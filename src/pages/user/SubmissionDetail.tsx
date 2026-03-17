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
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { getPhotoUrl } from '@/lib/r2';
import type { SubmissionStatus, PaymentStatus } from '@/types';

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
  photos: { id: string; storage_key: string; thumbnail_key: string | null; sort_order: number }[];
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

  useEffect(() => {
    if (!id) return;

    const fetchSubmission = async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          id, title, description, status, submitted_at, created_at,
          categories!submissions_category_id_fkey(name),
          editions!submissions_edition_id_fkey(title, year),
          submission_photos(id, storage_key, thumbnail_key, sort_order),
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

    fetchSubmission();
  }, [id, navigate]);

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
        <h3 className="text-sm font-medium text-surface-400 mb-4">
          Photos ({submission.photos.length})
        </h3>

        {submission.photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-surface-600">
            <ImageIcon className="h-12 w-12 mb-3" />
            <p>No photos uploaded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {submission.photos.map((photo, index) => {
              const url = getPhotoUrl(photo.thumbnail_key || photo.storage_key);
              return (
                <motion.button
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setLightboxIndex(index)}
                  className="aspect-square rounded-lg overflow-hidden bg-surface-800 hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer group"
                >
                  <img
                    src={url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </motion.button>
              );
            })}
          </div>
        )}
      </Card>

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
              <ChevronLeft className="h-10 w-10" />
            </button>
          )}

          {/* Next */}
          {lightboxIndex < submission.photos.length - 1 && (
            <button
              onClick={() => setLightboxIndex(lightboxIndex + 1)}
              className="absolute right-4 text-white/70 hover:text-white z-10 cursor-pointer"
            >
              <ChevronRight className="h-10 w-10" />
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
