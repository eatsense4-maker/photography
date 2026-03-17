import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Image, PlusCircle, Award, Clock, CheckCircle2, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { StatsCard, Button, Card, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

interface RecentSub {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
}

export default function UserDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, submitted: 0, underReview: 0, awards: 0 });
  const [recent, setRecent] = useState<RecentSub[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      // Fetch submission counts
      const { data: subs } = await supabase
        .from('submissions')
        .select('id, status')
        .eq('user_id', user.id);

      if (subs) {
        setStats({
          total: subs.length,
          submitted: subs.filter((s) => s.status === 'submitted').length,
          underReview: subs.filter((s) => s.status === 'under_review').length,
          awards: subs.filter((s) => s.status === 'accepted').length,
        });
      }

      // Fetch recent submissions
      const { data } = await supabase
        .from('submissions')
        .select('id, title, status, created_at, categories!submissions_category_id_fkey(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        setRecent(
          data.map((s: any) => ({
            id: s.id,
            title: s.title || 'Untitled',
            category: s.categories?.name || '—',
            status: s.status,
            created_at: s.created_at,
          }))
        );
      }
    };

    fetchData();
  }, [user?.id]);

  const statusColors: Record<string, string> = {
    draft: 'secondary',
    submitted: 'primary',
    under_review: 'warning',
    accepted: 'success',
    rejected: 'danger',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-display font-bold text-white">
          {t('user.dashboard')}
        </h1>
        <p className="text-surface-400 mt-1">
          Welcome back, {user?.full_name}
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div custom={0} variants={fadeUp}>
          <StatsCard
            label="Total Submissions"
            value={stats.total}
            icon={<Image className="h-5 w-5" />}
          />
        </motion.div>
        <motion.div custom={1} variants={fadeUp}>
          <StatsCard
            label="Submitted"
            value={stats.submitted}
            icon={<Send className="h-5 w-5" />}
          />
        </motion.div>
        <motion.div custom={2} variants={fadeUp}>
          <StatsCard
            label="Under Review"
            value={stats.underReview}
            icon={<Clock className="h-5 w-5" />}
          />
        </motion.div>
        <motion.div custom={3} variants={fadeUp}>
          <StatsCard
            label="Awards"
            value={stats.awards}
            icon={<Award className="h-5 w-5" />}
          />
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card hover className="p-6">
          <Link to="/dashboard/submissions/new" className="block">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary-600/10 text-primary-400">
                <PlusCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-white font-semibold">{t('user.new_submission')}</h3>
                <p className="text-sm text-surface-400">Submit your photos to the current edition</p>
              </div>
            </div>
          </Link>
        </Card>

        <Card hover className="p-6">
          <Link to="/dashboard/submissions" className="block">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-600/10 text-blue-400">
                <Image className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-white font-semibold">{t('user.submissions')}</h3>
                <p className="text-sm text-surface-400">View and manage your submissions</p>
              </div>
            </div>
          </Link>
        </Card>

        <Card hover className="p-6">
          <Link to="/dashboard/certificates" className="block">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gold-600/10 text-gold-400">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-white font-semibold">{t('user.certificates')}</h3>
                <p className="text-sm text-surface-400">Download your certificates</p>
              </div>
            </div>
          </Link>
        </Card>
      </div>

      {/* Recent Submissions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Recent Submissions</h2>
          <Link to="/dashboard/submissions">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-surface-700 mb-4" />
            <p className="text-surface-400">{t('user.no_submissions')}</p>
            <Link to="/dashboard/submissions/new" className="mt-4">
              <Button variant="primary" size="sm" icon={<PlusCircle className="h-4 w-4" />}>
                {t('user.start_first')}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map((sub) => (
              <Link key={sub.id} to={`/dashboard/submissions/${sub.id}`}>
                <div className="flex items-center justify-between py-3 border-b border-surface-800 last:border-0 hover:bg-surface-800/30 rounded-lg px-2 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white">{sub.title}</p>
                    <p className="text-xs text-surface-500">
                      {sub.category} ·{' '}
                      {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant={(statusColors[sub.status] || 'secondary') as any}>
                    {sub.status.replace('_', ' ')}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
