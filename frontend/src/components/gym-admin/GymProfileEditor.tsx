import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Lock, Plus, Star, Trash2, X } from 'lucide-react';
import { getMyChangeRequests, getMyGym, updateMyGym, uploadGymPhoto, type MyGym } from '../../api/gym.api';

const MAX_GALLERY = 12;

type Form = {
  name: string;
  tagline: string;
  description: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  openingHours: string;
  imageUrl: string;
  logoUrl: string;
  brandColor: string;
};

const toForm = (gym: MyGym): Form => ({
  name: gym.name,
  tagline: gym.tagline ?? '',
  description: gym.description ?? '',
  address: gym.address,
  city: gym.city,
  state: gym.state,
  phone: gym.phone ?? '',
  email: gym.email ?? '',
  openingHours: gym.openingHours ?? '',
  imageUrl: gym.imageUrl ?? '',
  logoUrl: gym.logoUrl ?? '',
  brandColor: gym.brandColor ?? '',
});

// Saved only after the Kavach admin approves them.
const LOCKED: { key: keyof Form; label: string }[] = [
  { key: 'name', label: 'Gym name' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
];

const lockedValues = (f: Form) => Object.fromEntries(LOCKED.map(({ key }) => [key, f[key]]));

const splitList = (value?: string | string[] | null) =>
  String(value ?? '').split(',').map((s) => s.trim()).filter(Boolean);

const looksLikeImage = (url: string) => /^https?:\/\//i.test(url) || /^\/[^/]/.test(url);

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="font-bold text-[var(--color-charcoal)] dark:text-white">{title}</h3>
      {hint && <p className="mt-0.5 text-sm text-gray-500">{hint}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`block text-sm ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block font-semibold text-gray-600 dark:text-gray-300">{label}</span>
      {children}
    </label>
  );
}

export default function GymProfileEditor() {
  const { data: gym, isLoading } = useQuery({ queryKey: ['my-branch'], queryFn: getMyGym });
  if (isLoading || !gym) {
    return <div className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />;
  }
  return <ProfileForm key={gym.id} gym={gym} />;
}

function ProfileForm({ gym }: { gym: MyGym }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => toForm(gym));
  const [facilities, setFacilities] = useState(() => splitList(gym.facilities));
  const [facilityDraft, setFacilityDraft] = useState('');
  const [gallery, setGallery] = useState(() => gym.galleryUrls ?? []);
  const [galleryDraft, setGalleryDraft] = useState('');
  const [saved, setSaved] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const { data: requests = [] } = useQuery({ queryKey: ['my-change-requests'], queryFn: getMyChangeRequests });
  const pending = requests.find((r) => r.status === 'PENDING_REVIEW');
  const lastDecided = requests.find((r) => r.status === 'REJECTED' || r.status === 'APPROVED');

  const save = useMutation({
    mutationFn: (f: Form) =>
      updateMyGym({
        name: f.name,
        address: f.address,
        city: f.city,
        state: f.state,
        tagline: f.tagline || null,
        description: f.description || null,
        phone: f.phone || null,
        email: f.email || null,
        openingHours: f.openingHours || null,
        imageUrl: f.imageUrl || null,
        logoUrl: f.logoUrl || null,
        brandColor: f.brandColor || null,
        facilities,
        galleryUrls: gallery,
      }),
    onSuccess: (updated) => {
      qc.setQueryData(['my-branch'], updated);
      qc.invalidateQueries({ queryKey: ['my-change-requests'] });
      // Locked fields keep their live values until the admin approves.
      setForm((f) => ({ ...f, ...lockedValues(toForm(updated)) }));
      setRequesting(false);
      qc.invalidateQueries({ queryKey: ['public-gym'] });
      qc.invalidateQueries({ queryKey: ['public-gyms'] });
      setSaved(true);
    },
  });

  const set = (key: keyof Form) => (e: { target: { value: string } }) => {
    setForm({ ...form, [key]: e.target.value });
    setSaved(false);
  };

  const addFacility = () => {
    const value = facilityDraft.trim().replace(/,/g, '');
    if (value && !facilities.includes(value)) setFacilities([...facilities, value]);
    setFacilityDraft('');
    setSaved(false);
  };

  const addPhoto = () => {
    const url = galleryDraft.trim();
    if (!looksLikeImage(url) || gallery.length >= MAX_GALLERY) return;
    setGallery([...gallery, url]);
    setGalleryDraft('');
    setSaved(false);
  };

  const movePhoto = (from: number, to: number) => {
    if (to < 0 || to >= gallery.length) return;
    const next = [...gallery];
    [next[from], next[to]] = [next[to]!, next[from]!];
    setGallery(next);
    setSaved(false);
  };

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setUploadError('');
    const urls: string[] = [];
    try {
      for (const file of Array.from(files).slice(0, MAX_GALLERY - gallery.length)) {
        urls.push(await uploadGymPhoto(gym.id, file));
      }
    } catch (e: any) {
      setUploadError(e?.response?.data?.error || 'Upload failed. Use JPG, PNG or WebP under 3 MB.');
    } finally {
      setUploading(false);
    }
    if (urls.length) {
      setGallery((g) => [...g, ...urls]);
      setSaved(false);
    }
  };

  const removePhoto = (index: number) => {
    setGallery(gallery.filter((_, i) => i !== index));
    setSaved(false);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(form);
  };

  const err = (save.error as any)?.response?.data;
  const errorText = err?.issues?.length
    ? err.issues.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`).join(' · ')
    : err?.error || (save.isError ? 'Could not save. Try again.' : '');

  const publicPath = gym.subdomain ? `/g/${gym.subdomain}` : gym.isApproved ? `/gyms/${gym.id}` : null;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold dark:text-white">Gym profile</h2>
          <p className="text-sm text-gray-500">This is what visitors see on your public gym page.</p>
        </div>
        {publicPath ? (
          <a href={publicPath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] underline">
            View public page <ExternalLink size={14} />
          </a>
        ) : (
          <span className="text-sm text-gray-500">Your public page goes live once the gym is approved.</span>
        )}
      </div>

      <Section
        title="Business details"
        hint="To stop fake or duplicate listings, the Kavach team checks these before they change on your page."
      >
        {pending && (
          <p role="status" className="sm:col-span-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
            Change request {pending.ref} is waiting for review:{' '}
            {Object.entries(pending.proposedValue ?? {})
              .map(([k, v]) => `${LOCKED.find((l) => l.key === k)?.label ?? k} → ${v || '(blank)'}`)
              .join(', ')}
          </p>
        )}
        {!pending && lastDecided?.status === 'REJECTED' && (
          <p className="sm:col-span-2 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-300">
            Your last change request ({lastDecided.ref}) was rejected{lastDecided.reviewNote ? `: ${lastDecided.reviewNote}` : '.'}
          </p>
        )}
        {LOCKED.map(({ key, label }) => (
          <Field key={key} label={label} wide={key === 'address'}>
            {requesting ? (
              <input
                className="input-field"
                type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
                value={form[key]}
                onChange={set(key)}
                required={key !== 'phone' && key !== 'email'}
                minLength={key === 'phone' || key === 'email' ? undefined : 2}
                maxLength={key === 'address' ? 300 : 120}
              />
            ) : (
              <span className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5 dark:text-white">
                <Lock size={14} className="shrink-0 text-gray-400" aria-hidden />
                {form[key] || <span className="text-gray-400">Not set</span>}
              </span>
            )}
          </Field>
        ))}
        <div className="sm:col-span-2">
          {requesting ? (
            <p className="text-sm text-gray-500">
              Edit the details above and press <strong>Save profile</strong>. The change goes to the admin and is live once approved.{' '}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => { setRequesting(false); setForm({ ...form, ...lockedValues(toForm(gym)) }); }}
              >
                Cancel
              </button>
            </p>
          ) : (
            <button type="button" onClick={() => setRequesting(true)} className="btn-outline">
              {pending ? 'Update change request' : 'Request a change'}
            </button>
          )}
        </div>
      </Section>

      <Section title="About">
        <Field label="Tagline">
          <input className="input-field" value={form.tagline} onChange={set('tagline')} maxLength={160} placeholder="Lift heavy, rest well" />
        </Field>
        <Field label="About the gym" wide>
          <textarea className="input-field min-h-28" value={form.description} onChange={set('description')} maxLength={2000} />
        </Field>
        <Field label="Opening hours" wide>
          <input className="input-field" value={form.openingHours} onChange={set('openingHours')} maxLength={200} placeholder="Mon-Sat 6 AM - 10 PM, Sun 7 AM - 12 PM" />
        </Field>
      </Section>

      <Section title="Facilities">
        <div className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {facilities.map((f) => (
              <span key={f} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm dark:bg-white/10 dark:text-white">
                {f}
                <button type="button" aria-label={`Remove ${f}`} onClick={() => { setFacilities(facilities.filter((x) => x !== f)); setSaved(false); }}>
                  <X size={14} />
                </button>
              </span>
            ))}
            {facilities.length === 0 && <span className="text-sm text-gray-500">No facilities listed yet.</span>}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="input-field"
              value={facilityDraft}
              onChange={(e) => setFacilityDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFacility(); } }}
              placeholder="Sauna, Free Weights, Parking..."
              maxLength={60}
            />
            <button type="button" onClick={addFacility} className="btn-outline inline-flex items-center gap-1 whitespace-nowrap">
              <Plus size={16} /> Add
            </button>
          </div>
        </div>
      </Section>

      <Section title="Look and feel" hint="Paste image links, or upload photos in the gallery and star one as the cover.">
        <Field label="Cover image URL">
          <input className="input-field" value={form.imageUrl} onChange={set('imageUrl')} maxLength={1000} placeholder="https://..." />
        </Field>
        <Field label="Logo URL">
          <input className="input-field" value={form.logoUrl} onChange={set('logoUrl')} maxLength={1000} placeholder="https://..." />
        </Field>
        <Field label="Brand colour">
          <div className="flex gap-2">
            <input
              type="color"
              aria-label="Pick brand colour"
              value={/^#[0-9a-f]{6}$/i.test(form.brandColor) ? form.brandColor : '#800020'}
              onChange={set('brandColor')}
              className="h-10 w-12 cursor-pointer rounded border border-[var(--color-border)]"
            />
            <input className="input-field" value={form.brandColor} onChange={set('brandColor')} placeholder="#800020" maxLength={7} />
          </div>
        </Field>
        {form.imageUrl && looksLikeImage(form.imageUrl) && (
          <img src={form.imageUrl} alt="Cover preview" className="h-24 w-full rounded-lg object-cover" />
        )}
      </Section>

      <Section title={`Gallery (${gallery.length}/${MAX_GALLERY})`} hint="Upload photos of your gym. The first photos show up first on your page.">
        <div className="sm:col-span-2">
          {gallery.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--color-border)] px-4 py-5 text-center text-sm text-gray-500">
              No photos yet. Upload photos of your gym below.
            </p>
          ) : (
            <ul className="space-y-2">
              {gallery.map((url, i) => (
                <li key={`${url}-${i}`} className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] p-2">
                  <img src={url} alt="" loading="lazy" className="h-12 w-16 shrink-0 rounded object-cover bg-gray-100 dark:bg-white/5" />
                  <span className="min-w-0 flex-1 truncate text-sm dark:text-white" title={url}>{url}</span>
                  <button
                    type="button"
                    aria-label={form.imageUrl === url ? 'Cover photo' : 'Use as cover photo'}
                    title={form.imageUrl === url ? 'Cover photo' : 'Use as cover photo'}
                    onClick={() => { setForm({ ...form, imageUrl: url }); setSaved(false); }}
                    className={`p-1 ${form.imageUrl === url ? 'text-amber-500' : 'text-gray-400'}`}
                  >
                    <Star size={16} fill={form.imageUrl === url ? 'currentColor' : 'none'} />
                  </button>
                  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => movePhoto(i, i - 1)} className="p-1 text-gray-500 disabled:opacity-30">
                    <ArrowUp size={16} />
                  </button>
                  <button type="button" aria-label="Move down" disabled={i === gallery.length - 1} onClick={() => movePhoto(i, i + 1)} className="p-1 text-gray-500 disabled:opacity-30">
                    <ArrowDown size={16} />
                  </button>
                  <button type="button" aria-label="Remove photo" onClick={() => removePhoto(i)} className="p-1 text-red-600">
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label
            className={`mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border-strong)] px-4 py-4 text-sm font-semibold text-[var(--color-primary)] ${uploading || gallery.length >= MAX_GALLERY ? 'pointer-events-none opacity-50' : ''}`}
          >
            <ImagePlus size={18} />
            {uploading ? 'Uploading...' : 'Upload photos (JPG, PNG or WebP, up to 3 MB each)'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              disabled={uploading || gallery.length >= MAX_GALLERY}
              onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
            />
          </label>
          {uploadError && <p role="alert" className="mt-2 text-sm text-red-600">{uploadError}</p>}
          <div className="mt-3 flex gap-2">
            <input
              className="input-field"
              value={galleryDraft}
              onChange={(e) => setGalleryDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPhoto(); } }}
              placeholder="Or paste a photo link: https://..."
              maxLength={1000}
              disabled={gallery.length >= MAX_GALLERY}
            />
            <button
              type="button"
              onClick={addPhoto}
              disabled={!looksLikeImage(galleryDraft.trim()) || gallery.length >= MAX_GALLERY}
              className="btn-outline inline-flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
            >
              <Plus size={16} /> Add photo
            </button>
          </div>
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={save.isPending} className="btn-primary disabled:opacity-50">
          {save.isPending ? 'Saving...' : 'Save profile'}
        </button>
        {errorText && <p role="alert" className="text-sm text-red-600">{errorText}</p>}
        {saved && !save.isError && (
          <p role="status" className="rounded-lg bg-green-100 px-3 py-2 text-sm font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-400">
            {save.data?.changeRequest
              ? `Saved. Business details sent for approval (${save.data.changeRequest.ref}).`
              : 'Saved. Your public page is updated.'}
          </p>
        )}
      </div>
    </form>
  );
}
