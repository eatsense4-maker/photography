import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, ExternalLink, GripVertical, Upload, X, Loader2 } from 'lucide-react';
import { Button, Card, Modal, Input, EmptyState } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Partner } from '@/types';
import toast from 'react-hot-toast';

export default function AdminPartners() {
  const { t } = useTranslation();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPartners = async () => {
    const { data } = await supabase
      .from('partners')
      .select('*')
      .order('sort_order');
    setPartners(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const openCreate = () => {
    setEditingPartner(null);
    setName('');
    setLogoUrl('');
    setPreviewUrl('');
    setWebsiteUrl('');
    setSortOrder((partners.length + 1).toString());
    setShowModal(true);
  };

  const openEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setName(partner.name);
    setLogoUrl(partner.logo_url || '');
    setPreviewUrl(partner.logo_url || '');
    setWebsiteUrl(partner.website_url || '');
    setSortOrder(partner.sort_order.toString());
    setShowModal(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    // Validate file size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      setUploading(true);
      setUploadProgress(0);

      // Upload to Supabase Storage (partners bucket)
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `logos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      setUploadProgress(30);
      const { error: uploadError } = await supabase.storage
        .from('partners')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(90);

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('partners')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      setLogoUrl(publicUrl);
      setPreviewUrl(publicUrl);
      setUploadProgress(100);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error('Image upload failed');
      setPreviewUrl(logoUrl); // revert to previous
      console.error(err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    setLogoUrl('');
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    const payload = {
      name,
      logo_url: logoUrl || null,
      website_url: websiteUrl || null,
      sort_order: parseInt(sortOrder),
      active: true,
    };

    if (editingPartner) {
      const { error } = await supabase
        .from('partners')
        .update(payload)
        .eq('id', editingPartner.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Partner updated');
    } else {
      const { error } = await supabase.from('partners').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Partner added');
    }
    setShowModal(false);
    fetchPartners();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('partners').delete().eq('id', deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success('Partner removed');
    setDeleteId(null);
    fetchPartners();
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
            {t('admin.partners')}
          </h1>
          <p className="text-surface-400 text-sm mt-1">Manage partner logos and links</p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          Add Partner
        </Button>
      </div>

      {partners.length === 0 ? (
        <EmptyState
          icon={<ExternalLink className="h-12 w-12" />}
          title="No partners yet"
          description="Add competition partners and sponsors."
          action={
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Add Partner
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {partners.map((partner, i) => (
            <motion.div
              key={partner.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-surface-600 cursor-grab" />
                    <div className="h-12 w-12 rounded-lg bg-surface-800 flex items-center justify-center overflow-hidden">
                      {partner.logo_url ? (
                        <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <ExternalLink className="h-5 w-5 text-surface-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" icon={<Edit className="h-4 w-4" />} onClick={() => openEdit(partner)} />
                    <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4 text-red-400" />} onClick={() => setDeleteId(partner.id)} />
                  </div>
                </div>
                <h3 className="font-semibold text-white">{partner.name}</h3>
                {partner.website_url && (
                  <a
                    href={partner.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-400 hover:underline mt-1 block truncate"
                  >
                    {partner.website_url}
                  </a>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingPartner ? 'Edit Partner' : 'Add Partner'}>
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Partner name" />

          {/* Logo Upload */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-surface-300">Partner Logo</label>

            {previewUrl ? (
              <div className="relative group w-full rounded-lg border border-surface-700 bg-surface-800 p-4">
                <img
                  src={previewUrl}
                  alt="Logo preview"
                  className="h-24 mx-auto object-contain"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1 rounded-full bg-surface-900/80 text-surface-400 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
                {uploading && (
                  <div className="absolute inset-0 bg-surface-900/70 rounded-lg flex flex-col items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-400 mb-2" />
                    <span className="text-xs text-surface-300">{uploadProgress}%</span>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-lg border-2 border-dashed border-surface-700 bg-surface-800/50 hover:border-primary-500/50 hover:bg-surface-800 transition-all cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
                    <span className="text-xs text-surface-400">Uploading… {uploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-surface-500" />
                    <span className="text-sm text-surface-400">Click to upload logo</span>
                    <span className="text-xs text-surface-600">PNG, JPG, SVG, WebP — max 5 MB</span>
                  </>
                )}
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Fallback: manual URL */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  const url = prompt('Enter logo URL:', logoUrl);
                  if (url !== null) {
                    setLogoUrl(url);
                    setPreviewUrl(url);
                  }
                }}
                className="text-xs text-surface-500 hover:text-primary-400 transition-colors cursor-pointer"
              >
                Or paste an image URL
              </button>
            </div>
          </div>

          <Input label="Website URL" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://..." />
          <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={uploading}>{editingPartner ? 'Update' : 'Add'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Remove Partner">
        <p className="text-surface-300">Are you sure you want to remove this partner?</p>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Remove</Button>
        </div>
      </Modal>
    </div>
  );
}
