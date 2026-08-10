'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ImgHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';

export interface LightboxImageItem {
  src: string;
  alt?: string;
  title?: string;
}

interface ImageLightboxContextValue {
  open: (images: LightboxImageItem[] | LightboxImageItem, index?: number) => void;
  close: () => void;
  isOpen: boolean;
}

const ImageLightboxContext = createContext<ImageLightboxContextValue | null>(null);

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function looksLikeImage(input: {
  url?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
}): boolean {
  if (input.mimeType?.toLowerCase().startsWith('image/')) return true;
  const name = (input.fileName || input.url || '').toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|#|$)/i.test(name);
}

function ImageLightboxModal({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: LightboxImageItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const current = images[index];
  const hasMultiple = images.length > 1;

  useEffect(() => {
    setZoom(1);
  }, [index, current?.src]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft' && hasMultiple) {
        event.preventDefault();
        onIndexChange((index - 1 + images.length) % images.length);
      }
      if (event.key === 'ArrowRight' && hasMultiple) {
        event.preventDefault();
        onIndexChange((index + 1) % images.length);
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setZoom((z) => clampZoom(z + ZOOM_STEP));
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        setZoom((z) => clampZoom(z - ZOOM_STEP));
      }
      if (event.key === '0') {
        event.preventDefault();
        setZoom(1);
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [hasMultiple, images.length, index, onClose, onIndexChange]);

  if (!current || typeof document === 'undefined') return null;

  const title = current.title || current.alt || 'Image preview';

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/80 px-3 py-2.5 sm:px-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{title}</p>
          {hasMultiple && (
            <p className="text-xs text-white/60">
              {index + 1} of {images.length}
            </p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
            className="rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Zoom out"
            title="Zoom out"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="min-w-[3.5rem] rounded-md px-2 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Reset zoom"
            title="Reset zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
            className="rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Zoom in"
            title="Zoom in"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Reset view"
            title="Reset view"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
        {hasMultiple && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onIndexChange((index - 1 + images.length) % images.length);
            }}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 sm:left-4"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.src}
          alt={current.alt || title}
          className="max-h-full max-w-full origin-center object-contain transition-transform duration-150"
          style={{ transform: `scale(${zoom})` }}
          onClick={(event) => event.stopPropagation()}
          draggable={false}
        />

        {hasMultiple && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onIndexChange((index + 1) % images.length);
            }}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 sm:right-4"
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}

export function ImageLightboxProvider({ children }: { children: ReactNode }) {
  const [images, setImages] = useState<LightboxImageItem[]>([]);
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => {
    setIsOpen(false);
    setImages([]);
    setIndex(0);
  }, []);

  const open = useCallback(
    (input: LightboxImageItem[] | LightboxImageItem, startIndex = 0) => {
      const list = Array.isArray(input) ? input.filter((item) => item?.src) : [input];
      if (list.length === 0) return;
      const safeIndex = Math.min(Math.max(0, startIndex), list.length - 1);
      setImages(list);
      setIndex(safeIndex);
      setIsOpen(true);
    },
    []
  );

  const value = useMemo(
    () => ({ open, close, isOpen }),
    [open, close, isOpen]
  );

  return (
    <ImageLightboxContext.Provider value={value}>
      {children}
      {isOpen && images.length > 0 && (
        <ImageLightboxModal
          images={images}
          index={index}
          onClose={close}
          onIndexChange={setIndex}
        />
      )}
    </ImageLightboxContext.Provider>
  );
}

export function useImageLightbox(): ImageLightboxContextValue {
  const ctx = useContext(ImageLightboxContext);
  if (!ctx) {
    throw new Error('useImageLightbox must be used within ImageLightboxProvider');
  }
  return ctx;
}

/** Safe hook when provider may be absent (returns no-op open). */
export function useImageLightboxOptional(): ImageLightboxContextValue {
  const ctx = useContext(ImageLightboxContext);
  return (
    ctx || {
      open: () => undefined,
      close: () => undefined,
      isOpen: false,
    }
  );
}

interface LightboxImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  title?: string;
  /** Optional gallery; when set, opens at this image's index in the list. */
  gallery?: LightboxImageItem[];
  galleryIndex?: number;
  wrapperClassName?: string;
}

/** Clickable image that opens the shared lightbox. */
export function LightboxImage({
  src,
  alt,
  title,
  gallery,
  galleryIndex,
  wrapperClassName,
  className,
  onClick,
  ...imgProps
}: LightboxImageProps) {
  const { open } = useImageLightboxOptional();

  return (
    <button
      type="button"
      className={
        wrapperClassName ||
        'block overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900'
      }
      onClick={(event) => {
        onClick?.(event as unknown as MouseEvent<HTMLImageElement>);
        if (gallery?.length) {
          open(gallery, galleryIndex ?? 0);
        } else {
          open({ src, alt, title: title || alt });
        }
      }}
      aria-label={alt ? `View ${alt}` : 'View image'}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt || ''} className={className} {...imgProps} />
    </button>
  );
}
