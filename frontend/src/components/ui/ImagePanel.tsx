import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { cx } from './cx';

type ImagePanelProps = {
  src?: string;
  alt: string;
  width: number;
  height: number;
  /** Above-the-fold hero: eager load with high fetch priority. */
  priority?: boolean;
  /** Text on the placeholder when the photo is missing or fails. */
  label?: string;
  /** Set a height here (h-full, h-80 ...) to fill a box instead of keeping width/height ratio. */
  className?: string;
};

export function ImagePanel({ src, alt, width, height, priority = false, label = 'Photo goes here', className }: ImagePanelProps) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <div className={cx('relative overflow-hidden rounded-card bg-surface-sunken', className)} style={{ aspectRatio: `${width} / ${height}` }}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div
          className="photo-placeholder absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center"
          role={alt ? 'img' : undefined}
          aria-label={alt || undefined}
          aria-hidden={alt ? undefined : true}
        >
          <ImageIcon className="size-6" aria-hidden="true" />
          <span className="text-sm font-medium">{label}</span>
        </div>
      )}
    </div>
  );
}
