import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BarChart3, Image, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface AssignmentProgress {
  categoryId: string;
  categoryName: string;
  totalSubmissions: number;
  scoredCount: number;
}

export default function JuryDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentProgress[]>([]);
  const [totalScored, setTotalScored] = useState(0);
  const [totalAssigned, setTotalAssigned] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    fetchProgress();
  }, [user?.id]);

  const fetchProgress = async () => {
    if (!user?.id) return;

    // Get jury assignments with category info
    const { data: assignData } = await supabase
      .from('jury_assignments')
      .select('id, category_id, categories(id, name, edition_id)')
      .eq('jury_id', user.id);

    if (!assignData || assignData.length === 0) {
      setLoading(false);
      return;
    }

    const progress: AssignmentProgress[] = [];
    let scored = 0;
    let assigned = 0;

    for (const a of assignData) {
      const cat = a.categories as any;
      if (!cat) continue;

      // Count submissions in category
      const { count: subCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', cat.id)
        .in('status', ['submitted', 'under_review', 'accepted']);

      // Count scores by this jury member in this category
      const { count: scoreCount } = await supabase
        .from('scores')
        .select('*, submissions!inner(category_id)', { count: 'exact', head: true })
        .eq('jury_id', user.id)
        .eq('submissions.category_id', cat.id);

      const total = subCount || 0;
      const done = scoreCount || 0;

      progress.push({
        categoryId: cat.id,
        categoryName: cat.name,
        totalSubmissions: total,
        scoredCount: done,
      });

      assigned += total;
      scored += done;
    }

    setAssignments(progress);
    setTotalScored(scored);
    setTotalAssigned(assigned);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  const overallPercent = totalAssigned > 0 ? Math.round((totalScored / totalAssigned) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">
          {t('jury.dashboard')}
        </h1>
        <p className="text-surface-400 text-sm mt-1">
          Review and score assigned submissions
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/10">
              <Image className="h-5 w-5 text-primary-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalAssigned}</p>
              <p className="text-sm text-surface-400">Total Assigned</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalScored}</p>
              <p className="text-sm text-surface-400">Scored</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalAssigned - totalScored}</p>
              <p className="text-sm text-surface-400">Remaining</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white">Overall Progress</h3>
          <span className="text-sm font-medium text-primary-400">{overallPercent}%</span>
        </div>
        <div className="h-3 rounded-full bg-surface-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400"
            initial={{ width: 0 }}
            animate={{ width: `${overallPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </Card>

      {/* Category Progress */}
      {assignments.length === 0 ? (
        <Card className="p-12 text-center">
          <BarChart3 className="h-16 w-16 text-surface-600 mx-auto mb-4" />
          <p className="text-surface-400 text-lg">No categories assigned</p>
          <p className="text-surface-500 text-sm mt-2">
            You will be assigned categories to review by an administrator
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">By Category</h2>
          {assignments.map((a, i) => {
            const pct = a.totalSubmissions > 0 ? Math.round((a.scoredCount / a.totalSubmissions) * 100) : 0;
            return (
              <motion.div
                key={a.categoryId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-white">{a.categoryName}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-surface-400">
                        {a.scoredCount}/{a.totalSubmissions}
                      </span>
                      <Link
                        to="/jury/review"
                        className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1"
                      >
                        Review <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-surface-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
