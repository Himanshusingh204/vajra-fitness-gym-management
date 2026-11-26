import { useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Trash2, X } from 'lucide-react';
import Wizard, { type WizardStep } from '../../components/ui/Wizard';
import FileDrop from '../../components/ui/FileDrop';
import { usePageMeta } from '../../hooks/usePageMeta';
import { uploadGymPhoto } from '../../api/gym.api';
import {
  getApplication, getFacilities, saveApplication, submitApplication, uploadProof, removeUpload,
  type Application, type ApplicationDraft, type ProofKind,
} from '../../api/onboarding.api';

const STEPS: WizardStep[] = [
  { id: 'details', label: 'Gym details' },
  { id: 'location', label: 'Location' },
  { id: 'facilities', label: 'Facilities' },
  { id: 'photos', label: 'Photos' },
  { id: 'plans', label: 'Plans' },
  { id: 'documents', label: 'Documents' },
  { id: 'review', label: 'Review' },
];

const CATEGORIES = ['Gym', 'CrossFit', 'Yoga', 'Martial arts', 'Dance', 'Women only', 'Other'];
// Used when the platform list is empty or can't be loaded.
const COMMON_FACILITIES = ['Free weights', 'Cardio', 'Personal training', 'Group classes', 'Locker room', 'Showers', 'Steam / Sauna', 'Parking', 'Air conditioned', 'Drinking water'];
const PROOFS: { kind: ProofKind; label: string; hint: string; required: boolean }[] = [
  { kind: 'ID_PROOF', label: 'Owner ID proof', hint: 'Aadhaar, PAN, passport or voter ID. JPG, PNG or PDF, up to 5 MB.', required: true },
  { kind: 'BUSINESS_PROOF', label: 'Business proof', hint: 'Shop licence, trade licence, rent agreement or Udyam certificate. Up to 5 MB.', required: true },
  { kind: 'GST_CERT', label: 'GST certificate (if you have one)', hint: 'JPG, PNG or PDF, up to 5 MB.', required: false },
];
const DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MB = 1024 * 1024;

type Form = Record<'name' | 'category' | 'description' | 'establishedYear' | 'phone' | 'email' | 'gstNumber' | 'address' | 'city' | 'state' | 'postalCode' | 'location' | 'openingHours' | 'parking' | 'accessibility' | 'rules', string>;
type PlanRow = { id?: string; name: string; duration: string; price: string };

const toForm = (g: Application['gym']): Form => ({
  name: g.name, category: g.category ?? '', description: g.description ?? '', establishedYear: g.establishedYear?.toString() ?? '',
  phone: g.phone ?? '', email: g.email ?? '', gstNumber: g.gstNumber ?? '', address: g.address, city: g.city, state: g.state,
  postalCode: g.postalCode ?? '', location: g.location ?? '', openingHours: g.openingHours ?? '', parking: g.parking ?? '',
  accessibility: g.accessibility ?? '', rules: g.rules ?? '',
});

const PHONE_RE = /^(\+?91[\s-]?)?[6-9]\d{9}$/;
const errMsg = (err: any, fallback: string) =>
  err?.response?.data?.issues?.[0]?.message ?? err?.response?.data?.error ?? fallback;

