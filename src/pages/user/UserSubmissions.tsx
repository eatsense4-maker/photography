import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Image, PlusCircle, Search, ChevronDown, ChevronRight, FolderOpen, Tag } from 'lucide-react';
import { Button, Input, Badge, Card, EmptyState } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getPhotoUrl } from '@/lib/r2';
import type { SubmissionStatus, PaymentStatus } from '@/types';

const statusBadge: Record<SubmissionStatus, { labelKey: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold' }> = {
  draft: { labelKey: 'user.submission_status.draft', variant: 'default' },
  submitted: { labelKey: 'user.submission_status.submitted', variant: 'info' },
  under_review: { labelKey: 'user.submission_status.under_review', variant: 'warning' },
  accepted: { labelKey: 'user.submission_status.accepted', variant: 'success' },
  rejected: { labelKey: 'user.submission_status.rejected', variant: 'danger' },
  disqualified: { labelKey: 'user.submission_status.disqualified', variant: 'danger' },
};

const paymentBadge: Record<PaymentStatus, { labelKey: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold' }> = {
  pending: { labelKey: 'user.payment_status.pending', variant: 'warning' },
  completed: { labelKey: 'user.payment_status.paid', variant: 'success' },
  refunded: { labelKey: 'user.payment_status.refunded', variant: 'info' },
  failed: { labelKey: 'user.payment_status.failed', variant: 'danger' },
};

interface SubRow {
  id: string;
  title: string;
  category: string;
  edition: string;
  status: SubmissionStatus;
  payment_status: PaymentStatus | null;
  photos: number;
  submitted_at: string | null;
  thumbnail: string;
}

/** Edition → Category → Submissions */
interface GroupedEdition {
  edition: string;
  categories: { category: string; submissions: SubRow[] }[];
}

