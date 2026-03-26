import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Star, Users, Image, BarChart3 } from 'lucide-react';
import { Card, Badge, Select } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { getPhotoUrl } from '@/lib/r2';

interface LiveScore {
  id: string;
  photoId: string;
  storageKey: string;
  juryName: string;
  category: string;
  score: number;
  comment: string | null;
  timestamp: string;
}

interface CategoryStat {
  categoryId: string;
  categoryName: string;
  totalPhotos: number;
  scoredPhotos: number;
  avgScore: number;
}

interface JuryStat {
  juryId: string;
  juryName: string;
  scored: number;
  avgScore: number;
}

export default function AdminLiveScoring() {
  const [feed, setFeed] = useState<LiveScore[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [juryStats, setJuryStats] = useState<JuryStat[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();

    // Real-time subscription on scores table
    const channel = supabase
      .channel('live-scoring')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scores' },
        (payload) => handleNewScore(payload.new as any)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'scores' },
        (payload) => handleUpdatedScore(payload.new as any)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInitialData = async () => {
    // Fetch categories
    const { data: cats } = await supabase.from('categories').select('id, name');
    setCategories(cats || []);

    // Fetch recent scores (last 50) with photo + jury + category info
    const { data: recent } = await supabase
      .from('scores')
      .select(`
        id, score, comment, photo_id, jury_id, created_at,
        submission_photos!scores_photo_id_fkey(id, storage_key,
          submissions!submission_photos_submission_id_fkey(
            category_id,
            categories!submissions_category_id_fkey(id, name)
          )
        ),
        profiles!scores_jury_id_fkey(full_name)
      `)
      .not('photo_id', 'is', null)
      .not('score', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (recent) {
      const feedItems: LiveScore[] = recent.map((r: any) => ({
        id: r.id,
        photoId: r.photo_id,
        storageKey: r.submission_photos?.storage_key || '',
        juryName: r.profiles?.full_name || 'Jury',
        category: r.submission_photos?.submissions?.categories?.name || '—',
        score: r.score,
        comment: r.comment,
        timestamp: r.created_at,
      }));
      setFeed(feedItems);
    }

    // Fetch category stats
    await refreshStats(cats || []);
    setLoading(false);
  };

  const refreshStats = async (cats: { id: string; name: string }[]) => {
    // Photo counts + score aggregation per category
    const { data: allScores } = await supabase
      .from('scores')
      .select(`
        score, photo_id, jury_id,
        submission_photos!scores_photo_id_fkey(
          submissions!submission_photos_submission_id_fkey(category_id)
        ),
        profiles!scores_jury_id_fkey(full_name)
      `)
      .not('photo_id', 'is', null)
      .not('score', 'is', null);

    if (!allScores) return;

    // Category stats
    const catMap = new Map<string, { scores: number[]; photoIds: Set<string> }>();
    // Jury stats
    const juryMap = new Map<string, { name: string; scores: number[] }>();

    for (const s of allScores as any[]) {
      const catId = s.submission_photos?.submissions?.category_id;
      if (catId) {
        if (!catMap.has(catId)) catMap.set(catId, { scores: [], photoIds: new Set() });
        const entry = catMap.get(catId)!;
        entry.scores.push(Number(s.score));
        if (s.photo_id) entry.photoIds.add(s.photo_id);
      }

      const juryId = s.jury_id;
      const juryName = s.profiles?.full_name || 'Jury';
      if (!juryMap.has(juryId)) juryMap.set(juryId, { name: juryName, scores: [] });
      juryMap.get(juryId)!.scores.push(Number(s.score));
    }

    // Get total approved photos per category
    const { data: approvedPhotos } = await supabase
      .from('submission_photos')
      .select(`
        id,
        submissions!submission_photos_submission_id_fkey(category_id)
      `)
      .eq('status', 'approved');

    const totalByCategory = new Map<string, number>();
    for (const p of (approvedPhotos || []) as any[]) {
      const catId = p.submissions?.category_id;
      if (catId) totalByCategory.set(catId, (totalByCategory.get(catId) || 0) + 1);
    }

    const catStats: CategoryStat[] = cats.map((c) => {
      const entry = catMap.get(c.id);
      return {
        categoryId: c.id,
        categoryName: c.name,
        totalPhotos: totalByCategory.get(c.id) || 0,
        scoredPhotos: entry?.photoIds.size || 0,
        avgScore: entry ? entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length : 0,
      };
    });
    setCategoryStats(catStats);

    const jStats: JuryStat[] = Array.from(juryMap.entries()).map(([id, info]) => ({
      juryId: id,
      juryName: info.name,
      scored: info.scores.length,
      avgScore: info.scores.reduce((a, b) => a + b, 0) / info.scores.length,
    })).sort((a, b) => b.scored - a.scored);
    setJuryStats(jStats);
  };

  const handleNewScore = async (row: any) => {
    // Fetch full info for the new score
    const { data } = await supabase
      .from('scores')
      .select(`
        id, score, comment, photo_id, created_at,
        submission_photos!scores_photo_id_fkey(storage_key,
          submissions!submission_photos_submission_id_fkey(
            categories!submissions_category_id_fkey(name)
          )
        ),
        profiles!scores_jury_id_fkey(full_name)
      `)
      .eq('id', row.id)
      .single();

    if (data) {
      const item: LiveScore = {
        id: (data as any).id,
        photoId: row.photo_id,
        storageKey: (data as any).submission_photos?.storage_key || '',
        juryName: (data as any).profiles?.full_name || 'Jury',
        category: (data as any).submission_photos?.submissions?.categories?.name || '—',
        score: (data as any).score,
        comment: (data as any).comment,
        timestamp: (data as any).created_at,
      };
      setFeed((prev) => [item, ...prev].slice(0, 100));
    }

    // Refresh stats
    refreshStats(categories);
  };

  const handleUpdatedScore = async (row: any) => {
    setFeed((prev) =>
      prev.map((f) => (f.id === row.id ? { ...f, score: row.score, comment: row.comment } : f))
    );
    refreshStats(categories);
  };

  const filteredFeed = filterCategory
    ? feed.filter((f) => f.category === categories.find((c) => c.id === filterCategory)?.name)
    : feed;

  const totalScored = juryStats.reduce((a, j) => a + j.scored, 0);
  const totalPhotos = categoryStats.reduce((a, c) => a + c.totalPhotos, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <Activity className="h-6 w-6 text-emerald-500 animate-pulse" />
            Live Scoring Monitor
          </h1>
          <p className="text-surface-400 text-sm mt-1">Real-time jury scoring activity</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/10">
              <Star className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalScored}</p>
              <p className="text-xs text-surface-400">Total Scores</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gold-500/10">
              <Image className="h-5 w-5 text-gold-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalPhotos}</p>
              <p className="text-xs text-surface-400">Approved Photos</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Users className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{juryStats.length}</p>
              <p className="text-xs text-surface-400">Active Jury</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <BarChart3 className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {juryStats.length > 0
                  ? (juryStats.reduce((a, j) => a + j.avgScore, 0) / juryStats.length).toFixed(1)
                  : '—'}
              </p>
              <p className="text-xs text-surface-400">Avg Score</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Live Feed</h2>
            <div className="w-48">
              <Select
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="All categories"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {filteredFeed.length > 0 ? (
                filteredFeed.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="p-3 flex items-center gap-3">
                      {item.storageKey && (
                        <img
                          src={getPhotoUrl(item.storageKey)}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">{item.juryName}</span>
                          <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>
                        </div>
                        {item.comment && (
                          <p className="text-xs text-surface-500 truncate mt-0.5">{item.comment}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-800 flex-shrink-0">
                        <Star className={`h-3.5 w-3.5 ${item.score >= 8 ? 'text-gold-400 fill-gold-400' : 'text-surface-500'}`} />
                        <span className={`text-sm font-bold ${item.score >= 8 ? 'text-gold-400' : 'text-surface-300'}`}>
                          {item.score}
                        </span>
                      </div>
                      <span className="text-[10px] text-surface-600 flex-shrink-0 w-14 text-right">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <Card className="p-8 text-center">
                  <Activity className="h-8 w-8 text-surface-600 mx-auto mb-2" />
                  <p className="text-surface-500 text-sm">No scores yet. Waiting for jury activity...</p>
                </Card>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar: Category Progress + Jury Stats */}
        <div className="space-y-6">
          {/* Category Progress */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Category Progress</h2>
            <div className="space-y-3">
              {categoryStats.map((cat) => (
                <Card key={cat.categoryId} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white truncate">{cat.categoryName}</span>
                    <span className="text-xs text-surface-400">
                      {cat.scoredPhotos}/{cat.totalPhotos}
                    </span>
                  </div>
                  <div className="w-full bg-surface-800 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-emerald-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: cat.totalPhotos > 0 ? `${(cat.scoredPhotos / cat.totalPhotos) * 100}%` : '0%' }}
                    />
                  </div>
                  {cat.avgScore > 0 && (
                    <p className="text-xs text-surface-500 mt-1">Avg: {cat.avgScore.toFixed(1)}</p>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Jury Progress */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Jury Progress</h2>
            <div className="space-y-2">
              {juryStats.map((jury) => (
                <Card key={jury.juryId} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{jury.juryName}</p>
                    <p className="text-xs text-surface-500">{jury.scored} scored · avg {jury.avgScore.toFixed(1)}</p>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-surface-800">
                    <Star className="h-3 w-3 text-gold-400 fill-gold-400" />
                    <span className="text-xs font-bold text-gold-400">{jury.avgScore.toFixed(1)}</span>
                  </div>
                </Card>
              ))}
              {juryStats.length === 0 && (
                <p className="text-sm text-surface-500">No jury activity yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
