import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Award, Calendar, Trophy } from 'lucide-react';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Edition } from '@/types';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6 },
  }),
};

const CATEGORIES = [
  {
    slug: 'theme',
    title: 'Theme — BREATH',
    titleAl: 'Tema — FRYMË',
    subtitle: 'FRYMË / BREATH',
    description: 'The invisible rhythm of being, the conditions of life, the politics of air, and the human capacity to breathe life into the world.',
    descriptionAl: 'Ritmi i padukshëm i qenies, kushtet e jetës, politika e ajrit, dhe aftësia njerëzore për t\'i dhënë frymë botës.',
    prize: '€1,000',
    format: 'Series (6–12) or Single (1–3)',
    image: 'https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=800&h=600&fit=crop',
    accent: 'gold',
    gradientFrom: 'from-gold-500/20',
    borderColor: 'border-gold-500/40',
    textColor: 'text-gold-400',
    badgeBg: 'bg-gold-500/15',
  },
  {
    slug: 'press-news',
    title: 'Press & News',
    titleAl: 'Shtypi & Lajmet',
    subtitle: 'Documentary & Photojournalism',
    description: 'Photos with informative and social value from news-worthy events, sports, daily life moments, and social phenomena.',
    descriptionAl: 'Foto me vlerë informative dhe shoqërore nga ngjarje të rëndësishme, sport, momente të jetës së përditshme dhe fenomene sociale.',
    prize: '€1,000',
    format: 'Series (6–12) or Single (1–3)',
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168d9c?w=800&h=600&fit=crop',
    accent: 'blue',
    gradientFrom: 'from-blue-500/20',
    borderColor: 'border-blue-500/40',
    textColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/15',
  },
  {
    slug: 'life',
    title: 'Life',
    titleAl: 'Jeta',
    subtitle: 'Street · Portrait',
    description: 'Style, fashion, objects, products, people, weddings, architecture — the beauty of everyday life captured through street and portrait photography.',
    descriptionAl: 'Stili, moda, objekte, produkte, njerëz, dasma, arkitektura — bukuria e jetës së përditshme e kapur përmes fotografisë së rrugës dhe portretit.',
    prize: '2 × €500',
    format: 'Up to 6 images per sub-category',
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=600&fit=crop',
    accent: 'emerald',
    gradientFrom: 'from-emerald-500/20',
    borderColor: 'border-emerald-500/40',
    textColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/15',
  },
  {
    slug: 'land',
    title: 'Land',
    titleAl: 'Toka',
    subtitle: 'Landscape · Wildlife',
    description: 'Landscape, animals, plants, natural processes — celebrating the beauty of nature and the importance of environmental protection.',
    descriptionAl: 'Peizazhi, kafshët, bimët, proceset natyrore — duke festuar bukurinë e natyrës dhe rëndësinë e mbrojtjes së mjedisit.',
    prize: '2 × €500',
    format: 'Up to 6 images per sub-category',
    image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop',
    accent: 'sky',
    gradientFrom: 'from-sky-500/20',
    borderColor: 'border-sky-500/40',
    textColor: 'text-sky-400',
    badgeBg: 'bg-sky-500/15',
  },
];

