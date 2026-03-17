import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FileText, Save, Image as ImageIcon } from 'lucide-react';
import { Button, Card, Input, Textarea } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface PageContent {
  slug: string;
  title_en: string;
  title_al: string;
  content_en: string;
  content_al: string;
}

const PAGE_SLUGS = ['about', 'theme', 'rules', 'prizes'];

export default function AdminContent() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'pages' | 'hero'>('pages');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<Record<string, PageContent>>({});

  // Hero settings (stored in the latest edition)
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroBgUrl, setHeroBgUrl] = useState('');
  const [editionId, setEditionId] = useState('');

  useEffect(() => {
    const fetchPages = async () => {
      const { data } = await supabase
        .from('pages')
        .select('*')
        .in('slug', PAGE_SLUGS);

      if (data) {
        const map: Record<string, PageContent> = {};
        for (const p of data) {
          map[p.slug] = {
            slug: p.slug,
            title_en: p.title_en || '',
            title_al: p.title_al || '',
            content_en: p.content_en || '',
            content_al: p.content_al || '',
          };
        }
        // Ensure all slugs exist
        for (const slug of PAGE_SLUGS) {
          if (!map[slug]) {
            map[slug] = { slug, title_en: '', title_al: '', content_en: '', content_al: '' };
          }
        }
        setPages(map);
      }

      // Fetch latest edition for hero settings
      const { data: edition } = await supabase
        .from('editions')
        .select('id, title, description, hero_image_url')
        .order('year', { ascending: false })
        .limit(1)
        .single();

      if (edition) {
        setEditionId(edition.id);
        setHeroTitle(edition.title || '');
        setHeroSubtitle(edition.description || '');
        setHeroBgUrl(edition.hero_image_url || '');
      }

      setLoading(false);
    };
    fetchPages();
  }, []);

  const updatePage = (slug: string, field: keyof PageContent, value: string) => {
    setPages((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert pages
      for (const slug of PAGE_SLUGS) {
        const page = pages[slug];
        if (!page) continue;
        const { error } = await supabase
          .from('pages')
          .upsert(
            {
              slug: page.slug,
              title_en: page.title_en || null,
              title_al: page.title_al || null,
              content_en: page.content_en || null,
              content_al: page.content_al || null,
            },
            { onConflict: 'slug' }
          );
        if (error) throw error;
      }

      // Update hero in edition
      if (editionId) {
        const { error } = await supabase
          .from('editions')
          .update({
            title: heroTitle,
            description: heroSubtitle,
            hero_image_url: heroBgUrl || null,
          })
          .eq('id', editionId);
        if (error) throw error;
      }

      toast.success('Content saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
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
          <h1 className="text-2xl font-display font-bold text-white">
            {t('admin.content')}
          </h1>
          <p className="text-surface-400 text-sm mt-1">Edit website content and pages</p>
        </div>
        <Button variant="primary" icon={<Save className="h-4 w-4" />} loading={saving} onClick={handleSave}>
          {t('common.save')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-800 pb-0">
        {[
          { key: 'pages', label: 'Pages', icon: <FileText className="h-4 w-4" /> },
          { key: 'hero', label: 'Hero Section', icon: <ImageIcon className="h-4 w-4" /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'pages' | 'hero')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-surface-400 hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'pages' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {PAGE_SLUGS.map((slug) => (
            <Card key={slug} className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white capitalize">{slug} Page</h2>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Title (English)"
                  value={pages[slug]?.title_en || ''}
                  onChange={(e) => updatePage(slug, 'title_en', e.target.value)}
                />
                <Input
                  label="Title (Albanian)"
                  value={pages[slug]?.title_al || ''}
                  onChange={(e) => updatePage(slug, 'title_al', e.target.value)}
                />
              </div>
              <Textarea
                label="Content (English)"
                value={pages[slug]?.content_en || ''}
                onChange={(e) => updatePage(slug, 'content_en', e.target.value)}
                rows={5}
                placeholder={`Write the ${slug} page content...`}
              />
              <Textarea
                label="Content (Albanian)"
                value={pages[slug]?.content_al || ''}
                onChange={(e) => updatePage(slug, 'content_al', e.target.value)}
                rows={5}
                placeholder={`Shkruani përmbajtjen e faqes ${slug}...`}
              />
            </Card>
          ))}
        </motion.div>
      )}

      {activeTab === 'hero' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Hero Section</h2>
            <Input
              label="Title"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
            />
            <Input
              label="Subtitle"
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
            />
            <Input
              label="Background Image URL"
              value={heroBgUrl}
              onChange={(e) => setHeroBgUrl(e.target.value)}
              placeholder="https://..."
            />

            {/* Preview */}
            <div className="mt-6">
              <p className="text-sm text-surface-400 mb-2">Preview</p>
              <div
                className="rounded-xl overflow-hidden relative h-48 bg-surface-800 flex items-center justify-center"
                style={
                  heroBgUrl
                    ? {
                        backgroundImage: `url(${heroBgUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : {}
                }
              >
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative text-center p-6">
                  <p className="text-xs text-primary-400 mb-2">{heroSubtitle}</p>
                  <h3 className="text-xl font-display font-bold text-white">
                    {heroTitle}
                  </h3>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
