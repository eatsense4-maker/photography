import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Image as ImageIcon,
  Calendar,
  Tag,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Card, Badge, Button, Modal, Textarea } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { getPhotoUrl } from '@/lib/r2';
import type { SubmissionStatus, PaymentStatus, PhotoReviewStatus } from '@/types';
import toast from 'react-hot-toast';

const statusBadge: Record<SubmissionStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  draft: { label: 'Draft', variant: 'default' },
  submitted: { label: 'Submitted', variant: 'info' },
  under_review: { label: 'Under Review', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  disqualified: { label: 'Disqualified', variant: 'danger' },
};

const paymentBadge: Record<PaymentStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  pending: { label: 'Payment Pending', variant: 'warning' },
  completed: { label: 'Paid', variant: 'success' },
  refunded: { label: 'Refunded', variant: 'info' },
  failed: { label: 'Payment Failed', variant: 'danger' },
};

interface SubmissionData {
  id: string;
  title: string;
  description: string;
  status: SubmissionStatus;
  submitted_at: string | null;
  created_at: string;
  category: string;
  edition: string;
  payment_status: PaymentStatus | null;
  photos: {
    id: string;
    storage_key: string;
    thumbnail_key: string | null;
    sort_order: number;
    status: PhotoReviewStatus;
    review_note: string | null;
  }[];
}

