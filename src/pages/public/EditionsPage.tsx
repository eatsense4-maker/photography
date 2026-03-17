import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Edition } from '@/types';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6 },
  }),
};

export default function EditionsPage() {
  const { t } = useTranslation();
  const [editions, setEditions] = useState<Edition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('editions')
      .select('*')
      .eq('published', true)
      .order('year', { ascending: false })
      .then(({ data }) => {
        setEditions(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-900/30 to-surface-950" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-display font-bold text-white mb-6"
          >
            {t('editions.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-surface-300"
          >
            {t('editions.subtitle')}
          </motion.p>
        </div>
      </section>

      {/* Editions Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : editions.length === 0 ? (
            <p className="text-center text-surface-400 py-20">No editions published yet.</p>
          ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {editions.map((edition, i) => (
              <motion.div
                key={edition.id}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
              >
                <Link
                  to={`/editions/${edition.slug}`}
                  className="group block rounded-2xl overflow-hidden bg-surface-900 border border-surface-800 hover:border-surface-600 transition-all duration-300"
                >
                  <div className="aspect-[16/10] overflow-hidden relative bg-surface-800">
                    {edition.hero_image_url && (
                      <img
                        src={edition.hero_image_url}
                        alt={edition.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-900 via-transparent to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-600/90 text-white">
                        {edition.title}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-surface-400 text-sm mb-2">
                      <Calendar className="h-4 w-4" />
                      {edition.year}
                    </div>
                    <h3 className="text-xl font-display font-bold text-white mb-3 group-hover:text-primary-400 transition-colors">
                      {edition.theme || edition.title}
                    </h3>
                    <div className="flex items-center text-primary-400 text-sm font-medium">
                      {t('editions.view_edition')} <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
          )}
        </div>
      </section>
    </div>
  );
}
