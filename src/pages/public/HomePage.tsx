import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Camera,
  Globe2,
  Users,
  Image as ImageIcon,
  ChevronDown,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Edition, Category, Partner } from '@/types';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: 'easeOut' as const },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function HomePage() {
  const { t } = useTranslation();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [statsData, setStatsData] = useState({ editions: 0, users: 0, submissions: 0 });

  useEffect(() => {
    // Fetch latest open/published edition
    supabase
      .from('editions')
      .select('*')
      .eq('published', true)
      .order('year', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setCurrentEdition(data);
          // Fetch categories for this edition
          supabase
            .from('categories')
            .select('*')
            .eq('edition_id', data.id)
            .order('sort_order')
            .then(({ data: cats }) => setCategories(cats || []));
        }
      });

    // Fetch partners
    supabase
      .from('partners')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => setPartners(data || []));

    // Fetch stats
    Promise.all([
      supabase.from('editions').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('submissions').select('id', { count: 'exact', head: true }).neq('status', 'draft'),
    ]).then(([edRes, usRes, subRes]) => {
      setStatsData({
        editions: edRes.count || 0,
        users: usRes.count || 0,
        submissions: subRes.count || 0,
      });
    });
  }, []);

  const stats = [
    { icon: <Camera className="h-6 w-6" />, value: `${statsData.editions || '16'}+`, label: t('home.stats.editions') },
    { icon: <Globe2 className="h-6 w-6" />, value: '50+', label: t('home.stats.countries') },
    { icon: <Users className="h-6 w-6" />, value: `${statsData.users || 0}`, label: t('home.stats.photographers') },
    { icon: <ImageIcon className="h-6 w-6" />, value: `${statsData.submissions || 0}`, label: t('home.stats.photos') },
  ];

  return (
    <div className="relative">
      {/* ===== Hero Section ===== */}
      <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Parallax Image */}
        <motion.div style={{ y: heroY }} className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                'url(https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1920&h=1080&fit=crop)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface-950/70 via-surface-950/50 to-surface-950" />
        </motion.div>

        {/* Hero Content */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-10 text-center px-4 max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-light text-sm text-surface-300 mb-8"
          >
            <Award className="h-4 w-4 text-gold-400" />
            {t('hero.badge')}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-display font-bold tracking-tight mb-4"
          >
            <span className="text-gradient">{t('hero.title')}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-xl md:text-2xl text-surface-300 font-display italic mb-4"
          >
            {t('hero.subtitle')}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="text-base text-surface-400 max-w-2xl mx-auto mb-10"
          >
            {t('hero.description')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/register">
              <Button variant="gold" size="lg" icon={<ArrowRight className="h-5 w-5" />}>
                {t('hero.cta_submit')}
              </Button>
            </Link>
            <Link to="/editions">
              <Button variant="secondary" size="lg">
                {t('hero.cta_explore')}
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs text-surface-500 uppercase tracking-widest">
            {t('hero.scroll')}
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          >
            <ChevronDown className="h-5 w-5 text-surface-500" />
          </motion.div>
        </motion.div>
      </section>

      {/* ===== Stats Section ===== */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i}
                variants={fadeUp}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-800 text-primary-400 mb-4">
                  {stat.icon}
                </div>
                <p className="text-3xl md:text-4xl font-bold text-white font-display">
                  {stat.value}
                </p>
                <p className="text-sm text-surface-400 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== Theme Section ===== */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-900/50 to-surface-950" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="grid lg:grid-cols-2 gap-16 items-center"
          >
            <motion.div custom={0} variants={fadeUp}>
              <span className="text-primary-400 text-sm font-semibold uppercase tracking-widest">
                {t('home.current_edition')}
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-white mt-3 mb-6">
                {t('home.theme_title')}
              </h2>
              {currentEdition?.theme && (
                <h3 className="text-xl text-gold-400 font-display italic mb-6">
                  "{currentEdition.theme}"
                </h3>
              )}
              <p className="text-surface-300 leading-relaxed mb-8">
                {currentEdition?.theme_description ||
                  t('hero.description')}
              </p>
              <Link to="/theme">
                <Button variant="secondary" icon={<ArrowRight className="h-4 w-4" />}>
                  Learn More
                </Button>
              </Link>
            </motion.div>

            <motion.div custom={1} variants={fadeUp} className="relative">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden">
                <img
                  src={currentEdition?.hero_image_url || 'https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=800&h=1000&fit=crop'}
                  alt="Theme"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-950/80 via-transparent to-transparent" />
              </div>
              {/* Floating card */}
              {currentEdition && (
                <div className="absolute -bottom-6 -left-6 glass rounded-xl p-4 max-w-[200px]">
                  <p className="text-gold-400 text-sm font-semibold">{currentEdition.title}</p>
                  <p className="text-white text-lg font-display font-bold">{currentEdition.year} Edition</p>
                  <p className="text-surface-400 text-xs mt-1">
                    {currentEdition.status === 'open' ? 'Now accepting submissions' : currentEdition.status}
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== Categories Section ===== */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
          >
            <motion.div custom={0} variants={fadeUp} className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
                {t('home.categories')}
              </h2>
              <p className="text-surface-400 max-w-2xl mx-auto">
                Submit your best work across four distinct categories, each celebrating a unique aspect of photography.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((cat, i) => (
                <motion.div
                  key={cat.id}
                  custom={i + 1}
                  variants={fadeUp}
                  whileHover={{ y: -8 }}
                  className="group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer bg-surface-800"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl font-display font-bold text-white mb-2">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="text-sm text-surface-400 mb-2 line-clamp-2">{cat.description}</p>
                    )}
                    <div className="flex items-center text-primary-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {t('home.view_category')} <ArrowRight className="h-4 w-4 ml-1" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== CTA Section ===== */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage:
                'url(https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1920&h=600&fit=crop)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-950/90 via-surface-950 to-primary-950/90" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2
              custom={0}
              variants={fadeUp}
              className="text-4xl md:text-5xl font-display font-bold text-white mb-6"
            >
              {t('home.cta.title')}
            </motion.h2>
            <motion.p
              custom={1}
              variants={fadeUp}
              className="text-lg text-surface-300 mb-10 max-w-2xl mx-auto"
            >
              {t('home.cta.subtitle')}
            </motion.p>
            <motion.div custom={2} variants={fadeUp}>
              <Link to="/register">
                <Button variant="gold" size="lg" icon={<ArrowRight className="h-5 w-5" />}>
                  {t('home.cta.button')}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== Partners Section ===== */}
      <section className="py-20 border-t border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center"
          >
            <motion.h2
              custom={0}
              variants={fadeUp}
              className="text-2xl font-display font-bold text-surface-300 mb-12"
            >
              {t('home.partners_title')}
            </motion.h2>
            <motion.div
              custom={1}
              variants={fadeUp}
              className="flex flex-wrap items-center justify-center gap-12 opacity-50"
            >
              {partners.map((partner) => (
                <a
                  key={partner.id}
                  href={partner.website_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-32 h-12 rounded bg-surface-800 flex items-center justify-center text-surface-500 text-xs overflow-hidden hover:opacity-80 transition-opacity"
                >
                  {partner.logo_url ? (
                    <img src={partner.logo_url} alt={partner.name} className="max-w-full max-h-full object-contain p-1" />
                  ) : (
                    partner.name
                  )}
                </a>
              ))}
              {partners.length === 0 && (
                <p className="text-surface-600 text-sm">Partners coming soon</p>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
