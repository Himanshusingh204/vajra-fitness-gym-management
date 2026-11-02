import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ImageCarousel, type CarouselImage } from '../../components/ImageCarousel';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useGymSite } from './gymData';
import { GymPageIntro, JoinBand, Section } from './shared';

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
    <div role="dialog" aria-modal aria-label="Gym photos" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4">
      <button type="button" autoFocus aria-label="Close gallery" onClick={onClose} className="absolute right-4 top-4 rounded-full border border-white/30 p-2 text-white hover:bg-white/10">
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

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <GymPageIntro eyebrow="The space" title="Take a look around." description={`Explore the training spaces, equipment and atmosphere at ${gym.name}. Tap any photo to view it full screen.`} />
      <Section title="Inside the gym">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Open photo ${i + 1}`}
              className={`group overflow-hidden rounded-2xl bg-[var(--color-base-dark)] ${i === 0 ? 'col-span-2 row-span-2 aspect-[4/3] md:aspect-auto' : 'aspect-[4/3]'}`}
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
      </Section>
      <JoinBand gym={gym} joinUrl={joinUrl} />
      {open !== null && <Lightbox images={images} start={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
