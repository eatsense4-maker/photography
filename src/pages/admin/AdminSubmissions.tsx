import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Download,
  Image,
  Users,
  Tag,
  List,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button, Card, Badge, Input, Select, Modal } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

type GroupMode = 'none' | 'user' | 'category';

interface AdminSubmission {
  id: string;
  userId: string;
  userName: string;
  userCountry: string;
  category: string;
  categoryId: string;
  photoCount: number;
  status: string;
  paymentStatus: string;
  submittedAt: string;
}

export default function AdminSubmissions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [groupBy, setGroupBy] = useState<GroupMode>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [actionModal, setActionModal] = useState<{ sub: AdminSubmission; action: string } | null>(null);

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('submissions')
      .select(`
        id, user_id, status, submitted_at, created_at,
        profiles!submissions_user_id_fkey(full_name, country),
        categories!submissions_category_id_fkey(id, name),
        submission_photos(id),
        payments(status)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setSubmissions(
        data.map((s: any) => ({
          id: s.id,
          userId: s.user_id,
          userName: s.profiles?.full_name || 'Unknown',
          userCountry: s.profiles?.country || '—',
          category: s.categories?.name || '—',
          categoryId: s.categories?.id || '',
          photoCount: s.submission_photos?.length || 0,
          status: s.status,
          paymentStatus: s.payments?.[0]?.status || 'none',
          submittedAt: (s.submitted_at || s.created_at || '').slice(0, 10),
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubmissions();
    supabase
      .from('categories')
      .select('id, name')
      .then(({ data }) => setCategories(data || []));
  }, []);

  const statusBadgeVariant: Record<string, string> = {
    draft: 'secondary',
    submitted: 'primary',
    under_review: 'warning',
    accepted: 'success',
    rejected: 'danger',
    disqualified: 'danger',
  };

  const filteredSubmissions = submissions.filter((s) => {
    const matchSearch =
      s.userName.toLowerCase().includes(search.toLowerCase()) ||
      s.id.includes(search);
    const matchStatus = !statusFilter || s.status === statusFilter;
    const matchCategory = !categoryFilter || s.categoryId === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  /** Build groups based on groupBy mode */
  const groups: { key: string; label: string; sublabel?: string; items: AdminSubmission[] }[] = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: '__all', label: '', items: filteredSubmissions }];
    }
    const map = new Map<string, { label: string; sublabel?: string; items: AdminSubmission[] }>();
    for (const sub of filteredSubmissions) {
      if (groupBy === 'user') {
        const key = sub.userId;
        if (!map.has(key)) map.set(key, { label: sub.userName, sublabel: sub.userCountry, items: [] });
        map.get(key)!.items.push(sub);
      } else {
        const key = sub.categoryId || sub.category;
        if (!map.has(key)) map.set(key, { label: sub.category, items: [] });
        map.get(key)!.items.push(sub);
      }
    }
    return Array.from(map.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredSubmissions, groupBy]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleAction = async (action: string) => {
    if (!actionModal) return;
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    const { error } = await supabase
      .from('submissions')
      .update({ status: newStatus })
      .eq('id', actionModal.sub.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Submission ${action}ed`);
    setActionModal(null);
    fetchSubmissions();
  };

  const groupModes: { mode: GroupMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'none', icon: <List className="h-4 w-4" />, label: 'No grouping' },
    { mode: 'user', icon: <Users className="h-4 w-4" />, label: 'By user' },
    { mode: 'category', icon: <Tag className="h-4 w-4" />, label: 'By category' },
  ];

  /** Render a table for a list of submissions */
  const renderTable = (items: AdminSubmission[], animOffset = 0) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-800">
            <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">User</th>
            <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Category</th>
            <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Photos</th>
            <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Status</th>
            <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Payment</th>
            <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Date</th>
            <th className="text-right text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((sub, i) => (
            <motion.tr
              key={sub.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: (animOffset + i) * 0.03 }}
              className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors"
            >
              <td className="px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{sub.userName}</p>
                  <p className="text-xs text-surface-500">{sub.userCountry}</p>
                </div>
              </td>
              <td className="px-6 py-3 text-sm text-surface-300">{sub.category}</td>
              <td className="px-6 py-3">
                <div className="flex items-center gap-1 text-sm text-surface-400">
                  <Image className="h-3.5 w-3.5" />
                  {sub.photoCount}
                </div>
              </td>
              <td className="px-6 py-3">
                <Badge variant={(statusBadgeVariant[sub.status] || 'secondary') as 'primary' | 'success' | 'warning' | 'danger' | 'secondary'}>
                  {sub.status.replace('_', ' ')}
                </Badge>
              </td>
              <td className="px-6 py-3">
                <Badge variant={sub.paymentStatus === 'completed' ? 'success' : sub.paymentStatus === 'refunded' ? 'warning' : 'secondary'}>
                  {sub.paymentStatus}
                </Badge>
              </td>
              <td className="px-6 py-3 text-sm text-surface-400">{sub.submittedAt}</td>
              <td className="px-6 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" icon={<Eye className="h-4 w-4" />} onClick={() => navigate(`/admin/submissions/${sub.id}`)} />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<CheckCircle className="h-4 w-4 text-green-400" />}
                    onClick={() => setActionModal({ sub, action: 'accept' })}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<XCircle className="h-4 w-4 text-red-400" />}
                    onClick={() => setActionModal({ sub, action: 'reject' })}
                  />
                </div>
              </td>
            </motion.tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-8 text-surface-500">
                No submissions found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            {t('admin.submissions')}
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            {submissions.length} total submissions
          </p>
        </div>
        <Button variant="secondary" icon={<Download className="h-4 w-4" />}>
          Export CSV
        </Button>
      </div>

      {/* Filters + Group By */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <Select
              options={[
                { value: 'submitted', label: 'Submitted' },
                { value: 'under_review', label: 'Under Review' },
                { value: 'accepted', label: 'Accepted' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'disqualified', label: 'Disqualified' },
              ]}
              placeholder="All statuses"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
            <Select
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="All categories"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
          </div>

          {/* Group By Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-500 uppercase tracking-wider mr-1">Group by:</span>
            {groupModes.map((gm) => (
              <button
                key={gm.mode}
                onClick={() => {
                  setGroupBy(gm.mode);
                  setCollapsedGroups(new Set());
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  groupBy === gm.mode
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                    : 'bg-surface-800 text-surface-400 hover:text-white border border-transparent'
                }`}
              >
                {gm.icon}
                {gm.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : groupBy === 'none' ? (
        <Card className="overflow-hidden">
          {renderTable(filteredSubmissions)}
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const collapsed = collapsedGroups.has(group.key);
            return (
              <Card key={group.key} className="overflow-hidden">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center gap-3 px-6 py-4 hover:bg-surface-800/30 transition-colors cursor-pointer"
                >
                  {collapsed ? (
                    <ChevronRight className="h-5 w-5 text-surface-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-surface-500" />
                  )}
                  {groupBy === 'user' ? (
                    <Users className="h-5 w-5 text-primary-400" />
                  ) : (
                    <Tag className="h-5 w-5 text-primary-400" />
                  )}
                  <div className="text-left">
                    <span className="text-sm font-semibold text-white">{group.label}</span>
                    {group.sublabel && (
                      <span className="text-xs text-surface-500 ml-2">{group.sublabel}</span>
                    )}
                  </div>
                  <span className="ml-auto text-xs text-surface-500 bg-surface-800 px-2 py-0.5 rounded-full">
                    {group.items.length} {group.items.length === 1 ? 'submission' : 'submissions'}
                  </span>
                </button>

                {!collapsed && (
                  <div className="border-t border-surface-800">
                    {renderTable(group.items)}
                  </div>
                )}
              </Card>
            );
          })}
          {groups.length === 0 && (
            <Card className="p-8 text-center text-surface-500">
              No submissions found.
            </Card>
          )}
        </div>
      )}

      {/* Action Modal */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => setActionModal(null)}
        title={`${actionModal?.action === 'accept' ? 'Accept' : 'Reject'} Submission`}
      >
        <p className="text-surface-300 mb-6">
          Are you sure you want to {actionModal?.action} the submission by{' '}
          <span className="text-white font-medium">{actionModal?.sub.userName}</span>?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setActionModal(null)}>Cancel</Button>
          <Button
            variant={actionModal?.action === 'accept' ? 'primary' : 'danger'}
            onClick={() => handleAction(actionModal?.action || '')}
          >
            {actionModal?.action === 'accept' ? 'Accept' : 'Reject'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
