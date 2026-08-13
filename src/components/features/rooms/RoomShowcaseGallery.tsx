'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  Grid3X3,
  ImagePlus,
  LayoutGrid,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { getImageUrl } from '@/lib/format/image-url';
import { useNotifications } from '@/hooks/useNotifications';
import { TakePhotoButton } from '@/components/features/TakePhotoButton';
import { cn } from '@/lib/utils';

export interface ShowcaseImage {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  caption?: string | null;
  isPrimary: boolean;
  createdAt?: string | Date;
}

/** Default Airbnb-style area labels for unit photo tours. */
export const ROOM_AREA_OPTIONS = [
  'Living room',
  'Full kitchen',
  'Dining area',
  'Bedroom',
  'Full bathroom',
  'Additional photos',
] as const;

export type RoomAreaLabel = (typeof ROOM_AREA_OPTIONS)[number];

const ADDITIONAL = 'Additional photos';

interface RoomShowcaseGalleryProps {
  roomId: string;
  unitLabel: string;
  /** Optional amenity chips shown under the selected area in the photo tour. */
  amenities?: string[];
  className?: string;
  onImagesChanged?: () => void;
}

function normalizeArea(caption?: string | null): string {
  const trimmed = (caption || '').trim();
  if (!trimmed) return ADDITIONAL;
  const match = ROOM_AREA_OPTIONS.find(
    (area) => area.toLowerCase() === trimmed.toLowerCase()
  );
  return match || trimmed;
}

function formatAmenityLine(amenities: string[]): string {
  return amenities
    .map((a) => a.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
    .filter(Boolean)
    .join(' · ');
}

async function uploadRoomPhoto(
  roomId: string,
  file: File,
  area: string
): Promise<ShowcaseImage> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('entityType', 'room');
  formData.append('entityId', roomId);
  formData.append('imageType', 'photo');
  if (area) formData.append('caption', area);

  const response = await fetch('/api/images', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Failed to upload photo');
  }
  return json.data as ShowcaseImage;
}

