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
  Wind,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Edition, Partner } from '@/types';

const FIVE_DOORS = [
  { n: '01', title: 'Intimate Breath', desc: 'Fragile moments — waiting, panic, relief, survival, intimacy.' },
  { n: '02', title: 'Invisible Traces', desc: 'Condensation, fog on glass, steam, wind in fabric or hair.' },
  { n: '03', title: 'Animated Memory', desc: 'Giving breath to places, objects, archives, and voiceless stories.' },
  { n: '04', title: 'Air as Commons', desc: 'Pollution, burning, traffic, dust — who pays for clean air?' },
  { n: '05', title: 'The Living Image', desc: 'What feels unmistakably alive in an age of synthetic images?' },
];

const PAST_WINNERS = [
  { url: 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev/gallery/2023/main-first-place-2023.jpeg', label: 'Things Have Changed — 1st Place', edition: 'IFFA 14 · 2023' },
  { url: 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev/gallery/2023/PEOPLE1.jpeg', label: 'People — 1st Place', edition: 'IFFA 14 · 2023' },
  { url: 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev/gallery/2023/LANDWIN.jpeg', label: 'Land — 1st Place', edition: 'IFFA 14 · 2023' },
  { url: 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev/gallery/2022/Mourning.jpg', label: 'The Other — 1st Place', edition: 'IFFA 13 · 2022' },
  { url: 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev/gallery/2023/LIFE1.jpeg', label: 'Life — 1st Place', edition: 'IFFA 14 · 2023' },
  { url: 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev/gallery/2022/Pershendetja-e-fundit.jpg', label: 'Portrait — 1st Place', edition: 'IFFA 13 · 2022' },
];

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
  const [partners, setPartners] = useState<Partner[]>([]);
  const [statsData, setStatsData] = useState({ editions: 0, users: 0, submissions: 0 });

  useEffect(() => {
    supabase
      .from('editions')
      .select('*')
      .eq('published', true)
      .order('year', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setCurrentEdition(data);
      });

    supabase
      .from('partners')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => setPartners(data || []));

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
    { icon: <Camera className="h-6 w-6" />, value: '17', label: 'Editions' },
    { icon: <Globe2 className="h-6 w-6" />, value: '100+', label: 'Countries' },
    { icon: <Users className="h-6 w-6" />, value: '1,500+', label: 'Photographers' },
    { icon: <ImageIcon className="h-6 w-6" />, value: `${statsData.submissions || '2000'}+`, label: 'Photos submitted' },
  ];

  return (
    <div className="relative">

      {/* ===== Hero ===== */}
      <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden">
        <motion.div style={{ y: heroY }} className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?w=1920&h=1080&fit=crop)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface-950/60 via-surface-950/50 to-surface-950" />
        </motion.div>

        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-10 text-center px-4 max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-light text-sm text-surface-300 mb-6"
          >
            <Award className="h-4 w-4 text-gold-400" />
            {currentEdition?.title
              ? `${currentEdition.title} · ${currentEdition.year}`
              : 'International Fine Art & Photography Award · Edition 17'}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="font-display font-bold tracking-tight mb-2 leading-none"
          >
            <span className="block text-7xl sm:text-8xl md:text-9xl text-gradient">FRYMË</span>
            <span className="block text-4xl sm:text-5xl md:text-6xl text-gold-400/90 font-light italic mt-1">BREATH</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
            className="text-lg text-surface-300 font-display italic mt-6 mb-3"
          >
            "the invisible rhythm of being"
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex items-center justify-center gap-2 mb-10"
          >
            {currentEdition?.status === 'open' && (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm text-emerald-400 font-semibold uppercase tracking-wider">Submissions Open</span>
                <span className="text-surface-500 text-sm">·</span>
              </>
            )}
            <span className="text-sm text-surface-400 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Deadline: <strong className="text-white">30 June 2026</strong>
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/register">
              <Button variant="gold" size="lg" icon={<ArrowRight className="h-5 w-5" />}>
                Submit Your Work
              </Button>
            </Link>
            <Link to="/theme">
              <Button variant="secondary" size="lg">
                Explore the Theme
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs text-surface-500 uppercase tracking-widest">Scroll</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>
            <ChevronDown className="h-5 w-5 text-surface-500" />
          </motion.div>
        </motion.div>
      </section>

      {/* ===== Stats ===== */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {stats.map((stat, i) => (
              <motion.div key={stat.label} custom={i} variants={fadeUp} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-800 text-primary-400 mb-4">
                  {stat.icon}
                </div>
                <p className="text-3xl md:text-4xl font-bold text-white font-display">{stat.value}</p>
                <p className="text-sm text-surface-400 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== 2026 Theme Spotlight ===== */}
      <section className="py-24 relative bg-surface-900/30">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-900/40 to-surface-950" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="grid lg:grid-cols-2 gap-16 items-center"
          >
            <motion.div custom={0} variants={fadeUp}>
              <span className="text-primary-400 text-xs font-semibold uppercase tracking-[0.3em]">
                2026 Annual Edition
              </span>
              <h2 className="text-5xl md:text-6xl font-display font-bold text-white mt-3 mb-2 leading-none">
                FRYMË
              </h2>
              <h3 className="text-2xl font-display font-light text-gold-400 italic mb-6">BREATH</h3>
              <p className="text-surface-300 leading-relaxed mb-4">
                Breath is the most ordinary miracle — constant, unconscious, taken for granted until the loss of a single breath changes everything. This edition understands breathing not only as a biological function, but as a way of being: as presence, as a relationship with the body and the world, as both a right and an ecological responsibility.
              </p>
              <p className="text-surface-400 leading-relaxed mb-8">
                From intimate fragile moments to the politics of air as a commons, five thematic doors invite photographers to explore what breath reveals about life.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/theme">
                  <Button variant="secondary" icon={<ArrowRight className="h-4 w-4" />}>
                    Read the Full Concept
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="gold" size="sm">
                    Apply Now
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div custom={1} variants={fadeUp} className="space-y-3">
              {FIVE_DOORS.map((door, i) => (
                <div
                  key={door.n}
                  className="flex items-start gap-4 p-4 rounded-xl bg-surface-900 border border-surface-800 hover:border-primary-500/40 transition-colors group"
                  style={{ transitionDelay: `${i * 40}ms` }}
                >
                  <span className="text-2xl font-display font-black text-primary-500/30 leading-none pt-0.5 w-8 flex-shrink-0 group-hover:text-primary-500/60 transition-colors">
                    {door.n}
                  </span>
                  <div>
                    <p className="font-semibold text-white text-sm">{door.title}</p>
                    <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">{door.desc}</p>
                  </div>
                </div>
              ))}
              <Link to="/theme" className="block text-center text-xs text-primary-400 hover:text-primary-300 transition-colors pt-2">
                Your submission must address at least one of these doors →
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== Past Winners Gallery ===== */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
          >
            <motion.div custom={0} variants={fadeUp} className="text-center mb-14">
              <span className="text-primary-400 text-xs font-semibold uppercase tracking-widest">Past editions</span>
              <h2 className="text-4xl md:text-5xl font-display font-bold text-white mt-3 mb-3">
                Award-Winning Work
              </h2>
              <p className="text-surface-400 max-w-xl mx-auto">
                Selected first-place photographs from our recent editions — the kind of work this competition recognises.
              </p>
            </motion.div>

            <motion.div
              custom={1}
              variants={fadeUp}
              className="grid grid-cols-2 md:grid-cols-3 gap-3"
            >
              {PAST_WINNERS.map((photo, i) => (
                <div
                  key={i}
                  className={`relative overflow-hidden rounded-xl group cursor-pointer ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
                  style={{ aspectRatio: i === 0 ? '16/10' : '4/3' }}
                >
                  <img
                    src={photo.url}
                    alt={photo.label}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <p className="text-white text-sm font-semibold leading-tight">{photo.label}</p>
                    <p className="text-gold-400 text-xs mt-0.5">{photo.edition}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div custom={2} variants={fadeUp} className="text-center mt-10">
              <Link to="/gallery">
                <Button variant="secondary" icon={<ArrowRight className="h-4 w-4" />}>
                  View Full Gallery
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== Submission call-to-action ===== */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-15"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1485236715568-ddc5ee6ca227?w=1920&h=600&fit=crop)' }}
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
            <motion.div custom={0} variants={fadeUp} className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <Wind className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-semibold">Open for Submissions · IFFA 17 · 2026</span>
            </motion.div>
            <motion.h2
              custom={1}
              variants={fadeUp}
              className="text-4xl md:text-5xl font-display font-bold text-white mb-4"
            >
              What does your breath<br />look like?
            </motion.h2>
            <motion.p custom={2} variants={fadeUp} className="text-lg text-surface-300 mb-4 max-w-2xl mx-auto">
              Submit a photographic series (6–12 images) or single image (1–3 images) that explores breath — intimate, ecological, political, or alive.
            </motion.p>
            <motion.p custom={3} variants={fadeUp} className="text-surface-500 text-sm mb-10">
              No entry fee · Open to photographers 18+ worldwide · JPEG sRGB 2500–4000px
            </motion.p>
            <motion.div custom={4} variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button variant="gold" size="lg" icon={<ArrowRight className="h-5 w-5" />}>
                  Submit by 30 June 2026
                </Button>
              </Link>
              <Link to="/theme">
                <Button variant="secondary" size="lg">
                  Read Submission Guidelines
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== Partners ===== */}
      <section className="py-20 border-t border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center"
          >
            <motion.h2 custom={0} variants={fadeUp} className="text-2xl font-display font-bold text-surface-300 mb-12">
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
