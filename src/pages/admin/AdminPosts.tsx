import { useState, useEffect, useRef } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { motion } from 'framer-motion';
import {
  Plus, Edit, Trash2, Eye, EyeOff, Star, StarOff,
  Upload, X, Loader2, Newspaper, Calendar as CalendarIcon,
  Pin, PinOff, ImageIcon, Crown,
} from 'lucide-react';
import { Button, Card, Modal, Input, Textarea, Select, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Post, PostCategory } from '@/types';
import toast from 'react-hot-toast';

const CATEGORY_OPTIONS = [
  { value: 'news', label: 'Kulture' },
  { value: 'event', label: 'Arte Figurative' },
  { value: 'announcement', label: 'Announcement' },
];

const CATEGORY_COLORS: Record<PostCategory, 'primary' | 'info' | 'gold'> = {
  news: 'primary',
  event: 'info',
  announcement: 'gold',
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function AdminPosts() {
  usePageTitle('Posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [category, setCategory] = useState<PostCategory>('news');
  const [featured, setFeatured] = useState(false);
  const [published, setPublished] = useState(false);
  const [facebookUrl, setFacebookUrl] = useState('');
  const [pinned, setPinned] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const resetForm = () => {
    setTitle(''); setSlug(''); setExcerpt(''); setBody('');
    setCoverUrl(''); setCategory('news'); setFeatured(false);
    setPublished(false);
    setFacebookUrl(''); setPinned(false); setGalleryImages([]);
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (post: Post) => {
    setEditing(post);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt || '');
    setBody(post.body || '');
    setCoverUrl(post.cover_image_url || '');
    setCategory(post.category);
    setFeatured(post.featured);
    setPublished(post.published);
    setFacebookUrl(post.facebook_url || '');
    setPinned(post.pinned);
    setGalleryImages(post.gallery_images || []);
    setShowModal(true);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!editing) setSlug(slugify(value));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5 MB'); return; }

    try {
      setUploading(true);
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `posts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from('partners')
        .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('partners').getPublicUrl(filePath);
      const url = pub.publicUrl;
      setGalleryImages(prev => [...prev, url]);
      if (!coverUrl) { setCoverUrl(url); }
      toast.success('Image uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGalleryMultiSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} exceeds 5 MB`); continue; }

      try {
        const ext = file.name.split('.').pop() || 'jpg';
        const filePath = `posts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage
          .from('partners')
          .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type });
        if (error) throw error;
        const { data: pub } = supabase.storage.from('partners').getPublicUrl(filePath);
        newUrls.push(pub.publicUrl);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (newUrls.length > 0) {
      setGalleryImages(prev => {
        const updated = [...prev, ...newUrls];
        if (!coverUrl) { setCoverUrl(newUrls[0]); }
        return updated;
      });
      toast.success(`${newUrls.length} image${newUrls.length > 1 ? 's' : ''} uploaded`);
    }

    setUploading(false);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const setAsCover = (url: string) => {
    setCoverUrl(url);
    toast.success('Cover image updated');
  };

  const removeGalleryImage = (url: string) => {
    setGalleryImages(prev => prev.filter(u => u !== url));
    if (coverUrl === url) {
      const remaining = galleryImages.filter(u => u !== url);
      setCoverUrl(remaining[0] || '');
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !slug.trim()) { toast.error('Title and slug are required'); return; }
    setSaving(true);

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || null,
      body: body.trim() || null,
      cover_image_url: coverUrl || null,
      gallery_images: galleryImages,
      facebook_url: facebookUrl.trim() || null,
      category,
      featured,
      pinned,
      published,
      published_at: published ? (editing?.published_at || new Date().toISOString()) : null,
    };

    if (editing) {
      const { error } = await supabase.from('posts').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Post updated');
    } else {
      const { error } = await supabase.from('posts').insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Post created');
    }
    setSaving(false);
    setShowModal(false);
    fetchPosts();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('posts').delete().eq('id', deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success('Post deleted');
    setDeleteId(null);
    fetchPosts();
  };

  const togglePublish = async (post: Post) => {
    const newPublished = !post.published;
    await supabase.from('posts').update({
      published: newPublished,
      published_at: newPublished ? (post.published_at || new Date().toISOString()) : null,
    }).eq('id', post.id);
    fetchPosts();
    toast.success(newPublished ? 'Published' : 'Unpublished');
  };

  const toggleFeatured = async (post: Post) => {
    await supabase.from('posts').update({ featured: !post.featured }).eq('id', post.id);
    fetchPosts();
    toast.success(post.featured ? 'Unfeatured' : 'Featured');
  };

  const togglePinned = async (post: Post) => {
    await supabase.from('posts').update({ pinned: !post.pinned }).eq('id', post.id);
    fetchPosts();
    toast.success(post.pinned ? 'Unpinned' : 'Pinned');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">News & Events</h1>
          <p className="text-surface-400 text-sm mt-1">
            Manage posts displayed on the homepage magazine feed
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          New Post
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card className="p-12 text-center">
          <Newspaper className="h-12 w-12 text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No posts yet</h3>
          <p className="text-surface-400 text-sm mb-6">Create your first news post or event.</p>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            New Post
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-0 overflow-hidden">
                <div className="flex items-stretch">
                  {/* Thumbnail */}
                  <div className="w-40 flex-shrink-0 bg-surface-800">
                    {post.cover_image_url ? (
                      <img src={post.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center min-h-[100px]">
                        <Newspaper className="h-8 w-8 text-surface-600" />
                      </div>
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant={CATEGORY_COLORS[post.category]}>{post.category}</Badge>
                          {post.pinned && <Badge variant="gold">📌 Pinned</Badge>}
                          {post.featured && <Badge variant="gold">Featured</Badge>}
                          {post.facebook_url && <Badge variant="info">FB</Badge>}
                          {post.gallery_images?.length > 1 && (
                            <Badge variant="primary">
                              <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" />{post.gallery_images.length}</span>
                            </Badge>
                          )}
                          {!post.published && <Badge variant="warning">Draft</Badge>}
                        </div>
                        <h3 className="text-white font-semibold truncate">{post.title}</h3>
                        {post.excerpt && (
                          <p className="text-surface-400 text-sm mt-1 line-clamp-1">{post.excerpt}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-surface-500">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                          <span>/news/{post.slug}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost" size="sm"
                          icon={post.pinned ? <PinOff className="h-4 w-4 text-gold-400" /> : <Pin className="h-4 w-4" />}
                          onClick={() => togglePinned(post)}
                        />
                        <Button
                          variant="ghost" size="sm"
                          icon={post.featured ? <StarOff className="h-4 w-4 text-gold-400" /> : <Star className="h-4 w-4" />}
                          onClick={() => toggleFeatured(post)}
                        />
                        <Button
                          variant="ghost" size="sm"
                          icon={post.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          onClick={() => togglePublish(post)}
                        />
                        <Button variant="ghost" size="sm" icon={<Edit className="h-4 w-4" />} onClick={() => openEdit(post)} />
                        <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4 text-red-400" />} onClick={() => setDeleteId(post.id)} />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Post' : 'New Post'} size="3xl">
        <div className="max-h-[80vh] overflow-y-auto pr-1 -mr-1">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* ── Left column: Content (3/5) ── */}
            <div className="lg:col-span-3 space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500">Content</h4>
                <div className="h-px bg-surface-800" />
              </div>

              <Input label="Title" value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Post title" />
              <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="post-url-slug" />

              <Select
                label="Category"
                options={CATEGORY_OPTIONS}
                value={category}
                onChange={(e) => setCategory(e.target.value as PostCategory)}
              />

              <Textarea label="Excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} placeholder="Short summary shown on cards..." />
              <Textarea label="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={12} placeholder="Full post content..." />

              {/* Facebook URL */}
              <div className="space-y-1">
                <Input
                  label="Facebook Post URL"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://www.facebook.com/..."
                />
                <p className="text-[10px] text-surface-500">Optional — paste a public Facebook post link to embed it.</p>
              </div>
            </div>

            {/* ── Right column: Media & Settings (2/5) ── */}
            <div className="lg:col-span-2 space-y-4">
              {/* Images Section */}
              <div className="space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500">Images</h4>
                <div className="h-px bg-surface-800" />
              </div>

              <div className="space-y-3">
                {galleryImages.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-surface-400">{galleryImages.length} image{galleryImages.length !== 1 ? 's' : ''}</span>
                      <span className="text-[10px] text-surface-500 flex items-center gap-1"><Crown className="h-3 w-3 text-gold-400" /> = cover</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {galleryImages.map((url) => (
                        <div
                          key={url}
                          className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                            coverUrl === url ? 'border-gold-400' : 'border-surface-700 hover:border-surface-500'
                          }`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {coverUrl === url && (
                            <div className="absolute top-1 left-1 bg-gold-500 text-surface-950 rounded-full p-0.5">
                              <Crown className="h-3 w-3" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-surface-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                            {coverUrl !== url && (
                              <button
                                type="button"
                                onClick={() => setAsCover(url)}
                                className="p-1.5 rounded-full bg-surface-800/90 text-gold-400 hover:bg-gold-500 hover:text-surface-950 transition-colors cursor-pointer"
                                title="Set as cover"
                              >
                                <Crown className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeGalleryImage(url)}
                              className="p-1.5 rounded-full bg-surface-800/90 text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                              title="Remove"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-surface-700 bg-surface-800/30 p-6 text-center">
                    <ImageIcon className="h-8 w-8 text-surface-600 mx-auto mb-2" />
                    <p className="text-xs text-surface-500">No images yet</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-surface-700 bg-surface-800/50 hover:border-primary-500/50 transition-all cursor-pointer disabled:opacity-50 text-sm text-surface-400"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary-400" />
                  ) : (
                    <Upload className="h-4 w-4 text-surface-500" />
                  )}
                  {uploading ? 'Uploading...' : galleryImages.length > 0 ? 'Add more' : 'Upload images'}
                </button>
                <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryMultiSelect} />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                <button
                  type="button"
                  onClick={() => {
                    const u = prompt('Image URL:');
                    if (u) {
                      setGalleryImages(prev => [...prev, u]);
                      if (!coverUrl) { setCoverUrl(u); }
                    }
                  }}
                  className="text-xs text-surface-500 hover:text-primary-400 transition-colors cursor-pointer"
                >
                  Or paste URL
                </button>
              </div>

              {/* Settings Section */}
              <div className="space-y-1 pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500">Settings</h4>
                <div className="h-px bg-surface-800" />
              </div>

              <div className="space-y-3 rounded-lg border border-surface-800 bg-surface-800/30 p-4">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm text-surface-300 group-hover:text-white transition-colors">Published</span>
                  <div className={`relative w-9 h-5 rounded-full transition-colors ${
                    published ? 'bg-emerald-500' : 'bg-surface-600'
                  }`} onClick={() => setPublished(!published)}>
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      published ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm text-surface-300 group-hover:text-white transition-colors">Featured</span>
                  <div className={`relative w-9 h-5 rounded-full transition-colors ${
                    featured ? 'bg-gold-500' : 'bg-surface-600'
                  }`} onClick={() => setFeatured(!featured)}>
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      featured ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm text-surface-300 group-hover:text-white transition-colors">📌 Pinned</span>
                  <div className={`relative w-9 h-5 rounded-full transition-colors ${
                    pinned ? 'bg-gold-500' : 'bg-surface-600'
                  }`} onClick={() => setPinned(!pinned)}>
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      pinned ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                <Button variant="primary" onClick={handleSave} loading={saving} className="flex-1">
                  {editing ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>

          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Post">
        <p className="text-surface-300">Are you sure? This cannot be undone.</p>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
