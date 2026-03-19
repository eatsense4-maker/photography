import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Camera, Trophy, Image as ImageIcon } from 'lucide-react';

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
  const navigate = useNavigate();
  const [data, setData] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/gallery-data.json')
      .then((r) => r.json())
      .then((d: GalleryData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* Sorted editions (newest first) with cover photo */
  const editionsWithCover = useMemo(() => {
    if (!data) return [];
    return data.editions
      .slice()
      .sort((a, b) => b.year - a.year)
      .map((ed) => {
        const photos = data.photos.filter((p) => p.edition === ed.number);
        const winners = photos.filter((p) => p.isWinner);
        const cover = winners[0] || photos[0];
        return { ...ed, cover, photoCount: photos.length, winnerCount: winners.length };
      });
  }, [data]);

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

  return (
    <div className="bg-surface-950 min-h-screen">

      {/* ===== Hero ===== */}
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-900/40 to-surface-950" />
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
                className="group relative rounded-2xl overflow-hidden cursor-pointer bg-surface-900"
                onClick={() => navigate(`/gallery/${ed.year}`)}
              >
                {/* Cover image */}
                <div className="aspect-[4/3] overflow-hidden relative">
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
                <div className="px-5 py-3 flex items-center justify-between border-t border-surface-800/60">
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
