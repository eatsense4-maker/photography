import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, MessageSquare, Image, ZoomIn } from 'lucide-react';
import { Button, Textarea, Card } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { getPhotoUrl } from '@/lib/r2';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

interface ReviewSubmission {
  id: string;
  title: string;
  description: string | null;
  category: string;
  photographer: string;
  photos: { id: string; storage_key: string }[];
  existingScore: number | null;
  existingComment: string | null;
  scoreId: string | null;
}

export default function JuryReview() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submissions, setSubmissions] = useState<ReviewSubmission[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [comment, setComment] = useState('');
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetchSubmissions();
  }, [user?.id]);

  const fetchSubmissions = async () => {
    if (!user?.id) return;

    // Get jury's assigned category IDs
    const { data: assignments } = await supabase
      .from('jury_assignments')
      .select('category_id')
      .eq('jury_id', user.id);

    if (!assignments || assignments.length === 0) {
      setLoading(false);
      return;
    }

    const catIds = assignments.map((a) => a.category_id);

    // Get submissions in those categories with status submitted/under_review/accepted
    const { data: subs } = await supabase
      .from('submissions')
      .select('id, title, description, categories(name), profiles!submissions_user_id_fkey(full_name), submission_photos(id, storage_key, sort_order)')
      .in('category_id', catIds)
      .in('status', ['submitted', 'under_review', 'accepted'])
      .order('created_at', { ascending: true });

    if (!subs || subs.length === 0) {
      setLoading(false);
      return;
    }

    // Get existing scores by this jury member
    const subIds = subs.map((s) => s.id);
    const { data: scores } = await supabase
      .from('scores')
      .select('id, submission_id, score, comment')
      .eq('jury_id', user.id)
      .in('submission_id', subIds);

    const scoreMap = new Map(
      (scores || []).map((s) => [s.submission_id, s])
    );

    const result: ReviewSubmission[] = subs.map((s: any) => {
      const existing = scoreMap.get(s.id);
      const photos = (s.submission_photos || []).sort(
        (a: any, b: any) => a.sort_order - b.sort_order
      );
      return {
        id: s.id,
        title: s.title || 'Untitled',
        description: s.description,
        category: s.categories?.name || '',
        photographer: s.profiles?.full_name || 'Anonymous',
        photos: photos.map((p: any) => ({ id: p.id, storage_key: p.storage_key })),
        existingScore: existing?.score ?? null,
        existingComment: existing?.comment ?? null,
        scoreId: existing?.id ?? null,
      };
    });

    setSubmissions(result);

    // Load first submission's existing score
    if (result.length > 0 && result[0].existingScore !== null) {
      setScore(result[0].existingScore);
      setComment(result[0].existingComment || '');
    }

    setLoading(false);
  };

  const current = submissions[currentIndex] || null;

  const navigateTo = useCallback(
    (idx: number) => {
      setCurrentIndex(idx);
      setActivePhoto(0);
      const sub = submissions[idx];
      if (sub?.existingScore !== null) {
        setScore(sub.existingScore!);
        setComment(sub.existingComment || '');
      } else {
        setScore(0);
        setComment('');
      }
    },
    [submissions]
  );

  const handleSave = async () => {
    if (!user?.id || !current) return;
    if (score === 0) {
      toast.error('Please select a score');
      return;
    }

    setSaving(true);
    try {
      if (current.scoreId) {
        // Update existing score
        const { error } = await supabase
          .from('scores')
          .update({ score, comment: comment || null })
          .eq('id', current.scoreId);
        if (error) throw error;
      } else {
        // Insert new score
        const { data, error } = await supabase
          .from('scores')
          .insert({
            submission_id: current.id,
            jury_id: user.id,
            phase: 'phase1',
            score,
            comment: comment || null,
          })
          .select('id')
          .single();
        if (error) throw error;

        // Update local state with the new score ID
        setSubmissions((prev) =>
          prev.map((s, i) =>
            i === currentIndex
              ? { ...s, existingScore: score, existingComment: comment, scoreId: data.id }
              : s
          )
        );
      }

      toast.success('Score saved');

      // Auto-advance to next unscored
      if (currentIndex < submissions.length - 1) {
        navigateTo(currentIndex + 1);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save score');
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

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Image className="h-16 w-16 text-surface-600 mb-4" />
        <p className="text-surface-400 text-lg">No submissions to review</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">{t('jury.review')}</h1>
          <p className="text-surface-400 text-sm mt-1">
            Submission {currentIndex + 1} of {submissions.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<ChevronLeft className="h-4 w-4" />}
            onClick={() => navigateTo(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<ChevronRight className="h-4 w-4" />}
            onClick={() => navigateTo(Math.min(submissions.length - 1, currentIndex + 1))}
            disabled={currentIndex === submissions.length - 1}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Photo Viewer */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden">
            <div className="relative aspect-[4/3] bg-black">
              {current.photos.length > 0 ? (
                <>
                  <img
                    src={getPhotoUrl(current.photos[activePhoto]?.storage_key)}
                    alt={current.title}
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={() => setLightbox(true)}
                    className="absolute top-4 right-4 p-2 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer"
                  >
                    <ZoomIn className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-surface-500">
                  <Image className="h-16 w-16" />
                </div>
              )}
            </div>

            {/* Photo thumbnails */}
            {current.photos.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto bg-surface-900">
                {current.photos.map((photo, i) => (
                  <button
                    key={photo.id}
                    onClick={() => setActivePhoto(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors cursor-pointer ${
                      i === activePhoto ? 'border-primary-500' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={getPhotoUrl(photo.storage_key)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Scoring Panel */}
        <div className="space-y-4">
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">{current.title}</h2>
              <p className="text-sm text-surface-400">{current.photographer}</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs bg-surface-800 text-surface-300">
                {current.category}
              </span>
            </div>
            {current.description && (
              <p className="text-sm text-surface-400">{current.description}</p>
            )}
          </Card>

          <Card className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-gold-400" />
                Score
              </h3>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                  <button
                    key={s}
                    onMouseEnter={() => setHoverScore(s)}
                    onMouseLeave={() => setHoverScore(0)}
                    onClick={() => setScore(s)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        s <= (hoverScore || score)
                          ? 'text-gold-400 fill-gold-400'
                          : 'text-surface-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {score > 0 && (
                <p className="text-sm text-surface-400 mt-2">{score}/10</p>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary-400" />
                Comment
              </h3>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional feedback..."
                rows={3}
              />
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleSave}
              loading={saving}
              disabled={score === 0}
            >
              {current.scoreId ? 'Update Score' : 'Submit Score'}
            </Button>

            {current.existingScore !== null && (
              <p className="text-xs text-green-400 text-center">
                ✓ Previously scored: {current.existingScore}/10
              </p>
            )}
          </Card>

          {/* Progress mini-bar */}
          <Card className="p-4">
            <div className="flex justify-between text-xs text-surface-400 mb-2">
              <span>Progress</span>
              <span>
                {submissions.filter((s) => s.existingScore !== null).length}/{submissions.length}
              </span>
            </div>
            <div className="flex gap-0.5">
              {submissions.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => navigateTo(i)}
                  className={`flex-1 h-2 rounded-full transition-colors cursor-pointer ${
                    i === currentIndex
                      ? 'bg-primary-500'
                      : s.existingScore !== null
                      ? 'bg-green-500'
                      : 'bg-surface-700'
                  }`}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && current.photos[activePhoto] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setLightbox(false)}
          >
            <img
              src={getPhotoUrl(current.photos[activePhoto].storage_key)}
              alt={current.title}
              className="max-w-full max-h-full object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