export default function UserSubmissions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedEditions, setCollapsedEditions] = useState<Set<string>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;

    const fetchSubmissions = async () => {
      const { data } = await supabase
        .from('submissions')
        .select(`
          id, title, status, submitted_at, created_at,
          categories!submissions_category_id_fkey(name),
          editions!submissions_edition_id_fkey(title, year),
          submission_photos(storage_key, thumbnail_key, sort_order),
          payments(status)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setSubmissions(
          data.map((s: any) => {
            const photos = s.submission_photos || [];
            const firstPhoto = photos.sort((a: any, b: any) => a.sort_order - b.sort_order)[0];
            const thumbKey = firstPhoto?.thumbnail_key || firstPhoto?.storage_key || '';

            return {
              id: s.id,
              title: s.title || 'Untitled',
              category: s.categories?.name || '—',
              edition: s.editions ? `${s.editions.title} (${s.editions.year})` : '—',
              status: s.status as SubmissionStatus,
              payment_status: (s.payments?.[0]?.status as PaymentStatus) || null,
              photos: photos.length,
              submitted_at: s.submitted_at,
              thumbnail: thumbKey ? getPhotoUrl(thumbKey) : '',
            };
          })
        );
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, [user?.id]);

  const filtered = submissions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.edition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /** Group filtered submissions: Edition → Category → items */
  const grouped: GroupedEdition[] = useMemo(() => {
    const editionMap = new Map<string, Map<string, SubRow[]>>();
    for (const sub of filtered) {
      if (!editionMap.has(sub.edition)) editionMap.set(sub.edition, new Map());
      const catMap = editionMap.get(sub.edition)!;
      if (!catMap.has(sub.category)) catMap.set(sub.category, []);
      catMap.get(sub.category)!.push(sub);
    }
    const result: GroupedEdition[] = [];
    for (const [edition, catMap] of editionMap) {
      const categories: GroupedEdition['categories'] = [];
      for (const [category, subs] of catMap) {
        categories.push({ category, submissions: subs });
      }
      categories.sort((a, b) => a.category.localeCompare(b.category));
      result.push({ edition, categories });
    }
    return result;
  }, [filtered]);

  const toggleEdition = (edition: string) => {
    setCollapsedEditions((prev) => {
      const next = new Set(prev);
      next.has(edition) ? next.delete(edition) : next.add(edition);
      return next;
    });
  };

  const toggleCategory = (key: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            {t('user.submissions')}
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            {t('user.manage_entries')}
          </p>
        </div>
        <Link to="/dashboard/submissions/new">
          <Button variant="primary" icon={<PlusCircle className="h-4 w-4" />}>
            {t('user.new_submission')}
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder={t('common.search')}
            icon={<Search className="h-4 w-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grouped Submissions */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Image className="h-16 w-16" />}
          title={t('user.no_submissions')}
          description={t('user.submit_to_participate')}
          action={
            <Link to="/dashboard/submissions/new">
              <Button variant="primary" icon={<PlusCircle className="h-4 w-4" />}>
                {t('user.start_first')}
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {grouped.map((editionGroup) => {
            const editionCollapsed = collapsedEditions.has(editionGroup.edition);
            const editionCount = editionGroup.categories.reduce(
              (sum, c) => sum + c.submissions.length,
              0
            );

            return (
              <div key={editionGroup.edition}>
                {/* Edition Header */}
                <button
                  onClick={() => toggleEdition(editionGroup.edition)}
                  className="w-full flex items-center gap-3 py-3 px-1 group cursor-pointer"
                >
                  {editionCollapsed ? (
                    <ChevronRight className="h-5 w-5 text-surface-500 group-hover:text-primary-400 transition-colors" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-surface-500 group-hover:text-primary-400 transition-colors" />
                  )}
                  <FolderOpen className="h-5 w-5 text-primary-400" />
                  <h2 className="text-lg font-semibold text-white group-hover:text-primary-300 transition-colors">
                    {editionGroup.edition}
                  </h2>
                  <span className="text-xs text-surface-500 bg-surface-800 px-2 py-0.5 rounded-full">
                    {editionCount} {editionCount === 1 ? 'entry' : 'entries'}
                  </span>
                </button>

                {!editionCollapsed && (
                  <div className="ml-4 border-l border-surface-800 pl-4 space-y-4 mt-1">
                    {editionGroup.categories.map((catGroup) => {
                      const catKey = `${editionGroup.edition}::${catGroup.category}`;
                      const catCollapsed = collapsedCategories.has(catKey);

                      return (
                        <div key={catKey}>
                          {/* Category Header */}
                          <button
                            onClick={() => toggleCategory(catKey)}
                            className="w-full flex items-center gap-2 py-2 px-1 group cursor-pointer"
                          >
                            {catCollapsed ? (
                              <ChevronRight className="h-4 w-4 text-surface-500 group-hover:text-primary-400 transition-colors" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-surface-500 group-hover:text-primary-400 transition-colors" />
                            )}
                            <Tag className="h-4 w-4 text-surface-400" />
                            <h3 className="text-sm font-medium text-surface-300 group-hover:text-white transition-colors">
                              {catGroup.category}
                            </h3>
                            <span className="text-xs text-surface-600">
                              ({catGroup.submissions.length})
                            </span>
                          </button>

                          {!catCollapsed && (
                            <div className="ml-6 mt-1 space-y-2">
                              {catGroup.submissions.map((sub, i) => (
                                <motion.div
                                  key={sub.id}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.03 }}
                                >
                                  <Link to={`/dashboard/submissions/${sub.id}`}>
                                    <Card hover className="p-3">
                                      <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-800 flex-shrink-0">
                                          {sub.thumbnail ? (
                                            <img src={sub.thumbnail} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-surface-600">
                                              <Image className="h-5 w-5" />
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h4 className="text-sm text-white font-medium truncate">{sub.title}</h4>
                                          <p className="text-xs text-surface-500">
                                            {sub.photos} photos
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <Badge variant={statusBadge[sub.status]?.variant || 'default'}>
                                            {t(statusBadge[sub.status]?.labelKey || sub.status)}
                                          </Badge>
                                          {sub.payment_status && (
                                            <Badge variant={paymentBadge[sub.payment_status]?.variant || 'default'}>
                                              {t(paymentBadge[sub.payment_status]?.labelKey || sub.payment_status)}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </Card>
                                  </Link>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
