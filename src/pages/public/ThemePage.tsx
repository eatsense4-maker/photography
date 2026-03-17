import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check, X as XIcon, Calendar, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Edition } from '@/types';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6 },
  }),
};

export default function ThemePage() {
  const { t } = useTranslation();
  const [edition, setEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('editions')
      .select('*')
      .eq('published', true)
      .order('year', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setEdition(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-15"
            style={{
              backgroundImage:
                'url(https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=1920&h=800&fit=crop)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-950/95 to-surface-950" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-primary-400 text-sm font-semibold uppercase tracking-widest"
          >
            {edition?.title || 'Current Edition'} — {edition?.year || ''} Edition
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-6xl font-display font-bold text-white mt-4 mb-6"
          >
            {t('theme.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-2xl text-gold-400 font-display italic"
          >
            {edition?.theme ? `"${edition.theme}"` : ''}
          </motion.p>
        </div>
      </section>

      {/* Theme Description */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-6"
          >
            {edition?.theme_description ? (
              edition.theme_description.split('\n\n').map((paragraph, i) => (
                <motion.p key={i} custom={i} variants={fadeUp} className="text-lg text-surface-200 leading-relaxed">
                  {paragraph}
                </motion.p>
              ))
            ) : (
              <motion.p custom={0} variants={fadeUp} className="text-lg text-surface-200 leading-relaxed">
                {t('theme.description_placeholder', 'Theme details will be published soon.')}
              </motion.p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Rules & Prizes Grid */}
      <section className="py-24 bg-surface-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Prizes */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={fadeUp}
              className="p-8 rounded-2xl bg-surface-900 border border-surface-800"
            >
              <h3 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-3">
                🏆 {t('theme.prizes')}
              </h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-gold-500/10 to-transparent border border-gold-500/20">
                  <p className="text-gold-400 font-semibold">Main Theme Winner</p>
                  <p className="text-2xl font-bold text-white">€1,000</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-r from-gold-500/10 to-transparent border border-gold-500/20">
                  <p className="text-gold-400 font-semibold">News & Press Winner</p>
                  <p className="text-2xl font-bold text-white">€1,000</p>
                </div>
                <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700">
                  <p className="text-surface-300 font-semibold">Land, Life, People</p>
                  <p className="text-lg text-white">Honorary Award + Trophy</p>
                </div>
              </div>
            </motion.div>

            {/* Rules */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={1}
              variants={fadeUp}
              className="p-8 rounded-2xl bg-surface-900 border border-surface-800"
            >
              <h3 className="text-2xl font-display font-bold text-white mb-6">
                📋 {t('theme.rules')}
              </h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('theme.photo_period')}
                  </h4>
                  <p className="text-surface-200">2022 – 2026</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    {t('theme.accepted')}
                  </h4>
                  <ul className="space-y-2 text-sm text-surface-300">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      Cropping
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      Contrast and exposure changes
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      Color correction
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      Desaturation
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <XIcon className="h-4 w-4" />
                    {t('theme.not_accepted')}
                  </h4>
                  <ul className="space-y-2 text-sm text-surface-300">
                    <li className="flex items-start gap-2">
                      <XIcon className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                      Importing elements from other photos
                    </li>
                    <li className="flex items-start gap-2">
                      <XIcon className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                      Cloning and deleting parts of the photo
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{t('theme.ai_notice')}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
