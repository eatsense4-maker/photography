import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { PayPalButtons } from '@paypal/react-paypal-js';

import {
  Upload, X, ArrowRight, ArrowLeft, Image as ImageIcon,
  CreditCard, Check, Camera, ShieldCheck, Info, HelpCircle, Lock,
} from 'lucide-react';
import { Button, Input, Textarea, Select, Card } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { uploadPhoto, getPhotoUrl } from '@/lib/r2';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import type { PricingTier, Category } from '@/types';

/* -- Category accent colors -- */
const CAT_ACCENTS = [
  { text: 'text-gold-400', border: 'border-gold-500/40', bg: 'bg-gold-500/10' },
  { text: 'text-blue-400', border: 'border-blue-500/40', bg: 'bg-blue-500/10' },
  { text: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10' },
  { text: 'text-violet-400', border: 'border-violet-500/40', bg: 'bg-violet-500/10' },
  { text: 'text-sky-400', border: 'border-sky-500/40', bg: 'bg-sky-500/10' },
  { text: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-500/10' },
];

interface UploadedPhoto {
  id: string;
  file: File | null;
  preview: string;
  progress: number;
  uploaded: boolean;
  storageKey?: string;
  thumbnailKey?: string;
  dbPhotoId?: string;
  title: string;
  description: string;
}

export default function NewSubmission() {
  const { t } = useTranslation();
  usePageTitle('New Submission');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const draftIdParam = searchParams.get('draftId');
  const prefillEditionIdParam = searchParams.get('editionId');
  const prefillCategoryIdParam = searchParams.get('categoryId');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [hydratedFromQuery, setHydratedFromQuery] = useState(false);

  // Edition
  const [editionId, setEditionId] = useState('');
  const [editions, setEditions] = useState<{ value: string; label: string }[]>([]);

  // Categories (single-select)
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Pricing tiers from DB
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [selectedTierId, setSelectedTierId] = useState('');

  // User credits scoped to selected category
  const [userCredits, setUserCredits] = useState<{
    photo_credits: number;
    photo_credits_used: number;
    tier_id: string | null;
  } | null>(null);

// Existing non-draft submissions in this edition: { categoryId: count }
  const [submissionCountByCategory, setSubmissionCountByCategory] = useState<Record<string, number>>({});
  // Purchased photo credits per category: { categoryId: totalCredits }
  const [creditsByCategory, setCreditsByCategory] = useState<Record<string, number>>({});

  // Payment
  const [paying, setPaying] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  // Photos (single category, flat array)
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  // Submission details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // --- Derived state ---
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );

  const isPaid = selectedCategory ? selectedCategory.price > 0 : false;
  const hasCredits = !!userCredits || paymentComplete;
  const needsPayment = isPaid && !hasCredits;

  const selectedTier = useMemo(
    () => pricingTiers.find((t) => t.id === selectedTierId) || null,
    [pricingTiers, selectedTierId]
  );

  const paymentAmount = useMemo(() => {
    if (!selectedTier) return 0;
    return Number(selectedTier.price);
  }, [selectedTier]);

  const paidPhotoLimit = useMemo(() => {
    if (userCredits) return Math.max(userCredits.photo_credits - userCredits.photo_credits_used, 0);
    if (selectedTier) return selectedTier.photo_credits;
    return 0;
  }, [userCredits, selectedTier]);

  const maxPhotos = selectedCategory
    ? (isPaid ? Math.min(selectedCategory.max_photos, paidPhotoLimit || selectedCategory.max_photos) : selectedCategory.max_photos)
    : 0;

  const hasPhotos = photos.length > 0;

  // --- Data fetching ---
  useEffect(() => {
    supabase
      .from('editions')
      .select('id, title, year')
      .eq('status', 'open')
      .eq('published', true)
      .order('year', { ascending: false })
      .then(({ data }) => {
        const opts = (data || []).map((e) => ({
          value: e.id,
          label: `${e.title} — ${e.year} Edition`,
        }));
        setEditions(opts);
        if (opts.length === 1) setEditionId(opts[0].value);
      });
  }, []);

  useEffect(() => {
    if (!editionId) { setCategories([]); return; }
    supabase
      .from('categories')
      .select('*')
      .eq('edition_id', editionId)
      .eq('is_active', true)
      .or(`submission_deadline.is.null,submission_deadline.gt.${new Date().toISOString()}`)
      .order('sort_order')
      .then(({ data }) => setCategories(data || []));
  }, [editionId]);

  useEffect(() => {
    if (!editionId) { setPricingTiers([]); return; }
    let query = supabase
      .from('pricing_tiers')
      .select('*')
      .eq('edition_id', editionId)
      .eq('is_bundle', false);
    query = selectedCategoryId
      ? query.or(`category_id.is.null,category_id.eq.${selectedCategoryId}`)
      : query.is('category_id', null);
    query.order('sort_order').then(({ data }) => setPricingTiers(data || []));
  }, [editionId, selectedCategoryId]);

  useEffect(() => {
    if (!editionId || !user?.id || !selectedCategoryId) {
      setUserCredits(null);
      return;
    }
    supabase
      .from('user_credits')
      .select('photo_credits, photo_credits_used, tier_id')
      .eq('user_id', user.id)
      .eq('edition_id', editionId)
      .eq('category_id', selectedCategoryId)
      .maybeSingle()
      .then(({ data }) => setUserCredits(data || null));
  }, [editionId, user?.id, selectedCategoryId, paymentComplete]);

  useEffect(() => {
    if (hydratedFromQuery || !user?.id) return;

    const hydrateFromDraft = async () => {
      if (draftIdParam) {
        const { data: draft, error } = await supabase
          .from('submissions')
          .select(`
            id, edition_id, category_id, title, description, status,
            submission_photos(id, storage_key, thumbnail_key, sort_order, title, description)
          `)
          .eq('id', draftIdParam)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          toast.error('Failed to open draft for editing.');
          setHydratedFromQuery(true);
          return;
        }

        if (!draft || (draft as any).status !== 'draft') {
          toast.error('Draft not found or no longer editable.');
          setHydratedFromQuery(true);
          return;
        }

        const draftPhotos: UploadedPhoto[] = ((draft as any).submission_photos || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((photo: any) => ({
            id: `existing-${photo.id}`,
            file: null,
            preview: getPhotoUrl(photo.thumbnail_key || photo.storage_key),
            progress: 100,
            uploaded: true,
            storageKey: photo.storage_key,
            thumbnailKey: photo.thumbnail_key || undefined,
            dbPhotoId: photo.id,
            title: photo.title || '',
            description: photo.description || '',
          }));

        setEditionId((draft as any).edition_id);
        setSelectedCategoryId((draft as any).category_id);
        setTitle((draft as any).title || '');
        setDescription((draft as any).description || '');
        setPhotos(draftPhotos);
        setStep(draftPhotos.length > 0 ? 4 : 3);
        setHydratedFromQuery(true);
        return;
      }

      if (prefillEditionIdParam) {
        setEditionId(prefillEditionIdParam);
      }
      if (prefillCategoryIdParam) {
        setSelectedCategoryId(prefillCategoryIdParam);
        setStep(3);
      }

      setHydratedFromQuery(true);
    };

    hydrateFromDraft();
  }, [
    hydratedFromQuery,
    draftIdParam,
    prefillEditionIdParam,
    prefillCategoryIdParam,
    user?.id,
  ]);

  // Fetch existing non-draft submission counts and purchased credits per category.
  useEffect(() => {
    if (!editionId || !user?.id) {
      setSubmissionCountByCategory({});
      setCreditsByCategory({});
      return;
    }
    Promise.all([
      supabase
        .from('submissions')
        .select('category_id')
        .eq('user_id', user.id)
        .eq('edition_id', editionId)
        .neq('status', 'draft'),
      supabase
        .from('user_credits')
        .select('category_id, photo_credits')
        .eq('user_id', user.id)
        .eq('edition_id', editionId),
    ]).then(([subRes, credRes]) => {
      const countMap: Record<string, number> = {};
      for (const row of subRes.data || []) {
        const cid = (row as any).category_id;
        countMap[cid] = (countMap[cid] || 0) + 1;
      }
      setSubmissionCountByCategory(countMap);

      const creditMap: Record<string, number> = {};
      for (const row of credRes.data || []) {
        const cid = (row as any).category_id;
        creditMap[cid] = (creditMap[cid] || 0) + (row as any).photo_credits;
      }
      setCreditsByCategory(creditMap);
    });
  }, [editionId, user?.id, paymentComplete]);

  // --- Category selection (single) ---
  const selectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    setSelectedTierId('');
    setPaymentComplete(false);
    setPhotos([]);
  };

  // --- Photos management ---
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!selectedCategory) return;
      const remaining = maxPhotos - photos.length;
      const filesToAdd = acceptedFiles.slice(0, remaining);

      const newPhotos: UploadedPhoto[] = filesToAdd.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        uploaded: false,
        title: '',
        description: '',
      }));

      setPhotos((prev) => [...prev, ...newPhotos]);
    },
    [selectedCategory, photos.length, maxPhotos]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/tiff': ['.tif', '.tiff'],
    },
    maxSize: 20 * 1024 * 1024,
    disabled: !selectedCategory || photos.length >= maxPhotos,
  });

  const removePhoto = async (photoId: string) => {
    const current = photos;
    const index = current.findIndex((p) => p.id === photoId);
    if (index < 0) return;

    const target = current[index];

    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    if (target.preview.startsWith('blob:')) {
      URL.revokeObjectURL(target.preview);
    }

    if (target.dbPhotoId && target.storageKey) {
      try {
        const keysToDelete = [target.storageKey];
        if (target.thumbnailKey) keysToDelete.push(target.thumbnailKey);

        await supabase.functions.invoke('r2-delete', { body: { keys: keysToDelete } });

        const { error } = await supabase
          .from('submission_photos')
          .delete()
          .eq('id', target.dbPhotoId);

        if (error) throw error;
        toast.success('Saved photo removed from draft.');
      } catch {
        setPhotos((prev) => {
          const next = [...prev];
          next.splice(index, 0, target);
          return next;
        });
        toast.error('Failed to remove saved photo.');
      }
    }
  };

  const updatePhotoField = (photoId: string, field: 'title' | 'description', value: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, [field]: value } : p))
    );
  };

  // --- Step navigation ---
  const goToNextStep = () => {
    if (step === 1 && isPaid && !hasCredits) {
      setStep(2);
    } else if (step === 1) {
      setStep(3);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const goToPrevStep = () => {
    if (step === 4) setStep(3);
    else if (step === 3 && isPaid && !userCredits && paymentComplete) setStep(2);
    else if (step === 3) setStep(1);
    else if (step === 2) setStep(1);
  };

  const getOrCreateDraftSubmission = async (): Promise<string> => {
    if (!user?.id || !selectedCategory) {
      throw new Error('Missing submission context');
    }

    const { data: existingDraft, error: draftFetchError } = await supabase
      .from('submissions')
      .select('id')
      .eq('user_id', user.id)
      .eq('edition_id', editionId)
      .eq('category_id', selectedCategory.id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (draftFetchError) throw draftFetchError;

    if (existingDraft?.id) {
      const { error: draftUpdateError } = await supabase
        .from('submissions')
        .update({
          title: title || null,
          description: description || null,
        })
        .eq('id', existingDraft.id);

      if (draftUpdateError) throw draftUpdateError;
      return existingDraft.id;
    }

    const { data: createdDraft, error: draftCreateError } = await supabase
      .from('submissions')
      .insert({
        user_id: user.id,
        edition_id: editionId,
        category_id: selectedCategory.id,
        title: title || null,
        description: description || null,
        status: 'draft',
        submitted_at: null,
      })
      .select('id')
      .single();

    if (draftCreateError || !createdDraft?.id) {
      throw draftCreateError || new Error('Failed to create draft submission');
    }

    return createdDraft.id;
  };

  // --- Submit ---
  const handleSubmit = async (asDraft: boolean) => {
    if (!user?.id || !selectedCategory) return;

    // Block duplicate non-draft submission when credits are exhausted.
    const submittedCount = submissionCountByCategory[selectedCategory.id] || 0;
    const purchasedCredits = creditsByCategory[selectedCategory.id] || 0;
    const categoryIsPaidCheck = selectedCategory.price > 0;
    if (!asDraft && categoryIsPaidCheck && submittedCount >= purchasedCredits) {
      toast.error('You have used all your purchased photo credits for this category.');
      return;
    }
    if (!asDraft && !categoryIsPaidCheck && submittedCount > 0) {
      toast.error('You already have a submission for this category. Only one entry per free category is allowed.');
      return;
    }

    if (!asDraft && isPaid && (!userCredits || userCredits.photo_credits - userCredits.photo_credits_used < photos.length)) {
      toast.error('You do not have enough photo credits for this category.');
      return;
    }

    setLoading(true);
    try {
      const submissionId = await getOrCreateDraftSubmission();

      setUploadProgress({ current: 0, total: photos.length });
      for (let i = 0; i < photos.length; i++) {
        setUploadProgress({ current: i + 1, total: photos.length });
        const photo = photos[i];

        if (photo.uploaded && photo.storageKey) {
          if (!photo.dbPhotoId) {
            throw new Error('Missing saved photo reference while updating draft.');
          }

          const { error: existingPhotoUpdateError } = await supabase
            .from('submission_photos')
            .update({
              sort_order: i,
              title: photo.title || null,
              description: photo.description || null,
            })
            .eq('id', photo.dbPhotoId);

          if (existingPhotoUpdateError) {
            throw existingPhotoUpdateError;
          }
          continue;
        }

        try {
          let uploadedKey: string | null = null;

          if (!photo.file) {
            throw new Error('Missing file for photo upload.');
          }

          const { key } = await uploadPhoto(photo.file, (progress) => {
            setPhotos((prev) =>
              prev.map((p) => (p.id === photo.id ? { ...p, progress } : p))
            );
          });

          uploadedKey = key;

          const { data: insertedPhoto, error: photoError } = await supabase
            .from('submission_photos')
            .insert({
              submission_id: submissionId,
              storage_key: key,
              original_filename: photo.file.name,
              mime_type: photo.file.type,
              file_size: photo.file.size,
              sort_order: i,
              title: photo.title || null,
              description: photo.description || null,
            })
            .select('id')
            .single();

          if (photoError) {
            if (uploadedKey) {
              await supabase.functions.invoke('r2-delete', { body: { keys: [uploadedKey] } });
            }
            throw photoError;
          }

          setPhotos((prev) =>
            prev.map((p) => (p.id === photo.id
              ? { ...p, uploaded: true, storageKey: key, dbPhotoId: insertedPhoto?.id || p.dbPhotoId }
              : p))
          );
        } catch (uploadErr) {
          console.error('Photo upload failed:', uploadErr);
          const fileName = photo.file?.name || `Photo ${i + 1}`;
          const message = uploadErr instanceof Error ? uploadErr.message : `Failed to upload ${fileName}`;
          throw new Error(`${message || `Failed to upload ${fileName}`}. Progress has been kept as draft.`);
        }
      }

      const finalStatus = asDraft ? 'draft' : 'submitted';
      const { error: finalizeError } = await supabase
        .from('submissions')
        .update({
          title: title || null,
          description: description || null,
          status: finalStatus,
          submitted_at: finalStatus === 'submitted' ? new Date().toISOString() : null,
        })
        .eq('id', submissionId);

      if (finalizeError) throw finalizeError;

      if (!asDraft && isPaid && finalStatus === 'submitted') {
        // Refresh credits from DB so the UI reflects the trigger-managed photo_credits_used.
        const { data: refreshed } = await supabase
          .from('user_credits')
          .select('photo_credits, photo_credits_used, tier_id')
          .eq('user_id', user.id)
          .eq('edition_id', editionId)
          .eq('category_id', selectedCategory.id)
          .maybeSingle();
        setUserCredits(refreshed || null);
      }

      toast.success(asDraft ? 'Saved as draft!' : t('submission.submitted_success'));
      navigate('/dashboard/submissions');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit');
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  // --- Progress bar ---
  const progressSteps = needsPayment
    ? [t('submission.step_categories'), t('submission.step_payment'), t('submission.step_upload'), t('submission.step_review')]
    : [t('submission.step_categories'), t('submission.step_upload'), t('submission.step_review')];

  const currentProgressIdx = needsPayment
    ? step - 1
    : step === 1 ? 0 : step === 3 ? 1 : 2;

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-6">
      <div className="text-center">
        <h1 className="text-xl font-display font-bold text-white">
          {t('user.new_submission')}
        </h1>
        <p className="text-surface-300 text-xs mt-1">
          {t('submission.follow_steps')}
        </p>
        {draftIdParam && (
          <p className="text-primary-300 text-xs mt-1">
            You are editing an existing draft. Add or remove photos, then submit when ready.
          </p>
        )}
      </div>

      {/* Progress Steps */}
      <nav aria-label="Submission progress" className="flex items-center justify-center gap-0">
        {progressSteps.map((label, i) => {
          const isCompleted = i < currentProgressIdx;
          const isCurrent = i === currentProgressIdx;
          return (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-primary-600 border-primary-500 text-white shadow-sm shadow-primary-500/30'
                      : 'bg-surface-800 border-surface-600 text-surface-500'
                  }`}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={`text-[11px] font-medium ${
                    isCompleted
                      ? 'text-emerald-400'
                      : isCurrent
                      ? 'text-primary-400'
                      : 'text-surface-500'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < progressSteps.length - 1 && (
                <div
                  className={`h-0.5 w-10 sm:w-16 mx-1.5 rounded-full mb-5 ${
                    i < currentProgressIdx ? 'bg-emerald-500' : 'bg-surface-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </nav>

      {/* === STEP 1: Select Category (Card Grid) === */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-3"
        >
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary-500/5 border border-primary-500/20">
            <Info className="h-4 w-4 text-primary-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium">Choose a category to enter</p>
              <p className="text-xs text-surface-300 mt-0.5">
                Select one category. You can submit to other categories separately.
              </p>
            </div>
          </div>

          <Card className="p-4 space-y-3">
            <Select
              label={t('submission.select_edition')}
              options={editions}
              placeholder="Choose an edition..."
              value={editionId}
              onChange={(e) => {
                setEditionId(e.target.value);
                setSelectedCategoryId(null);
                setSelectedTierId('');
                setPaymentComplete(false);
                setPhotos([]);
              }}
            />

            {editionId && categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Select a category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categories.map((cat, i) => {
                    const isSelected = selectedCategoryId === cat.id;
                    const accent = CAT_ACCENTS[i % CAT_ACCENTS.length];
                    const catIsPaid = cat.price > 0;
                    const catSubmitCount = submissionCountByCategory[cat.id] || 0;
                    const catPurchasedCredits = creditsByCategory[cat.id] || 0;
                    const alreadySubmitted = catIsPaid
                      ? catSubmitCount > 0 && catSubmitCount >= catPurchasedCredits
                      : catSubmitCount > 0;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => !alreadySubmitted && selectCategory(cat.id)}
                        disabled={alreadySubmitted}
                        className={`group relative rounded-xl overflow-hidden text-left transition-all border-2 ${
                          alreadySubmitted
                            ? 'border-surface-800 opacity-50 cursor-not-allowed'
                            : isSelected
                              ? `${accent.border} ring-1 ring-white/20 cursor-pointer`
                              : 'border-surface-700 hover:border-surface-500 cursor-pointer'
                        }`}
                      >
                        <div className="h-24 sm:h-28 bg-surface-800 overflow-hidden relative">
                          {cat.image_url ? (
                            <img src={cat.image_url} alt={cat.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-surface-800 to-surface-900 flex items-center justify-center">
                              <Camera className="h-8 w-8 text-surface-700" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/40 to-transparent" />
                          {alreadySubmitted && (
                            <div className="absolute top-2 right-2 h-6 px-2 rounded-full bg-emerald-500 flex items-center gap-1">
                              <Check className="h-3 w-3 text-white" />
                              <span className="text-[10px] font-semibold text-white">Submitted</span>
                            </div>
                          )}
                          {!alreadySubmitted && isSelected && (
                            <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary-500 flex items-center justify-center">
                              <Check className="h-3.5 w-3.5 text-white" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            {catIsPaid ? (
                              <span className="text-[10px] font-bold text-gold-400 bg-surface-950/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
                                €{Number(cat.price).toFixed(0)}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-400 bg-surface-950/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
                                {t('submission.free_badge')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-3 bg-surface-900">
                          <p className="text-sm font-semibold text-white leading-tight">{cat.name}</p>
                          {cat.description && <p className="text-[11px] text-surface-400 line-clamp-2 mt-1">{cat.description}</p>}
                          <p className="text-[10px] text-surface-500 mt-1.5">Max {cat.max_photos} photo{cat.max_photos > 1 ? 's' : ''}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedCategory && (
              <div className="p-2.5 rounded-lg bg-surface-800/50 border border-surface-700 space-y-1">
                <p className="text-sm text-white font-medium flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  {selectedCategory.name}
                  {isPaid && <span className="text-gold-400 text-xs">· €{Number(selectedCategory.price).toFixed(0)}</span>}
                </p>
                {userCredits && isPaid && userCredits.photo_credits - userCredits.photo_credits_used <= 0 && (
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 mt-1">
                    <p className="text-xs text-red-400 font-medium">
                      You have used all your photo credits for this category. Contact support if you need to submit again.
                    </p>
                  </div>
                )}
                {userCredits && isPaid && userCredits.photo_credits - userCredits.photo_credits_used > 0 && (
                  <p className="text-xs text-surface-400">
                    {userCredits.photo_credits - userCredits.photo_credits_used} of {userCredits.photo_credits} photo credit{userCredits.photo_credits !== 1 ? 's' : ''} remaining
                  </p>
                )}
                {(() => {
                  const submittedCount = submissionCountByCategory[selectedCategory.id] || 0;
                  const purchasedCredits = creditsByCategory[selectedCategory.id] || 0;
                  if (isPaid && submittedCount > 0 && submittedCount < purchasedCredits) {
                    return (
                      <p className="text-xs text-emerald-400">
                        {submittedCount} of {purchasedCredits} credit{purchasedCredits !== 1 ? 's' : ''} used — {purchasedCredits - submittedCount} submission{purchasedCredits - submittedCount !== 1 ? 's' : ''} remaining.
                      </p>
                    );
                  }
                  if (isPaid && submittedCount >= purchasedCredits && purchasedCredits > 0) {
                    return (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-1">
                        <p className="text-xs text-amber-400 font-medium">
                          You have used all {purchasedCredits} purchased photo credit{purchasedCredits !== 1 ? 's' : ''} for this category.
                        </p>
                      </div>
                    );
                  }
                  if (!isPaid && submittedCount > 0) {
                    return (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-1">
                        <p className="text-xs text-amber-400 font-medium">
                          You already have a submission for this category. Only one entry per free category is allowed.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </Card>

          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              icon={<ArrowRight className="h-4 w-4" />}
              onClick={goToNextStep}
              disabled={!selectedCategoryId}
            >
              {isPaid && !hasCredits ? 'Continue to Choose Plan' : 'Continue to Upload Photos'}
            </Button>
          </div>
        </motion.div>
      )}

      {/* === STEP 2: Payment === */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-3"
        >
          {paymentComplete && (
            <Card className="p-5 text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 mb-3">
                <Check className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white">Payment Confirmed!</h3>
              <p className="text-sm text-surface-300 mt-1 max-w-md mx-auto">
                You now have <strong className="text-white">{paidPhotoLimit} photo credits</strong> for {selectedCategory?.name}.
              </p>
              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight className="h-4 w-4" />}
                onClick={goToNextStep}
                className="mt-4"
              >
                Continue to Upload Photos
              </Button>
            </Card>
          )}

          {!paymentComplete && (
            <>
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gold-500/5 border border-gold-500/20">
                <Info className="h-4 w-4 text-gold-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-white font-medium">Choose your photo plan</p>
                  <p className="text-xs text-surface-300 mt-0.5">
                    Select how many photos you want to upload for {selectedCategory?.name}.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 space-y-3">
                  <Card className="p-4">
                    <h2 className="text-sm font-bold text-white mb-0.5">Choose Your Plan</h2>
                    <p className="text-xs text-surface-400 mb-3">
                      Pick a plan for {selectedCategory?.name}:
                    </p>

                    <div className="space-y-1.5">
                      {pricingTiers.map((tier) => {
                        const isActive = selectedTierId === tier.id;
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => setSelectedTierId(tier.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left cursor-pointer ${
                              isActive
                                ? 'border-gold-500 bg-gold-500/10'
                                : 'border-surface-700 hover:border-surface-500 bg-surface-900'
                            }`}
                          >
                            <div
                              className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isActive ? 'border-gold-500' : 'border-surface-600'
                              }`}
                            >
                              {isActive && <div className="h-2.5 w-2.5 rounded-full bg-gold-500" />}
                            </div>
                            <div className="flex-1">
                              <span className="text-sm text-white font-semibold">{tier.name}</span>
                              <span className="text-xs text-surface-400 ml-2">
                                {tier.photo_credits} photo{tier.photo_credits > 1 ? 's' : ''}
                              </span>
                            </div>
                            <span className="text-base font-bold text-white">€{Number(tier.price).toFixed(0)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                </div>

                <div className="lg:col-span-2 space-y-3">
                  <Card className="p-4">
                    <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-2">
                      Order Summary
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-surface-400 truncate max-w-[65%]">{selectedCategory?.name}</span>
                        <span className="text-white">
                          {selectedTier ? `€${Number(selectedTier.price).toFixed(0)}` : '-'}
                        </span>
                      </div>
                      {selectedTier && (
                        <>
                          <div className="border-t border-surface-700 pt-2 flex justify-between">
                            <span className="text-surface-400">Plan</span>
                            <span className="text-white">{selectedTier.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-surface-400">Photos</span>
                            <span className="text-white">{selectedTier.photo_credits}</span>
                          </div>
                          <div className="border-t border-surface-700 pt-1.5 flex justify-between">
                            <span className="text-white font-semibold text-sm">Total</span>
                            <span className="text-lg font-bold text-gold-400">€{paymentAmount.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>

                  {selectedTier && paymentAmount > 0 && (
                    <Card className="p-4 space-y-3">
                      <h3 className="text-xs font-semibold text-surface-300 uppercase tracking-wider">
                        Complete Payment
                      </h3>

                      {paying ? (
                        <div className="flex flex-col items-center justify-center py-5 gap-2">
                          <div className="animate-spin h-6 w-6 border-2 border-gold-500 border-t-transparent rounded-full" />
                          <span className="text-sm text-surface-300">Processing payment...</span>
                          <span className="text-xs text-surface-500">Don't close this page.</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="rounded-lg border border-gold-500/40 bg-gradient-to-b from-gold-500/5 to-transparent p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-gold-400" />
                                <span className="text-white font-semibold text-xs">Pay with Card</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {['Visa', 'MC', 'Amex'].map((brand) => (
                                  <span key={brand} className="px-1 py-0.5 rounded bg-white/10 text-[9px] font-bold text-surface-300 uppercase">
                                    {brand}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <PayPalButtons
                              style={{ layout: 'vertical', color: 'black', shape: 'pill', label: 'pay', height: 40 }}
                              fundingSource="card"
                              createOrder={async () => {
                                const { data, error } = await supabase.functions.invoke('create-paypal-order', {
                                  body: { tierId: selectedTierId, editionId, categoryIds: [selectedCategory!.id] },
                                });
                                if (error) {
                                  let msg = error.message;
                                  try { const body = await error.context?.json(); msg = body?.error || body?.details || msg; } catch {}
                                  throw new Error(msg);
                                }
                                if (!data?.orderId) throw new Error(data?.error || 'Failed to create order');
                                return data.orderId;
                              }}
                              onApprove={async (data) => {
                                setPaying(true);
                                try {
                                  const { data: res, error } = await supabase.functions.invoke('capture-paypal-order', {
                                    body: { orderId: data.orderID, userId: user!.id, tierId: selectedTierId, editionId, categoryIds: [selectedCategory!.id] },
                                  });
                                  if (error) throw new Error(error.message || 'Capture request failed');
                                  if (res?.success) {
                                    setPaymentComplete(true);
                                    // Refresh credits from DB so the UI reflects the actual grant.
                                    const { data: refreshed } = await supabase
                                      .from('user_credits')
                                      .select('photo_credits, photo_credits_used, tier_id')
                                      .eq('user_id', user!.id)
                                      .eq('edition_id', editionId)
                                      .eq('category_id', selectedCategory!.id)
                                      .maybeSingle();
                                    setUserCredits(refreshed || null);
                                    toast.success('Payment successful! Credits added.');
                                  } else {
                                    throw new Error(res?.error || 'Capture failed');
                                  }
                                } catch (err: any) { toast.error(err.message || 'Card payment failed.'); }
                                finally { setPaying(false); }
                              }}
                              onError={() => toast.error('Card payment failed.')}
                              onCancel={() => toast('Payment cancelled.', { icon: '⚠️' })}
                            />

                            <div className="flex items-center justify-center gap-1.5 text-xs text-surface-500">
                              <Lock className="h-3 w-3" />
                              <span>No PayPal account needed · card details entered securely</span>
                            </div>
                          </div>

                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-surface-700" />
                            </div>
                            <div className="relative flex justify-center">
                              <span className="px-4 bg-surface-900 text-xs font-medium text-surface-500 uppercase tracking-wider">
                                or
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <PayPalButtons
                              style={{ layout: 'vertical', color: 'blue', shape: 'pill', label: 'paypal', height: 38 }}
                              fundingSource="paypal"
                              createOrder={async () => {
                                const { data, error } = await supabase.functions.invoke('create-paypal-order', {
                                  body: { tierId: selectedTierId, editionId, categoryIds: [selectedCategory!.id] },
                                });
                                if (error) {
                                  let msg = error.message;
                                  try { const body = await error.context?.json(); msg = body?.error || body?.details || msg; } catch {}
                                  throw new Error(msg);
                                }
                                if (!data?.orderId) throw new Error(data?.error || 'Failed to create order');
                                return data.orderId;
                              }}
                              onApprove={async (data) => {
                                setPaying(true);
                                try {
                                  const { data: res, error } = await supabase.functions.invoke('capture-paypal-order', {
                                    body: { orderId: data.orderID, userId: user!.id, tierId: selectedTierId, editionId, categoryIds: [selectedCategory!.id] },
                                  });
                                  if (error) throw new Error(error.message || 'Capture request failed');
                                  if (res?.success) {
                                    setPaymentComplete(true);
                                    // Refresh credits from DB so the UI reflects the actual grant.
                                    const { data: refreshed } = await supabase
                                      .from('user_credits')
                                      .select('photo_credits, photo_credits_used, tier_id')
                                      .eq('user_id', user!.id)
                                      .eq('edition_id', editionId)
                                      .eq('category_id', selectedCategory!.id)
                                      .maybeSingle();
                                    setUserCredits(refreshed || null);
                                    toast.success('Payment successful! Credits added.');
                                  } else {
                                    throw new Error(res?.error || 'Capture failed');
                                  }
                                } catch (err: any) { toast.error(err.message || 'Payment capture failed.'); }
                                finally { setPaying(false); }
                              }}
                              onError={() => toast.error('PayPal error.')}
                              onCancel={() => toast('Payment cancelled.', { icon: '⚠️' })}
                            />
                          </div>
                        </div>
                      )}

                      <div className="border-t border-surface-800 pt-2">
                        <div className="flex items-center gap-1.5 text-[11px] text-surface-400 justify-center">
                          <ShieldCheck className="h-3 w-3 text-emerald-400" />
                          <span>256-bit SSL · Secure checkout via PayPal</span>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </>
          )}

          {!paymentComplete && (
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={goToPrevStep}>
                Back
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* === STEP 3: Upload Photos === */}
      {step === 3 && selectedCategory && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-3"
        >
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary-500/5 border border-primary-500/20">
            <Info className="h-4 w-4 text-primary-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium">Upload your photos for {selectedCategory.name}</p>
              <p className="text-xs text-surface-300 mt-0.5">
                JPG, PNG, or TIFF · max 20 MB each. Click or drag & drop.
              </p>
            </div>
          </div>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">{selectedCategory.name}</h3>
                <p className="text-xs text-surface-400 mt-0.5">
                  {photos.length}/{maxPhotos} photos
                  {isPaid && (
                    <> - <span className="text-gold-400">{paidPhotoLimit} credits</span></>
                  )}
                  {!isPaid && (
                    <> - <span className="text-emerald-400">Free</span></>
                  )}
                </p>
              </div>
              {isPaid && (
                <span className="px-2 py-0.5 rounded-full bg-gold-500/10 text-xs font-medium text-gold-400">Paid</span>
              )}
            </div>

            {/* Upload zone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-5 sm:p-6 text-center transition-all ${
                isDragActive
                  ? 'border-primary-500 bg-primary-500/5'
                  : photos.length >= maxPhotos
                  ? 'border-surface-800 bg-surface-900/50 cursor-not-allowed'
                  : 'border-surface-600 hover:border-primary-500/50 bg-surface-900 cursor-pointer'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className={`h-8 w-8 mx-auto mb-2 ${
                photos.length >= maxPhotos ? 'text-surface-700' : 'text-surface-400'
              }`} />
              {photos.length >= maxPhotos ? (
                <p className="text-sm text-surface-500">Max photos reached</p>
              ) : isDragActive ? (
                <p className="text-sm text-primary-400 font-medium">Drop here!</p>
              ) : (
                <>
                  <p className="text-sm text-white font-medium">Click to choose or drag & drop</p>
                  <p className="text-xs text-surface-500 mt-1">JPG, PNG, or TIFF · up to 20 MB</p>
                </>
              )}
            </div>

            {/* Photo list with per-photo title & description */}
            {photos.length > 0 && (
              <div className="mt-3 space-y-3">
                {photos.map((photo, idx) => (
                  <div key={photo.id} className="flex gap-3 p-2.5 rounded-lg bg-surface-800/50 border border-surface-700/50">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-surface-800 flex-shrink-0">
                      <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                      {!photo.uploaded && photo.progress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-700">
                          <div className="h-full bg-primary-500 transition-all" style={{ width: `${photo.progress}%` }} />
                        </div>
                      )}
                      {photo.uploaded && (
                        <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                          <div className="bg-emerald-500 rounded-full p-0.5">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-surface-500 font-mono">#{idx + 1}</span>
                        <span className="text-[10px] text-surface-500 truncate">{photo.file?.name || 'Saved draft photo'}</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Photo title (required)"
                        value={photo.title}
                        onChange={(e) => updatePhotoField(photo.id, 'title', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-md bg-surface-900 border border-surface-700 text-white text-xs placeholder:text-surface-500 focus:outline-none focus:border-primary-500 transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="Description (optional)"
                        value={photo.description}
                        onChange={(e) => updatePhotoField(photo.id, 'description', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-md bg-surface-900 border border-surface-700 text-white text-xs placeholder:text-surface-500 focus:outline-none focus:border-primary-500 transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={goToPrevStep}>
              Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<ArrowRight className="h-4 w-4" />}
              onClick={goToNextStep}
              disabled={!hasPhotos}
            >
              Review
            </Button>
          </div>
        </motion.div>
      )}

      {/* === STEP 4: Review & Submit === */}
      {step === 4 && selectedCategory && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-3"
        >
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <Info className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium">Almost done!</p>
              <p className="text-xs text-surface-300 mt-0.5">
                Add a title, review, then submit. You can also save as draft.
              </p>
            </div>
          </div>

          <Card className="p-4 space-y-3">
            <Input
              label={t('submission.title')}
              placeholder={t('submission.title_placeholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              label={t('submission.description')}
              placeholder={t('submission.description_placeholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                Summary
              </h3>

              <div className="rounded-lg bg-surface-800/50 border border-surface-700/50 overflow-hidden">
                <div className="flex items-center justify-between p-2.5">
                  <div className="flex items-center gap-2">
                    <Camera className="h-3.5 w-3.5 text-surface-400" />
                    <span className="text-sm text-white">{selectedCategory.name}</span>
                    {isPaid ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold-500/10 text-gold-400">Paid</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Free</span>
                    )}
                  </div>
                  <span className="text-xs text-surface-300">
                    {photos.length} photo{photos.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {photos.length > 0 && (
                  <div className="border-t border-surface-700/50 px-2.5 py-1.5 space-y-1">
                    {photos.map((photo, idx) => (
                      <div key={photo.id} className="flex items-center gap-2 text-xs">
                        <img src={photo.preview} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
                        <span className="text-surface-300 flex-shrink-0">#{idx + 1}</span>
                        <span className={`truncate ${photo.title.trim() ? 'text-white' : 'text-surface-400 italic'}`}>
                          {photo.title.trim() || 'Untitled'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isPaid && hasCredits && (
                <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" />
                    Payment confirmed - {paidPhotoLimit} photo credits
                  </p>
                </div>
              )}
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row justify-between gap-2">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={goToPrevStep}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleSubmit(true)} loading={loading}>
                Save Draft
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<ImageIcon className="h-4 w-4" />}
                onClick={() => handleSubmit(false)}
                loading={loading}
                disabled={!hasPhotos}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Submit
              </Button>
            </div>
          </div>

          {uploadProgress && (
            <div className="text-center space-y-2">
              <p className="text-sm text-surface-300">
                {t('common.uploading_photos', { current: uploadProgress.current, total: uploadProgress.total })}
              </p>
              <div className="h-1.5 w-full bg-surface-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-300"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {(!title.trim() || photos.some(p => !p.title.trim())) && (
            <p className="text-xs text-surface-400 text-center flex items-center justify-center gap-1">
              <HelpCircle className="h-3 w-3" />
              Titles are optional — you can submit without them.
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

