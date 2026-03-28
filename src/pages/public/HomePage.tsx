import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Camera,
  Globe2,
  Users,
  Image as ImageIcon,
  Award,
  Wind,
  Calendar,
  Newspaper,
  Pin,
  Facebook,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui';
import CompetitionModal from '@/components/CompetitionModal';
import { supabase } from '@/lib/supabase';
import type { Edition, Partner, Post } from '@/types';

/* ---------- static data ---------- */
const CATEGORY_COLORS: Record<string, string> = {
  news: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  event: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  announcement: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  news: <Newspaper className="h-3 w-3" />,
  event: <Calendar className="h-3 w-3" />,
  announcement: <Megaphone className="h-3 w-3" />,
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
};

/* ---------- helper ---------- */
function formatDate(d: string | null, full = false) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', ...(full ? { year: 'numeric' } : {}),
  });
}

/* ---------- component ---------- */
export default function HomePage() {
  const { t } = useTranslation();

  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [sliderPosts, setSliderPosts] = useState<Post[]>([]);
  const [showCompetitionModal, setShowCompetitionModal] = useState(false);

  // Auto-show competition modal on first visit
  useEffect(() => {
    const dismissed = localStorage.getItem('iffa17_modal_dismissed');
    if (!dismissed) {
      const timer = setTimeout(() => setShowCompetitionModal(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Re-open modal if returning from Google OAuth
  useEffect(() => {
    if (localStorage.getItem('iffa17_modal_return')) {
      localStorage.removeItem('iffa17_modal_return');
      setShowCompetitionModal(true);
    }
  }, []);

  const handleCloseModal = () => {
    setShowCompetitionModal(false);
    localStorage.setItem('iffa17_modal_dismissed', '1');
  };

  // Slider state
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    supabase
      .from('editions')
      .select('*')
      .eq('published', true)
      .order('year', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { if (data) setCurrentEdition(data); });

    supabase
      .from('partners')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => setPartners(data || []));

    supabase
      .from('posts')
      .select('*')
      .eq('published', true)
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAllPosts(data);
          // Slider: pinned + featured posts (min 1, max 5)
          const highlighted = data.filter(p => p.pinned || p.featured);
          const slider = highlighted.length > 0 ? highlighted.slice(0, 5) : data.slice(0, 1);
          setSliderPosts(slider);
        }
      });
  }, []);

  // Auto-advance slider
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSlideDir(1);
      setSlideIndex(prev => (prev + 1) % (sliderPosts.length || 1));
    }, 6000);
  }, [sliderPosts.length]);

  useEffect(() => {
    if (sliderPosts.length > 1) resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [sliderPosts.length, resetTimer]);

  const goToSlide = (i: number) => {
    setSlideDir(i > slideIndex ? 1 : -1);
    setSlideIndex(i);
    resetTimer();
  };
  const goPrev = () => { goToSlide((slideIndex - 1 + sliderPosts.length) % sliderPosts.length); };
  const goNext = () => { goToSlide((slideIndex + 1) % sliderPosts.length); };

  // Split posts into groups — use ALL posts for category sections (not just grid)
  const events = allPosts.filter(p => p.category === 'event');
  const news = allPosts.filter(p => p.category === 'news');
  const announcements = allPosts.filter(p => p.category === 'announcement');

  // Bento grid: pick one from each category for diversity
  const bentoPosts = (() => {
    const picks: Post[] = [];
    const pools = [announcements, news, events];
    for (const pool of pools) {
      const next = pool.find(p => !picks.some(pp => pp.id === p.id));
      if (next) picks.push(next);
    }
    // Fill remaining slots from allPosts if needed
    for (const p of allPosts) {
      if (picks.length >= 3) break;
      if (!picks.some(pp => pp.id === p.id)) picks.push(p);
    }
    return picks;
  })();

  const stats = [
    { icon: <Camera className="h-5 w-5" />, value: '17', label: 'Editions' },
    { icon: <Globe2 className="h-5 w-5" />, value: '100+', label: 'Countries' },
    { icon: <Users className="h-5 w-5" />, value: '1,500+', label: 'Photographers' },
    { icon: <ImageIcon className="h-5 w-5" />, value: '2,000+', label: 'Photos' },
  ];

  const currentSlide = sliderPosts[slideIndex];

  return (
    <div className="relative">

      {/* ===== HERO SLIDER — Full-width pinned/featured posts ===== */}
      {sliderPosts.length > 0 ? (
        <section className="relative h-dvh overflow-hidden">
          <AnimatePresence initial={false} custom={slideDir} mode="popLayout">
            <motion.div
              key={currentSlide?.id}
              custom={slideDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0"
            >
              {currentSlide?.cover_image_url ? (
                <img
                  src={currentSlide.cover_image_url}
                  alt={currentSlide.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-surface-900 flex items-center justify-center">
                  <Newspaper className="h-20 w-20 text-surface-700" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/50 to-surface-950/20" />
              <div className="absolute inset-0 bg-gradient-to-r from-surface-950/60 to-transparent" />
            </motion.div>
          </AnimatePresence>

          {/* Slide content overlay */}
          <div className="absolute inset-0 flex items-end z-10">
            <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-10 pb-12 md:pb-16">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide?.id + '-text'}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  className="max-w-2xl"
                >
                  <div className="flex items-center gap-2 mb-3">
                    {currentSlide && (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${CATEGORY_COLORS[currentSlide.category]}`}>
                        {CATEGORY_ICONS[currentSlide.category]}
                        {currentSlide.category}
                      </span>
                    )}
                    {currentSlide?.pinned && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-gold-400">
                        <Pin className="h-3 w-3" /> Pinned
                      </span>
                    )}
                    {currentSlide?.featured && !currentSlide?.pinned && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-primary-400">
                        <Sparkles className="h-3 w-3" /> Featured
                      </span>
                    )}
                    {currentSlide?.published_at && (
                      <span className="text-xs text-surface-400">{formatDate(currentSlide.published_at, true)}</span>
                    )}
                  </div>
                  <Link to={`/news/${currentSlide?.slug}`} className="group">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-white leading-[1.1] group-hover:text-primary-300 transition-colors">
                      {currentSlide?.title}
                    </h1>
                  </Link>
                  {currentSlide?.excerpt && (
                    <p className="text-surface-300 mt-3 text-sm md:text-base line-clamp-2 leading-relaxed">
                      {currentSlide.excerpt}
                    </p>
                  )}
                  <Link
                    to={`/news/${currentSlide?.slug}`}
                    className="inline-flex items-center gap-2 mt-5 text-sm font-semibold text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    Read More <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              </AnimatePresence>

              {/* Slider controls */}
              {sliderPosts.length > 1 && (
                <div className="flex items-center gap-4 mt-6">
                  <div className="flex items-center gap-1.5">
                    {sliderPosts.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => goToSlide(i)}
                        className={`transition-all duration-300 rounded-full ${
                          i === slideIndex
                            ? 'w-8 h-2 bg-primary-400'
                            : 'w-2 h-2 bg-surface-600 hover:bg-surface-400'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={goPrev}
                      className="p-2 rounded-full bg-surface-800/60 backdrop-blur-sm text-white hover:bg-surface-700/80 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={goNext}
                      className="p-2 rounded-full bg-surface-800/60 backdrop-blur-sm text-white hover:bg-surface-700/80 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-xs text-surface-500 tabular-nums ml-1">
                    {slideIndex + 1} / {sliderPosts.length}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        /* Fallback header when no posts */
        <section className="relative pt-28 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-950/95 to-surface-950" />
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 relative text-center">
            <Award className="h-8 w-8 text-gold-400 mx-auto mb-4" />
            <h1 className="text-4xl sm:text-5xl font-display font-bold text-white">FOKUS Award</h1>
            <p className="text-surface-400 mt-3 max-w-lg mx-auto">
              Celebrating photographic excellence since 2009
            </p>
          </div>
        </section>
      )}

      {/* ===== Stats ribbon ===== */}
      <section className="border-b border-surface-800 bg-surface-950/80 backdrop-blur-sm relative z-10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between py-4 overflow-x-auto gap-6">
            <div className="flex items-center gap-2 shrink-0">
              <Award className="h-4 w-4 text-gold-400" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-surface-400">FOKUS Award</span>
            </div>
            <div className="flex items-center gap-6 sm:gap-10">
              {stats.map(s => (
                <div key={s.label} className="flex items-center gap-2 shrink-0">
                  <span className="text-primary-400">{s.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white font-display leading-none">{s.value}</p>
                    <p className="text-[9px] text-surface-500 uppercase tracking-wider">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== MAGAZINE CONTENT — Diverse chaotic layout ===== */}
      <section className="py-10 sm:py-14">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">

          {/* ── Row 1: Full-width accent banner (Theme CTA) + Category strip ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-10">
            {/* Theme banner — spans 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-3 relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary-950 via-surface-900 to-surface-950 border border-surface-800"
            >
              <div
                className="absolute inset-0 bg-cover bg-center opacity-15"
                style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?w=800&h=400&fit=crop)' }}
              />
              <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5">
                <div className="flex-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary-400 mb-2 block">2026 Theme</span>
                  <h3 className="text-4xl font-display font-bold text-white leading-none">FRYMË</h3>
                  <p className="text-gold-400 font-display italic text-xl mt-1">BREATH</p>
                  <p className="text-sm text-surface-300 leading-relaxed mt-3 max-w-md">
                    Breath is the most ordinary miracle — constant, unconscious, taken for granted until it changes everything.
                  </p>
                  {currentEdition?.status === 'open' && (
                    <div className="flex items-center gap-2 mt-3">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs text-emerald-400 font-semibold">Submissions Open</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0 md:w-44">
                  <div className="flex items-center gap-2 text-xs text-surface-500 mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Deadline: <strong className="text-white">30 June 2026</strong>
                  </div>
                  <Link to="/theme">
                    <Button variant="secondary" size="sm" className="w-full" icon={<ArrowRight className="h-4 w-4" />}>
                      Explore Theme
                    </Button>
                  </Link>
                  <Button variant="gold" size="sm" className="w-full" onClick={() => setShowCompetitionModal(true)}>Submit Your Work</Button>
                </div>
              </div>
            </motion.div>

            {/* Announcements column — spans 2 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2 rounded-2xl border border-surface-800 bg-surface-900 p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Megaphone className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Announcements</h3>
              </div>
              <div className="space-y-4">
                {announcements.length > 0 ? announcements.slice(0, 3).map(post => (
                  <Link key={post.id} to={`/news/${post.slug}`} className="group block border-l-2 border-amber-500/30 pl-3 hover:border-amber-400 transition-colors">
                    <p className="text-sm text-white font-medium group-hover:text-amber-300 transition-colors leading-snug line-clamp-2">
                      {post.title}
                    </p>
                    <span className="text-[10px] text-surface-500 mt-0.5 block">{formatDate(post.published_at)}</span>
                  </Link>
                )) : (
                  <p className="text-sm text-surface-600">No announcements yet</p>
                )}
              </div>
            </motion.div>
          </div>

          {/* ── Row 2: Asymmetric 3-column bento grid ── */}
          {bentoPosts.length > 0 && (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-10"
            >
              {/* Large card — spans 7 cols */}
              {bentoPosts[0] && (
                <motion.div custom={0} variants={fadeUp} className="md:col-span-7">
                  <Link to={`/news/${bentoPosts[0].slug}`} className="group block h-full">
                    <div className="relative rounded-2xl overflow-hidden h-full min-h-[320px] md:min-h-[400px] bg-surface-800">
                      {bentoPosts[0].cover_image_url ? (
                        <img src={bentoPosts[0].cover_image_url} alt={bentoPosts[0].title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Newspaper className="h-12 w-12 text-surface-600" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-950/90 via-surface-950/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${CATEGORY_COLORS[bentoPosts[0].category]}`}>
                            {CATEGORY_ICONS[bentoPosts[0].category]} {bentoPosts[0].category}
                          </span>
                          <span className="text-xs text-surface-400">{formatDate(bentoPosts[0].published_at)}</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-display font-bold text-white group-hover:text-primary-300 transition-colors leading-tight line-clamp-2">
                          {bentoPosts[0].title}
                        </h2>
                        {bentoPosts[0].excerpt && (
                          <p className="text-surface-300 text-sm mt-2 line-clamp-2 hidden md:block">{bentoPosts[0].excerpt}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )}

              {/* Stack of 2 medium cards — spans 5 cols */}
              <div className="md:col-span-5 flex flex-col gap-4">
                {bentoPosts.slice(1, 3).map((post, i) => (
                  <motion.div key={post.id} custom={i + 1} variants={fadeUp} className="flex-1">
                    <Link to={`/news/${post.slug}`} className="group block h-full">
                      <div className="relative rounded-xl overflow-hidden h-full min-h-[160px] bg-surface-800">
                        {post.cover_image_url ? (
                          <img src={post.cover_image_url} alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Newspaper className="h-8 w-8 text-surface-600" /></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-surface-950/90 via-surface-950/30 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${CATEGORY_COLORS[post.category]}`}>
                              {CATEGORY_ICONS[post.category]} {post.category}
                            </span>
                            <span className="text-[10px] text-surface-400">{formatDate(post.published_at)}</span>
                          </div>
                          <h3 className="text-base font-semibold text-white group-hover:text-primary-300 transition-colors leading-snug line-clamp-2">
                            {post.title}
                          </h3>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Row 3: Horizontal scroll card row (events) ── */}
          {events.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-lg font-display font-bold text-white">Upcoming Events</h2>
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 snap-x snap-mandatory scrollbar-hide">
                {events.slice(0, 4).map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="shrink-0 w-72 sm:w-80 snap-start"
                  >
                    <Link to={`/news/${post.slug}`} className="group block">
                      <div className="rounded-xl overflow-hidden bg-surface-900 border border-surface-800 hover:border-emerald-500/30 transition-colors">
                        <div className="aspect-[16/9] bg-surface-800 overflow-hidden relative">
                          {post.cover_image_url ? (
                            <img src={post.cover_image_url} alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Calendar className="h-8 w-8 text-surface-600" /></div>
                          )}
                          <div className="absolute top-3 left-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/90 text-white">
                              <Calendar className="h-2.5 w-2.5" /> Event
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-white text-sm leading-snug group-hover:text-emerald-300 transition-colors line-clamp-2">
                            {post.title}
                          </h3>
                          {post.excerpt && <p className="text-xs text-surface-400 mt-1.5 line-clamp-2">{post.excerpt}</p>}
                          <span className="text-[10px] text-surface-500 mt-2 block">{formatDate(post.published_at)}</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── Row 4: Mixed masonry-ish — news cards + sidebar stack ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
            {/* News column */}
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Newspaper className="h-4 w-4 text-blue-400" />
                  <h2 className="text-lg font-display font-bold text-white">Latest News</h2>
                </div>
                <Link to="/news" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {news.length > 0 ? (
                <div className="space-y-4">
                  {news.slice(0, 5).map((post, i) => {
                    const isNew = post.published_at && (Date.now() - new Date(post.published_at).getTime()) < 7 * 24 * 60 * 60 * 1000;
                    return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <Link to={`/news/${post.slug}`} className="group flex gap-4 items-start p-3 rounded-xl hover:bg-surface-900/80 transition-colors">
                        <div className="shrink-0 w-28 h-20 sm:w-36 sm:h-24 rounded-lg overflow-hidden bg-surface-800 relative">
                          {post.cover_image_url ? (
                            <img src={post.cover_image_url} alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Newspaper className="h-6 w-6 text-surface-600" /></div>
                          )}
                          {isNew && (
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-500 text-white leading-none tracking-wider">
                              New
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${CATEGORY_COLORS[post.category]}`}>
                              {post.category}
                            </span>
                            <span className="text-[10px] text-surface-500">{formatDate(post.published_at)}</span>
                            {post.facebook_url && <Facebook className="h-3 w-3 text-[#1877F2]" />}
                          </div>
                          <h3 className="font-semibold text-white text-sm leading-snug group-hover:text-primary-300 transition-colors line-clamp-2">
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p className="text-xs text-surface-400 mt-1 line-clamp-2 hidden sm:block">{post.excerpt}</p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-surface-600 group-hover:text-primary-400 transition-colors mt-1 shrink-0 hidden sm:block" />
                      </Link>
                    </motion.div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-surface-600">No news articles yet</p>
              )}
            </div>

            {/* Sidebar stack */}
            <aside className="lg:col-span-4 space-y-6">
              {/* Open call card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-surface-800 bg-surface-900 p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Wind className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Open Call</span>
                </div>
                <h3 className="text-lg font-display font-bold text-white mb-2">
                  What does your breath look like?
                </h3>
                <p className="text-xs text-surface-400 leading-relaxed mb-3">
                  4 categories, €4,000 total prizes. Explore breath — intimate, ecological, political, or alive.
                </p>
                <div className="space-y-1.5 text-xs text-surface-500 mb-4">
                  <p className="text-gold-400 font-semibold">Main Theme · Press & News — €1,000 each</p>
                  <p className="text-emerald-400 font-semibold">Life · Land sub-awards — €500 each</p>
                </div>
                <ul className="space-y-1.5 text-xs text-surface-500 mb-5">
                  <li>Open to photographers 18+ worldwide</li>
                  <li>JPEG sRGB · 2500–4000 px</li>
                </ul>
                <Link to="/register">
                  <Button variant="gold" size="sm" className="w-full" icon={<ArrowRight className="h-4 w-4" />}>
                    Submit by 30 June 2026
                  </Button>
                </Link>
              </motion.div>

              {/* Quick Links */}
              <div className="rounded-2xl border border-surface-800 bg-surface-900 p-5">
                <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">Quick Links</h3>
                <div className="space-y-2">
                  {[
                    { to: '/about', label: 'About FOKUS Award' },
                    { to: '/winners', label: 'Past Winners' },
                    { to: '/gallery', label: 'Photo Gallery' },
                    { to: '/contact', label: 'Contact Us' },
                  ].map(link => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="flex items-center justify-between py-2 px-1 text-sm text-surface-400 hover:text-primary-400 transition-colors border-b border-surface-800 last:border-0"
                    >
                      {link.label}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>


        </div>
      </section>

      {/* ===== Partners ===== */}
      <section className="py-16 border-t border-surface-800">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center"
          >
            <motion.h2 custom={0} variants={fadeUp} className="text-xl font-display font-bold text-surface-300 mb-10">
              {t('home.partners_title')}
            </motion.h2>
            <motion.div
              custom={1}
              variants={fadeUp}
              className="flex flex-wrap items-center justify-center gap-10 opacity-50"
            >
              {partners.map((partner) => (
                <a
                  key={partner.id}
                  href={partner.website_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-28 h-10 rounded bg-surface-800 flex items-center justify-center text-surface-500 text-xs overflow-hidden hover:opacity-80 transition-opacity"
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
      {/* Competition Modal */}
      <CompetitionModal isOpen={showCompetitionModal} onClose={handleCloseModal} />
    </div>
  );
}