export default function ApplyPage() {
  const { i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const lang = i18n.language === 'al' ? 'al' : 'en';
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

  const isOpen = edition?.status === 'open';

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-8"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=1920&h=800&fit=crop)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-950/95 to-surface-950" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-block text-primary-400 text-xs font-semibold uppercase tracking-[0.3em] mb-4 border border-primary-400/30 px-4 py-1.5 rounded-full"
          >
            IFFA 17 · 2026 Edition
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-5xl md:text-6xl font-display font-bold text-white leading-none tracking-tight"
          >
            {lang === 'en' ? 'Open Call' : 'Thirrje e Hapur'}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-surface-300 mt-4 max-w-2xl mx-auto leading-relaxed"
          >
            {lang === 'en'
              ? 'Four categories, €4,000 in prizes, one shared vision. Choose your category and submit your work.'
              : 'Katër kategori, €4,000 çmime, një vizion i përbashkët. Zgjidhni kategorinë tuaj dhe dërgoni punën tuaj.'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-6 flex items-center justify-center gap-4 flex-wrap text-sm text-surface-400"
          >
            {isOpen && (
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {lang === 'en' ? 'Submissions Open' : 'Aplikimet Hapur'}
              </span>
            )}
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary-400" />
              {lang === 'en' ? 'Deadline:' : 'Afati:'} <strong className="text-white">30 June 2026</strong>
            </span>
          </motion.div>
        </div>
      </section>

      {/* ── Category Cards 2×2 ── */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.slug}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
              >
                <Link
                  to={`/apply/${cat.slug}`}
                  className="group block relative rounded-2xl overflow-hidden h-full min-h-[280px] border border-surface-800 hover:border-surface-600 transition-all duration-300"
                >
                  {/* Background image */}
                  <img
                    src={cat.image}
                    alt={cat.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/70 to-surface-950/30" />

                  {/* Content */}
                  <div className="relative h-full flex flex-col justify-end p-6 md:p-8">
                    {/* Prize badge */}
                    <div className={`absolute top-5 right-5 px-3 py-1.5 rounded-full ${cat.badgeBg} border ${cat.borderColor} backdrop-blur-sm`}>
                      <span className={`text-sm font-bold ${cat.textColor}`}>{cat.prize}</span>
                    </div>

                    <span className={`text-[10px] font-semibold uppercase tracking-[0.25em] ${cat.textColor} mb-2`}>
                      {cat.subtitle}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-white leading-tight mb-2">
                      {lang === 'al' ? cat.titleAl : cat.title}
                    </h2>
                    <p className="text-sm text-surface-300 leading-relaxed line-clamp-2 mb-4 max-w-lg">
                      {lang === 'al' ? cat.descriptionAl : cat.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-surface-500">{cat.format}</span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-400 group-hover:text-primary-300 transition-colors">
                        {lang === 'en' ? 'View Details' : 'Shiko Detajet'} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Prize Summary ── */}
      <section className="py-16 bg-surface-900/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <Award className="h-8 w-8 text-gold-400 mx-auto mb-3" />
            <h2 className="text-3xl font-display font-bold text-white">
              {lang === 'en' ? 'Total Prize Pool' : 'Fondi Total i Çmimeve'}
            </h2>
            <p className="text-5xl font-bold text-gold-400 mt-3">€4,000</p>
            <p className="text-sm text-surface-400 mt-2">
              {lang === 'en'
                ? '+ Honorary diplomas, exhibition, catalog publication'
                : '+ Diploma nderi, ekspozitë, publikim katalogu'}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.slug}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className={`p-4 rounded-xl bg-surface-900 border ${cat.borderColor} text-center`}
              >
                <Trophy className={`h-5 w-5 ${cat.textColor} mx-auto mb-2`} />
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1">
                  {lang === 'al' ? cat.titleAl : cat.title}
                </p>
                <p className={`text-xl font-bold ${cat.textColor}`}>{cat.prize}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mt-10"
            >
              <Link to={isAuthenticated ? '/dashboard/submissions/new' : '/register'}>
                <Button variant="gold" size="lg" icon={<ArrowRight className="h-5 w-5" />}>
                  {isAuthenticated
                    ? (lang === 'en' ? 'Submit Your Work' : 'Dërgo Punën Tënde')
                    : (lang === 'en' ? 'Register & Submit' : 'Regjistrohu & Dërgo')}
                </Button>
              </Link>
              <p className="text-xs text-surface-500 mt-3">
                {lang === 'en' ? 'Open to photographers 18+ worldwide' : 'E hapur për fotografë 18+ në mbarë botën'}
              </p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
