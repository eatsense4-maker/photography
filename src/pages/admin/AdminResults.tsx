import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { motion } from 'framer-motion';
import { Trophy, Download, Eye, Award, Medal, Star, Globe } from 'lucide-react';
import { Button, Card, Badge, Select, Modal } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { getPhotoUrl } from '@/lib/r2';
import type { Edition } from '@/types';
import toast from 'react-hot-toast';

interface PhotoResult {
  rank: number;
  photoId: string;
  storageKey: string;
  photographerName: string;
  country: string;
  category: string;
  categoryId: string;
  avgScore: number;
  juryCount: number;
}

interface CategoryWinners {
  categoryId: string;
  categoryName: string;
  winners: PhotoResult[]; // top 3
  rest: PhotoResult[];
}

export default function AdminResults() {
  const { t } = useTranslation();
  usePageTitle('Results');
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEdition, setSelectedEdition] = useState('');
  const [categoryWinners, setCategoryWinners] = useState<CategoryWinners[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [publishModal, setPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const currentEdition = editions.find((e) => e.id === selectedEdition);

  useEffect(() => {
    fetchEditions();
  }, []);

  useEffect(() => {
    if (selectedEdition) fetchResults();
  }, [selectedEdition]);

  const fetchEditions = async () => {
    const { data } = await supabase
      .from('editions')
      .select('*')
      .order('year', { ascending: false });
    const eds = data || [];
    setEditions(eds);

    // Auto-select the most recent non-draft edition, or just the first
    const active = eds.find((e) => e.status === 'judging' || e.status === 'completed') || eds[0];
    if (active) setSelectedEdition(active.id);
    else setLoading(false);
  };

  const fetchResults = async () => {
    setLoading(true);

    // Get categories for this edition (for the filter dropdown)
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name')
      .eq('edition_id', selectedEdition);
    setCategories(cats || []);

    // Use RPC to aggregate scores server-side — avoids PostgREST 1000-row default limit
    const { data, error } = await supabase
      .rpc('get_edition_photo_scores', { p_edition_id: selectedEdition });

    if (error || !data || data.length === 0) {
      setCategoryWinners([]);
      setLoading(false);
      return;
    }

    // Build per-category ranked lists directly from aggregated RPC rows
    const byCat = new Map<string, PhotoResult[]>();
    for (const row of data as any[]) {
      const result: PhotoResult = {
        rank: 0,
        photoId: row.photo_id,
        storageKey: row.storage_key || '',
        photographerName: row.photographer || 'Unknown',
        country: row.country || '—',
        category: row.category_name || '—',
        categoryId: row.category_id || '',
        avgScore: Number(row.avg_score),
        juryCount: Number(row.jury_count),
      };
      if (!byCat.has(row.category_id)) byCat.set(row.category_id, []);
      byCat.get(row.category_id)!.push(result);
    }

    const catWinnersList: CategoryWinners[] = [];
    for (const [catId, photos] of byCat) {
      photos.sort((a, b) => b.avgScore - a.avgScore);
      photos.forEach((p, i) => (p.rank = i + 1));
      catWinnersList.push({
        categoryId: catId,
        categoryName: photos[0]?.category || '—',
        winners: photos.slice(0, 3),
        rest: photos.slice(3),
      });
    }
    catWinnersList.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
    setCategoryWinners(catWinnersList);
    setLoading(false);
  };

  const handlePublishResults = async () => {
    if (!selectedEdition) return;
    setPublishing(true);
    const { error } = await supabase
      .from('editions')
      .update({ results_published: true, updated_at: new Date().toISOString() })
      .eq('id', selectedEdition);
    setPublishing(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Results published! Winners & participants are now visible.');
    setPublishModal(false);
    setEditions((prev) =>
      prev.map((e) => (e.id === selectedEdition ? { ...e, results_published: true } : e))
    );
  };

  const handleUnpublishResults = async () => {
    if (!selectedEdition) return;
    const { error } = await supabase
      .from('editions')
      .update({ results_published: false, updated_at: new Date().toISOString() })
      .eq('id', selectedEdition);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Results unpublished');
    setEditions((prev) =>
      prev.map((e) => (e.id === selectedEdition ? { ...e, results_published: false } : e))
    );
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-6 w-6 text-gold-500" />;
      case 2: return <Medal className="h-6 w-6 text-gray-300" />;
      case 3: return <Award className="h-6 w-6 text-amber-600" />;
      default: return <span className="text-sm text-surface-500 font-mono">#{rank}</span>;
    }
  };

  const getRankLabel = (rank: number) => {
    switch (rank) {
      case 1: return '1st Place';
      case 2: return '2nd Place';
      case 3: return '3rd Place';
      default: return `#${rank}`;
    }
  };

  const filtered = category
    ? categoryWinners.filter((c) => c.categoryId === category)
    : categoryWinners;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">{t('admin.results')}</h1>
          <p className="text-surface-400 text-sm mt-1">Per-category winners ranked by average jury score</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={<Download className="h-4 w-4" />}>Export</Button>
          {currentEdition?.results_published ? (
            <Button variant="ghost" icon={<Eye className="h-4 w-4" />} onClick={handleUnpublishResults}>Unpublish Results</Button>
          ) : (
            <Button variant="primary" icon={<Globe className="h-4 w-4" />} onClick={() => setPublishModal(true)} disabled={categoryWinners.length === 0}>
              Publish Results
            </Button>
          )}
        </div>
      </div>

      {/* Edition Selector */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-64">
          <Select
            label="Edition"
            options={editions.map((e) => ({ value: e.id, label: `${e.title} (${e.year})` }))}
            placeholder="Select edition"
            value={selectedEdition}
            onChange={(e) => { setSelectedEdition(e.target.value); setCategory(''); }}
          />
        </div>
        <div className="w-52">
          <Select
            label="Category"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="All categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        {currentEdition && (
          <div className="flex items-center gap-2 pb-1">
            <Badge variant={currentEdition.results_published ? 'success' : 'secondary'}>
              {currentEdition.results_published ? 'Results Published' : 'Results Draft'}
            </Badge>
          </div>
        )}
      </div>

      {currentEdition?.results_published && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-4 border-green-500/30 bg-green-500/5">
            <p className="text-green-400 text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Results are published. Winners and participants are visible on the Winners page.
            </p>
          </Card>
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Trophy className="h-10 w-10 text-surface-600 mx-auto mb-3" />
          <p className="text-surface-500">No scored photos yet.</p>
        </Card>
      ) : (
        filtered.map((cat) => (
          <div key={cat.categoryId} className="space-y-4">
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-gold-400" />
              {cat.categoryName}
            </h2>

            {/* Winners Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {cat.winners.map((winner) => (
                <motion.div
                  key={winner.photoId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: winner.rank * 0.1 }}
                >
                  <Card className={`overflow-hidden ${winner.rank === 1 ? 'ring-2 ring-gold-500/50' : winner.rank === 2 ? 'ring-1 ring-gray-400/30' : 'ring-1 ring-amber-600/30'}`}>
                    <div className="relative aspect-[4/3] bg-black">
                      {winner.storageKey && (
                        <img src={getPhotoUrl(winner.storageKey)} alt="" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute top-3 left-3">{getRankIcon(winner.rank)}</div>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <div className="flex items-center gap-1.5">
                          <Star className="h-3.5 w-3.5 text-gold-400 fill-gold-400" />
                          <span className="text-white font-bold">{winner.avgScore.toFixed(1)}</span>
                          <span className="text-surface-400 text-xs">/ 10</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${winner.rank === 1 ? 'text-gold-400' : winner.rank === 2 ? 'text-gray-300' : 'text-amber-500'}`}>
                          {getRankLabel(winner.rank)}
                        </span>
                        <span className="text-xs text-surface-500">{winner.juryCount} jury scores</span>
                      </div>
                      <p className="text-sm font-medium text-white">{winner.photographerName}</p>
                      <p className="text-xs text-surface-500">{winner.country}</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Remaining ranked photos table */}
            {cat.rest.length > 0 && (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-800">
                        <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3 w-16">Rank</th>
                        <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3 w-16">Photo</th>
                        <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Photographer</th>
                        <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Country</th>
                        <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Avg Score</th>
                        <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Jury</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.rest.map((r) => (
                        <tr key={r.photoId} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                          <td className="px-6 py-3 text-sm text-surface-500 font-mono">#{r.rank}</td>
                          <td className="px-6 py-3">
                            {r.storageKey && (
                              <img src={getPhotoUrl(r.storageKey)} alt="" className="w-10 h-10 rounded object-cover" />
                            )}
                          </td>
                          <td className="px-6 py-3 text-sm text-white">{r.photographerName}</td>
                          <td className="px-6 py-3 text-sm text-surface-300">{r.country}</td>
                          <td className="px-6 py-3">
                            <span className={`text-sm font-bold ${r.avgScore >= 9 ? 'text-gold-400' : r.avgScore >= 8 ? 'text-green-400' : 'text-surface-300'}`}>
                              {r.avgScore.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-surface-400">{r.juryCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        ))
      )}

      {/* Publish Confirmation Modal */}
      <Modal isOpen={publishModal} onClose={() => setPublishModal(false)} title="Publish Results">
        <div className="space-y-4">
          <p className="text-surface-300">
            Publishing results for <strong className="text-white">{currentEdition?.title} ({currentEdition?.year})</strong> will:
          </p>
          <ul className="text-sm text-surface-400 space-y-2 ml-4 list-disc">
            <li>Announce the <strong className="text-white">winners</strong> and <strong className="text-white">participants</strong> publicly</li>
            <li>Display the top 3 winners per category on the <strong className="text-white">Winners</strong> page</li>
          </ul>
          <p className="text-xs text-surface-500 mt-2">This does not change the edition status or gallery visibility.</p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setPublishModal(false)}>Cancel</Button>
            <Button variant="primary" icon={<Globe className="h-4 w-4" />} onClick={handlePublishResults} loading={publishing}>
              Publish Results
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
