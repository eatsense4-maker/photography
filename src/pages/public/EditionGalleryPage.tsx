import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Trophy,
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
  ArrowLeft,
  Users,
  Tag,
  Facebook,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getPhotoUrl } from '@/lib/r2';

/* ── types ────────────────────────────────────────────────────── */
interface JuryMember {
  name: string;
  country: string;
}

interface GalleryEdition {
  number: number;
  year: number;
  title: string;
  slug: string;
  theme: string | null;
  winner: string | null;
  photoCount: number;
  jury?: JuryMember[];
  curators?: JuryMember[];
  categories?: string[];
  mainCategory?: string;
}

interface GalleryPhoto {
  r2Key: string;
  url: string;
  category: string | null;
  isWinner: boolean;
  place?: number | null;
  title?: string | null;
  photographer: string | null;
  edition: number;
  year: number;
  isJury?: boolean;
}

interface GalleryData {
  editions: GalleryEdition[];
  photos: GalleryPhoto[];
}

interface FacebookAlbum {
  label: string;
  url: string;
}

/* ── helpers ──────────────────────────────────────────────────── */
function catId(name: string) {
  return 'cat-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
}

function PlaceBadge({ place }: { place: number }) {
  const cfg: Record<number, { label: string; cls: string }> = {
    1: { label: '1st Prize', cls: 'bg-gold-500/90 text-black' },
    2: { label: '2nd Prize', cls: 'bg-slate-300/90 text-black' },
    3: { label: '3rd Prize', cls: 'bg-amber-600/90 text-white' },
  };
  const c = cfg[place] ?? cfg[1];
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${c.cls} backdrop-blur-sm`}>
      <Trophy className="h-3 w-3" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{c.label}</span>
    </div>
  );
}

const FACEBOOK_GALLERY_ALBUMS: Record<number, FacebookAlbum[]> = {
  2025: [
    { label: 'Theme Category', url: 'https://www.facebook.com/media/set/?set=a.1475971483975208&type=3' },
    { label: 'Press & News', url: 'https://www.facebook.com/media/set/?set=a.1475927220646301&type=3' },
    { label: 'People', url: 'https://www.facebook.com/media/set/?set=a.1475121494060207&type=3' },
    { label: 'Life', url: 'https://www.facebook.com/media/set/?set=a.1475098394062517&type=3' },
    { label: 'Land', url: 'https://www.facebook.com/media/set/?set=a.1475091240729899&type=3' },
  ],
  2024: [
    { label: 'Theme Category', url: 'https://www.facebook.com/media/set/?set=a.1151499996422360&type=3' },
    { label: 'Press & News', url: 'https://www.facebook.com/media/set/?set=a.1151497373089289&type=3' },
    { label: 'People', url: 'https://www.facebook.com/media/set/?set=a.1151494886422871&type=3' },
    { label: 'Life', url: 'https://www.facebook.com/media/set/?set=a.1151490416423318&type=3' },
    { label: 'Land', url: 'https://www.facebook.com/media/set/?set=a.1151485376423822&type=3' },
  ],
  2023: [
    { label: 'Life', url: 'https://www.facebook.com/media/set/?set=a.908725034033192&type=3' },
    { label: 'Theme Category', url: 'https://www.facebook.com/media/set/?set=a.907135044192191&type=3' },
    { label: 'Press & News', url: 'https://www.facebook.com/media/set/?set=a.907133110859051&type=3' },
    { label: 'People', url: 'https://www.facebook.com/media/set/?set=a.907131530859209&type=3' },
    { label: 'Land', url: 'https://www.facebook.com/media/set/?set=a.907122024193493&type=3' },
  ],
  2022: [
    { label: 'Theme Category', url: 'https://www.facebook.com/media/set/?set=a.642015977370767&type=3' },
    { label: 'Press & News', url: 'https://www.facebook.com/media/set/?set=a.642033864035645&type=3' },
    { label: 'Wedding', url: 'https://www.facebook.com/media/set/?set=a.643719430533755&type=3' },
    { label: 'Fashion', url: 'https://www.facebook.com/media/set/?set=a.633767921528906&type=3' },
    { label: 'Street', url: 'https://www.facebook.com/media/set/?set=a.633787691526929&type=3' },
    { label: 'Portrait', url: 'https://www.facebook.com/media/set/?set=a.633776798194685&type=3' },
  ],
};

function getFacebookEmbedUrl(url: string) {
  return `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500`;
}

/* ── component ────────────────────────────────────────────────── */
export default function EditionGalleryPage() {
  const { t } = useTranslation();
  usePageTitle('Gallery');
  const { year } = useParams<{ year: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<GalleryPhoto | null>(null);
  const [lightboxSet, setLightboxSet] = useState<GalleryPhoto[]>([]);
  const [visibleCount, setVisibleCount] = useState(48);
  const observerRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const yearNum = Number(year);
    fetch('/gallery-data.json')
      .then((r) => r.json())
      .then(async (d: GalleryData) => {
        // Check if edition exists in legacy JSON
        const found = d.editions.find((e) => e.year === yearNum);
        if (found) {
          setData(d);
          setLoading(false);
        } else {
          // Fallback: fetch from Supabase for published DB editions
          const dbData = await fetchDbEditionData(yearNum);
          if (dbData) {
            setData({
              editions: [...d.editions, dbData.edition],
              photos: [...d.photos, ...dbData.photos],
            });
          } else {
            setData(d);
          }
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [year]);

  async function fetchDbEditionData(yr: number): Promise<{ edition: GalleryEdition; photos: GalleryPhoto[] } | null> {
    const { data: ed } = await supabase
      .from('editions')
      .select('id, title, slug, year, theme, published, results_published')
      .eq('year', yr)
      .eq('published', true)
      .eq('results_published', true)
      .single();

    if (!ed) return null;

    // Fetch categories
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name')
      .eq('edition_id', ed.id);

    // Fetch approved photos
    const { data: subs } = await supabase
      .from('submissions')
      .select(`
        id, category_id, user_id,
        categories!submissions_category_id_fkey(name),
        submission_photos!inner(id, storage_key, status)
      `)
      .eq('edition_id', ed.id);

    const userIds = [...new Set(((subs || []) as Array<{ user_id: string }>).map((s) => s.user_id).filter(Boolean))];
    const { data: profiles } = userIds.length
      ? await supabase.from('public_profiles').select('id, full_name').in('id', userIds)
      : { data: [] };
    const profileNames = new Map((profiles || []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]));

    // Fetch scores
    const { data: allScores } = await supabase
      .from('scores')
      .select('score, photo_id')
      .not('photo_id', 'is', null)
      .not('score', 'is', null);

    const photoAvg = new Map<string, number[]>();
    for (const s of (allScores || []) as any[]) {
      if (!photoAvg.has(s.photo_id)) photoAvg.set(s.photo_id, []);
      photoAvg.get(s.photo_id)!.push(Number(s.score));
    }

    // Compute per-category winners (top 3)
    type PhInfo = { id: string; key: string; cat: string; photographer: string; avg: number };
    const byCat = new Map<string, PhInfo[]>();
    for (const sub of (subs || []) as any[]) {
      const catName = sub.categories?.name || '';
      if (!byCat.has(catName)) byCat.set(catName, []);
      for (const photo of sub.submission_photos || []) {
        const scores = photoAvg.get(photo.id);
        const avg = scores ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
        byCat.get(catName)!.push({
          id: photo.id, key: photo.storage_key,
          cat: catName, photographer: profileNames.get(sub.user_id) || '',
          avg,
        });
      }
    }

    // Mark winners per category
    const winnerIds = new Set<string>();
    const winnerPlace = new Map<string, number>();
    for (const [, catPhotos] of byCat) {
      catPhotos.sort((a, b) => b.avg - a.avg);
      for (let i = 0; i < Math.min(3, catPhotos.length); i++) {
        winnerIds.add(catPhotos[i].id);
        winnerPlace.set(catPhotos[i].id, i + 1);
      }
    }

    // Build photos array
    const photos: GalleryPhoto[] = [];
    let topWinner: string | null = null;
    let topAvg = 0;
    for (const sub of (subs || []) as any[]) {
      for (const photo of sub.submission_photos || []) {
        const isW = winnerIds.has(photo.id);
        const place = winnerPlace.get(photo.id) ?? null;
        const scores = photoAvg.get(photo.id);
        const avg = scores ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
        const photographer = profileNames.get(sub.user_id) || null;
        if (avg > topAvg) { topAvg = avg; topWinner = photographer; }
        photos.push({
          r2Key: photo.storage_key,
          url: getPhotoUrl(photo.storage_key),
          category: sub.categories?.name || null,
          isWinner: isW,
          place,
          title: null,
          photographer,
          edition: yr,
          year: yr,
        });
      }
    }

    const edition: GalleryEdition = {
      number: yr,
      year: yr,
      title: ed.title,
      slug: ed.slug,
      theme: ed.theme,
      winner: topWinner,
      photoCount: photos.length,
      categories: (cats || []).map(c => c.name),
    };

    return { edition, photos };
  }

  const yearNum = Number(year);
  const edition = data?.editions.find((e) => e.year === yearNum) ?? null;
  const facebookAlbums = FACEBOOK_GALLERY_ALBUMS[yearNum] ?? [];

  /* All non-jury photos for this edition */
  const photos = useMemo(() => {
    if (!data || !edition) return [];
    return data.photos
      .filter((p) => p.edition === edition.number && !p.isJury)
      .sort((a, b) => {
        if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1;
        return (a.place ?? 99) - (b.place ?? 99);
      });
  }, [data, edition]);

  /* Category sections (multi-category editions only) */
  const categorySections = useMemo(() => {
    if (!edition?.categories?.length) return null;
    const sections = edition.categories.map((cat) => {
      const catPhotos = photos.filter((p) => p.category === cat);
      return {
        name: cat,
        id: catId(cat),
        isMain: cat === edition.mainCategory,
        winners: catPhotos.filter((p) => p.isWinner).sort((a, b) => (a.place ?? 99) - (b.place ?? 99)),
        participants: catPhotos.filter((p) => !p.isWinner),
        allPhotos: catPhotos,
      };
    });
    const visibleSections = sections.filter((section) => section.allPhotos.length > 0);
    return visibleSections.length > 0 ? visibleSections : null;
  }, [edition, photos]);

  /* Legacy single-edition helpers */
  const legacyWinners = useMemo(() => photos.filter((p) => p.isWinner), [photos]);
  const visiblePhotos = photos.slice(0, visibleCount);
  const hasMore = visibleCount < photos.length;
  const hideEmptyGalleryState = photos.length === 0 && facebookAlbums.length > 0;

  /* Infinite scroll (legacy only) */
  useEffect(() => {
    if (categorySections || !observerRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount((c) => c + 48); },
      { rootMargin: '400px' },
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [categorySections, hasMore, photos.length]);

  /* Lightbox */
  const openLightbox = useCallback((photo: GalleryPhoto, set: GalleryPhoto[]) => {
    setLightbox(photo);
    setLightboxSet(set);
  }, []);

  const lightboxIdx = lightbox && lightboxSet.length ? lightboxSet.indexOf(lightbox) : -1;
  const goPrev = useCallback(() => {
    if (lightboxIdx > 0) setLightbox(lightboxSet[lightboxIdx - 1]);
  }, [lightboxIdx, lightboxSet]);
  const goNext = useCallback(() => {
    if (lightboxIdx < lightboxSet.length - 1) setLightbox(lightboxSet[lightboxIdx + 1]);
  }, [lightboxIdx, lightboxSet]);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, goPrev, goNext]);

  useEffect(() => {
    document.body.style.overflow = lightbox ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [lightbox]);

  /* Scroll to category section */
  const scrollToCategory = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const tabH = tabBarRef.current?.offsetHeight ?? 0;
    const y = el.getBoundingClientRect().top + window.scrollY - 64 - tabH - 16;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }, []);

  /* ── render ──────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="bg-surface-950 min-h-screen pt-32 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-pulse h-8 w-48 bg-surface-800 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-surface-800 rounded-xl aspect-[3/4]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!edition) {
    return (
      <div className="bg-surface-950 min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-surface-400">{t('gallery.no_photos')}</p>
        <button onClick={() => navigate('/gallery')} className="text-primary-400 hover:text-primary-300 text-sm">
          &larr; {t('gallery.back_to_gallery')}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface-950 min-h-screen">

      {/* ===== Header ===== */}
      <section className="relative pt-8 pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-900/40 to-surface-950" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <button
            onClick={() => navigate('/gallery')}
            className="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('gallery.back_to_gallery')}
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div>
              <p className="text-sm text-surface-500 mb-1">{edition.title}</p>
              <h1 className="text-4xl sm:text-5xl font-display font-bold text-white">{edition.year}</h1>
              {edition.theme && (
                <p className="text-surface-400 mt-2">
                  {t('gallery.theme')}: <span className="text-primary-400">{edition.theme}</span>
                </p>
              )}
              {edition.categories && (
                <p className="text-surface-500 mt-1 text-sm">
                  <Tag className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                  {edition.categories.length} categories
                </p>
              )}
            </div>
            <div className="sm:ml-auto flex items-center gap-6 text-sm text-surface-400">
              <span className="inline-flex items-center gap-1.5">
                <Camera className="h-4 w-4" />
                {photos.length} {t('gallery.photos')}
              </span>
              {edition.winner && (
                <span className="inline-flex items-center gap-1.5 text-gold-400">
                  <Trophy className="h-4 w-4" />
                  {edition.winner}
                </span>
              )}
            </div>
          </div>

          {/* Jury & Curators */}
          {(edition.jury || edition.curators) && (
            <div className="mt-8 flex flex-col sm:flex-row gap-6">
              {edition.jury && (
                <div className="flex-1">
                  <h3 className="inline-flex items-center gap-2 text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
                    <Users className="h-3.5 w-3.5" />Jury
                  </h3>
                  <ul className="space-y-1">
                    {edition.jury.map((m) => (
                      <li key={m.name} className="text-sm text-surface-300">
                        <span className="font-medium text-surface-200">{m.name}</span>
                        {m.country && <span className="text-surface-500">, {m.country}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {edition.curators && (
                <div className="flex-1">
                  <h3 className="inline-flex items-center gap-2 text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
                    <Users className="h-3.5 w-3.5" />Curators
                  </h3>
                  <ul className="space-y-1">
                    {edition.curators.map((m) => (
                      <li key={m.name} className="text-sm text-surface-300">
                        <span className="font-medium text-surface-200">{m.name}</span>
                        {m.country && <span className="text-surface-500">, {m.country}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {facebookAlbums.length > 0 && edition && (
        <section className="pb-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-surface-700 bg-surface-900/75 p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary-400">
                    Facebook Albums
                  </p>
                  <h2 className="mt-2 text-2xl font-display font-bold text-surface-100">
                    Browse the {edition.year} category archive on Facebook
                  </h2>
                  <p className="mt-1 text-sm text-surface-400">
                    Public album embeds for the available category links shared for this edition.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {facebookAlbums.map((album) => (
                  <article key={album.url} className="overflow-hidden rounded-2xl border border-surface-700 bg-white shadow-sm">
                    <div className="flex items-start justify-between gap-4 border-b border-surface-700 px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary-400">
                          <Facebook className="h-3.5 w-3.5" /> Facebook
                        </div>
                        <h3 className="mt-2 text-lg font-display font-bold text-surface-100">
                          {album.label}
                        </h3>
                      </div>
                      <a
                        href={album.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-surface-700 px-3 py-1.5 text-xs font-semibold text-surface-300 transition-colors hover:border-primary-500/40 hover:text-primary-500"
                      >
                        Open album <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    <iframe
                      src={getFacebookEmbedUrl(album.url)}
                      title={`${edition.year} ${album.label} Facebook album`}
                      className="h-[30rem] w-full border-0 bg-surface-900"
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    />
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== Category Tab Bar (multi-category only) ===== */}
      {categorySections && (
        <div
          ref={tabBarRef}
          className="sticky top-16 z-20 bg-surface-950/95 backdrop-blur-md border-b border-surface-800"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-3">
              {categorySections.map((s) => (
                <button
                  key={s.name}
                  onClick={() => scrollToCategory(s.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                    s.isMain
                      ? 'bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 ring-1 ring-gold-500/40'
                      : 'bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-white'
                  }`}
                >
                  {s.isMain && <Trophy className="h-3 w-3" />}
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== Multi-Category Layout ===== */}
      {categorySections ? (
        <div className="pb-24">
          {categorySections.map((section, sIdx) => (
            <section
              key={section.name}
              id={section.id}
              className={`py-12 ${sIdx > 0 ? 'border-t border-surface-800' : ''}`}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Category header */}
                <div className="flex flex-wrap items-center gap-3 mb-8">
                  {section.isMain && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold-500/15 ring-1 ring-gold-500/30 text-gold-400 text-[10px] font-bold uppercase tracking-widest">
                      <Trophy className="h-3 w-3" />Main Category
                    </span>
                  )}
                  <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                    {section.name}
                  </h2>
                  <span className="text-surface-600 text-sm ml-auto">
                    {section.allPhotos.length} photos
                  </span>
                </div>

                {/* Winners — 1st / 2nd / 3rd */}
                {section.winners.length > 0 && (
                  <div className="mb-10">
                    <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-4">
                      <Trophy className="inline h-3 w-3 mr-1.5 -mt-0.5 text-gold-500" />
                      Category Winners
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {section.winners.map((photo) => (
                        <motion.div
                          key={photo.r2Key}
                          initial={{ opacity: 0, y: 12 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4 }}
                          className={`group relative rounded-xl overflow-hidden cursor-pointer bg-surface-900 ${
                            photo.place === 1
                              ? 'ring-2 ring-gold-500/50 shadow-lg shadow-gold-500/10'
                              : photo.place === 2
                              ? 'ring-1 ring-slate-400/30'
                              : 'ring-1 ring-amber-700/30'
                          }`}
                          onClick={() => openLightbox(photo, section.allPhotos)}
                        >
                          <div className="aspect-[4/3] overflow-hidden">
                            <img
                              src={photo.url}
                              alt={photo.title || photo.photographer || ''}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                          </div>
                          {(photo.title || photo.photographer) && (
                            <div className="px-4 py-3 bg-surface-900">
                              {photo.title && (
                                  <p className="text-sm font-semibold text-surface-200 truncate">{photo.title}</p>
                              )}
                              {photo.photographer && (
                                <p className="text-xs text-surface-400 mt-0.5 truncate">{photo.photographer}</p>
                              )}
                            </div>
                          )}
                          <div className="absolute top-3 left-3">
                            <PlaceBadge place={photo.place ?? 1} />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Participants */}
                {section.participants.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-4">
                      Participants
                      <span className="ml-2 text-surface-700 font-normal normal-case tracking-normal">
                        ({section.participants.length})
                      </span>
                    </p>
                    <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3">
                      {section.participants.map((photo) => (
                        <div
                          key={photo.r2Key}
                          className="public-invert break-inside-avoid group relative mb-3 cursor-pointer overflow-hidden rounded-lg bg-surface-900"
                          onClick={() => openLightbox(photo, section.allPhotos)}
                        >
                          <img
                            src={photo.url}
                            alt={photo.title || photo.photographer || ''}
                            className="w-full block transition-transform duration-500 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                              {(photo.title || photo.photographer) && (
                                <p className="text-xs font-medium text-white truncate">
                                  {photo.title || photo.photographer}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        /* ===== Legacy Single-Category Layout ===== */
        <>
          {legacyWinners.length > 0 && (
            <section className="pb-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-sm font-medium text-gold-400 uppercase tracking-wider mb-4">
                  <Trophy className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                  {t('gallery.winner')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {legacyWinners.map((photo) => (
                    <div
                      key={photo.r2Key}
                      className="group relative rounded-xl overflow-hidden cursor-pointer bg-surface-900 ring-1 ring-gold-500/20"
                      onClick={() => openLightbox(photo, photos)}
                    >
                      <div className="aspect-[3/2] overflow-hidden">
                        <img
                          src={photo.url}
                          alt={photo.photographer || ''}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                      {photo.photographer && (
                        <div className="px-4 py-3">
                          <p className="text-sm font-medium text-surface-200 truncate">{photo.photographer}</p>
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gold-500/90 backdrop-blur-sm">
                          <Trophy className="h-3 w-3 text-black" />
                          <span className="text-[10px] font-bold text-black uppercase tracking-wider">
                            {t('gallery.winner')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {!hideEmptyGalleryState && (
            <section className="pb-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {legacyWinners.length > 0 && photos.length > legacyWinners.length && (
                  <h2 className="text-sm font-medium text-surface-500 uppercase tracking-wider mb-4">
                    {t('gallery.all_photos')}
                  </h2>
                )}
                {photos.length === 0 ? (
                  <div className="text-center py-24">
                    <Camera className="h-12 w-12 text-surface-700 mx-auto mb-4" />
                    <p className="text-surface-400">{t('gallery.no_photos')}</p>
                  </div>
                ) : (
                  <>
                    <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3">
                      {visiblePhotos
                        .filter((p) => !p.isWinner || legacyWinners.length === 0)
                        .map((photo) => (
                          <div
                            key={photo.r2Key}
                            className="public-invert break-inside-avoid group relative mb-3 cursor-pointer overflow-hidden rounded-xl bg-surface-900"
                            onClick={() => openLightbox(photo, photos)}
                          >
                            <img
                              src={photo.url}
                              alt={photo.photographer || ''}
                              className="w-full block transition-transform duration-500 group-hover:scale-[1.03]"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                {photo.photographer && (
                                  <p className="text-sm font-medium text-white truncate">{photo.photographer}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                    {hasMore && (
                      <div ref={observerRef} className="flex justify-center py-12">
                        <div className="flex items-center gap-3 text-surface-500">
                          <div className="w-5 h-5 rounded-full border-2 border-surface-600 border-t-primary-500 animate-spin" />
                          <span className="text-sm">{t('gallery.loading_more')}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {/* ===== Lightbox ===== */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="public-invert fixed inset-0 z-50 flex items-center justify-center bg-black/97"
            onClick={() => setLightbox(null)}
          >
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center gap-2 flex-wrap">
                {lightbox.isWinner && lightbox.place && (
                  <PlaceBadge place={lightbox.place} />
                )}
                {lightbox.isWinner && !lightbox.place && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold-500/90 text-xs font-bold text-black">
                    <Trophy className="h-3 w-3" />{t('gallery.winner')}
                  </span>
                )}
                {lightbox.category && (
                  <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/70 text-xs font-medium backdrop-blur-sm">
                    {lightbox.category}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-white/50 tabular-nums">
                  {lightboxIdx + 1} / {lightboxSet.length}
                </span>
                <button
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  onClick={() => setLightbox(null)}
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            {/* Prev */}
            {lightboxIdx > 0 && (
              <button
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
              >
                <ChevronLeft className="h-6 w-6 text-white" />
              </button>
            )}

            {/* Next */}
            {lightboxIdx < lightboxSet.length - 1 && (
              <button
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
              >
                <ChevronRight className="h-6 w-6 text-white" />
              </button>
            )}

            {/* Image */}
            <motion.div
              key={lightbox.r2Key}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative max-w-[92vw] max-h-[88vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightbox.url}
                alt={lightbox.title || lightbox.photographer || ''}
                className="max-w-full max-h-[88vh] object-contain select-none"
                draggable={false}
              />
            </motion.div>

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 z-10 px-4 sm:px-6 py-4 bg-gradient-to-t from-black/60 to-transparent">
              <div className="max-w-3xl mx-auto text-center">
                {lightbox.title && (
                  <p className="text-base font-semibold text-white">{lightbox.title}</p>
                )}
                {lightbox.photographer && (
                  <p className={`text-sm text-surface-400 ${lightbox.title ? 'mt-0.5' : ''}`}>
                    {lightbox.photographer}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
