import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/audit';
import { findDuplicateGym } from '../utils/duplicateGym';
import { onboardingSubmitSchema } from '../utils/validators';
import { createNotification } from '../services/notification.service';
import { deleteFile } from '../services/storage.service';
import { ApprovalError, submitGymRegistration } from '../services/approval.service';

// The owner fills in the application while the gym is DRAFT, or after the
// admin sent it back. Once submitted it is read-only until the admin decides.
const EDITABLE = ['DRAFT', 'CHANGES_REQUESTED'];
const DOCUMENT_KINDS = ['ID_PROOF', 'BUSINESS_PROOF', 'GST_CERT'];
const REQUIRED_DOCUMENTS: Record<string, string> = { ID_PROOF: 'ID proof', BUSINESS_PROOF: 'business proof' };

const GYM_FIELDS = {
  id: true, name: true, status: true, category: true, description: true, establishedYear: true,
  phone: true, email: true, gstNumber: true, address: true, city: true, state: true, postalCode: true,
  location: true, lat: true, lng: true, facilities: true, openingHours: true, parking: true,
  accessibility: true, rules: true, imageUrl: true, galleryUrls: true,
} satisfies Prisma.GymSelect;

const ownGym = (userId: string) => prisma.gym.findFirst({ where: { ownerId: userId }, select: GYM_FIELDS });

const loadApplication = async (gymId: string) => {
  const [plans, docs, request] = await Promise.all([
    prisma.membershipPlan.findMany({
      where: { gymId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, duration: true, price: true, description: true },
    }),
    prisma.document.findMany({
      where: { gymId, kind: { in: DOCUMENT_KINDS }, status: { not: 'DELETED' } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, kind: true, mime: true, sizeBytes: true, createdAt: true },
    }),
    prisma.approvalRequest.findFirst({
      where: { gymId, type: 'GYM_REGISTRATION' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, ref: true, status: true, reviewNote: true, submittedAt: true, decidedAt: true },
    }),
  ]);
  // A replaced file stays on record; only the newest of each kind counts.
  const documents = DOCUMENT_KINDS.map((kind) => docs.find((d) => d.kind === kind)).filter((d) => !!d);
  return { plans: plans.map((p) => ({ ...p, price: Number(p.price) })), documents, request };
};

// GET /api/onboarding/gym
export const getApplication = async (req: AuthRequest, res: Response) => {
  const gym = await ownGym(req.user!.userId);
  if (!gym) return res.status(404).json({ error: 'Gym not found', code: 'NOT_FOUND' });
  res.json({ gym, ...(await loadApplication(gym.id)) });
};

// PATCH /api/onboarding/gym: autosave of one wizard step.
export const saveApplication = async (req: AuthRequest, res: Response) => {
  const gym = await ownGym(req.user!.userId);
  if (!gym) return res.status(404).json({ error: 'Gym not found', code: 'NOT_FOUND' });
  if (!EDITABLE.includes(gym.status)) {
    return res.status(409).json({ error: 'Your application is with our team and cannot be edited right now', code: 'NOT_EDITABLE' });
  }

  const { plans, ...fields } = req.body as { plans?: Array<{ id?: string; name: string; duration: number; price: number; description?: string | null }> };
  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
    // The application can be submitted in another tab after the first read.
    // The conditional update locks the row and prevents edits after submission.
    const claimed = await tx.gym.updateMany({ where: { id: gym.id, status: { in: EDITABLE } }, data: fields });
    if (!claimed.count) throw new ApprovalError(409, 'NOT_EDITABLE', 'Your application cannot be edited right now');
    const saved = await tx.gym.findUniqueOrThrow({ where: { id: gym.id }, select: GYM_FIELDS });
    if (plans) {
      // Plans left out are switched off, not deleted, in case a member already holds one.
      const kept = plans.flatMap((p) => (p.id ? [p.id] : []));
      await tx.membershipPlan.updateMany({ where: { gymId: gym.id, id: { notIn: kept } }, data: { isActive: false } });
      for (const { id, ...plan } of plans) {
        if (id) await tx.membershipPlan.updateMany({ where: { id, gymId: gym.id }, data: { ...plan, isActive: true } });
        else await tx.membershipPlan.create({ data: { ...plan, gymId: gym.id } });
      }
    }
    return saved;
    });
  } catch (err) {
    if (err instanceof ApprovalError) return res.status(err.status).json({ error: err.message, code: err.code });
    throw err;
  }

  res.json({ gym: updated, ...(await loadApplication(gym.id)) });
};

