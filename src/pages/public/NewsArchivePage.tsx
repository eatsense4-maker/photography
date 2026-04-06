import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Newspaper,
  Calendar,
  Megaphone,
  Facebook,
  Search,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Post, PostCategory } from '@/types';

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

const CATEGORIES: { value: PostCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'news', label: 'News' },
  { value: 'event', label: 'Events' },
  { value: 'announcement', label: 'Announcements' },
];

function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NewsArchivePage() {
  usePageTitle('News');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PostCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .from('posts')
      .select('*')
      .eq('published', true)
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        setPosts(data || []);
        setLoading(false);
      });
  }, []);

  const filtered = posts.filter(p => {
    if (filter !== 'all' && p.category !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.excerpt?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="relative">
      {/* Header */}
      <section className="relative pt-8 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-950/95 to-surface-950" />
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link to="/" className="text-sm text-surface-500 hover:text-primary-400 transition-colors mb-4 inline-block">
              &larr; Back to Home
            </Link>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">
              News & Events
            </h1>
            <p className="text-surface-400 mt-2">
              All posts, events, and announcements from the FOKUS Award.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-surface-800 sticky top-16 z-20 bg-surface-950/90 backdrop-blur-sm">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4">
            {/* Category pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setFilter(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    filter === cat.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="relative sm:ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search posts..."
                className="w-full sm:w-64 pl-9 pr-8 py-2 rounded-lg bg-surface-800 border border-surface-700 text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Post list */}
      <section className="py-10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl bg-surface-800 h-64" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Newspaper className="h-12 w-12 text-surface-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-surface-400">No posts found</h3>
              <p className="text-sm text-surface-600 mt-1">
                {search ? 'Try a different search term.' : 'No posts in this category yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-surface-500 mb-2">{filtered.length} post{filtered.length !== 1 ? 's' : ''}</p>
              {filtered.map((post, i) => {
                const isNew = post.published_at && (Date.now() - new Date(post.published_at).getTime()) < 7 * 24 * 60 * 60 * 1000;
                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  >
                    <Link
                      to={`/news/${post.slug}`}
                      className="group flex gap-4 sm:gap-5 items-start p-4 rounded-xl bg-surface-900/50 border border-surface-800 hover:border-surface-700 hover:bg-surface-900 transition-colors"
                    >
                      {/* Thumbnail */}
                      <div className="shrink-0 w-24 h-18 sm:w-40 sm:h-28 rounded-lg overflow-hidden bg-surface-800 relative">
                        {post.cover_image_url ? (
                          <img
                            src={post.cover_image_url}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Newspaper className="h-6 w-6 text-surface-600" />
                          </div>
                        )}
                        {isNew && (
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-500 text-white leading-none tracking-wider">
                            New
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${CATEGORY_COLORS[post.category]}`}>
                            {CATEGORY_ICONS[post.category]} {post.category}
                          </span>
                          {post.pinned && (
                            <span className="text-[10px] font-semibold text-gold-400">Pinned</span>
                          )}
                          <span className="text-[10px] text-surface-500">{formatDate(post.published_at)}</span>
                          {post.facebook_url && <Facebook className="h-3 w-3 text-[#1877F2]" />}
                        </div>
                        <h3 className="font-semibold text-white text-base leading-snug group-hover:text-primary-300 transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="text-sm text-surface-400 mt-1.5 line-clamp-2 hidden sm:block">{post.excerpt}</p>
                        )}
                      </div>

                      <ArrowRight className="h-4 w-4 text-surface-600 group-hover:text-primary-400 transition-colors mt-2 shrink-0 hidden sm:block" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
