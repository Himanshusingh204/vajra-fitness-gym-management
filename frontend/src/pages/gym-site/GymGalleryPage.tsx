import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ImageCarousel, type CarouselImage } from '../../components/ImageCarousel';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useGymSite } from './gymData';
import { GymPageIntro, JoinBand } from './shared';

function Lightbox({ images, start, onClose }: { images: CarouselImage[]; start: number; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal aria-label="Gym photos" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
      <button type="button" autoFocus aria-label="Close gallery" onClick={onClose} className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 text-white hover:bg-white/10">
        <X className="h-5 w-5" />
      </button>
      <ImageCarousel images={images} startIndex={start} fit="contain" className="h-[75vh] w-full max-w-5xl bg-transparent!" />
    </div>
  );
}

export default function GymGalleryPage() {
  const { gym, images, joinUrl } = useGymSite();
  usePageMeta(`Photos of ${gym.name}`, `See the training floor and facilities at ${gym.name} in ${gym.city}.`, `/gyms/${gym.id}/gallery`);
  const [open, setOpen] = useState<number | null>(null);
  // The last photo stretches to close the gap in the final row (two columns on phones, three from md)
  const rest = images.length - 1;
  const lastSpan = `${rest % 2 ? 'col-span-2 aspect-[8/3]' : ''} ${['md:col-span-1 md:aspect-[4/3]', 'md:col-span-3 md:aspect-[4/1]', 'md:col-span-2 md:aspect-[8/3]'][(rest - 2 + 3) % 3]}`;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <GymPageIntro eyebrow="Photos" title="Inside the gym" description={`The training floor and facilities at ${gym.name}. Tap a photo to see it full screen.`} photo={2} />
      {images.some((image) => image.alt === 'Illustrative gym photo') && <p className="mt-5 text-sm text-[var(--color-muted)]">Illustrative photos are included where the gym has not provided enough images.</p>}
      <div className="mt-8 md:mt-12">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Open photo ${i + 1}`}
              className={`group overflow-hidden rounded-2xl bg-[var(--color-base-dark)] ${i === 0 ? 'col-span-2 row-span-2 aspect-[4/3] md:aspect-auto' : `aspect-[4/3] ${i === images.length - 1 ? lastSpan : ''}`}`}
            >
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
              />
            </button>
          ))}
        </div>
      </div>
      <JoinBand gym={gym} joinUrl={joinUrl} />
      {open !== null && <Lightbox images={images} start={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
