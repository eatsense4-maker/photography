import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Edition, Partner, Post } from '@/types';

/* ---------- static data ---------- */
const PAST_WINNERS = [
  { url: 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev/gallery/2023/main-first-place-2023.jpeg', label: 'Things Have Changed — 1st Place', edition: 'IFFA 14 · 2023' },
  { url: 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev/gallery/2023/PEOPLE1.jpeg', label: 'People — 1st Place', edition: 'IFFA 14 · 2023' },
  { url: 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev/gallery/2023/LANDWIN.jpeg', label: 'Land — 1st Place', edition: 'IFFA 14 · 2023' },
  { url: 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev/gallery/2022/Mourning.jpg', label: 'The Other — 1st Place', edition: 'IFFA 13 · 2022' },
  { url: 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev/gallery/2023/LIFE1.jpeg', label: 'Life — 1st Place', edition: 'IFFA 14 · 2023' },
  { url: 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev/gallery/2022/Pershendetja-e-fundit.jpg', label: 'Portrait — 1st Place', edition: 'IFFA 13 · 2022' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

/* ---------- component ---------- */
export default function HomePage() {
  const { t } = useTranslation();

  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [featuredPost, setFeaturedPost] = useState<Post | null>(null);

  useEffect(() => {
    // Current edition
    supabase
      .from('editions')
      .select('*')
      .eq('published', true)
      .order('year', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { if (data) setCurrentEdition(data); });

    // Partners
    supabase
      .from('partners')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => setPartners(data || []));

    // Posts
    supabase
      .from('posts')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(7)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const feat = data.find(p => p.featured) || data[0];
          setFeaturedPost(feat);
          setPosts(data.filter(p => p.id !== feat.id));
        }
      });
  }, []);

  const stats = [
    { icon: <Camera className="h-5 w-5" />, value: '17', label: 'Editions' },
    { icon: <Globe2 className="h-5 w-5" />, value: '100+', label: 'Countries' },
    { icon: <Users className="h-5 w-5" />, value: '1,500+', label: 'Photographers' },
    { icon: <ImageIcon className="h-5 w-5" />, value: '2,000+', label: 'Photos' },
  ];

  return (
    <div className="relative">

      {/* ===== Compact Hero / Header ===== */}
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?w=1920&h=600&fit=crop)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-950/95 to-surface-950" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-4"
              >
                <Award className="h-5 w-5 text-gold-400" />
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-surface-400">
                  International Fine Art & Photography Award
                </span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-5xl font-display font-bold text-white leading-tight"
              >
                FOKUS Award
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-surface-400 mt-2 max-w-lg"
              >
                Celebrating photographic excellence since 2009. News, events, and stories from the world of fine-art photography.
              </motion.p>
            </div>

            {/* Quick stats bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-6"
            >
              {stats.map(s => (
                <div key={s.label} className="text-center">
                  <div className="flex items-center justify-center text-primary-400 mb-1">{s.icon}</div>
                  <p className="text-lg font-bold text-white font-display leading-none">{s.value}</p>
                  <p className="text-[10px] text-surface-500 uppercase tracking-wider mt-0.5">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== Magazine Content Area ===== */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">

            {/* ── Main column (2 cols) ── */}
            <div className="lg:col-span-2 space-y-8">

              {/* Featured Post */}
              {featuredPost ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Link to={`/news/${featuredPost.slug}`} className="group block">
                    <div className="relative rounded-2xl overflow-hidden aspect-[16/9] bg-surface-800">
                      {featuredPost.cover_image_url ? (
                        <img
                          src={featuredPost.cover_image_url}
                          alt={featuredPost.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Newspaper className="h-16 w-16 text-surface-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-950/90 via-surface-950/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="primary">{featuredPost.category}</Badge>
                          {featuredPost.published_at && (
                            <span className="text-xs text-surface-400">
                              {new Date(featuredPost.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <h2 className="text-2xl md:text-3xl font-display font-bold text-white group-hover:text-primary-300 transition-colors leading-tight">
                          {featuredPost.title}
                        </h2>
                        {featuredPost.excerpt && (
                          <p className="text-surface-300 mt-2 line-clamp-2 max-w-2xl">
                            {featuredPost.excerpt}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ) : (
                /* No posts yet — show a placeholder */
                <div className="rounded-2xl border-2 border-dashed border-surface-800 bg-surface-900/30 p-12 text-center">
                  <Newspaper className="h-12 w-12 text-surface-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-surface-400">Latest News</h3>
                  <p className="text-sm text-surface-600 mt-1">Posts published by admin will appear here.</p>
                </div>
              )}

              {/* Post Grid */}
              {posts.length > 0 && (
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={stagger}
                  className="grid sm:grid-cols-2 gap-6"
                >
                  {posts.slice(0, 4).map((post, i) => (
                    <motion.div key={post.id} custom={i} variants={fadeUp}>
                      <Link to={`/news/${post.slug}`} className="group block">
                        <div className="rounded-xl overflow-hidden bg-surface-900 border border-surface-800 hover:border-surface-700 transition-colors">
                          <div className="aspect-[16/10] bg-surface-800 overflow-hidden">
                            {post.cover_image_url ? (
                              <img
                                src={post.cover_image_url}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Newspaper className="h-8 w-8 text-surface-600" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-400">
                                {post.category}
                              </span>
                              {post.published_at && (
                                <span className="text-[10px] text-surface-500">
                                  {new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-white text-sm leading-snug group-hover:text-primary-300 transition-colors line-clamp-2">
                              {post.title}
                            </h3>
                            {post.excerpt && (
                              <p className="text-xs text-surface-400 mt-1.5 line-clamp-2">{post.excerpt}</p>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Past Winners Gallery (kept) */}
              <div className="pt-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-display font-bold text-white">Award-Winning Work</h2>
                  <Link to="/gallery" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
                    View Gallery <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <p className="text-white text-xs font-semibold leading-tight">{photo.label}</p>
                        <p className="text-gold-400 text-[10px] mt-0.5">{photo.edition}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Sidebar (1 col) ── */}
            <aside className="space-y-8">

              {/* Current Theme Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl overflow-hidden border border-surface-800 bg-surface-900"
              >
                <div className="relative h-40 bg-gradient-to-br from-primary-950 to-surface-900 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-30"
                    style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?w=600&h=300&fit=crop)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-900 to-transparent" />
                  <div className="relative p-5 flex flex-col justify-end h-full">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-400 mb-1">
                      2026 Theme
                    </span>
                    <h3 className="text-3xl font-display font-bold text-white leading-none">
                      FRYMË
                    </h3>
                    <p className="text-gold-400 font-display italic text-lg">BREATH</p>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-surface-300 leading-relaxed mb-4">
                    Breath is the most ordinary miracle — constant, unconscious, taken for granted until the loss of a single breath changes everything.
                  </p>
                  {currentEdition?.status === 'open' && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Submissions Open</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-surface-500 mb-5">
                    <Calendar className="h-3.5 w-3.5" />
                    Deadline: <strong className="text-white">30 June 2026</strong>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link to="/theme">
                      <Button variant="secondary" size="sm" className="w-full" icon={<ArrowRight className="h-4 w-4" />}>
                        Explore Theme
                      </Button>
                    </Link>
                    <Link to="/register">
                      <Button variant="gold" size="sm" className="w-full">
                        Submit Your Work
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>

              {/* Submission CTA */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl border border-surface-800 bg-surface-900 p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Wind className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Open Call</span>
                </div>
                <h3 className="text-lg font-display font-bold text-white mb-2">
                  What does your breath look like?
                </h3>
                <p className="text-xs text-surface-400 leading-relaxed mb-4">
                  Submit a series (6–12 images) or single image (1–3) exploring breath — intimate, ecological, political, or alive.
                </p>
                <ul className="space-y-1.5 text-xs text-surface-500 mb-5">
                  <li>No entry fee</li>
                  <li>Open to photographers 18+ worldwide</li>
                  <li>JPEG sRGB · 2500–4000 px</li>
                </ul>
                <Link to="/register">
                  <Button variant="gold" size="sm" className="w-full" icon={<ArrowRight className="h-4 w-4" />}>
                    Submit by 30 June 2026
                  </Button>
                </Link>
              </motion.div>

              {/* Recent Posts List (sidebar compact) */}
              {posts.length > 4 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="rounded-2xl border border-surface-800 bg-surface-900 p-5"
                >
                  <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">More Stories</h3>
                  <div className="space-y-4">
                    {posts.slice(4).map(post => (
                      <Link key={post.id} to={`/news/${post.slug}`} className="group block">
                        <p className="text-sm text-white font-medium group-hover:text-primary-300 transition-colors leading-snug line-clamp-2">
                          {post.title}
                        </p>
                        <span className="text-[10px] text-surface-500 mt-0.5 block">
                          {post.published_at && new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' · '}{post.category}
                        </span>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
    </div>
  );
}