// DELETE /api/onboarding/documents/:id: the owner removes an uploaded proof or photo.
export const removeDocument = async (req: AuthRequest, res: Response) => {
  const gym = await ownGym(req.user!.userId);
  if (!gym || !EDITABLE.includes(gym.status)) {
    return res.status(409).json({ error: 'Your application cannot be edited right now', code: 'NOT_EDITABLE' });
  }
  const doc = await prisma.document.findFirst({
    where: { id: req.params.id as string, gymId: gym.id, kind: { in: [...DOCUMENT_KINDS, 'GALLERY'] }, status: { not: 'DELETED' } },
  });
  if (!doc) return res.status(404).json({ error: 'Document not found', code: 'NOT_FOUND' });

  await prisma.document.update({ where: { id: doc.id }, data: { status: 'DELETED' } });
  // Proofs stay on disk because a submitted request may point at them. A photo
  // is not part of the review record, so its file goes and the gym stops showing it.
  if (doc.kind === 'GALLERY') {
    const url = `/api/images/${doc.id}`;
    await prisma.gym.update({
      where: { id: gym.id },
      data: { galleryUrls: gym.galleryUrls.filter((u) => u !== url), imageUrl: gym.imageUrl === url ? null : gym.imageUrl },
    });
    await deleteFile(doc.storageKey).catch(() => undefined);
  }
  res.status(204).end();
};

// POST /api/onboarding/gym/submit: checks every step, then sends the gym to review.
export const submitApplication = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const gym = await ownGym(userId);
  if (!gym) return res.status(404).json({ error: 'Gym not found', code: 'NOT_FOUND' });
  if (!EDITABLE.includes(gym.status)) {
    return res.status(409).json({ error: 'This application has already been submitted', code: 'NOT_EDITABLE' });
  }

  const { plans, documents } = await loadApplication(gym.id);
  const checked = onboardingSubmitSchema.safeParse({ ...gym, plans });
  const issues = checked.success ? [] : checked.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  for (const [kind, label] of Object.entries(REQUIRED_DOCUMENTS)) {
    if (!documents.some((d) => d.kind === kind)) issues.push({ path: 'documents', message: `Upload your ${label}` });
  }
  if (issues.length) return res.status(400).json({ error: 'Some details are missing', code: 'INCOMPLETE', issues });

  const duplicate = await findDuplicateGym(gym, gym.id);
  if (duplicate) return res.status(409).json({ error: duplicate.message, code: 'DUPLICATE_GYM' });

  const { id: _id, status: _status, ...details } = gym;
  let request;
  try {
    request = await submitGymRegistration(gym.id, { ...details, plans }, documents.map((d) => d.id), userId);
  } catch (err) {
    if (err instanceof ApprovalError) return res.status(err.status).json({ error: err.message, code: err.code });
    throw err;
  }

  const admins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN', isActive: true }, select: { id: true } });
  await Promise.all(
    admins.map((a) =>
      createNotification({
        userId: a.id,
        type: 'INFO',
        title: 'New gym application',
        message: `${gym.name}, ${gym.city} sent application ${request.ref} for review.`,
        link: '/admin/approvals',
      }),
    ),
  );
  await logAudit({
    action: 'GYM_APPLICATION_SUBMITTED',
    entity: 'ApprovalRequest',
    entityId: request.id,
    details: JSON.stringify({ ref: request.ref, gymId: gym.id }),
    userId,
    ipAddress: req.ip ?? null,
  });

  res.json({ gym: { ...gym, status: 'PENDING_REVIEW' }, ...(await loadApplication(gym.id)) });
};
