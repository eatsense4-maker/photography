import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, CreditCard, Package } from 'lucide-react';
import { Button, Card, Modal, Input, Textarea, Select } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { PricingTier, Category } from '@/types';
import toast from 'react-hot-toast';

export default function AdminPricingTiers() {
  usePageTitle('Pricing');
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [editions, setEditions] = useState<{ id: string; title: string; year: number }[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedEdition, setSelectedEdition] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [photoCredits, setPhotoCredits] = useState('1');
  const [price, setPrice] = useState('0');
  const [isBundle, setIsBundle] = useState(false);
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [categoryId, setCategoryId] = useState<string>('');

  useEffect(() => {
    supabase
      .from('editions')
      .select('id, title, year')
      .order('year', { ascending: false })
      .then(({ data }) => {
        setEditions(data || []);
        if (data && data.length > 0) setSelectedEdition(data[0].id);
      });
  }, []);

  const fetchTiers = async (eid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('pricing_tiers')
      .select('*')
      .eq('edition_id', eid)
      .order('sort_order');
    setTiers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedEdition) fetchTiers(selectedEdition);
  }, [selectedEdition]);

  useEffect(() => {
    if (!selectedEdition) { setCategories([]); return; }
    supabase
      .from('categories')
      .select('*')
      .eq('edition_id', selectedEdition)
      .order('sort_order')
      .then(({ data }) => setCategories(data || []));
  }, [selectedEdition]);

  const openCreate = () => {
    setEditingTier(null);
    setName('');
    setPhotoCredits('1');
    setPrice('0');
    setIsBundle(false);
    setDescription('');
    setSortOrder((tiers.length + 1).toString());
    setCategoryId('');
    setShowModal(true);
  };

  const openEdit = (tier: PricingTier) => {
    setEditingTier(tier);
    setName(tier.name);
    setPhotoCredits(tier.photo_credits.toString());
    setPrice(tier.price.toString());
    setIsBundle(tier.is_bundle);
    setDescription(tier.description || '');
    setSortOrder(tier.sort_order.toString());
    setCategoryId(tier.category_id || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    const payload = {
      edition_id: selectedEdition,
      name,
      photo_credits: parseInt(photoCredits),
      price: parseFloat(price),
      is_bundle: isBundle,
      description: description || null,
      sort_order: parseInt(sortOrder),
      category_id: isBundle ? null : (categoryId || null),
    };

    if (editingTier) {
      const { error } = await supabase
        .from('pricing_tiers')
        .update(payload)
        .eq('id', editingTier.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Tier updated');
    } else {
      const { error } = await supabase.from('pricing_tiers').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Tier created');
    }
    setShowModal(false);
    fetchTiers(selectedEdition);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('pricing_tiers').delete().eq('id', deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success('Tier deleted');
    setDeleteId(null);
    fetchTiers(selectedEdition);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Pricing Tiers</h1>
          <p className="text-surface-400 text-sm mt-1">
            Manage entry fee tiers for paid categories
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate} disabled={!selectedEdition}>
          New Tier
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
      ) : tiers.length === 0 ? (
        <Card className="p-12 text-center">
          <CreditCard className="h-12 w-12 text-surface-600 mx-auto mb-4" />
          <p className="text-surface-400">No pricing tiers for this edition.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`p-6 ${tier.is_bundle ? 'border-emerald-500/30 bg-emerald-500/5' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${tier.is_bundle ? 'bg-emerald-500/10' : 'bg-gold-500/10'}`}>
                      {tier.is_bundle ? (
                        <Package className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <CreditCard className="h-5 w-5 text-gold-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{tier.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {tier.is_bundle && (
                          <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">Bundle</span>
                        )}
                        <span className="text-[10px] font-medium uppercase tracking-wider text-surface-400">
                          {tier.category_id
                            ? (categories.find(c => c.id === tier.category_id)?.name || 'Category-specific')
                            : 'All categories'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" icon={<Edit className="h-4 w-4" />} onClick={() => openEdit(tier)} />
                    <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4 text-red-400" />} onClick={() => setDeleteId(tier.id)} />
                  </div>
                </div>

                <p className="text-sm text-surface-400 mb-4">{tier.description || '—'}</p>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-surface-500">Photo credits</p>
                    <p className="text-lg font-bold text-white">{tier.photo_credits} / category</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-surface-500">{tier.is_bundle ? 'Flat rate' : 'Per category'}</p>
                    <p className="text-2xl font-bold text-gold-400">€{tier.price}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingTier ? 'Edit Tier' : 'New Tier'}>
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 3 Photos" />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          {!isBundle && (
            <Select
              label="Applies to category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={[
                { value: '', label: 'All categories (default)' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          )}
          <div className="grid grid-cols-3 gap-4">
            <Input label="Photo Credits" type="number" value={photoCredits} onChange={(e) => setPhotoCredits(e.target.value)} />
            <Input label="Price (€)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isBundle}
              onChange={(e) => setIsBundle(e.target.checked)}
              className="h-4 w-4 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500"
            />
            <div>
              <span className="text-sm text-white font-medium">Bundle deal</span>
              <p className="text-xs text-surface-500">Flat rate for all paid categories (not per-category)</p>
            </div>
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>{editingTier ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Tier">
        <p className="text-surface-300">Are you sure you want to delete this pricing tier?</p>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
