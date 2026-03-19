import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Trophy,
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
  ArrowLeft,
  Users,
} from 'lucide-react';

/* ── types ────────────────────────────────────────────────────── */
interface JuryMember {
  name: string;
  country: string;
}

interface GalleryEdition {
  number: number;
  year: number;
  title: string;
  slug: string;
  theme: string | null;
  winner: string | null;
  photoCount: number;
  jury?: JuryMember[];
  curators?: JuryMember[];
}

interface GalleryPhoto {
  r2Key: string;
  url: string;
  category: string | null;
  isWinner: boolean;
  photographer: string | null;
  edition: number;
  year: number;
}

interface GalleryData {
  editions: GalleryEdition[];
  photos: GalleryPhoto[];
}

/* ── component ────────────────────────────────────────────────── */
export default function EditionGalleryPage() {
  const { t } = useTranslation();
  const { year } = useParams<{ year: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<GalleryPhoto | null>(null);
  const [visibleCount, setVisibleCount] = useState(48);
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/gallery-data.json')
      .then((r) => r.json())
      .then((d: GalleryData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const yearNum = Number(year);
  const edition = data?.editions.find((e) => e.year === yearNum) ?? null;

  /* Photos for this edition: winners first */
  const photos = useMemo(() => {
    if (!data || !edition) return [];
    return data.photos
      .filter((p) => p.edition === edition.number)
      .sort((a, b) => {
        if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1;
        return 0;
      });
  }, [data, edition]);

  const winners = useMemo(() => photos.filter((p) => p.isWinner), [photos]);
  const visiblePhotos = photos.slice(0, visibleCount);
  const hasMore = visibleCount < photos.length;

  /* Infinite scroll */
  useEffect(() => {
    if (!observerRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCount((c) => c + 48);
      },
      { rootMargin: '400px' },
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, photos.length]);

  /* Lightbox navigation */
  const lightboxIdx = lightbox ? photos.indexOf(lightbox) : -1;
  const goPrev = useCallback(() => {
    if (lightboxIdx > 0) setLightbox(photos[lightboxIdx - 1]);
  }, [lightboxIdx, photos]);
  const goNext = useCallback(() => {
    if (lightboxIdx < photos.length - 1) setLightbox(photos[lightboxIdx + 1]);
  }, [lightboxIdx, photos]);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, goPrev, goNext]);

  useEffect(() => {
    document.body.style.overflow = lightbox ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [lightbox]);

  /* ── render ──────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="bg-surface-950 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-surface-700" />
            <div className="absolute inset-0 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-surface-500">{t('gallery.loading')}</p>
        </div>
      </div>
    );
  }

  if (!edition) {
    return (
      <div className="bg-surface-950 min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-surface-400">{t('gallery.no_photos')}</p>
        <button
          onClick={() => navigate('/gallery')}
          className="text-primary-400 hover:text-primary-300 text-sm"
        >
          &larr; {t('gallery.back_to_gallery')}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface-950 min-h-screen">

      {/* ===== Header ===== */}
      <section className="relative pt-28 pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-900/40 to-surface-950" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Back link */}
          <button
            onClick={() => navigate('/gallery')}
            className="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('gallery.back_to_gallery')}
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div>
              <p className="text-sm text-surface-500 mb-1">{edition.title}</p>
              <h1 className="text-4xl sm:text-5xl font-display font-bold text-white">
                {edition.year}
              </h1>
              {edition.theme && (
                <p className="text-surface-400 mt-2">
                  {t('gallery.theme')}: <span className="text-primary-400">{edition.theme}</span>
                </p>
              )}
            </div>

            <div className="sm:ml-auto flex items-center gap-6 text-sm text-surface-400">
              <span className="inline-flex items-center gap-1.5">
                <Camera className="h-4 w-4" />
                {photos.length} {t('gallery.photos')}
              </span>
              {edition.winner && (
                <span className="inline-flex items-center gap-1.5 text-gold-400">
                  <Trophy className="h-4 w-4" />
                  {edition.winner}
                </span>
              )}
            </div>
          </div>

          {/* Jury & Curators */}
          {(edition.jury || edition.curators) && (
            <div className="mt-8 flex flex-col sm:flex-row gap-6">
              {edition.jury && (
                <div className="flex-1">
                  <h3 className="inline-flex items-center gap-2 text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
                    <Users className="h-3.5 w-3.5" />
                    Jury
                  </h3>
                  <ul className="space-y-1">
                    {edition.jury.map((m) => (
                      <li key={m.name} className="text-sm text-surface-300">
                        <span className="font-medium text-white">{m.name}</span>
                        {m.country && <span className="text-surface-500">, {m.country}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {edition.curators && (
                <div className="flex-1">
                  <h3 className="inline-flex items-center gap-2 text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
                    <Users className="h-3.5 w-3.5" />
                    Curators
                  </h3>
                  <ul className="space-y-1">
                    {edition.curators.map((m) => (
                      <li key={m.name} className="text-sm text-surface-300">
                        <span className="font-medium text-white">{m.name}</span>
                        {m.country && <span className="text-surface-500">, {m.country}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ===== Winners Row ===== */}
      {winners.length > 0 && (
        <section className="pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-sm font-medium text-gold-400 uppercase tracking-wider mb-4">
              <Trophy className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
              {t('gallery.winner')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {winners.map((photo) => (
                <div
                  key={photo.r2Key}
                  className="group relative rounded-xl overflow-hidden cursor-pointer bg-surface-900 ring-1 ring-gold-500/20"
                  onClick={() => setLightbox(photo)}
                >
                  <div className="aspect-[3/2] overflow-hidden">
                    <img
                      src={photo.url}
                      alt={photo.photographer || ''}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  {photo.photographer && (
                    <div className="px-4 py-3">
                      <p className="text-sm font-medium text-white truncate">{photo.photographer}</p>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gold-500/90 backdrop-blur-sm">
                      <Trophy className="h-3 w-3 text-black" />
                      <span className="text-[10px] font-bold text-black uppercase tracking-wider">
                        {t('gallery.winner')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== Photo Grid ===== */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {winners.length > 0 && photos.length > winners.length && (
            <h2 className="text-sm font-medium text-surface-500 uppercase tracking-wider mb-4">
              {t('gallery.all_photos')}
            </h2>
          )}

          {photos.length === 0 ? (
            <div className="text-center py-24">
              <Camera className="h-12 w-12 text-surface-700 mx-auto mb-4" />
              <p className="text-surface-400">{t('gallery.no_photos')}</p>
            </div>
          ) : (
            <>
              <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3">
                {visiblePhotos
                  .filter((p) => !p.isWinner || winners.length === 0)
                  .map((photo) => (
                    <div
                      key={photo.r2Key}
                      className="break-inside-avoid mb-3 group relative rounded-xl overflow-hidden cursor-pointer bg-surface-900"
                      onClick={() => setLightbox(photo)}
                    >
                      <img
                        src={photo.url}
                        alt={photo.photographer || ''}
                        className="w-full block transition-transform duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          {photo.photographer && (
                            <p className="text-sm font-medium text-white truncate">{photo.photographer}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {hasMore && (
                <div ref={observerRef} className="flex justify-center py-12">
                  <div className="flex items-center gap-3 text-surface-500">
                    <div className="w-5 h-5 rounded-full border-2 border-surface-600 border-t-primary-500 animate-spin" />
                    <span className="text-sm">{t('gallery.loading_more')}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ===== Lightbox ===== */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/97 flex items-center justify-center"
            onClick={() => setLightbox(null)}
          >
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center gap-3">
                {lightbox.isWinner && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold-500/90 text-xs font-bold text-black">
                    <Trophy className="h-3 w-3" />
                    {t('gallery.winner')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-white/50 tabular-nums">
                  {lightboxIdx + 1} / {photos.length}
                </span>
                <button
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  onClick={() => setLightbox(null)}
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            {/* Prev */}
            {lightboxIdx > 0 && (
              <button
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
              >
                <ChevronLeft className="h-6 w-6 text-white" />
              </button>
            )}

            {/* Next */}
            {lightboxIdx < photos.length - 1 && (
              <button
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
              >
                <ChevronRight className="h-6 w-6 text-white" />
              </button>
            )}

            {/* Image */}
            <motion.div
              key={lightbox.r2Key}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative max-w-[92vw] max-h-[88vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightbox.url}
                alt={lightbox.photographer || ''}
                className="max-w-full max-h-[88vh] object-contain select-none"
                draggable={false}
              />
            </motion.div>

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 z-10 px-4 sm:px-6 py-4 bg-gradient-to-t from-black/60 to-transparent">
              <div className="max-w-3xl mx-auto text-center">
                {lightbox.photographer && (
                  <p className="text-base font-medium text-white">{lightbox.photographer}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
