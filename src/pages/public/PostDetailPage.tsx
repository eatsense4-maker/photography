import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, Tag, Facebook, ChevronLeft, ChevronRight, X, Images } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { supabase } from '@/lib/supabase';
import type { Post } from '@/types';

export default function PostDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  usePageTitle('News');
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single()
      .then(({ data }) => {
        setPost(data);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-display font-bold text-white">Post not found</h1>
        <Link to="/" className="text-primary-400 hover:text-primary-300 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </div>
    );
  }

  const categoryLabel = post.category.charAt(0).toUpperCase() + post.category.slice(1);

  return (
    <article className="pt-8 pb-20">
      {/* Hero */}
      {post.cover_image_url && (
        <div className="relative h-[35vh] sm:h-[50vh] max-h-[500px] mb-6 sm:mb-12 overflow-hidden">
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/30 to-transparent" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: 'Home', to: '/' },
          { label: 'News', to: '/news' },
          { label: post.title },
        ]} />

        {/* Meta */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4"
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-400">
            <Tag className="h-3 w-3" />
            {categoryLabel}
          </span>
          {post.published_at && (
            <span className="flex items-center gap-1.5 text-xs text-surface-500">
              <Calendar className="h-3 w-3" />
              {new Date(post.published_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </span>
          )}
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl sm:text-4xl md:text-5xl font-display font-bold text-white leading-tight mb-6"
        >
          {post.title}
        </motion.h1>

        {post.excerpt && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-surface-300 leading-relaxed mb-10 font-display italic"
          >
            {post.excerpt}
          </motion.p>
        )}

        {/* Body */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="prose prose-invert prose-lg max-w-none
            prose-headings:font-display prose-headings:text-white
            prose-p:text-surface-200 prose-p:leading-relaxed
            prose-a:text-primary-400 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-white
            prose-blockquote:border-primary-500 prose-blockquote:text-surface-300"
        >
          {post.body?.split('\n').map((paragraph, i) => {
            const trimmed = paragraph.trim();
            if (!trimmed) return <br key={i} />;
            if (trimmed.startsWith('# ')) return <h2 key={i}>{trimmed.slice(2)}</h2>;
            if (trimmed.startsWith('## ')) return <h3 key={i}>{trimmed.slice(3)}</h3>;
            if (trimmed.startsWith('> ')) return <blockquote key={i}><p>{trimmed.slice(2)}</p></blockquote>;
            return <p key={i}>{trimmed}</p>;
          })}
        </motion.div>

        {/* Facebook Embed */}
        {post.facebook_url && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-10"
          >
            <div className="flex items-center gap-2 mb-4">
              <Facebook className="h-5 w-5 text-[#1877F2]" />
              <span className="text-sm font-semibold text-surface-300">Facebook Post</span>
            </div>
            <div className="rounded-xl overflow-hidden border border-surface-800 bg-surface-900">
              <iframe
                src={`https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(post.facebook_url)}&width=500&show_text=true&appId`}
                width="500"
                height="600"
                className="w-full border-0"
                style={{ maxWidth: '500px' }}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                title="Facebook Post"
              />
            </div>
          </motion.div>
        )}

        {/* Image Gallery */}
        {post.gallery_images && post.gallery_images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12"
          >
            <div className="flex items-center gap-2 mb-5">
              <Images className="h-5 w-5 text-primary-400" />
              <h2 className="text-lg font-display font-semibold text-white">
                Gallery
                <span className="text-surface-500 text-sm font-normal ml-2">
                  ({post.gallery_images.length} {post.gallery_images.length === 1 ? 'photo' : 'photos'})
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {post.gallery_images.map((url, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 * i }}
                  className="relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group"
                  onClick={() => setLightboxIndex(i)}
                >
                  <img
                    src={url}
                    alt={`${post.title} — photo ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-surface-950/0 group-hover:bg-surface-950/30 transition-colors" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Bottom nav */}
        <div className="mt-16 pt-8 border-t border-surface-800">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-primary-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to latest news
          </Link>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && post.gallery_images && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-surface-950/95 flex items-center justify-center"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              onClick={() => setLightboxIndex(null)}
              aria-label="Close lightbox"
              className="absolute top-4 right-4 p-2 rounded-full bg-surface-800/80 text-surface-300 hover:text-white transition-colors z-10 cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="absolute top-4 left-4 text-sm text-surface-400 z-10">
              {lightboxIndex + 1} / {post.gallery_images.length}
            </div>

            {lightboxIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
                aria-label="Previous image"
                className="absolute left-4 p-2 rounded-full bg-surface-800/80 text-surface-300 hover:text-white transition-colors z-10 cursor-pointer"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {lightboxIndex < post.gallery_images.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
                aria-label="Next image"
                className="absolute right-4 p-2 rounded-full bg-surface-800/80 text-surface-300 hover:text-white transition-colors z-10 cursor-pointer"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            <motion.img
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              src={post.gallery_images[lightboxIndex]}
              alt={`${post.title} — photo ${lightboxIndex + 1}`}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
