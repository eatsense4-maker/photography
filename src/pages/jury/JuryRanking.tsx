import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Trophy, Save, Image } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { getPhotoUrl } from '@/lib/r2';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

interface RankedSubmission {
  id: string;
  submissionId: string;
  title: string;
  photographer: string;
  category: string;
  avgScore: number;
  thumbnailKey: string | null;
  rank: number | null;
}

export default function JuryRanking() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ranked, setRanked] = useState<RankedSubmission[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    fetchCategories();
  }, [user?.id]);

  useEffect(() => {
    if (selectedCategory) fetchRanking();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from('jury_assignments')
      .select('category_id, categories(id, name)')
      .eq('jury_id', user.id);

    const cats = (data || [])
      .map((a: any) => a.categories)
      .filter(Boolean);

    setCategories(cats);
    if (cats.length > 0) {
      setSelectedCategory(cats[0].id);
    } else {
      setLoading(false);
    }
  };

  const fetchRanking = async () => {
    setLoading(true);

    // Get submissions in this category that have been scored (phase2 or top-scored phase1)
    const { data: scores } = await supabase
      .from('scores')
      .select('id, submission_id, score, rank, submissions(id, title, category_id, profiles!submissions_user_id_fkey(full_name), categories(name), submission_photos(storage_key, sort_order))')
      .eq('submissions.category_id', selectedCategory)
      .order('score', { ascending: false });

    if (!scores) {
      setRanked([]);
      setLoading(false);
      return;
    }

    // Aggregate scores per submission
    const subMap = new Map<string, {
      submissionId: string;
      title: string;
      photographer: string;
      category: string;
      totalScore: number;
      count: number;
      thumbnailKey: string | null;
      rank: number | null;
      scoreIds: string[];
    }>();

    for (const s of scores) {
      const sub = s.submissions as any;
      if (!sub || sub.category_id !== selectedCategory) continue;

      const existing = subMap.get(sub.id);
      if (existing) {
        existing.totalScore += s.score;
        existing.count += 1;
        existing.scoreIds.push(s.id);
        if (s.rank !== null) existing.rank = s.rank;
      } else {
        const photos = (sub.submission_photos || []).sort(
          (a: any, b: any) => a.sort_order - b.sort_order
        );
        subMap.set(sub.id, {
          submissionId: sub.id,
          title: sub.title || 'Untitled',
          photographer: sub.profiles?.full_name || 'Anonymous',
          category: sub.categories?.name || '',
          totalScore: s.score,
          count: 1,
          thumbnailKey: photos[0]?.storage_key || null,
          rank: s.rank,
          scoreIds: [s.id],
        });
      }
    }

    const items: RankedSubmission[] = Array.from(subMap.values())
      .map((s) => ({
        id: s.scoreIds[0],
        submissionId: s.submissionId,
        title: s.title,
        photographer: s.photographer,
        category: s.category,
        avgScore: Math.round((s.totalScore / s.count) * 10) / 10,
        thumbnailKey: s.thumbnailKey,
        rank: s.rank,
      }))
      .sort((a, b) => {
        // Sort by rank if both have ranks, otherwise by avgScore
        if (a.rank && b.rank) return a.rank - b.rank;
        if (a.rank) return -1;
        if (b.rank) return 1;
        return b.avgScore - a.avgScore;
      });

    setRanked(items);
    setLoading(false);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newRanked = [...ranked];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newRanked.length) return;

    [newRanked[index], newRanked[targetIndex]] = [newRanked[targetIndex], newRanked[index]];
    setRanked(newRanked);
  };

  const handleSaveRanking = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < ranked.length; i++) {
        const item = ranked[i];
        await supabase
          .from('scores')
          .update({ rank: i + 1 })
          .eq('id', item.id);
      }
      toast.success('Rankings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save rankings');
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            {t('jury.ranking')}
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Rank the top submissions by dragging or using arrows
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Save className="h-4 w-4" />}
          onClick={handleSaveRanking}
          loading={saving}
          disabled={ranked.length === 0}
        >
          Save Rankings
        </Button>
      </div>

      {/* Category Selector */}
      {categories.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {ranked.length === 0 ? (
        <Card className="p-12 text-center">
          <Trophy className="h-16 w-16 text-surface-600 mx-auto mb-4" />
          <p className="text-surface-400 text-lg">No submissions to rank</p>
          <p className="text-surface-500 text-sm mt-2">
            Score submissions first in the Review tab
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {ranked.map((item, index) => (
            <motion.div
              key={item.submissionId}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className="p-4 flex items-center gap-4 hover:ring-1 hover:ring-surface-700 transition-all">
                {/* Rank Number */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                  index === 0 ? 'bg-gold-500/20 text-gold-400' :
                  index === 1 ? 'bg-surface-500/20 text-surface-300' :
                  index === 2 ? 'bg-amber-700/20 text-amber-500' :
                  'bg-surface-800 text-surface-400'
                }`}>
                  {index + 1}
                </div>

                {/* Thumbnail */}
                <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-surface-800">
                  {item.thumbnailKey ? (
                    <img
                      src={getPhotoUrl(item.thumbnailKey)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="h-5 w-5 text-surface-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">{item.title}</h3>
                  <p className="text-sm text-surface-400">{item.photographer}</p>
                </div>

                {/* Score */}
                <div className="text-right">
                  <p className="text-lg font-bold text-gold-400">{item.avgScore}</p>
                  <p className="text-xs text-surface-500">avg score</p>
                </div>

                {/* Move Buttons */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0}
                    className="p-1 rounded text-surface-400 hover:text-white hover:bg-surface-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                  </button>
                  <button
                    onClick={() => moveItem(index, 'down')}
                    disabled={index === ranked.length - 1}
                    className="p-1 rounded text-surface-400 hover:text-white hover:bg-surface-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
