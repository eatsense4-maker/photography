import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, ChevronLeft, ChevronRight, MessageSquare, Image, ZoomIn,
  CheckCircle, Filter,
} from 'lucide-react';
import { Button, Textarea, Card, Select, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { getPhotoUrl } from '@/lib/r2';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

interface ReviewPhoto {
  photoId: string;
  storageKey: string;
  category: string;
  categoryId: string;
  submissionId: string;
  existingScore: number | null;
  existingComment: string | null;
  scoreId: string | null;
}

export default function JuryReview() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<ReviewPhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [comment, setComment] = useState('');
  const [lightbox, setLightbox] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unscored' | 'scored'>('all');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    fetchPhotos();
  }, [user?.id]);

  const fetchPhotos = async () => {
    if (!user?.id) return;

    const { data: assignments } = await supabase
      .from('jury_assignments')
      .select('category_id, categories(id, name)')
      .eq('jury_id', user.id);

    if (!assignments || assignments.length === 0) {
      setLoading(false);
      return;
    }

    const catIds = assignments.map((a) => a.category_id);
    const catList = assignments.map((a: any) => ({
      id: a.categories?.id || a.category_id,
      name: a.categories?.name || '—',
    }));
    setCategories(catList);

    // Only get approved photos
    const { data: subs } = await supabase
      .from('submissions')
      .select(`
        id, category_id,
        categories!submissions_category_id_fkey(id, name),
        submission_photos!inner(id, storage_key, sort_order, status)
      `)
      .in('category_id', catIds)
      .in('status', ['submitted', 'under_review', 'accepted'])
      .eq('submission_photos.status', 'approved');

    if (!subs || subs.length === 0) {
      setLoading(false);
      return;
    }

    const allPhotos: { photoId: string; storageKey: string; category: string; categoryId: string; submissionId: string }[] = [];
    for (const sub of subs as any[]) {
      const catName = sub.categories?.name || '—';
      const catId = sub.categories?.id || sub.category_id;
      for (const photo of sub.submission_photos || []) {
        allPhotos.push({ photoId: photo.id, storageKey: photo.storage_key, category: catName, categoryId: catId, submissionId: sub.id });
      }
    }

    // Shuffle for unbiased ordering
    for (let i = allPhotos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPhotos[i], allPhotos[j]] = [allPhotos[j], allPhotos[i]];
    }

    const photoIds = allPhotos.map((p) => p.photoId);
    const { data: scores } = await supabase
      .from('scores')
      .select('id, photo_id, score, comment')
      .eq('jury_id', user.id)
      .in('photo_id', photoIds);

    const scoreMap = new Map((scores || []).map((s) => [s.photo_id, s]));

    const result: ReviewPhoto[] = allPhotos.map((p) => {
      const existing = scoreMap.get(p.photoId);
      return { ...p, existingScore: existing?.score ?? null, existingComment: existing?.comment ?? null, scoreId: existing?.id ?? null };
    });

    setPhotos(result);
    if (result.length > 0 && result[0].existingScore !== null) {
      setScore(result[0].existingScore);
      setComment(result[0].existingComment || '');
    }
    setLoading(false);
  };

  const filteredPhotos = photos.filter((p) => {
    if (filterCategory && p.categoryId !== filterCategory) return false;
    if (filterStatus === 'scored' && p.existingScore === null) return false;
    if (filterStatus === 'unscored' && p.existingScore !== null) return false;
    return true;
  });

  const current = filteredPhotos[currentIndex] || null;

  const navigateTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= filteredPhotos.length) return;
      setCurrentIndex(idx);
      const photo = filteredPhotos[idx];
      if (photo?.existingScore !== null) {
        setScore(photo.existingScore!);
        setComment(photo.existingComment || '');
      } else {
        setScore(0);
        setComment('');
      }
    },
    [filteredPhotos]
  );

  useEffect(() => {
    setCurrentIndex(0);
    if (filteredPhotos.length > 0) {
      const p = filteredPhotos[0];
      setScore(p.existingScore ?? 0);
      setComment(p.existingComment || '');
    } else {
      setScore(0);
      setComment('');
    }
  }, [filterCategory, filterStatus]);

  const handleSave = async () => {
    if (!user?.id || !current) return;
    if (score === 0) {
      toast.error('Please select a score (1–10)');
      return;
    }

    setSaving(true);
    try {
      if (current.scoreId) {
        const { error } = await supabase
          .from('scores')
          .update({ score, comment: comment || null, updated_at: new Date().toISOString() })
          .eq('id', current.scoreId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('scores')
          .insert({
            submission_id: current.submissionId,
            photo_id: current.photoId,
            jury_id: user.id,
            phase: 'phase1',
            score,
            comment: comment || null,
          })
          .select('id')
          .single();
        if (error) throw error;

        setPhotos((prev) =>
          prev.map((p) =>
            p.photoId === current.photoId
              ? { ...p, existingScore: score, existingComment: comment, scoreId: data.id }
              : p
          )
        );
      }

      setPhotos((prev) =>
        prev.map((p) =>
          p.photoId === current.photoId
            ? { ...p, existingScore: score, existingComment: comment }
            : p
        )
      );

      toast.success('Score saved');

      const nextUnscored = filteredPhotos.findIndex((p, i) => i > currentIndex && p.existingScore === null);
      if (nextUnscored !== -1) {
        navigateTo(nextUnscored);
      } else if (currentIndex < filteredPhotos.length - 1) {
        navigateTo(currentIndex + 1);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save score');
    } finally {
      setSaving(false);
    }
  };

  const totalScored = photos.filter((p) => p.existingScore !== null).length;
  const filteredScored = filteredPhotos.filter((p) => p.existingScore !== null).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Image className="h-16 w-16 text-surface-600 mb-4" />
        <p className="text-surface-400 text-lg">No approved photos to score</p>
        <p className="text-surface-500 text-sm mt-1">Check back once the admin has approved photos in your assigned categories.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">{t('jury.review')}</h1>
          <p className="text-surface-400 text-sm mt-1">
            Score each photo from 1 to 10 · {totalScored}/{photos.length} scored
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<ChevronLeft className="h-4 w-4" />} onClick={() => navigateTo(currentIndex - 1)} disabled={currentIndex === 0} />
          <span className="text-sm text-surface-400 min-w-[80px] text-center">
            {filteredPhotos.length > 0 ? `${currentIndex + 1} / ${filteredPhotos.length}` : '—'}
          </span>
          <Button variant="ghost" size="sm" icon={<ChevronRight className="h-4 w-4" />} onClick={() => navigateTo(currentIndex + 1)} disabled={currentIndex >= filteredPhotos.length - 1} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-surface-500" />
        <Select
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="All categories"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        />
        <div className="flex rounded-lg bg-surface-800 p-0.5">
          {(['all', 'unscored', 'scored'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer capitalize ${
                filterStatus === s ? 'bg-primary-500 text-white' : 'text-surface-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-xs text-surface-500">{filteredScored}/{filteredPhotos.length} scored in view</span>
      </div>

      {filteredPhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48">
          <CheckCircle className="h-12 w-12 text-emerald-500 mb-3" />
          <p className="text-surface-300 text-lg font-medium">All done!</p>
          <p className="text-surface-500 text-sm">No photos matching this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Photo Viewer — anonymous */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="overflow-hidden">
              <div className="relative aspect-[4/3] bg-black">
                {current ? (
                  <>
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={current.photoId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        src={getPhotoUrl(current.storageKey)}
                        alt="Competition photo"
                        className="w-full h-full object-contain"
                      />
                    </AnimatePresence>
                    <button onClick={() => setLightbox(true)} className="absolute top-4 right-4 p-2 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer">
                      <ZoomIn className="h-5 w-5" />
                    </button>
                    <div className="absolute top-4 left-4">
                      <Badge variant="secondary">{current.category}</Badge>
                    </div>
                    {current.existingScore !== null && (
                      <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/90 text-white text-sm font-bold">
                        <Star className="h-3.5 w-3.5 fill-white" />
                        {current.existingScore}/10
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-surface-500">
                    <Image className="h-16 w-16" />
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Scoring Panel — no identifying info */}
          <div className="space-y-4">
            <Card className="p-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-500 uppercase tracking-wider font-semibold">Category</span>
                <Badge variant="gold">{current?.category || '—'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-500 uppercase tracking-wider font-semibold">Photo</span>
                <span className="text-sm text-surface-300">#{currentIndex + 1}</span>
              </div>
            </Card>

            <Card className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-gold-400" />
                  Your Score
                </h3>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                    <button
                      key={s}
                      onMouseEnter={() => setHoverScore(s)}
                      onMouseLeave={() => setHoverScore(0)}
                      onClick={() => setScore(s)}
                      className="p-1 cursor-pointer transition-transform hover:scale-125"
                    >
                      <Star className={`h-7 w-7 transition-colors ${s <= (hoverScore || score) ? 'text-gold-400 fill-gold-400' : 'text-surface-600'}`} />
                    </button>
                  ))}
                </div>
                {score > 0 && <p className="text-center text-lg font-bold text-gold-400 mt-2">{score}/10</p>}
              </div>

              <div>
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary-400" />
                  Comment <span className="text-xs text-surface-500 font-normal">(optional)</span>
                </h3>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Why this score? Your notes stay private..." rows={3} />
              </div>

              <Button variant="primary" className="w-full" size="lg" onClick={handleSave} loading={saving} disabled={score === 0}>
                {current?.scoreId ? 'Update Score' : 'Submit Score'}
              </Button>

              {current?.existingScore !== null && (
                <p className="text-xs text-emerald-400 text-center flex items-center justify-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Previously scored: {current.existingScore}/10
                </p>
              )}
            </Card>

            {/* Progress */}
            <Card className="p-4">
              <div className="flex justify-between text-xs text-surface-400 mb-2">
                <span>Progress</span>
                <span>{filteredScored}/{filteredPhotos.length}</span>
              </div>
              <div className="w-full bg-surface-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-gold-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: filteredPhotos.length > 0 ? `${(filteredScored / filteredPhotos.length) * 100}%` : '0%' }}
                />
              </div>
              {filteredPhotos.length <= 60 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {filteredPhotos.map((p, i) => (
                    <button
                      key={p.photoId}
                      onClick={() => navigateTo(i)}
                      title={`Photo #${i + 1}${p.existingScore !== null ? ` — ${p.existingScore}/10` : ''}`}
                      className={`w-3 h-3 rounded-sm transition-colors cursor-pointer ${
                        i === currentIndex ? 'bg-primary-500 ring-1 ring-primary-400' : p.existingScore !== null ? 'bg-emerald-500' : 'bg-surface-700 hover:bg-surface-600'
                      }`}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && current && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setLightbox(false)}
          >
            <img src={getPhotoUrl(current.storageKey)} alt="Competition photo" className="max-w-full max-h-full object-contain" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