export default function SubmissionDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const backPath = isAdmin ? '/admin/submissions' : '/dashboard/submissions';
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Admin photo review state
  const [reviewModal, setReviewModal] = useState<{ photoId: string; action: 'approved' | 'rejected' } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // User cancel/delete state
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [deletePhotoModal, setDeletePhotoModal] = useState<{ photoId: string; storageKey: string; thumbnailKey: string | null } | null>(null);
  const [deletePhotoLoading, setDeletePhotoLoading] = useState(false);

  const fetchSubmission = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        id, title, description, status, submitted_at, created_at,
        categories!submissions_category_id_fkey(name),
        editions!submissions_edition_id_fkey(title, year),
        submission_photos(id, storage_key, thumbnail_key, sort_order, status, review_note),
        payments(status)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      navigate(backPath, { replace: true });
      return;
    }

    const s: any = data;
    const photos = (s.submission_photos || []).sort(
      (a: any, b: any) => a.sort_order - b.sort_order
    );

    setSubmission({
      id: s.id,
      title: s.title || 'Untitled',
      description: s.description || '',
      status: s.status as SubmissionStatus,
      submitted_at: s.submitted_at,
      created_at: s.created_at,
      category: s.categories?.name || '—',
      edition: s.editions ? `${s.editions.title} (${s.editions.year})` : '—',
      payment_status: (s.payments?.[0]?.status as PaymentStatus) || null,
      photos,
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchSubmission();
  }, [id, navigate]);

  const handlePhotoReview = async () => {
    if (!reviewModal) return;
    setReviewLoading(true);
    const { error } = await supabase
      .from('submission_photos')
      .update({
        status: reviewModal.action,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote || null,
      })
      .eq('id', reviewModal.photoId);
    setReviewLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Photo ${reviewModal.action}`);
    setReviewModal(null);
    setReviewNote('');
    fetchSubmission();
  };

  const handleBulkReview = async (action: 'approved' | 'rejected') => {
    if (!submission) return;
    const pendingPhotos = submission.photos.filter((p) => p.status === 'pending');
    if (pendingPhotos.length === 0) return;

    const { error } = await supabase
      .from('submission_photos')
      .update({
        status: action,
        reviewed_at: new Date().toISOString(),
      })
      .in('id', pendingPhotos.map((p) => p.id));

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`All pending photos ${action}`);
    fetchSubmission();
  };

  const canModify = submission && !isAdmin && ['draft', 'submitted'].includes(submission.status);

  const handleDeletePhoto = async () => {
    if (!deletePhotoModal || !submission) return;
    setDeletePhotoLoading(true);
    try {
      // Delete from R2
      const keysToDelete = [deletePhotoModal.storageKey];
      if (deletePhotoModal.thumbnailKey) keysToDelete.push(deletePhotoModal.thumbnailKey);
      await supabase.functions.invoke('r2-delete', { body: { keys: keysToDelete } });

      // Delete from DB
      const { error } = await supabase
        .from('submission_photos')
        .delete()
        .eq('id', deletePhotoModal.photoId);

      if (error) throw error;
      toast.success('Photo deleted');
      setDeletePhotoModal(null);
      fetchSubmission();
    } catch {
      toast.error('Failed to delete photo');
    } finally {
      setDeletePhotoLoading(false);
    }
  };

  const handleCancelSubmission = async () => {
    if (!submission) return;
    setCancelLoading(true);
    try {
      // Collect all storage keys for R2 deletion
      const keysToDelete: string[] = [];
      for (const photo of submission.photos) {
        keysToDelete.push(photo.storage_key);
        if (photo.thumbnail_key) keysToDelete.push(photo.thumbnail_key);
      }

      // Delete photos from R2
      if (keysToDelete.length > 0) {
        await supabase.functions.invoke('r2-delete', { body: { keys: keysToDelete } });
      }

      // Delete submission (cascades to submission_photos, payments, etc.)
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', submission.id);

      if (error) throw error;
      toast.success('Submission cancelled and deleted');
      navigate(backPath, { replace: true });
    } catch {
      toast.error('Failed to cancel submission');
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!submission) return null;

  const sb = statusBadge[submission.status] || { label: submission.status, variant: 'default' as const };
  const pb = submission.payment_status ? paymentBadge[submission.payment_status] : null;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to={backPath}
        className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('user.submissions')}
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            {submission.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-surface-400">
            <span className="flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" />
              {submission.category}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {submission.edition}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(submission.submitted_at || submission.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={sb.variant as any}>{sb.label}</Badge>
          {pb && <Badge variant={pb.variant as any}>{pb.label}</Badge>}
          {canModify && (
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setCancelModal(true)}
            >
              Cancel Submission
            </Button>
          )}
        </div>
      </div>

      {/* Description */}
      {submission.description && (
        <Card className="p-5">
          <h3 className="text-sm font-medium text-surface-400 mb-2">Description</h3>
          <p className="text-surface-200 whitespace-pre-wrap">{submission.description}</p>
        </Card>
      )}

      {/* Photos */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-surface-400">
            Photos ({submission.photos.length})
            {isAdmin && submission.photos.length > 0 && (
              <span className="ml-2 text-xs text-surface-500">
                — {submission.photos.filter((p) => p.status === 'approved').length} approved,{' '}
                {submission.photos.filter((p) => p.status === 'rejected').length} rejected,{' '}
                {submission.photos.filter((p) => p.status === 'pending').length} pending
              </span>
            )}
          </h3>
          {isAdmin && submission.photos.some((p) => p.status === 'pending') && (
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={<CheckCircle className="h-4 w-4" />}
                onClick={() => handleBulkReview('approved')}
              >
                Approve All
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<XCircle className="h-4 w-4" />}
                onClick={() => handleBulkReview('rejected')}
              >
                Reject All
              </Button>
            </div>
          )}
        </div>

        {submission.photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-surface-600">
            <ImageIcon className="h-12 w-12 mb-3" />
            <p>No photos uploaded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {submission.photos.map((photo, index) => {
              const url = getPhotoUrl(photo.thumbnail_key || photo.storage_key);
              const photoStatusBorder =
                photo.status === 'approved'
                  ? 'ring-2 ring-emerald-500'
                  : photo.status === 'rejected'
                  ? 'ring-2 ring-red-500'
                  : '';
              return (
                <div key={photo.id} className="space-y-2">
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setLightboxIndex(index)}
                    className={`aspect-square rounded-lg overflow-hidden bg-surface-800 hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer group relative w-full ${photoStatusBorder}`}
                  >
                    <img
                      src={url}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {/* Status overlay badge */}
                    {photo.status !== 'pending' && (
                      <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                        photo.status === 'approved'
                          ? 'bg-emerald-500/90 text-white'
                          : 'bg-red-500/90 text-white'
                      }`}>
                        {photo.status === 'approved' ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {photo.status}
                      </div>
                    )}
                    {photo.status === 'pending' && isAdmin && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-surface-700/90 text-surface-300">
                        <Clock className="h-3 w-3" />
                        pending
                      </div>
                    )}
                    {/* Review note indicator */}
                    {photo.review_note && (
                      <div className="absolute bottom-2 left-2 p-1 rounded-full bg-surface-800/90">
                        <MessageSquare className="h-3.5 w-3.5 text-surface-300" />
                      </div>
                    )}
                  </motion.button>

                  {/* User delete photo button */}
                  {canModify && (
                    <button
                      onClick={() => setDeletePhotoModal({ photoId: photo.id, storageKey: photo.storage_key, thumbnailKey: photo.thumbnail_key || null })}
                      className="flex items-center justify-center gap-1 w-full py-1.5 rounded-md text-xs font-medium bg-surface-800 text-surface-400 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}

                  {/* Admin per-photo actions */}
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setReviewNote('');
                          setReviewModal({ photoId: photo.id, action: 'approved' });
                        }}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          photo.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-surface-800 text-surface-400 hover:bg-emerald-500/10 hover:text-emerald-400'
                        }`}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setReviewNote('');
                          setReviewModal({ photoId: photo.id, action: 'rejected' });
                        }}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          photo.status === 'rejected'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-surface-800 text-surface-400 hover:bg-red-500/10 hover:text-red-400'
                        }`}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Admin photo review confirmation modal */}
      {reviewModal && (
        <Modal
          isOpen
          onClose={() => { setReviewModal(null); setReviewNote(''); }}
          title={`${reviewModal.action === 'approved' ? 'Approve' : 'Reject'} Photo`}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-surface-300">
              {reviewModal.action === 'approved'
                ? 'This photo will be marked as approved.'
                : 'This photo will be marked as rejected and will not be displayed publicly.'}
            </p>
            <Textarea
              label="Note (optional)"
              placeholder="Add a note about this decision..."
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setReviewModal(null); setReviewNote(''); }}>
                Cancel
              </Button>
              <Button
                variant={reviewModal.action === 'approved' ? 'primary' : 'danger'}
                onClick={handlePhotoReview}
                loading={reviewLoading}
              >
                {reviewModal.action === 'approved' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel submission modal */}
      {cancelModal && (
        <Modal
          isOpen
          onClose={() => setCancelModal(false)}
          title="Cancel Submission"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-white font-medium">This action cannot be undone</p>
                <p className="text-xs text-surface-400 mt-1">
                  This will permanently delete your submission "{submission.title}" and all {submission.photos.length} photo{submission.photos.length !== 1 ? 's' : ''}.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCancelModal(false)}>
                Keep Submission
              </Button>
              <Button
                variant="danger"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={handleCancelSubmission}
                loading={cancelLoading}
              >
                Delete Submission
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete single photo modal */}
      {deletePhotoModal && (
        <Modal
          isOpen
          onClose={() => setDeletePhotoModal(null)}
          title="Remove Photo"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-surface-300">
              Are you sure you want to remove this photo? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeletePhotoModal(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={handleDeletePhoto}
                loading={deletePhotoLoading}
              >
                Remove Photo
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white z-10 cursor-pointer"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              onClick={() => setLightboxIndex(lightboxIndex - 1)}
              className="absolute left-4 text-white/70 hover:text-white z-10 cursor-pointer"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Next */}
          {lightboxIndex < submission.photos.length - 1 && (
            <button
              onClick={() => setLightboxIndex(lightboxIndex + 1)}
              className="absolute right-4 text-white/70 hover:text-white z-10 cursor-pointer"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          <img
            src={getPhotoUrl(submission.photos[lightboxIndex].storage_key)}
            alt={`Photo ${lightboxIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
          />

          <div className="absolute bottom-4 text-center text-white/60 text-sm">
            {lightboxIndex + 1} / {submission.photos.length}
          </div>
        </div>
      )}
    </div>
  );
}
