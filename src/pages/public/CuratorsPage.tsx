import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ArrowRight } from 'lucide-react';
import { CURATORS } from '@/data/curators';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6 },
  }),
};

export interface Curator {
  slug: string;
  name: string;
  role: string;
  roleAl: string;
  photo: string;
  shortBio: string;
  shortBioAl: string;
}

export default function CuratorsPage() {
  const { t, i18n } = useTranslation();
  usePageTitle(i18n.language === 'al' ? 'Kuratorët' : 'Curators');
  const lang = i18n.language === 'al' ? 'al' : 'en';

  return (
    <div>
      {/* Hero */}
      <section className="relative pt-12 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-950/95 to-surface-950" />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-block text-primary-400 text-xs font-semibold uppercase tracking-[0.3em] mb-4 border border-primary-400/30 px-4 py-1.5 rounded-full"
          >
            FOKUS Award 2026
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white leading-none tracking-tight"
          >
            {t('curators.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-surface-300 mt-4 max-w-2xl mx-auto leading-relaxed"
          >
            {t('curators.subtitle')}
          </motion.p>
        </div>
      </section>

      {/* Curator Cards */}
      <section className="py-10 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-8">
            {CURATORS.map((curator, i) => (
              <motion.div
                key={curator.slug}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
              >
                <Link
                  to={`/curators/${curator.slug}`}
                  className="group block rounded-2xl overflow-hidden bg-surface-900 border border-surface-800 hover:border-primary-500/40 transition-all duration-300"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={curator.photo}
                      alt={curator.name}
                      className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h2 className="text-xl font-display font-bold text-white group-hover:text-primary-400 transition-colors">
                        {curator.name}
                      </h2>
                      <span className="shrink-0 text-xs font-medium text-primary-400 bg-primary-500/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                        {curator.role[lang]}
                      </span>
                    </div>
                    <p className="text-sm text-surface-300 leading-relaxed mb-4">
                      {curator.shortBio[lang]}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-400 group-hover:text-primary-300 transition-colors">
                      {t('curators.read_more')} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
