import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Trophy, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getPhotoUrl } from '@/lib/r2';

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
    <div className="public-invert group relative aspect-[4/5] overflow-hidden rounded-2xl border border-surface-800 bg-surface-900 transition-all duration-300 hover:border-gold-500/40">
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
  usePageTitle('Winners');
  const [data, setData] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/gallery-data.json').then(r => r.json()).catch(() => ({ editions: [], photos: [] })),
      fetchDbWinners(),
    ]).then(([jsonData, db]) => {
      const jsonYears = new Set((jsonData as GalleryData).editions.map((e: GalleryEdition) => e.year));
      const mergedEditions = [
        ...(jsonData as GalleryData).editions,
        ...db.editions.filter(e => !jsonYears.has(e.year)),
      ];
      const mergedPhotos = [
        ...(jsonData as GalleryData).photos,
        ...db.photos,
      ];
      setData({ editions: mergedEditions, photos: mergedPhotos });
      setLoading(false);
    });
  }, []);

  async function fetchDbWinners() {
    const { data: editions } = await supabase
      .from('editions')
      .select('id, title, slug, year, theme, published, results_published')
      .eq('results_published', true)
      .order('year', { ascending: false });

    if (!editions || editions.length === 0) return { editions: [] as GalleryEdition[], photos: [] as GalleryPhoto[] };

    const editionIds = editions.map(e => e.id);

    // Get all categories for published editions
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name, edition_id')
      .in('edition_id', editionIds);

    // Get approved photos with photographer info
    const { data: subs } = await supabase
      .from('submissions')
      .select(`
        id, edition_id, category_id,
        categories!submissions_category_id_fkey(name),
        profiles!submissions_user_id_fkey(full_name),
        submission_photos!inner(id, storage_key, status)
      `)
      .in('edition_id', editionIds)
      .eq('submission_photos.status', 'approved');

    // Get all scores
    const { data: allScores } = await supabase
      .from('scores')
      .select('score, photo_id')
      .not('photo_id', 'is', null)
      .not('score', 'is', null);

    const photoAvg = new Map<string, number[]>();
    for (const s of (allScores || []) as any[]) {
      if (!photoAvg.has(s.photo_id)) photoAvg.set(s.photo_id, []);
      photoAvg.get(s.photo_id)!.push(Number(s.score));
    }

    // Build photo info indexed by edition + category
    type PhotoInfo = { photoId: string; storageKey: string; category: string; photographer: string; avg: number; editionId: string };
    const allPhotos: PhotoInfo[] = [];
    for (const sub of (subs || []) as any[]) {
      for (const photo of sub.submission_photos || []) {
        const scores = photoAvg.get(photo.id);
        const avg = scores ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
        allPhotos.push({
          photoId: photo.id,
          storageKey: photo.storage_key,
          category: sub.categories?.name || '',
          photographer: sub.profiles?.full_name || '',
          avg,
          editionId: sub.edition_id,
        });
      }
    }

    const resultEditions: GalleryEdition[] = [];
    const resultPhotos: GalleryPhoto[] = [];

    for (const ed of editions) {
      const edCats = (cats || []).filter(c => c.edition_id === ed.id);
      const edPhotos = allPhotos.filter(p => p.editionId === ed.id);

      resultEditions.push({
        number: ed.year,
        year: ed.year,
        title: ed.title,
        slug: ed.slug,
        theme: ed.theme,
        winner: null,
        photoCount: edPhotos.length,
        categories: edCats.map(c => c.name),
      });

      // Per-category top 3 winners
      for (const cat of edCats) {
        const catPhotos = edPhotos.filter(p => p.category === cat.name);
        catPhotos.sort((a, b) => b.avg - a.avg);
        const top3 = catPhotos.slice(0, 3);
        for (let i = 0; i < top3.length; i++) {
          resultPhotos.push({
            r2Key: top3[i].storageKey,
            url: getPhotoUrl(top3[i].storageKey),
            category: cat.name,
            isWinner: true,
            place: i + 1,
            title: null,
            photographer: top3[i].photographer,
            edition: ed.year,
            year: ed.year,
          });
        }
      }
    }

    return { editions: resultEditions, photos: resultPhotos };
  }

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
    }).filter(({ edition, cards }) => cards.length > 0 || !!edition.winner);
  }, [data]);

  return (
    <div>
      {/* Hero */}
      <section className="relative pt-12 pb-16">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/85 to-transparent" />
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
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-xl border border-surface-700/40 bg-white/80 shadow-sm" />
              ))}
            </div>
          ) : editionSections.length === 0 ? (
            <div className="rounded-2xl border border-surface-700 bg-white/85 px-6 py-16 text-center shadow-sm">
              <p className="text-sm text-surface-400">No published winners yet.</p>
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
                <div className="mb-8 flex items-end justify-between border-b border-surface-700 pb-4">
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
                  <div className="flex items-center gap-4 rounded-2xl border border-surface-700 bg-white/85 px-6 py-6 shadow-sm">
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