function Field({ id, label, error, wide, children }: { id: string; label: string; error?: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-[var(--color-charcoal)]">{label}</label>
      {children}
      {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export default function ApplyPage() {
  usePageMeta('Gym application', 'Send your gym to Kavach Fitness for review.', '/partner/apply');
  const { step = 'details' } = useParams();
  const current = Math.max(0, STEPS.findIndex((s) => s.id === step));
  const { data, isLoading, isError } = useQuery({ queryKey: ['onboarding'], queryFn: getApplication });

  if (isLoading) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-[var(--color-muted)]">Loading your application…</div>;
  if (isError || !data) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-[var(--color-muted)]">Could not load your application. Refresh the page to try again.</div>;
  if (!['DRAFT', 'CHANGES_REQUESTED'].includes(data.gym.status)) return <Navigate to="/partner/application" replace />;
  if (step !== STEPS[current].id) return <Navigate to={`/partner/apply/${STEPS[current].id}`} replace />;
  return <ApplyForm data={data} current={current} />;
}

// The form starts from the saved draft; after that the screen owns it.
function ApplyForm({ data, current }: { data: Application; current: number }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(() => toForm(data.gym));
  const [facilities, setFacilities] = useState(data.gym.facilities);
  const [facilityDraft, setFacilityDraft] = useState('');
  const [photos, setPhotos] = useState(data.gym.galleryUrls);
  const [plans, setPlans] = useState<PlanRow[]>(() => data.plans.map((p) => ({ id: p.id, name: p.name, duration: String(p.duration), price: String(p.price) })));
  const [coords, setCoords] = useState({ lat: data.gym.lat, lng: data.gym.lng });
  const [coordinateInput, setCoordinateInput] = useState({ lat: data.gym.lat?.toString() ?? '', lng: data.gym.lng?.toString() ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [fileError, setFileError] = useState<Record<string, string>>({});
  const [submitIssues, setSubmitIssues] = useState<string[]>([]);
  const { data: platformFacilities = [] } = useQuery({ queryKey: ['facilities'], queryFn: getFacilities, staleTime: 10 * 60 * 1000 });
  const facilityChoices = platformFacilities.length ? platformFacilities.map((f) => f.name) : COMMON_FACILITIES;

  const draft = (): ApplicationDraft => ({
    ...form,
    establishedYear: form.establishedYear ? Number(form.establishedYear) : null,
    ...coords,
    facilities,
    galleryUrls: photos,
    imageUrl: photos[0] ?? null,
    plans: plans.map((p) => ({ id: p.id, name: p.name.trim(), duration: Number(p.duration), price: Number(p.price) })),
  });

  const save = useMutation({
    mutationFn: () => saveApplication(draft()),
    onSuccess: (fresh) => {
      qc.setQueryData(['onboarding'], fresh);
      // The server sorts plans by creation time; its order can differ from the
      // edited rows. Match each new row once instead of assigning IDs by index.
      setPlans((rows) => {
        const available = [...fresh.plans];
        return rows.map((r) => {
          const i = available.findIndex((p) => r.id ? p.id === r.id : p.name === r.name.trim() && p.duration === Number(r.duration) && Number(p.price) === Number(r.price));
          const saved = i >= 0 ? available.splice(i, 1)[0] : undefined;
          return { ...r, id: saved?.id ?? r.id };
        });
      });
      setSavedAt(Date.now());
    },
  });

  const submit = useMutation({
    mutationFn: submitApplication,
    onSuccess: (fresh) => {
      qc.setQueryData(['onboarding'], fresh);
      navigate('/partner/application', { replace: true });
    },
    onError: (err: any) => {
      const issues: { message: string }[] = err?.response?.data?.issues ?? [];
      setSubmitIssues(issues.length ? issues.map((i) => i.message) : [errMsg(err, 'Could not submit. Please try again.')]);
    },
  });

  const set = (key: keyof Form) => (e: { target: { value: string } }) => {
    setForm({ ...form, [key]: e.target.value });
    setErrors(({ [key]: _gone, ...rest }) => rest);
  };
  const input = (key: keyof Form, props: Record<string, unknown> = {}) => (
    <input
      id={`apply-${key}`}
      className="input-field"
      value={form[key]}
      onChange={set(key)}
      aria-invalid={!!errors[key]}
      aria-describedby={errors[key] ? `apply-${key}-error` : undefined}
      {...props}
    />
  );

  // Same rules the server checks on submit, shown step by step.
  const check = () => {
    const e: Record<string, string> = {};
    const id = STEPS[current].id;
    if (id === 'details') {
      if (form.name.trim().length < 2) e.name = 'Enter your gym name';
      if (!PHONE_RE.test(form.phone.replace(/\s/g, ''))) e.phone = 'Enter a 10-digit mobile number';
      if (form.establishedYear && !/^\d{4}$/.test(form.establishedYear)) e.establishedYear = 'Enter a year like 2018';
    }
    if (id === 'location') {
      if (form.address.trim().length < 3) e.address = 'Enter the street address';
      if (form.city.trim().length < 2) e.city = 'Enter the city';
      if (form.state.trim().length < 2) e.state = 'Enter the state';
      if (!/^[1-9]\d{5}$/.test(form.postalCode.trim())) e.postalCode = 'Pincode must be 6 digits';
      if ((coordinateInput.lat.trim() || coordinateInput.lng.trim()) && (Number(coordinateInput.lat) !== coords.lat || Number(coordinateInput.lng) !== coords.lng || !coordinateInput.lat.trim() || !coordinateInput.lng.trim())) e.coords = 'Select Set pin to save the entered coordinates';
    }
    if (id === 'facilities' && facilities.length === 0) e.facilities = 'Pick at least one facility';
    if (id === 'photos' && photos.length === 0) e.photos = 'Add at least one photo of your gym';
    if (id === 'plans') {
      if (plans.length === 0) e.plans = 'Add at least one membership plan';
      if (plans.some((p) => p.name.trim().length < 2 || !(Number(p.duration) > 0) || !(Number(p.price) > 0))) e.plans = 'Every plan needs a name, days and a price';
    }
    if (id === 'documents') {
      for (const p of PROOFS) if (p.required && !data.documents.some((d) => d.kind === p.kind)) e[p.kind] = `Upload your ${p.label.toLowerCase()}`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const go = (index: number) => navigate(`/partner/apply/${STEPS[index].id}`);

  const next = async () => {
    if (STEPS[current].id === 'review') {
      setSubmitIssues([]);
      try {
        // Step links allow jumping directly to review with unsaved edits.
        await save.mutateAsync();
        submit.mutate();
      } catch {
        // Keep the draft on screen and show the save error.
      }
      return;
    }
    try {
      await save.mutateAsync();
      go(current + 1);
    } catch {
      // The save error shows next to the buttons.
    }
  };

  const addPhoto = async (file: File | null) => {
    if (!file) return;
    setUploading('photo');
    setFileError({});
    try {
      const url = await uploadGymPhoto(data.gym.id, file);
      setPhotos((p) => [...p, url]);
      setErrors({});
    } catch (err) {
      setFileError({ photo: errMsg(err, 'Upload failed. Try again.') });
    } finally {
      setUploading(null);
    }
  };

  // Uploaded photos are deleted on the server too; links added another way are just dropped.
  const removePhoto = async (url: string) => {
    const id = url.match(/^\/api\/images\/([0-9a-f-]{36})$/)?.[1];
    setFileError({});
    try {
      if (id) await removeUpload(id);
      setPhotos((p) => p.filter((x) => x !== url));
    } catch (err) {
      setFileError({ photo: errMsg(err, 'Could not remove the photo. Try again.') });
    }
  };

  const changeProof = async (kind: ProofKind, file: File | null) => {
    const existing = data.documents.find((d) => d.kind === kind);
    setUploading(kind);
    setFileError({});
    try {
      if (file) await uploadProof(data.gym.id, kind, file);
      else if (existing) await removeUpload(existing.id);
      await qc.invalidateQueries({ queryKey: ['onboarding'] });
      setErrors(({ [kind]: _gone, ...rest }) => rest);
    } catch (err) {
      setFileError({ [kind]: errMsg(err, 'Upload failed. Try again.') });
    } finally {
      setUploading(null);
    }
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setErrors((previous) => ({ ...previous, coords: 'Location is not available in this browser. Enter your address manually.' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const location = { lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) };
        setCoords(location);
        setCoordinateInput({ lat: String(location.lat), lng: String(location.lng) });
        setErrors((previous) => { const { coords: _error, ...rest } = previous; return rest; });
      },
      () => setErrors((previous) => ({ ...previous, coords: 'Could not get your location. Check the browser permission.' })),
      { timeout: 10_000 },
    );
  };

  const applyCoordinates = () => {
    const lat = Number(coordinateInput.lat);
    const lng = Number(coordinateInput.lng);
    if (!coordinateInput.lat.trim() || !coordinateInput.lng.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setErrors((previous) => ({ ...previous, coords: 'Enter a valid latitude and longitude.' }));
      return;
    }
    setCoords({ lat, lng });
    setErrors((previous) => { const { coords: _error, ...rest } = previous; return rest; });
  };

  const toggleFacility = (f: string) => {
    setFacilities(facilities.includes(f) ? facilities.filter((x) => x !== f) : [...facilities, f]);
    setErrors({});
  };
  const addFacility = () => {
    const value = facilityDraft.trim();
    if (value && !facilities.includes(value)) toggleFacility(value);
    setFacilityDraft('');
  };

  const setPlan = (i: number, key: keyof PlanRow, value: string) => {
    setPlans(plans.map((p, j) => (j === i ? { ...p, [key]: value } : p)));
    setErrors({});
  };

  const stepBody: Record<string, ReactNode> = {
    details: (
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="apply-name" label="Gym name" error={errors.name} wide>{input('name', { maxLength: 120, autoComplete: 'organization' })}</Field>
        <Field id="apply-category" label="Type of gym">
          <select id="apply-category" className="input-field" value={form.category} onChange={set('category')}>
            <option value="">Choose one</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field id="apply-establishedYear" label="Year started (optional)" error={errors.establishedYear}>{input('establishedYear', { inputMode: 'numeric', maxLength: 4, placeholder: '2018' })}</Field>
        <Field id="apply-phone" label="Gym phone number" error={errors.phone}>{input('phone', { type: 'tel', inputMode: 'tel', maxLength: 16, autoComplete: 'tel', placeholder: '98765 43210' })}</Field>
        <Field id="apply-email" label="Gym email (optional)">{input('email', { type: 'email', maxLength: 254, autoComplete: 'email' })}</Field>
        <Field id="apply-gstNumber" label="GST number (optional)">{input('gstNumber', { maxLength: 15, placeholder: '27ABCDE1234F1Z5' })}</Field>
        <Field id="apply-description" label="About your gym (optional)" wide>
          <textarea id="apply-description" className="input-field min-h-28" value={form.description} onChange={set('description')} maxLength={2000} placeholder="Equipment, trainers, timings, who it suits" />
        </Field>
      </div>
    ),
    location: (
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="apply-address" label="Street address" error={errors.address} wide>{input('address', { maxLength: 300, autoComplete: 'street-address' })}</Field>
        <Field id="apply-location" label="Area or landmark (optional)" wide>{input('location', { maxLength: 300, placeholder: 'Near City Mall, 2nd floor' })}</Field>
        <Field id="apply-city" label="City" error={errors.city}>{input('city', { maxLength: 80, autoComplete: 'address-level2' })}</Field>
        <Field id="apply-state" label="State" error={errors.state}>{input('state', { maxLength: 80, autoComplete: 'address-level1' })}</Field>
        <Field id="apply-postalCode" label="Pincode" error={errors.postalCode}>{input('postalCode', { inputMode: 'numeric', maxLength: 6, autoComplete: 'postal-code' })}</Field>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-semibold text-[var(--color-charcoal)]">Map location (optional)</p>
          <p className="mb-2 text-xs text-[var(--color-muted)]">Stand inside your gym and use your location, or enter coordinates from Google Maps. Verify the pin before submitting.</p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={locate} className="btn-outline min-h-11">
              <MapPin className="h-4 w-4" aria-hidden="true" /> Use my location
            </button>
            {coords.lat != null && coords.lng != null && (
              <span className="text-sm text-[var(--color-muted)]">
                {coords.lat}, {coords.lng}
                <button type="button" onClick={() => { setCoords({ lat: null, lng: null }); setCoordinateInput({ lat: '', lng: '' }); }} className="ml-2 min-h-11 font-semibold text-[var(--color-primary)]">Clear</button>
              </span>
            )}
          </div>
          <div className="mt-3 grid max-w-xl gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-sm font-semibold text-[var(--color-charcoal)]">Latitude
              <input className="input-field mt-1" inputMode="decimal" value={coordinateInput.lat} onChange={(e) => setCoordinateInput((p) => ({ ...p, lat: e.target.value }))} placeholder="e.g. 26.9124" />
            </label>
            <label className="text-sm font-semibold text-[var(--color-charcoal)]">Longitude
              <input className="input-field mt-1" inputMode="decimal" value={coordinateInput.lng} onChange={(e) => setCoordinateInput((p) => ({ ...p, lng: e.target.value }))} placeholder="e.g. 75.7873" />
            </label>
            <button type="button" onClick={applyCoordinates} className="btn-outline min-h-11">Set pin</button>
          </div>
          <a className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-primary)] underline underline-offset-4" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords.lat != null && coords.lng != null ? `${coords.lat},${coords.lng}` : [form.name, form.address, form.city, form.state, form.postalCode].filter(Boolean).join(', '))}`} target="_blank" rel="noopener noreferrer">{coords.lat != null && coords.lng != null ? 'Verify pin on Google Maps' : 'Find your gym on Google Maps'} <span className="sr-only">(opens in a new tab)</span></a>
          {errors.coords && <p role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{errors.coords}</p>}
        </div>
      </div>
    ),
    facilities: (
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-[var(--color-charcoal)]">What does your gym have?</legend>
          <div className="flex flex-wrap gap-2">
            {[...facilityChoices, ...facilities.filter((f) => !facilityChoices.includes(f))].map((f) => {
              const on = facilities.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleFacility(f)}
                  className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${on ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white dark:text-[var(--color-base)]' : 'border-[var(--color-border-strong)] text-[var(--color-charcoal)] hover:border-[var(--color-primary)]'}`}
                >
                  {f}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex max-w-md gap-2">
            <label htmlFor="apply-facility" className="sr-only">Add another facility</label>
            <input
              id="apply-facility"
              className="input-field"
              value={facilityDraft}
              maxLength={60}
              placeholder="Something else, e.g. Swimming pool"
              onChange={(e) => setFacilityDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFacility(); } }}
            />
            <button type="button" onClick={addFacility} className="btn-outline min-h-11 shrink-0">Add</button>
          </div>
          {errors.facilities && <p role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{errors.facilities}</p>}
        </fieldset>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="apply-openingHours" label="Opening hours (optional)" wide>{input('openingHours', { maxLength: 200, placeholder: 'Mon-Sat 5:30 AM - 10 PM, Sun 6 AM - 12 PM' })}</Field>
          <Field id="apply-parking" label="Parking (optional)">{input('parking', { maxLength: 200, placeholder: 'Two-wheeler parking in front' })}</Field>
          <Field id="apply-accessibility" label="Accessibility (optional)">{input('accessibility', { maxLength: 200, placeholder: 'Ground floor, lift available' })}</Field>
          <Field id="apply-rules" label="Gym rules (optional)" wide>
            <textarea id="apply-rules" className="input-field min-h-24" value={form.rules} onChange={set('rules')} maxLength={2000} placeholder="Clean shoes only, carry a towel" />
          </Field>
        </div>
      </div>
    ),
    photos: (
      <div className="space-y-5">
        <p className="text-sm text-[var(--color-muted)]">Add clear photos of the floor, equipment and changing rooms. The first photo is your cover. Up to 12.</p>
        {photos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((url, i) => (
              <li key={url} className="relative overflow-hidden rounded-lg border border-[var(--color-border)]">
                <img src={url} alt={`Gym photo ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
                {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">Cover</span>}
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {photos.length < 12 && (
          <FileDrop
            label="Add a photo"
            hint={uploading === 'photo' ? 'Uploading…' : undefined}
            accept={['image/jpeg', 'image/png', 'image/webp']}
            maxSize={3 * MB}
            value={null}
            onChange={addPhoto}
            error={fileError.photo ?? errors.photos}
            disabled={!!uploading}
          />
        )}
      </div>
    ),
    plans: (
      <div className="space-y-4">
        <p className="text-sm text-[var(--color-muted)]">Prices in rupees, as members pay them today. You can change plans later from your console.</p>
        {plans.map((p, i) => (
          <div key={p.id ?? `new-${i}`} className="grid gap-3 rounded-lg border border-[var(--color-border)] p-4 sm:grid-cols-[1fr_8rem_8rem_auto] sm:items-end">
            <Field id={`plan-name-${i}`} label="Plan name">
              <input id={`plan-name-${i}`} className="input-field" value={p.name} maxLength={100} placeholder="Monthly" onChange={(e) => setPlan(i, 'name', e.target.value)} />
            </Field>
            <Field id={`plan-days-${i}`} label="Days">
              <input id={`plan-days-${i}`} className="input-field" inputMode="numeric" value={p.duration} placeholder="30" onChange={(e) => setPlan(i, 'duration', e.target.value.replace(/\D/g, ''))} />
            </Field>
            <Field id={`plan-price-${i}`} label="Price (₹)">
              <input id={`plan-price-${i}`} className="input-field" inputMode="decimal" value={p.price} placeholder="1500" onChange={(e) => setPlan(i, 'price', e.target.value.replace(/[^\d.]/g, ''))} />
            </Field>
            <button type="button" onClick={() => setPlans(plans.filter((_, j) => j !== i))} aria-label={`Remove plan ${p.name || i + 1}`} className="btn-ghost min-h-11 justify-self-start">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        {plans.length < 20 && (
          <button type="button" onClick={() => setPlans([...plans, { name: '', duration: '30', price: '' }])} className="btn-outline min-h-11">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add a plan
          </button>
        )}
        {errors.plans && <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">{errors.plans}</p>}
      </div>
    ),
    documents: (
      <div className="space-y-6">
        <p className="text-sm text-[var(--color-muted)]">Only our review team can see these. They are never shown on your gym page.</p>
        {PROOFS.map((p) => {
          const doc = data.documents.find((d) => d.kind === p.kind);
          return (
            <FileDrop
              key={p.kind}
              label={p.label}
              hint={uploading === p.kind ? 'Uploading…' : p.hint}
              accept={DOC_TYPES}
              maxSize={5 * MB}
              value={doc ? { name: `${p.label} (${doc.mime === 'application/pdf' ? 'PDF' : 'image'})`, url: '', size: doc.sizeBytes } : null}
              onChange={(file) => changeProof(p.kind, file)}
              error={fileError[p.kind] ?? errors[p.kind]}
              disabled={!!uploading}
            />
          );
        })}
      </div>
    ),
    review: (
      <Review
        form={form}
        facilities={facilities}
        photos={photos.length}
        plans={plans}
        documents={PROOFS.filter((p) => data.documents.some((d) => d.kind === p.kind)).map((p) => p.label)}
        onEdit={go}
      />
    ),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">List your gym</p>
      <h1 className="mt-1 text-3xl font-extrabold text-[var(--color-deepgray)]">{STEPS[current].label}</h1>
      {data.gym.status === 'CHANGES_REQUESTED' && data.request?.reviewNote && (
        <div role="status" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          <p className="font-semibold">Our team asked for changes</p>
          <p className="mt-1">{data.request.reviewNote}</p>
        </div>
      )}
      <div className="mt-6">
        <Wizard
          steps={STEPS}
          current={current}
          onStepClick={go}
          onBack={() => go(current - 1)}
          onNext={next}
          validate={check}
          onSaveDraft={STEPS[current].id === 'review' ? undefined : () => save.mutate()}
          nextLabel={STEPS[current].id === 'review' ? (data.gym.status === 'CHANGES_REQUESTED' ? 'Send again for review' : 'Submit for review') : 'Save and continue'}
          busy={submit.isPending || !!uploading}
          saving={save.isPending}
          savedAt={savedAt}
          saveError={save.isError ? errMsg(save.error, 'Could not save. Check your connection and try again.') : null}
        >
          {stepBody[STEPS[current].id]}
          {submitIssues.length > 0 && (
            <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
              <p className="font-semibold">Please fix these before sending:</p>
              <ul className="mt-1 list-disc pl-5">{submitIssues.map((m) => <li key={m}>{m}</li>)}</ul>
            </div>
          )}
        </Wizard>
      </div>
      <p className="mt-8 text-center text-sm text-[var(--color-muted)]">
        Your answers are saved as you go. <Link to="/partner/application" className="font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline">See application status</Link>
      </p>
    </div>
  );
}

function Review({ form, facilities, photos, plans, documents, onEdit }: {
  form: Form; facilities: string[]; photos: number; plans: PlanRow[]; documents: string[]; onEdit: (step: number) => void;
}) {
  const rows: { step: number; title: string; lines: string[] }[] = [
    { step: 0, title: 'Gym details', lines: [form.name, [form.category, form.establishedYear && `since ${form.establishedYear}`].filter(Boolean).join(', '), form.phone, form.email, form.gstNumber && `GST ${form.gstNumber}`].filter(Boolean) },
    { step: 1, title: 'Location', lines: [form.address, form.location, `${form.city}, ${form.state} ${form.postalCode}`].filter(Boolean) },
    { step: 2, title: 'Facilities', lines: [facilities.join(', ') || 'None picked', form.openingHours].filter(Boolean) },
    { step: 3, title: 'Photos', lines: [`${photos} photo${photos === 1 ? '' : 's'}`] },
    { step: 4, title: 'Plans', lines: plans.length ? plans.map((p) => `${p.name}: ₹${p.price} for ${p.duration} days`) : ['No plans yet'] },
    { step: 5, title: 'Documents', lines: documents.length ? documents : ['Nothing uploaded yet'] },
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-muted)]">Check everything once. After you send it, we will tell you here and in your notifications when it is reviewed.</p>
      {rows.map((r) => (
        <section key={r.title} className="flex items-start justify-between gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[var(--color-deepgray)]">{r.title}</h2>
            {r.lines.map((l) => <p key={l} className="mt-0.5 break-words text-sm text-[var(--color-muted)]">{l}</p>)}
          </div>
          <button type="button" onClick={() => onEdit(r.step)} className="min-h-11 shrink-0 px-2 text-sm font-semibold text-[var(--color-primary)]" aria-label={`Edit ${r.title.toLowerCase()}`}>
            Edit
          </button>
        </section>
      ))}
    </div>
  );
}
