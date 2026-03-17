import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Grid, Image, DollarSign } from 'lucide-react';
import { Button, Card, Modal, Input, Textarea, Select } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/types';
import toast from 'react-hot-toast';

export default function AdminCategories() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [editions, setEditions] = useState<{ id: string; title: string; year: number }[]>([]);
  const [selectedEdition, setSelectedEdition] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxPhotos, setMaxPhotos] = useState('10');
  const [price, setPrice] = useState('0');
  const [sortOrder, setSortOrder] = useState('0');
  const [editionId, setEditionId] = useState('');

  useEffect(() => {
    supabase
      .from('editions')
      .select('id, title, year')
      .order('year', { ascending: false })
      .then(({ data }) => {
        setEditions(data || []);
        if (data && data.length > 0) {
          setSelectedEdition(data[0].id);
        }
      });
  }, []);

  const fetchCategories = async (eid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('edition_id', eid)
      .order('sort_order');
    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedEdition) fetchCategories(selectedEdition);
  }, [selectedEdition]);

  const openCreate = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setMaxPhotos('10');
    setPrice('0');
    setSortOrder((categories.length + 1).toString());
    setEditionId(selectedEdition);
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setMaxPhotos(cat.max_photos.toString());
    setPrice(cat.price.toString());
    setSortOrder(cat.sort_order.toString());
    setEditionId(cat.edition_id);
    setShowModal(true);
  };

  const handleSave = async () => {
    const payload = {
      edition_id: editionId || selectedEdition,
      name,
      description: description || null,
      max_photos: parseInt(maxPhotos),
      price: parseFloat(price),
      sort_order: parseInt(sortOrder),
    };

    if (editingCategory) {
      const { error } = await supabase
        .from('categories')
        .update(payload)
        .eq('id', editingCategory.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Category updated');
    } else {
      const { error } = await supabase.from('categories').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Category created');
    }
    setShowModal(false);
    fetchCategories(selectedEdition);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('categories').delete().eq('id', deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success('Category deleted');
    setDeleteId(null);
    fetchCategories(selectedEdition);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            {t('admin.categories')}
          </h1>
          <p className="text-surface-400 text-sm mt-1">Manage competition categories</p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate} disabled={!selectedEdition}>
          New Category
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
      ) : categories.length === 0 ? (
        <Card className="p-12 text-center">
          <Grid className="h-12 w-12 text-surface-600 mx-auto mb-4" />
          <p className="text-surface-400">No categories for this edition.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-500/10">
                      <Grid className="h-5 w-5 text-primary-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{cat.name}</h3>
                      <p className="text-xs text-surface-500 mt-0.5">Order: {cat.sort_order}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" icon={<Edit className="h-4 w-4" />} onClick={() => openEdit(cat)} />
                    <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4 text-red-400" />} onClick={() => setDeleteId(cat.id)} />
                  </div>
                </div>
                <p className="text-sm text-surface-400 mb-4">{cat.description || '—'}</p>
                <div className="flex items-center gap-4 text-sm text-surface-500">
                  <div className="flex items-center gap-1">
                    <Image className="h-4 w-4" />
                    Max {cat.max_photos} photos
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    €{cat.price}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingCategory ? 'Edit Category' : 'New Category'}>
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Max Photos" type="number" value={maxPhotos} onChange={(e) => setMaxPhotos(e.target.value)} />
            <Input label="Price (€)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>{editingCategory ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Category">
        <p className="text-surface-300">Are you sure you want to delete this category? All submissions in this category will also be removed.</p>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
