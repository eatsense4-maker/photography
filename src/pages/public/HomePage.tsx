import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
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
const CompetitionModal = lazy(() => import('@/components/CompetitionModal'));
import { supabase } from '@/lib/supabase';
import type { Edition, Partner, Post, Category } from '@/types';

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

const CAT_COLORS = [
  { color: 'text-gold-400', border: 'hover:border-gold-500/40' },
  { color: 'text-blue-400', border: 'hover:border-blue-500/40' },
  { color: 'text-emerald-400', border: 'hover:border-emerald-500/40' },
  { color: 'text-sky-400', border: 'hover:border-sky-500/40' },
  { color: 'text-violet-400', border: 'hover:border-violet-500/40' },
  { color: 'text-rose-400', border: 'hover:border-rose-500/40' },
];

// slug derived from category name if not stored in DB
function derivedSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/* Canonical category slugs & cover images — fallback only when DB has no slug/image */
const CATEGORY_LIST = [
  { slug: 'main-theme-breath',            image: 'https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=800&h=600&fit=crop' },
  { slug: 'press-news',                   image: 'https://images.unsplash.com/photo-1504711434969-e33886168d9c?w=800&h=600&fit=crop' },
  { slug: 'life-best-street-photography', image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=600&fit=crop' },
  { slug: 'life-best-portrait',           image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&h=600&fit=crop' },
  { slug: 'land-best-landscape',          image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop' },
  { slug: 'land-best-wild-world',         image: 'https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=800&h=600&fit=crop' },
];

/* Build a lookup from derived slug → { slug, image } */
const CATEGORY_COVERS = Object.fromEntries(
  CATEGORY_LIST.map(c => [c.slug, c])
);

function getCategoryMeta(cat: Category, sortIndex: number) {
  // 1. Use DB slug if available
  if (cat.slug) return { slug: cat.slug, image: CATEGORY_COVERS[cat.slug]?.image || '' };
  // 2. Try matching by position (sort_order) — most reliable
  if (sortIndex >= 0 && sortIndex < CATEGORY_LIST.length) {
    return CATEGORY_LIST[sortIndex];
  }
  // 3. Try exact slug match from name
  const derived = derivedSlug(cat.name);
  if (CATEGORY_COVERS[derived]) return CATEGORY_COVERS[derived];
  // 4. Partial match fallback
  const match = CATEGORY_LIST.find(c => derived.includes(c.slug) || c.slug.includes(derived));
  if (match) return match;
  // 5. Last resort — use derived slug
  return { slug: derived, image: '' };
}

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

function getPostCategoryLabel(category: string, t: (k: string) => string) {
  if (category === 'event') return t('home.upcoming_events');
  if (category === 'news') return t('home.latest_news');
  if (category === 'announcement') return t('home.announcement_label');
  return category;
}

/* ---------- component ---------- */
export default function HomePage() {
  const { t, i18n } = useTranslation();
  usePageTitle();

  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [homeCategories, setHomeCategories] = useState<Category[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [sliderPosts, setSliderPosts] = useState<Post[]>([]);
  const [postsLoaded, setPostsLoaded] = useState(false);
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
      .then(({ data }) => {
        if (data) {
          setCurrentEdition(data);
          // Fetch categories filtered by current edition
          supabase
            .from('categories')
            .select('*')
            .eq('edition_id', data.id)
            .order('sort_order')
            .then(({ data: cats }) => { if (cats) setHomeCategories(cats); });
        }
      });

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
        setPostsLoaded(true);
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
  // announcements kept for potential future use
  // const announcements = ...

  const stats = [
    { icon: <Camera className="h-5 w-5" />, value: '17', label: t('home.stats.editions') },
    { icon: <Globe2 className="h-5 w-5" />, value: '100+', label: t('home.stats.countries') },
    { icon: <Users className="h-5 w-5" />, value: '1,500+', label: t('home.stats.photographers') },
    { icon: <ImageIcon className="h-5 w-5" />, value: '2,000+', label: t('home.stats.photos') },
  ];

  const currentSlide = sliderPosts[slideIndex];

  return (
    <div className="relative bg-white">

      {/* ===== HERO SLIDER — Full-width pinned/featured posts ===== */}
      {sliderPosts.length > 0 ? (
        <section className="public-invert relative h-[calc(100dvh-4rem)] min-h-[320px] overflow-hidden sm:h-[calc(100dvh-5rem)] sm:min-h-[400px]">
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
                  fetchPriority="high"
                  sizes="100vw"
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
            <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-10 pb-8 sm:pb-12 md:pb-16">
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
                        <Pin className="h-3 w-3" /> {t('home.pinned')}
                      </span>
                    )}
                    {currentSlide?.featured && !currentSlide?.pinned && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-primary-400">
                        <Sparkles className="h-3 w-3" /> {t('home.featured')}
                      </span>
                    )}
                    {currentSlide?.published_at && (
                      <span className="text-xs text-surface-400">{formatDate(currentSlide.published_at, true)}</span>
                    )}
                  </div>
                  <Link to={`/news/${currentSlide?.slug}`} className="group">
                    <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-display font-bold text-white leading-[1.15] group-hover:text-primary-300 transition-colors">
                      {currentSlide?.title}
                    </h1>
                  </Link>
                  {currentSlide?.excerpt && (
                    <p className="text-surface-300 mt-2 sm:mt-3 text-xs sm:text-sm md:text-base line-clamp-2 leading-relaxed">
                      {currentSlide.excerpt}
                    </p>
                  )}
                  <Link
                    to={`/news/${currentSlide?.slug}`}
                    className="inline-flex items-center gap-2 mt-3 sm:mt-5 text-sm font-semibold text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    {t('home.read_more')} <ArrowRight className="h-4 w-4" />
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
                        aria-label={`Go to slide ${i + 1}`}
                        className={`transition-all duration-300 rounded-full ${
                          i === slideIndex
                            ? 'w-8 h-3 bg-primary-400'
                            : 'w-3 h-3 bg-surface-600 hover:bg-surface-400'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={goPrev}
                      aria-label="Previous"
                      className="p-2 rounded-full bg-surface-800/60 backdrop-blur-sm text-white hover:bg-surface-700/80 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={goNext}
                      aria-label="Next"
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
        /* Fallback / loading placeholder — same height as hero to prevent CLS */
        <section className="public-invert relative h-[calc(100dvh-4rem)] min-h-[320px] overflow-hidden bg-surface-900 sm:h-[calc(100dvh-5rem)] sm:min-h-[400px]">
          <div className="absolute inset-0 bg-gradient-to-b from-surface-900 via-surface-900/95 to-surface-950" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center relative">
              {postsLoaded ? (
                <>
                  <Award className="h-8 w-8 text-gold-400 mx-auto mb-4" />
                  <h1 className="text-4xl sm:text-5xl font-display font-bold text-white">FOKUS Award</h1>
                  <p className="text-surface-400 mt-3 max-w-lg mx-auto">
                    {t('home.hero_fallback')}
                  </p>
                </>
              ) : (
                <div className="animate-pulse flex flex-col items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-surface-700" />
                  <div className="h-10 w-64 rounded bg-surface-700" />
                  <div className="h-4 w-48 rounded bg-surface-800" />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===== Stats ribbon ===== */}
      <section className="relative z-10 border-b border-surface-700/50 bg-white/85 backdrop-blur-sm">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between py-3 sm:py-4 overflow-x-auto gap-3 sm:gap-6 scrollbar-hide">
            <div className="flex items-center gap-2 shrink-0">
              <Award className="h-4 w-4 text-gold-400" />
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-surface-500">FOKUS Award</span>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 md:gap-10">
              {stats.map(s => (
                <div key={s.label} className="flex items-center gap-2 shrink-0">
                  <span className="text-primary-400">{s.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white font-display leading-none">{s.value}</p>
                    <p className="text-[9px] text-surface-600 uppercase tracking-wider">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== COMPETITION CATEGORIES — shown when open ===== */}
      {currentEdition?.status === 'open' && homeCategories.length > 0 && (
        <section className="border-b border-surface-700/50 bg-white/45 py-10 sm:py-14">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary-400 block mb-1">{currentEdition.title} · {t('home.open_call')}</span>
                <h2 className="text-xl font-display font-bold text-white">{t('home.categories')}</h2>
              </div>
              <Link to="/apply" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
                {t('home.view_all')} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {homeCategories.slice(0, 6).map((cat, i) => {
                const style = CAT_COLORS[i % CAT_COLORS.length];
                const meta = getCategoryMeta(cat, i);
                const coverImage = cat.image_url || meta.image;
                const catName = i18n.language === 'al' && cat.name_al ? cat.name_al : cat.name;
                const displayCatName = catName;
                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Link to={`/apply/${meta.slug}`} className={`group block relative h-36 overflow-hidden rounded-xl border border-surface-700 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:h-44 ${style.border}`}>
                      {coverImage ? (
                        <img src={coverImage} alt={catName}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy" sizes="(max-width: 1024px) 50vw, 33vw" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-100 via-white to-gold-100" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-3">
                        <div className="rounded-lg bg-white/92 px-3 py-2 shadow-sm backdrop-blur-sm">
                          <h3 className="text-sm font-semibold text-surface-100 leading-tight">{displayCatName}</h3>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== MAGAZINE CONTENT ===== */}
      <section className="py-10 sm:py-14 min-h-[400px]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">

          {/* ── Events ── */}
          {events.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-lg font-display font-bold text-white">{t('home.upcoming_events')}</h2>
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
                    className="shrink-0 w-64 sm:w-72 md:w-80 snap-start"
                  >
                    <Link to={`/news/${post.slug}`} className="group block">
                      <div className="rounded-xl overflow-hidden border border-surface-700 bg-white/90 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
                        <div className="aspect-[16/9] bg-surface-100 overflow-hidden relative">
                          {post.cover_image_url ? (
                            <img src={post.cover_image_url} alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy" decoding="async" sizes="(max-width: 640px) 288px, 320px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Calendar className="h-8 w-8 text-surface-300" /></div>
                          )}
                          <div className="absolute top-3 left-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/90 text-white">
                              <Calendar className="h-2.5 w-2.5" /> {t('home.event_badge')}
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="text-sm font-semibold leading-snug text-white transition-colors group-hover:text-emerald-600 line-clamp-2">
                            {post.title}
                          </h3>
                          {post.excerpt && <p className="text-xs text-surface-500 mt-1.5 line-clamp-2">{post.excerpt}</p>}
                          <span className="text-[10px] text-surface-400 mt-2 block">{formatDate(post.published_at)}</span>
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
                  <h2 className="text-lg font-display font-bold text-white">{t('home.latest_news')}</h2>
                </div>
                <Link to="/news" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
                  {t('home.view_all')} <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {news.length > 0 ? (
                <div className="space-y-4">
                  {news.slice(0, 3).map((post, i) => {
                    const isNew = post.published_at && (Date.now() - new Date(post.published_at).getTime()) < 7 * 24 * 60 * 60 * 1000;
                    return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <Link to={`/news/${post.slug}`} className="group flex gap-4 items-start rounded-xl border border-transparent p-3 transition-colors hover:border-surface-700/70 hover:bg-white/80">
                        <div className="shrink-0 w-28 h-20 sm:w-36 sm:h-24 rounded-lg overflow-hidden bg-surface-100 relative">
                          {post.cover_image_url ? (
                            <img src={post.cover_image_url} alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy" decoding="async" sizes="(max-width: 640px) 112px, 144px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Newspaper className="h-6 w-6 text-surface-300" /></div>
                          )}
                          {isNew && (
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-500 text-white leading-none tracking-wider">
                              {t('home.new_badge')}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${CATEGORY_COLORS[post.category]}`}>
                              {getPostCategoryLabel(post.category, t)}
                            </span>
                            <span className="text-[10px] text-surface-500">{formatDate(post.published_at)}</span>
                            {post.facebook_url && <Facebook className="h-3 w-3 text-[#1877F2]" />}
                          </div>
                          <h3 className="text-sm font-semibold leading-snug text-white transition-colors group-hover:text-primary-600 line-clamp-2">
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p className="text-xs text-surface-500 mt-1 line-clamp-2 hidden sm:block">{post.excerpt}</p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-surface-300 group-hover:text-primary-500 transition-colors mt-1 shrink-0 hidden sm:block" />
                      </Link>
                    </motion.div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-surface-400">{t('home.no_news')}</p>
              )}
            </div>

            {/* Sidebar stack */}
            <aside className="lg:col-span-4 space-y-6">
              {/* Apply CTA */}
              {currentEdition?.status === 'open' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="rounded-2xl border border-surface-700 bg-white/85 p-5 shadow-sm backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Wind className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{t('home.open_call')}</span>
                  </div>
                  <h3 className="mb-2 text-lg font-display font-bold text-white">
                    {t('home.sidebar_title')}
                  </h3>
                  <p className="text-xs text-surface-500 leading-relaxed mb-4">
                    {t('home.sidebar_desc')}
                  </p>
                  <Link to="/apply">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full !bg-[#bd3020] hover:!bg-[#a92a1c] !text-white shadow-lg shadow-[#bd3020]/25"
                      icon={<ArrowRight className="h-4 w-4" />}
                    >
                      {t('home.view_categories')}
                    </Button>
                  </Link>
                </motion.div>
              )}

              {/* Quick Links */}
              <div className="rounded-2xl border border-surface-700 bg-white/85 p-5 shadow-sm backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-4">{t('home.quick_links')}</h3>
                <div className="space-y-2">
                  {[
                    { to: '/about', label: t('home.about_fokus') },
                    { to: '/winners', label: t('home.past_winners') },
                    { to: '/gallery', label: t('home.photo_gallery') },
                    { to: '/contact', label: t('home.contact_us') },
                  ].map(link => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="flex items-center justify-between border-b border-surface-700/80 px-1 py-2 text-sm text-surface-300 transition-colors hover:text-primary-600 last:border-0"
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
      <section className="border-t border-surface-700/50 bg-white/35 py-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center"
          >
            <motion.h2 custom={0} variants={fadeUp} className="mb-10 text-xl font-display font-bold text-white">
              {t('home.partners_title')}
            </motion.h2>
            <motion.div
              custom={1}
              variants={fadeUp}
              className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 lg:gap-12"
            >
              {partners.map((partner) => (
                <a
                  key={partner.id}
                  href={partner.website_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 group hover:opacity-80 transition-opacity"
                >
                  <div className="flex h-16 w-36 items-center justify-center overflow-hidden rounded-lg border border-surface-700 bg-white shadow-sm">
                    {partner.logo_url ? (
                      <img src={partner.logo_url} alt={partner.name} width={144} height={64} className="max-w-full max-h-full object-contain p-2" />
                    ) : (
                      <span className="text-surface-400 text-xs">{partner.name}</span>
                    )}
                  </div>
                  <span className="text-[11px] text-surface-500 font-medium leading-tight text-center max-w-[144px] truncate">
                    {partner.name}
                  </span>
                </a>
              ))}
              {partners.length === 0 && (
                <p className="text-surface-400 text-sm">{t('home.partners_soon')}</p>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>
      {/* Competition Modal */}
      {showCompetitionModal && (
        <Suspense fallback={null}>
          <CompetitionModal isOpen={showCompetitionModal} onClose={handleCloseModal} />
        </Suspense>
      )}
    </div>
  );
}
