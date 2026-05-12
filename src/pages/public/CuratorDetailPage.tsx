import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ArrowLeft } from 'lucide-react';
import { getCuratorBySlug } from '@/data/curators';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6 },
  }),
};

export default function CuratorDetailPage() {
  const { curatorSlug } = useParams<{ curatorSlug: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'al' ? 'al' : 'en';

  const curator = curatorSlug ? getCuratorBySlug(curatorSlug) : null;
  if (!curator) return <Navigate to="/curators" replace />;

  usePageTitle(curator.name);

  const paragraphs = curator.bio[lang];

  return (
    <div className="pb-24">
      {/* Hero with photo */}
      <section className="public-invert relative h-[40vh] min-h-[250px] overflow-hidden sm:h-[50vh] sm:min-h-[350px]">
        <img
          src={curator.photo}
          alt={curator.name}
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/60 to-surface-950/30" />
        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-6 sm:pb-10">
            <Link
              to="/curators"
              className="inline-flex items-center gap-2 text-sm text-surface-300 hover:text-primary-400 transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" /> {t('curators.all_curators')}
            </Link>

            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="inline-block text-xs font-semibold uppercase tracking-[0.3em] text-primary-400 mb-3 border border-primary-400/30 px-4 py-1.5 rounded-full"
            >
              {curator.role[lang]}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white leading-none tracking-tight"
            >
              {curator.name}
            </motion.h1>
          </div>
        </div>
      </section>

      {/* Bio content */}
      <section className="py-10 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-6"
          >
            {paragraphs.map((p, i) => (
              <motion.p
                key={i}
                custom={i}
                variants={fadeUp}
                className="text-base sm:text-lg text-surface-300 leading-relaxed"
              >
                {p}
              </motion.p>
            ))}
          </motion.div>

          {/* Back link */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-12 pt-8 border-t border-surface-800"
          >
            <Link
              to="/curators"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-400 hover:text-primary-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> {t('curators.all_curators')}
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
