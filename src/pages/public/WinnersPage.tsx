import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Trophy, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/* ── types ──────────────────────────────────────────────────────── */
interface GalleryEdition {
  number: number;
  year: number;
  title: string;
  slug: string;
  theme: string | null;
  winner: string | null;
  photoCount: number;
  categories?: string[];
  mainCategory?: string;
}

interface GalleryPhoto {
  r2Key: string;
  url: string;
  category: string | null;
  isWinner: boolean;
  place?: number | null;
  title?: string | null;
  photographer: string | null;
  edition: number;
  year: number;
  isJury?: boolean;
}

interface GalleryData {
  editions: GalleryEdition[];
  photos: GalleryPhoto[];
}

/* ── helpers ────────────────────────────────────────────────────── */
function PlaceBadge({ place }: { place: number }) {
  const cfg: Record<number, { label: string; cls: string }> = {
    1: { label: '1st Prize', cls: 'bg-gold-500/90 text-black' },
    2: { label: '2nd Prize', cls: 'bg-slate-300/90 text-black' },
    3: { label: '3rd Prize', cls: 'bg-amber-600/90 text-white' },
  };
  const c = cfg[place] ?? cfg[1];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${c.cls}`}>
      <Trophy className="h-3 w-3" />
      {c.label}
    </span>
  );
}

function WinnerCard({ photo, categoryLabel }: { photo: GalleryPhoto; categoryLabel?: string }) {
  return (
    <div className="group relative rounded-2xl overflow-hidden bg-surface-900 border border-surface-800 hover:border-gold-500/40 transition-all duration-300 aspect-[4/5]">
      <img
        src={photo.url}
        alt={photo.title || categoryLabel || ''}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {photo.place != null && <PlaceBadge place={photo.place} />}
        {categoryLabel && (
          <div className="mt-1.5 text-xs font-semibold text-gold-300 uppercase tracking-wider">
            {categoryLabel}
          </div>
        )}
        {photo.title && (
          <div className="mt-1 text-sm font-medium text-white leading-tight">{photo.title}</div>
        )}
        {photo.photographer && !['Winner', 'Theme Category', 'Press & News Category', 'People Category', 'Life Category', 'Land Category'].includes(photo.photographer) && (
          <div className="mt-1 text-xs text-surface-300">{photo.photographer}</div>
        )}
      </div>
    </div>
  );
}

/* ── component ──────────────────────────────────────────────────── */
export default function WinnersPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/gallery-data.json')
      .then(r => r.json())
      .then((d: GalleryData) => { setData(d); setLoading(false); });
  }, []);

  const editionSections = useMemo(() => {
    if (!data) return [];

    // Sort editions newest first
    const sorted = [...data.editions].sort((a, b) => b.year - a.year);

    return sorted.map(edition => {
      const photos = data.photos.filter(p => p.edition === edition.number && !p.isJury);
      const winnerPhotos = photos.filter(p => p.isWinner);

      // Multi-category editions: show 1st place per category
      if (edition.categories && edition.categories.length > 0) {
        const firstPlace = edition.categories
          .map(cat => winnerPhotos.find(p => p.category === cat && p.place === 1))
          .filter((p): p is GalleryPhoto => !!p);
        return { edition, cards: firstPlace, isMultiCategory: true };
      }

      // Single-category: show all winner photos (at most 3)
      if (winnerPhotos.length > 0) {
        return { edition, cards: winnerPhotos.slice(0, 6), isMultiCategory: false };
      }

      // Text-only fallback for older editions
      return { edition, cards: [], isMultiCategory: false };
    });
  }, [data]);

  return (
    <div>
      {/* Hero */}
      <section className="relative pt-32 pb-16">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-900/30 to-surface-950" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-500/10 text-gold-400 mb-6"
          >
            <Trophy className="h-8 w-8" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-6xl font-display font-bold text-white mb-6"
          >
            {t('home.winners_title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-surface-300"
          >
            {t('home.winners_subtitle')}
          </motion.p>
        </div>
      </section>

      {/* Edition Sections */}
      <section className="py-12 space-y-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            editionSections.map(({ edition, cards, isMultiCategory }, sectionIdx) => (
              <motion.div
                key={edition.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, delay: sectionIdx < 3 ? sectionIdx * 0.1 : 0 }}
              >
                {/* Edition header */}
                <div className="flex items-end justify-between mb-8 pb-4 border-b border-surface-800">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-semibold text-gold-400 uppercase tracking-widest">
                        Edition {edition.number} · {edition.year}
                      </span>
                      {isMultiCategory && (
                        <span className="text-xs text-surface-500">
                          {edition.categories!.length} categories
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
                      {edition.theme ?? edition.title}
                    </h2>
                    {edition.theme && edition.theme !== edition.title && (
                      <p className="text-sm text-surface-400 mt-0.5">{edition.title}</p>
                    )}
                  </div>
                  <Link
                    to={`/gallery/${edition.year}`}
                    className="hidden sm:flex items-center gap-1.5 text-sm text-surface-400 hover:text-gold-400 transition-colors shrink-0 ml-4"
                  >
                    View Gallery <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Winner cards */}
                {cards.length > 0 ? (
                  <div
                    className={`grid gap-4 ${
                      cards.length === 1
                        ? 'grid-cols-1 max-w-xs'
                        : cards.length === 2
                        ? 'grid-cols-2 max-w-lg'
                        : cards.length <= 4
                        ? 'grid-cols-2 sm:grid-cols-4'
                        : cards.length <= 5
                        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
                        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
                    }`}
                  >
                    {cards.map((photo) => (
                      <WinnerCard
                        key={photo.r2Key}
                        photo={photo}
                        categoryLabel={isMultiCategory ? (photo.category ?? undefined) : undefined}
                      />
                    ))}
                  </div>
                ) : edition.winner ? (
                  /* Text-only winner for oldest editions */
                  <div className="flex items-center gap-4 py-6 px-6 rounded-2xl bg-surface-900/50 border border-surface-800">
                    <div className="w-12 h-12 rounded-full bg-gold-500/10 flex items-center justify-center shrink-0">
                      <Trophy className="h-6 w-6 text-gold-400" />
                    </div>
                    <div>
                      <div className="text-xs text-gold-400 font-semibold uppercase tracking-wider mb-1">
                        Winner
                      </div>
                      <div className="text-white font-medium">{edition.winner}</div>
                    </div>
                  </div>
                ) : null}

                {/* Mobile gallery link */}
                <Link
                  to={`/gallery/${edition.year}`}
                  className="sm:hidden inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-gold-400 transition-colors mt-4"
                >
                  View Full Gallery <ChevronRight className="h-4 w-4" />
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
