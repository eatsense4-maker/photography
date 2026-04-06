import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { motion } from 'framer-motion';
import {
  Users,
  Image,
  DollarSign,
  Globe,
  TrendingUp,
  Calendar,
  Award,
  Eye,
} from 'lucide-react';
import { Card, StatsCard, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface DashStats {
  totalSubmissions: number;
  totalUsers: number;
  totalRevenue: number;
  activeEdition: string;
  countries: number;
  pendingReview: number;
}

interface RecentSub {
  id: string;
  user: string;
  category: string;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  usePageTitle('Admin Dashboard');
  const [stats, setStats] = useState<DashStats>({
    totalSubmissions: 0,
    totalUsers: 0,
    totalRevenue: 0,
    activeEdition: '—',
    countries: 0,
    pendingReview: 0,
  });
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSub[]>([]);

  useEffect(() => {
    // Fetch stats in parallel
    const fetchStats = async () => {
      const [subRes, userRes, payRes, editionRes, pendingRes] =
        await Promise.all([
          supabase
            .from('submissions')
            .select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase
            .from('payments')
            .select('amount')
            .eq('status', 'completed'),
          supabase
            .from('editions')
            .select('title, year')
            .eq('published', true)
            .order('year', { ascending: false })
            .limit(1)
            .single(),
          supabase
            .from('submissions')
            .select('*', { count: 'exact', head: true })
            .in('status', ['submitted', 'under_review']),
        ]);

      // Count distinct countries
      const { data: countryData } = await supabase
        .from('profiles')
        .select('country')
        .not('country', 'is', null);
      const uniqueCountries = new Set(
        (countryData || []).map((p) => p.country)
      ).size;

      const revenue = (payRes.data || []).reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );

      setStats({
        totalSubmissions: subRes.count || 0,
        totalUsers: userRes.count || 0,
        totalRevenue: revenue,
        activeEdition: editionRes.data
          ? `${editionRes.data.title}`
          : '—',
        countries: uniqueCountries,
        pendingReview: pendingRes.count || 0,
      });
    };

    // Fetch recent submissions
    const fetchRecent = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('id, status, created_at, profiles!submissions_user_id_fkey(full_name), categories!submissions_category_id_fkey(name)')
        .order('created_at', { ascending: false })
        .limit(6);

      if (data) {
        setRecentSubmissions(
          data.map((s: any) => ({
            id: s.id,
            user: s.profiles?.full_name || 'Unknown',
            category: s.categories?.name || '—',
            status: s.status,
            created_at: s.created_at,
          }))
        );
      }
    };

    fetchStats();
    fetchRecent();
  }, []);

  const statusColors: Record<string, string> = {
    submitted: 'primary',
    under_review: 'warning',
    accepted: 'success',
    rejected: 'danger',
    draft: 'secondary',
    disqualified: 'danger',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">
          {t('admin.dashboard')}
        </h1>
        <p className="text-surface-400 text-sm mt-1">
          Overview — {stats.activeEdition}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          label={t('admin.total_submissions')}
          value={stats.totalSubmissions}
          icon={<Image className="h-5 w-5" />}
        />
        <StatsCard
          label={t('admin.total_users')}
          value={stats.totalUsers}
          icon={<Users className="h-5 w-5" />}
        />
        <StatsCard
          label={t('admin.revenue')}
          value={`€${stats.totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatsCard
          label="Countries"
          value={stats.countries}
          icon={<Globe className="h-5 w-5" />}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Submissions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">
              Recent Submissions
            </h2>
            <Badge variant="primary">{stats.pendingReview} pending</Badge>
          </div>
          <div className="space-y-4">
            {recentSubmissions.length === 0 && (
              <p className="text-sm text-surface-500 py-4 text-center">
                No submissions yet.
              </p>
            )}
            {recentSubmissions.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between py-3 border-b border-surface-800 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-white">{sub.user}</p>
                  <p className="text-xs text-surface-500">
                    {sub.category} ·{' '}
                    {formatDistanceToNow(new Date(sub.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <Badge
                  variant={
                    (statusColors[sub.status] as
                      | 'primary'
                      | 'warning'
                      | 'success'
                      | 'danger'
                      | 'secondary') || 'secondary'
                  }
                >
                  {sub.status.replace('_', ' ')}
                </Badge>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                icon: <Calendar className="h-6 w-6" />,
                label: t('admin.manage_editions'),
                href: '/admin/editions',
                color: 'text-blue-400',
              },
              {
                icon: <Eye className="h-6 w-6" />,
                label: t('admin.review_submissions'),
                href: '/admin/submissions',
                color: 'text-green-400',
              },
              {
                icon: <Award className="h-6 w-6" />,
                label: t('admin.manage_jury'),
                href: '/admin/jury',
                color: 'text-purple-400',
              },
              {
                icon: <TrendingUp className="h-6 w-6" />,
                label: t('admin.view_results'),
                href: '/admin/results',
                color: 'text-gold-400',
              },
            ].map((action, i) => (
              <motion.a
                key={i}
                href={action.href}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-4 rounded-xl bg-surface-800/50 hover:bg-surface-800 border border-surface-700/50 hover:border-surface-600 transition-colors text-center group"
              >
                <div
                  className={`${action.color} mx-auto mb-2 group-hover:scale-110 transition-transform`}
                >
                  {action.icon}
                </div>
                <p className="text-sm text-surface-300 group-hover:text-white transition-colors">
                  {action.label}
                </p>
              </motion.a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
