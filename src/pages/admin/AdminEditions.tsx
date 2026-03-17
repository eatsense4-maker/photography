import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react';
import { Button, Card, Badge, Modal, Input, Textarea, Select } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Edition } from '@/types';
import toast from 'react-hot-toast';

export default function AdminEditions() {
  const { t } = useTranslation();
  const [editions, setEditions] = useState<Edition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEdition, setEditingEdition] = useState<Edition | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState('');
  const [themeDescription, setThemeDescription] = useState('');
  const [status, setStatus] = useState('draft');
  const [submissionStart, setSubmissionStart] = useState('');
  const [submissionEnd, setSubmissionEnd] = useState('');
  const [published, setPublished] = useState(false);

  const fetchEditions = async () => {
    const { data } = await supabase
      .from('editions')
      .select('*')
      .order('year', { ascending: false });
    setEditions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEditions();
  }, []);

  const statusConfig: Record<string, { color: string; label: string }> = {
    draft: { color: 'secondary', label: 'Draft' },
    open: { color: 'success', label: 'Open' },
    judging: { color: 'warning', label: 'Judging' },
    completed: { color: 'primary', label: 'Completed' },
  };

  const openCreate = () => {
    setEditingEdition(null);
    setTitle('');
    setSlug('');
    setYear(new Date().getFullYear().toString());
    setDescription('');
    setTheme('');
    setThemeDescription('');
    setStatus('draft');
    setSubmissionStart('');
    setSubmissionEnd('');
    setPublished(false);
    setShowModal(true);
  };

  const openEdit = (edition: Edition) => {
    setEditingEdition(edition);
    setTitle(edition.title);
    setSlug(edition.slug);
    setYear(edition.year.toString());
    setDescription(edition.description || '');
    setTheme(edition.theme || '');
    setThemeDescription(edition.theme_description || '');
    setStatus(edition.status);
    setSubmissionStart(edition.submission_start?.slice(0, 10) || '');
    setSubmissionEnd(edition.submission_end?.slice(0, 10) || '');
    setPublished(edition.published);
    setShowModal(true);
  };

  const handleSave = async () => {
    const payload = {
      title,
      slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
      year: parseInt(year),
      description: description || null,
      theme: theme || null,
      theme_description: themeDescription || null,
      status,
      submission_start: submissionStart || null,
      submission_end: submissionEnd || null,
      published,
    };

    if (editingEdition) {
      const { error } = await supabase
        .from('editions')
        .update(payload)
        .eq('id', editingEdition.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Edition updated');
    } else {
      const { error } = await supabase.from('editions').insert(payload);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Edition created');
    }
    setShowModal(false);
    fetchEditions();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from('editions')
      .delete()
      .eq('id', deleteId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Edition deleted');
    setDeleteId(null);
    fetchEditions();
  };

  const handleDuplicate = async (edition: Edition) => {
    const { error } = await supabase.from('editions').insert({
      title: `${edition.title} (copy)`,
      slug: `${edition.slug}-copy`,
      year: edition.year,
      description: edition.description,
      theme: edition.theme,
      theme_description: edition.theme_description,
      status: 'draft',
      submission_start: edition.submission_start,
      submission_end: edition.submission_end,
      published: false,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Edition duplicated');
    fetchEditions();
  };

  const togglePublished = async (edition: Edition) => {
    const { error } = await supabase
      .from('editions')
      .update({ published: !edition.published })
      .eq('id', edition.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(edition.published ? 'Unpublished' : 'Published');
    fetchEditions();
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
            {t('admin.editions')}
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Manage competition editions
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="h-4 w-4" />}
          onClick={openCreate}
        >
          New Edition
        </Button>
      </div>

      {editions.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="h-12 w-12 text-surface-600 mx-auto mb-4" />
          <p className="text-surface-400">No editions yet. Create your first edition.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {editions.map((edition, i) => (
            <motion.div
              key={edition.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary-500/10">
                      <Calendar className="h-6 w-6 text-primary-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">
                          {edition.title}
                        </h3>
                        <Badge
                          variant={
                            (statusConfig[edition.status]?.color as
                              | 'primary'
                              | 'success'
                              | 'warning'
                              | 'secondary') || 'secondary'
                          }
                        >
                          {statusConfig[edition.status]?.label || edition.status}
                        </Badge>
                        {edition.published && (
                          <Badge variant="success">Published</Badge>
                        )}
                      </div>
                      <p className="text-sm text-surface-400 mt-1">
                        {edition.year} · /{edition.slug}
                        {edition.theme && ` · ${edition.theme}`}
                      </p>
                      {edition.submission_start && (
                        <p className="text-xs text-surface-500 mt-1">
                          {edition.submission_start.slice(0, 10)} →{' '}
                          {edition.submission_end?.slice(0, 10) || '—'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Copy className="h-4 w-4" />}
                      onClick={() => handleDuplicate(edition)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={
                        edition.published ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )
                      }
                      onClick={() => togglePublished(edition)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Edit className="h-4 w-4" />}
                      onClick={() => openEdit(edition)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 className="h-4 w-4 text-red-400" />}
                      onClick={() => setDeleteId(edition.id)}
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEdition ? 'Edit Edition' : 'Create Edition'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="IFFA 17"
            />
            <Input
              label="Year"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <Input
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="iffa-17"
          />
          <Input
            label="Theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Memories"
          />
          <Textarea
            label="Theme Description"
            value={themeDescription}
            onChange={(e) => setThemeDescription(e.target.value)}
            rows={3}
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <Select
            label="Status"
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'open', label: 'Open for submissions' },
              { value: 'judging', label: 'Judging phase' },
              { value: 'completed', label: 'Completed' },
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Submissions open"
              type="date"
              value={submissionStart}
              onChange={(e) => setSubmissionStart(e.target.value)}
            />
            <Input
              label="Submissions close"
              type="date"
              value={submissionEnd}
              onChange={(e) => setSubmissionEnd(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-surface-300 cursor-pointer">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="rounded border-surface-600"
            />
            Published (visible to the public)
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {editingEdition ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Edition"
      >
        <p className="text-surface-300">
          Are you sure you want to delete this edition? This action cannot be
          undone and will remove all associated submissions and scores.
        </p>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="ghost" onClick={() => setDeleteId(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