export default function RoomShowcaseGallery({
  roomId,
  unitLabel,
  amenities = [],
  className,
  onImagesChanged,
}: RoomShowcaseGalleryProps) {
  const { showSuccess, showError } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ShowcaseImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadArea, setUploadArea] = useState<string>(ROOM_AREA_OPTIONS[0]);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourArea, setTourArea] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/images?entityType=room&entityId=${encodeURIComponent(roomId)}`,
        { credentials: 'include' }
      );
      const json = await response.json();
      setImages(json.success ? (json.data as ShowcaseImage[]) : []);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    void fetchImages();
  }, [fetchImages]);

  const ordered = useMemo(() => {
    return [...images].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [images]);

  const areasWithPhotos = useMemo(() => {
    const map = new Map<string, ShowcaseImage[]>();
    for (const area of ROOM_AREA_OPTIONS) {
      map.set(area, []);
    }
    for (const img of ordered) {
      const area = normalizeArea(img.caption);
      if (!map.has(area)) map.set(area, []);
      map.get(area)!.push(img);
    }
    const known = ROOM_AREA_OPTIONS.map((area) => ({
      area,
      photos: map.get(area) || [],
    }));
    const custom = [...map.entries()]
      .filter(([area]) => !ROOM_AREA_OPTIONS.includes(area as RoomAreaLabel))
      .map(([area, photos]) => ({ area, photos }));
    return [...known, ...custom];
  }, [ordered]);

  const amenityLine = formatAmenityLine(amenities);

  const handleFiles = async (
    files: FileList | File[],
    areaOverride?: string
  ) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) {
      showError('Please choose an image file');
      return;
    }

    const area = areaOverride || uploadArea;
    setUploading(true);
    try {
      for (const file of list) {
        await uploadRoomPhoto(roomId, file, area);
      }
      showSuccess(
        list.length === 1 ? 'Photo uploaded' : `${list.length} photos uploaded`
      );
      await fetchImages();
      onImagesChanged?.();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openTour = (area?: string) => {
    const targetArea =
      area ||
      areasWithPhotos.find((a) => a.photos.length > 0)?.area ||
      ROOM_AREA_OPTIONS[0];
    setTourArea(targetArea);
    setTourOpen(true);
    setViewerIndex(null);
  };

  const collageSlots = ordered.slice(0, 5);
  const hero = collageSlots[0];
  const side = collageSlots.slice(1, 5);

  return (
    <section className={cn('space-y-4', className)} id="photos">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{unitLabel}</h3>
          <p className="mt-1 text-sm text-gray-500">
            Showcase this unit with photos by area — living room, kitchen, and more.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={uploadArea}
            onChange={(e) => setUploadArea(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
            aria-label="Photo area"
            disabled={uploading}
          >
            {ROOM_AREA_OPTIONS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void handleFiles(e.target.files);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:border-gray-900 hover:bg-gray-900 hover:text-white disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload
          </button>
          <TakePhotoButton
            disabled={uploading}
            label="Take photo"
            size="sm"
            variant="outline"
            fileNamePrefix="unit"
            title="Take unit photo"
            description="Capture a photo of this area, then it will be added to the gallery."
            onCapture={(file) => void handleFiles([file])}
            className="!border-gray-300 !text-gray-900 hover:!border-gray-900 hover:!bg-gray-900 hover:!text-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
          Loading photos…
        </div>
      ) : ordered.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-56 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 text-center transition-colors hover:border-gray-900 hover:bg-white"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
            <ImagePlus className="h-6 w-6 text-gray-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Add showcase photos</p>
            <p className="mt-1 text-xs text-gray-500">
              Upload or take a photo · assign to an area above
            </p>
          </div>
        </button>
      ) : (
        <div className="relative overflow-hidden rounded-2xl">
          <div className="grid h-[280px] grid-cols-4 grid-rows-2 gap-1 sm:h-[320px] md:h-[380px]">
            <button
              type="button"
              onClick={() => openTour(normalizeArea(hero?.caption))}
              className="relative col-span-2 row-span-2 overflow-hidden bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getImageUrl(hero.filePath)}
                alt={`${unitLabel} main`}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
              />
            </button>
            {Array.from({ length: 4 }).map((_, index) => {
              const img = side[index];
              return (
                <button
                  key={img?.id || `empty-${index}`}
                  type="button"
                  disabled={!img}
                  onClick={() => img && openTour(normalizeArea(img.caption))}
                  className={cn(
                    'relative overflow-hidden bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900',
                    !img && 'cursor-default'
                  )}
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getImageUrl(img.filePath)}
                      alt={`${unitLabel} photo ${index + 2}`}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-gray-400">
                      —
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => openTour()}
            className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-lg border border-gray-900 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-md hover:bg-gray-900 hover:text-white"
          >
            <Grid3X3 className="h-4 w-4" />
            Show all photos
          </button>
        </div>
      )}

      {!loading && ordered.length > 0 && (
        <div className="space-y-10 pt-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <LayoutGrid className="h-4 w-4" />
            Areas of this unit
          </div>
          {areasWithPhotos
            .filter((entry) => entry.photos.length > 0 || entry.area !== ADDITIONAL)
            .map((entry) => (
              <div
                key={entry.area}
                className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,220px)_1fr] md:gap-8"
              >
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{entry.area}</h4>
                  {amenityLine && entry.photos.length > 0 && (
                    <p className="mt-2 text-sm text-gray-500">{amenityLine}</p>
                  )}
                  {entry.photos.length === 0 && (
                    <p className="mt-2 text-sm text-gray-400">No photos yet</p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setUploadArea(entry.area);
                      fileInputRef.current?.click();
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 underline-offset-2 hover:underline"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Add photos
                  </button>
                </div>
                <div
                  className={cn(
                    'grid gap-2',
                    entry.photos.length <= 1
                      ? 'grid-cols-1'
                      : entry.photos.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-2 sm:grid-cols-3'
                  )}
                >
                  {entry.photos.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadArea(entry.area);
                        fileInputRef.current?.click();
                      }}
                      className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-gray-400 hover:border-gray-900 hover:text-gray-900"
                    >
                      Add photo
                    </button>
                  ) : (
                    entry.photos.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => openTour(entry.area)}
                        className="aspect-[4/3] overflow-hidden rounded-xl bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getImageUrl(img.filePath)}
                          alt={entry.area}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {mounted &&
        tourOpen &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex flex-col bg-white">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
              <h3 className="text-lg font-bold text-gray-900">Photo tour</h3>
              <button
                type="button"
                onClick={() => {
                  setTourOpen(false);
                  setViewerIndex(null);
                }}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close photo tour"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
                <div className="flex gap-3 overflow-x-auto pb-4">
                  {areasWithPhotos.map((entry) => {
                    const thumb = entry.photos[0];
                    const selected = tourArea === entry.area;
                    return (
                      <button
                        key={entry.area}
                        type="button"
                        onClick={() => setTourArea(entry.area)}
                        className="w-[120px] flex-shrink-0 text-left"
                      >
                        <div
                          className={cn(
                            'aspect-[4/3] overflow-hidden rounded-lg border-2 bg-gray-50',
                            selected ? 'border-gray-900' : 'border-transparent'
                          )}
                        >
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getImageUrl(thumb.filePath)}
                              alt={entry.area}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center border border-dashed border-gray-300 text-[10px] text-gray-400">
                              Empty
                            </div>
                          )}
                        </div>
                        <p
                          className={cn(
                            'mt-1.5 truncate text-xs',
                            selected ? 'font-bold text-gray-900' : 'text-gray-600'
                          )}
                        >
                          {entry.area}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const current =
                    areasWithPhotos.find((a) => a.area === tourArea) ||
                    areasWithPhotos[0];
                  if (!current) return null;
                  return (
                    <div className="grid grid-cols-1 gap-6 pt-2 lg:grid-cols-[220px_1fr]">
                      <div>
                        <h4 className="text-2xl font-bold text-gray-900">
                          {current.area}
                        </h4>
                        {amenityLine && (
                          <p className="mt-2 text-sm text-gray-500">{amenityLine}</p>
                        )}
                        <p className="mt-3 text-xs text-gray-400">
                          {current.photos.length} photo
                          {current.photos.length === 1 ? '' : 's'}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setUploadArea(current.area);
                              fileInputRef.current?.click();
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-900 hover:text-white"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            Upload
                          </button>
                          <TakePhotoButton
                            size="sm"
                            label="Take photo"
                            onCapture={(file) => {
                              setUploadArea(current.area);
                              void handleFiles([file], current.area);
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {current.photos.length === 0 ? (
                          <div className="col-span-full flex aspect-video items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-400">
                            No photos in this area yet
                          </div>
                        ) : (
                          current.photos.map((img, index) => (
                            <button
                              key={img.id}
                              type="button"
                              onClick={() => {
                                const globalIdx = ordered.findIndex((o) => o.id === img.id);
                                setViewerIndex(globalIdx >= 0 ? globalIdx : index);
                              }}
                              className={cn(
                                'overflow-hidden rounded-xl bg-gray-100',
                                index === 0 && current.photos.length > 1
                                  ? 'sm:col-span-2 aspect-[16/9]'
                                  : 'aspect-[4/3]'
                              )}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getImageUrl(img.filePath)}
                                alt={current.area}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>,
          document.body
        )}

      {mounted &&
        viewerIndex != null &&
        ordered[viewerIndex] &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setViewerIndex(null)}
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              onClick={() => setViewerIndex(null)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getImageUrl(ordered[viewerIndex].filePath)}
              alt={normalizeArea(ordered[viewerIndex].caption)}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {ordered.length > 1 && (
              <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
                <button
                  type="button"
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewerIndex(
                      (viewerIndex - 1 + ordered.length) % ordered.length
                    );
                  }}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewerIndex((viewerIndex + 1) % ordered.length);
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </section>
  );
}
