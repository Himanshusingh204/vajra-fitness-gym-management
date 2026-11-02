import { useEffect, useId, useMemo, useRef, useState, type DragEvent } from 'react';
import { FileText, UploadCloud } from 'lucide-react';

/** A file that is already uploaded, e.g. when reopening a saved draft. */
export type StoredFile = { name: string; url: string; type?: string; size?: number };

type Props = {
  label: string;
  /** Mime types, `image/*` style wildcards allowed. */
  accept: string[];
  /** Bytes. */
  maxSize: number;
  value: File | StoredFile | null;
  onChange: (file: File | null) => void;
  hint?: string;
  /** 0–100 while uploading. */
  progress?: number | null;
  /** Error from the upload itself, shown under the field. */
  error?: string | null;
  disabled?: boolean;
};

const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

const matches = (type: string, accept: string[]) =>
  accept.some((a) => (a.endsWith('/*') ? type.startsWith(a.slice(0, -1)) : type === a));

// Short names for the hint, e.g. "JPG, PNG or PDF".
const describe = (accept: string[]) => {
  const names = accept.map((a) => (a === 'image/*' ? 'image' : a.split('/')[1].replace('jpeg', 'jpg').toUpperCase()));
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}` : names[0];
};

export default function FileDrop({ label, accept, maxSize, value, onChange, hint, progress, error, disabled }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const isFile = value instanceof File;
  const previewUrl = useMemo(() => (isFile && value.type.startsWith('image/') ? URL.createObjectURL(value) : null), [isFile, value]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);
  const imageUrl = previewUrl ?? (!isFile && value && (value.type?.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif)$/i.test(value.name)) ? value.url : null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!matches(file.type, accept)) return setProblem(`${file.name} isn't a supported file. Use ${describe(accept)}.`);
    if (file.size > maxSize) return setProblem(`${file.name} is ${formatBytes(file.size)}. The limit is ${formatBytes(maxSize)}.`);
    setProblem(null);
    onChange(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) pick(e.dataTransfer.files[0]);
  };

  const uploading = progress != null && progress < 100;
  const message = problem ?? error;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div>
      <p id={`${id}-label`} className="mb-1.5 text-sm font-semibold text-[var(--color-deepgray)]">{label}</p>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept.join(',')}
        disabled={disabled || uploading}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${hintId}${message ? ` ${errorId}` : ''}`}
        aria-invalid={!!message}
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
        className="peer sr-only"
      />

      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-[var(--color-border)]/40 text-[var(--color-muted)]">
              <FileText className="h-6 w-6" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--color-deepgray)]">{value.name}</p>
            {value.size != null && <p className="text-xs text-[var(--color-muted)]">{formatBytes(value.size)}</p>}
            {progress != null && (
              <div
                role="progressbar"
                aria-label={`Uploading ${value.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
                className="mt-2 h-1 rounded-full bg-[var(--color-border)]"
              >
                <div className="h-1 rounded-full bg-[var(--color-primary)] transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || uploading}
              className="min-h-11 rounded-lg px-3 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-border)]/40 disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => {
                setProblem(null);
                onChange(null);
              }}
              disabled={disabled || uploading}
              aria-label={`Remove ${value.name}`}
              className="min-h-11 rounded-lg px-3 text-sm font-semibold text-[var(--color-muted)] hover:bg-[var(--color-border)]/40 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-ring)] ${
            dragging ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border-strong)] hover:border-[var(--color-primary)]'
          } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
        >
          <UploadCloud className="h-6 w-6 text-[var(--color-muted)]" aria-hidden="true" />
          <span className="text-sm font-semibold text-[var(--color-deepgray)]">
            Drop a file here or <span className="text-[var(--color-primary)] underline underline-offset-2">browse</span>
          </span>
        </label>
      )}

      <p id={hintId} className="mt-1.5 text-xs text-[var(--color-muted)]">
        {hint ?? `${describe(accept)}, up to ${formatBytes(maxSize)}.`}
      </p>
      {message && (
        <p id={errorId} role="alert" className="mt-1 text-xs font-semibold text-[var(--color-primary)]">
          {message}
        </p>
      )}
    </div>
  );
}
