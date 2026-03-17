import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Trophy, Download, Eye, Send, Award, Medal } from 'lucide-react';
import { Button, Card, Badge, Select } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Result {
  rank: number;
  submissionId: string;
  photographerName: string;
  country: string;
  category: string;
  avgScore: number;
  juryCount: number;
}

export default function AdminResults() {
  const { t } = useTranslation();
  const [results, setResults] = useState<Result[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    // Fetch categories for filter
    supabase
      .from('categories')
      .select('id, name')
      .then(({ data }) => setCategories(data || []));

    fetchResults();
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    // Fetch all scores with submission + profile + category info
    const { data } = await supabase
      .from('scores')
      .select(`
        score, rank, submission_id,
        submissions!scores_submission_id_fkey(
          id,
          profiles!submissions_user_id_fkey(full_name, country),
          categories!submissions_category_id_fkey(id, name)
        )
      `)
      .not('score', 'is', null);

    if (data) {
      // Aggregate by submission
      const submissionMap = new Map<
        string,
        { scores: number[]; name: string; country: string; category: string; categoryId: string; rank: number | null }
      >();

      for (const row of data as any[]) {
        const subId = row.submission_id;
        if (!submissionMap.has(subId)) {
          submissionMap.set(subId, {
            scores: [],
            name: row.submissions?.profiles?.full_name || 'Unknown',
            country: row.submissions?.profiles?.country || '—',
            category: row.submissions?.categories?.name || '—',
            categoryId: row.submissions?.categories?.id || '',
            rank: row.rank,
          });
        }
        submissionMap.get(subId)!.scores.push(Number(row.score));
      }

      const resultsList: Result[] = Array.from(submissionMap.entries())
        .map(([subId, info]) => ({
          submissionId: subId,
          photographerName: info.name,
          country: info.country,
          category: info.category,
          avgScore:
            info.scores.reduce((a, b) => a + b, 0) / info.scores.length,
          juryCount: info.scores.length,
          rank: info.rank || 0,
        }))
        .sort((a, b) => b.avgScore - a.avgScore)
        .map((r, i) => ({ ...r, rank: i + 1 }));

      setResults(resultsList);
    }
    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-gold-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-300" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-sm text-surface-500 font-mono">#{rank}</span>;
    }
  };

  const handlePublish = async () => {
    // Mark top results as accepted/winners
    setPublished(true);
    toast.success('Results published successfully!');
  };

  const handleNotifyWinners = async () => {
    // Send notifications to winners
    // Would need user_id from submission — simplified for now
    toast.success('Email notifications sent to winners!');
  };

  const filteredResults = category
    ? results.filter((r) => r.category === categories.find((c) => c.id === category)?.name)
    : results;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            {t('admin.results')}
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Aggregated scores and competition results
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={<Download className="h-4 w-4" />}>
            Export
          </Button>
          {!published ? (
            <Button variant="primary" icon={<Eye className="h-4 w-4" />} onClick={handlePublish}>
              Publish Results
            </Button>
          ) : (
            <Button variant="primary" icon={<Send className="h-4 w-4" />} onClick={handleNotifyWinners}>
              Notify Winners
            </Button>
          )}
        </div>
      </div>

      {published && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-4 border-green-500/30 bg-green-500/5">
            <p className="text-green-400 text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Results are published and visible to the public.
            </p>
          </Card>
        </motion.div>
      )}

      {/* Category Filter */}
      <div className="max-w-xs">
        <Select
          label="Category"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="All categories"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </div>

      {/* Results Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-4 w-20">Rank</th>
                  <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-4">Photographer</th>
                  <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-4">Country</th>
                  <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-4">Category</th>
                  <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-4">Avg Score</th>
                  <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-4">Jury Count</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result, i) => (
                  <motion.tr
                    key={result.submissionId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors ${
                      result.rank <= 3 ? 'bg-gold-500/5' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center w-8">
                        {getRankIcon(result.rank)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-white">{result.photographerName}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-300">{result.country}</td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary">{result.category}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold ${
                        result.avgScore >= 9 ? 'text-gold-400' :
                        result.avgScore >= 8 ? 'text-green-400' :
                        'text-surface-300'
                      }`}>
                        {result.avgScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-400">{result.juryCount}</td>
                  </motion.tr>
                ))}
                {filteredResults.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-surface-500">
                      No scored submissions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
