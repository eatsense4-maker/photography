import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Users, Plus, CheckCircle, Clock } from 'lucide-react';
import { Button, Card, Badge, Modal, Select } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface JuryMember {
  id: string;
  fullName: string;
  email: string;
  assignedCategories: string[];
  totalAssigned: number;
  reviewed: number;
}

export default function AdminJury() {
  const { t } = useTranslation();
  const [juryMembers, setJuryMembers] = useState<JuryMember[]>([]);
  const [juryProfiles, setJuryProfiles] = useState<{ id: string; full_name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedJury, setSelectedJury] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedEdition, setSelectedEdition] = useState('');
  const [editions, setEditions] = useState<{ id: string; title: string; year: number }[]>([]);

  useEffect(() => {
    // Fetch editions
    supabase
      .from('editions')
      .select('id, title, year')
      .order('year', { ascending: false })
      .then(({ data }) => {
        setEditions(data || []);
        if (data && data.length > 0) setSelectedEdition(data[0].id);
      });
  }, []);

  const fetchJuryData = async () => {
    if (!selectedEdition) return;
    setLoading(true);

    // Fetch jury assignments for this edition
    const { data: assignments } = await supabase
      .from('jury_assignments')
      .select('jury_id, categories!jury_assignments_category_id_fkey(name)')
      .eq('edition_id', selectedEdition);

    // Fetch all jury profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'jury');

    setJuryProfiles(profiles || []);

    // Fetch categories for this edition
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name')
      .eq('edition_id', selectedEdition);
    setCategories(cats || []);

    // Build jury member list
    if (profiles && assignments) {
      const memberMap = new Map<string, { cats: string[]; profile: any }>();

      for (const p of profiles) {
        memberMap.set(p.id, { cats: [], profile: p });
      }

      for (const a of assignments as any[]) {
        const existing = memberMap.get(a.jury_id);
        if (existing) {
          existing.cats.push(a.categories?.name || '—');
        }
      }

      // Fetch scores count per jury for this edition
      const { data: scores } = await supabase
        .from('scores')
        .select('jury_id, submission_id')
        .in('jury_id', profiles.map((p) => p.id));

      const scoreCount = new Map<string, number>();
      for (const s of scores || []) {
        scoreCount.set(s.jury_id, (scoreCount.get(s.jury_id) || 0) + 1);
      }

      // Count submissions assigned per jury (through categories)
      const members: JuryMember[] = profiles
        .filter((p) => {
          const m = memberMap.get(p.id);
          return m && m.cats.length > 0;
        })
        .map((p) => {
          const m = memberMap.get(p.id)!;
          return {
            id: p.id,
            fullName: p.full_name,
            email: (p as any).email || '',
            assignedCategories: m.cats,
            totalAssigned: 0, // Would need a submission count query
            reviewed: scoreCount.get(p.id) || 0,
          };
        });

      setJuryMembers(members);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJuryData();
  }, [selectedEdition]);

  const handleAssign = async () => {
    if (!selectedJury || !selectedCategory || !selectedEdition) return;
    const { error } = await supabase.from('jury_assignments').insert({
      jury_id: selectedJury,
      edition_id: selectedEdition,
      category_id: selectedCategory,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Category assigned to jury member');
    setShowAssignModal(false);
    setSelectedJury('');
    setSelectedCategory('');
    fetchJuryData();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            {t('admin.jury_management')}
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Manage jury members and track review progress
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAssignModal(true)}>
          Assign Category
        </Button>
      </div>

      {/* Edition selector */}
      <div className="max-w-xs">
        <Select
          label="Edition"
          options={editions.map((e) => ({ value: e.id, label: `${e.title} (${e.year})` }))}
          placeholder="Select edition..."
          value={selectedEdition}
          onChange={(e) => setSelectedEdition(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : juryMembers.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 text-surface-600 mx-auto mb-4" />
          <p className="text-surface-400">No jury members assigned for this edition.</p>
          <p className="text-xs text-surface-500 mt-2">
            First, set users' role to "jury" in the Users page, then assign categories here.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {juryMembers.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-surface-800 flex items-center justify-center">
                      <Users className="h-5 w-5 text-surface-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{member.fullName}</h3>
                      <p className="text-xs text-surface-500">{member.email}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {member.assignedCategories.map((cat) => (
                          <Badge key={cat} variant="secondary">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 lg:min-w-[200px]">
                    <div className="text-sm text-surface-400">
                      {member.reviewed} reviews completed
                    </div>
                    <div className="flex items-center gap-1">
                      {member.reviewed > 0 ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-400" />
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Category to Jury">
        <div className="space-y-4">
          <Select
            label="Jury Member"
            options={juryProfiles.map((m) => ({ value: m.id, label: m.full_name }))}
            placeholder="Select jury member..."
            value={selectedJury}
            onChange={(e) => setSelectedJury(e.target.value)}
          />
          <Select
            label="Category"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Select category..."
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAssign} disabled={!selectedJury || !selectedCategory}>
              Assign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
