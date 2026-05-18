import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate } from 'react-router-dom';
import { Camera, Trophy, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getPhotoUrl } from '@/lib/r2';

/* ── types ────────────────────────────────────────────────────── */
interface GalleryEdition {
  number: number;
  year: number;
  title: string;
  slug: string;
  theme: string | null;
  winner: string | null;
  photoCount: number;
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
export default function GalleryPage() {
  const { t } = useTranslation();
  usePageTitle('Gallery');
  const navigate = useNavigate();
  const [data, setData] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/gallery-data.json').then((r) => r.json()).catch(() => ({ editions: [], photos: [] })),
      fetchDbEditions(),
    ]).then(([jsonData, { editions: dbEditions, photos: dbPhotos }]) => {
      // Merge: DB editions that aren't already in JSON by year
      const jsonYears = new Set((jsonData as GalleryData).editions.map((e: GalleryEdition) => e.year));
      const mergedEditions = [
        ...(jsonData as GalleryData).editions,
        ...dbEditions.filter((e) => !jsonYears.has(e.year)),
      ];
      const mergedPhotos = [
        ...(jsonData as GalleryData).photos,
        ...dbPhotos,
      ];
      setData({ editions: mergedEditions, photos: mergedPhotos });
      setLoading(false);
    });
  }, []);

  async function fetchDbEditions(): Promise<{ editions: GalleryEdition[]; photos: GalleryPhoto[] }> {
    const { data: editions } = await supabase
      .from('editions')
      .select('id, title, slug, year, theme, published, results_published')
      .eq('published', true)
      .eq('results_published', true)
      .order('year', { ascending: false });

    if (!editions || editions.length === 0) return { editions: [], photos: [] };

    const editionIds = editions.map((e) => e.id);

    const { data: subs } = await supabase
      .from('submissions')
      .select(`
        id, edition_id, category_id, user_id,
        categories!submissions_category_id_fkey(name),
        submission_photos!inner(id, storage_key, status)
      `)
      .in('edition_id', editionIds);

    const userIds = [...new Set(((subs || []) as Array<{ user_id: string }>).map((s) => s.user_id).filter(Boolean))];
    const { data: profiles } = userIds.length
      ? await supabase.from('public_profiles').select('id, full_name').in('id', userIds)
      : { data: [] };
    const profileNames = new Map((profiles || []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]));

    // Fetch all scores for these editions to determine winners
    const { data: allScores } = await supabase
      .from('scores')
      .select('score, photo_id')
      .not('photo_id', 'is', null)
      .not('score', 'is', null);

    // Build photo avg scores
    const photoAvg = new Map<string, number[]>();
    for (const s of (allScores || []) as any[]) {
      if (!photoAvg.has(s.photo_id)) photoAvg.set(s.photo_id, []);
      photoAvg.get(s.photo_id)!.push(Number(s.score));
    }

    // Group photos by edition
    const editionPhotos = new Map<string, { photoId: string; storageKey: string; category: string | null; photographer: string | null; avg: number }[]>();
    for (const sub of (subs || []) as any[]) {
      const eid = sub.edition_id;
      if (!editionPhotos.has(eid)) editionPhotos.set(eid, []);
      for (const photo of sub.submission_photos || []) {
        const scores = photoAvg.get(photo.id);
        const avg = scores ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
        editionPhotos.get(eid)!.push({
          photoId: photo.id,
          storageKey: photo.storage_key,
          category: sub.categories?.name || null,
          photographer: profileNames.get(sub.user_id) || null,
          avg,
        });
      }
    }

    const resultEditions: GalleryEdition[] = [];
    const resultPhotos: GalleryPhoto[] = [];

    for (const ed of editions) {
      const photos = editionPhotos.get(ed.id) || [];
      // Sort by avg score desc — top scorer is the "winner"
      const sorted = [...photos].sort((a, b) => b.avg - a.avg);
      const topWinner = sorted[0];

      resultEditions.push({
        number: ed.year,
        year: ed.year,
        title: ed.title,
        slug: ed.slug,
        theme: ed.theme,
        winner: topWinner?.photographer || null,
        photoCount: photos.length,
      });

      // Add a cover photo to the photos array for the gallery grid
      if (topWinner) {
        resultPhotos.push({
          r2Key: topWinner.storageKey,
          url: getPhotoUrl(topWinner.storageKey),
          category: topWinner.category,
          isWinner: true,
          photographer: topWinner.photographer,
          edition: ed.year,
          year: ed.year,
        });
      }
    }

    return { editions: resultEditions, photos: resultPhotos };
  }

  /* Sorted editions (newest first) with cover photo */
  const editionsWithCover = useMemo(() => {
    if (!data) return [];
    return data.editions
      .slice()
      .sort((a, b) => b.year - a.year)
      .map((ed) => {
        const photos = data.photos.filter((p) => p.edition === ed.number);
        const winners = photos.filter((p) => p.isWinner);
        const cover = winners[0] || photos[0] || null;
        return { ...ed, cover, photoCount: ed.photoCount || photos.length, winnerCount: winners.length };
      });
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  return (
    <div className="min-h-screen">

      {/* ===== Hero ===== */}
      <section className="relative pt-8 pb-16 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-transparent" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold-500/6 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight mb-4"
          >
            <span className="text-gradient">{t('gallery.title')}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-lg text-surface-400 max-w-xl mx-auto"
          >
            {t('gallery.subtitle')}
          </motion.p>
        </div>
      </section>

      {/* ===== Editions Grid ===== */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {editionsWithCover.map((ed, i) => (
              <motion.div
                key={ed.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.04, duration: 0.45 }}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-surface-700 bg-white shadow-sm"
                onClick={() => navigate(`/gallery/${ed.year}`)}
              >
                {/* Cover image */}
                <div className="public-invert relative aspect-[4/3] overflow-hidden">
                  {ed.cover ? (
                    <img
                      src={ed.cover.url}
                      alt={ed.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-800">
                      <ImageIcon className="h-12 w-12 text-surface-600" />
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Winner badge */}
                  {ed.winner && (
                    <div className="absolute top-3 right-3">
                      <div className="w-8 h-8 rounded-full bg-gold-500/90 flex items-center justify-center">
                        <Trophy className="h-3.5 w-3.5 text-black" />
                      </div>
                    </div>
                  )}

                  {/* Bottom info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-sm text-surface-300 mb-1">{ed.title}</p>
                    <h3 className="text-2xl font-display font-bold text-white">
                      {ed.year}
                    </h3>
                    {ed.winner && (
                      <p className="text-sm text-gold-400 mt-1.5 truncate">
                        <Trophy className="inline h-3 w-3 mr-1 -mt-0.5" />
                        {ed.winner}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-surface-700/70 bg-white/90 px-5 py-3">
                  <span className="inline-flex items-center gap-1.5 text-sm text-surface-400">
                    <Camera className="h-3.5 w-3.5" />
                    {ed.photoCount} {t('gallery.photos')}
                  </span>
                  <span className="text-xs text-surface-500 group-hover:text-primary-400 transition-colors">
                    {t('gallery.view_edition')} &rarr;
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
