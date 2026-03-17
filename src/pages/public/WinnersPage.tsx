import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getPhotoUrl } from '@/lib/r2';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.6 },
  }),
};

interface WinnerEntry {
  id: string;
  title: string | null;
  photographer: string;
  country: string | null;
  category: string;
  edition: string;
  storage_key: string | null;
}

export default function WinnersPage() {
  const { t } = useTranslation();
  const [winners, setWinners] = useState<WinnerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch submissions that have been accepted with rank 1 (winners)
    supabase
      .from('scores')
      .select(`
        id,
        rank,
        submission:submissions(
          id,
          title,
          user_id,
          profile:profiles(full_name, country),
          category:categories(name),
          edition:editions(title),
          photos:submission_photos(storage_key)
        )
      `)
      .eq('rank', 1)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          const mapped: WinnerEntry[] = data
            .filter((s: Record<string, unknown>) => s.submission)
            .map((s: Record<string, unknown>) => {
              const sub = s.submission as Record<string, unknown>;
              const profile = sub.profile as Record<string, unknown> | null;
              const category = sub.category as Record<string, unknown> | null;
              const edition = sub.edition as Record<string, unknown> | null;
              const photos = sub.photos as Array<Record<string, unknown>> | null;
              return {
                id: sub.id as string,
                title: sub.title as string | null,
                photographer: (profile?.full_name as string) || 'Unknown',
                country: (profile?.country as string) || null,
                category: (category?.name as string) || '',
                edition: (edition?.title as string) || '',
                storage_key: photos?.[0]?.storage_key as string | null,
              };
            });
          setWinners(mapped);
        }
        setLoading(false);
      });
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative pt-32 pb-20">
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

      {/* Winners Gallery */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : winners.length === 0 ? (
            <p className="text-center text-surface-400 py-20">No winners announced yet.</p>
          ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {winners.map((winner, i) => (
              <motion.div
                key={winner.id}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="break-inside-avoid group cursor-pointer"
              >
                <div className="relative rounded-2xl overflow-hidden bg-surface-900 border border-surface-800 hover:border-gold-500/30 transition-all duration-300">
                  <div className="overflow-hidden">
                    {winner.storage_key ? (
                      <img
                        src={getPhotoUrl(winner.storage_key)}
                        alt={winner.title || ''}
                        className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        style={{
                          height: i % 3 === 0 ? '450px' : i % 3 === 1 ? '350px' : '400px',
                        }}
                      />
                    ) : (
                      <div
                        className="w-full bg-surface-800 flex items-center justify-center"
                        style={{ height: i % 3 === 0 ? '450px' : i % 3 === 1 ? '350px' : '400px' }}
                      >
                        <Trophy className="h-12 w-12 text-surface-600" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gold-500/20 text-gold-400 border border-gold-500/30">
                        🏆 {winner.category}
                      </span>
                      <span className="text-xs text-surface-400">{winner.edition}</span>
                    </div>
                    <h3 className="text-lg font-display font-bold text-white">
                      {winner.title || 'Untitled'}
                    </h3>
                    <p className="text-sm text-surface-300 mt-1">
                      {winner.photographer}{winner.country ? ` · ${winner.country}` : ''}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          )}
        </div>
      </section>
    </div>
  );
}
