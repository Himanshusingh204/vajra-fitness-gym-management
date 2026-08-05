import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** transition delay in ms — use for staggered entrances */
  delay?: number;
  variant?: 'up' | 'left' | 'right' | 'scale' | 'fade';
  /** fraction of element that must be visible before animating */
  threshold?: number;
  as?: 'div' | 'section' | 'article' | 'li' | 'span' | 'header' | 'figure';
};

const HIDDEN_STYLES: Record<NonNullable<RevealProps['variant']>, string> = {
  up: 'opacity-0 translate-y-8',
  left: 'opacity-0 -translate-x-8',
  right: 'opacity-0 translate-x-8',
  scale: 'opacity-0 scale-95',
  fade: 'opacity-0',
};

const VISIBLE_STYLES = 'opacity-100 translate-x-0 translate-y-0 scale-100';

export function Reveal({
  children,
  className = '',
  delay = 0,
  variant = 'up',
  threshold = 0.15,
  as: Tag = 'div',
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold, rootMargin: '0px 0px -48px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const style: CSSProperties = delay ? { transitionDelay: `${delay}ms` } : {};

  return (
    <Tag
      ref={ref as never}
      style={style}
      className={`transition-all duration-700 ease-out will-change-transform ${visible ? VISIBLE_STYLES : HIDDEN_STYLES[variant]} ${className}`}
    >
      {children}
    </Tag>
  );
}
