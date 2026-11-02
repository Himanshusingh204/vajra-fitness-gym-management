import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CarouselImage {
  src: string;
  alt: string;
}

const SWIPE_DISTANCE = 40;

export function ImageCarousel({
  images,
  startIndex = 0,
  className = '',
  fit = 'cover',
}: {
  images: CarouselImage[];
  startIndex?: number;
  className?: string;
  fit?: 'cover' | 'contain';
}) {
  const [index, setIndex] = useState(startIndex);
  const touchStart = useRef<number | null>(null);
  const count = images.length;
  const go = (step: number) => setIndex((i) => (i + step + count) % count);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  };
  const onPointerDown = (e: PointerEvent) => {
    touchStart.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (touchStart.current == null) return;
    const delta = e.clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(delta) > SWIPE_DISTANCE) go(delta < 0 ? 1 : -1);
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Gym photos"
      tabIndex={0}
      onKeyDown={onKey}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (touchStart.current = null)}
      className={`group relative touch-pan-y select-none overflow-hidden rounded-xl bg-[var(--color-base-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${className}`}
    >
      {images.map((img, i) => (
        <img
          key={img.src}
          src={img.src}
          alt={img.alt}
          loading={i === 0 ? 'eager' : 'lazy'}
          draggable={false}
          aria-hidden={i !== index}
          className={`absolute inset-0 h-full w-full transition-opacity duration-500 motion-reduce:transition-none ${
            fit === 'cover' ? 'object-cover' : 'object-contain'
          } ${i === index ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}

      {count > 1 && (
        <>
          {[
            { step: -1, label: 'Previous photo', Icon: ChevronLeft, side: 'left-3' },
            { step: 1, label: 'Next photo', Icon: ChevronRight, side: 'right-3' },
          ].map(({ step, label, Icon, side }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => go(step)}
              className={`absolute top-1/2 ${side} flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur transition hover:bg-black/60 active:scale-95`}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {images.map((img, i) => (
              <button
                key={img.src}
                type="button"
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full bg-white transition-all ${i === index ? 'w-5 opacity-100' : 'w-1.5 opacity-50 hover:opacity-80'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
