import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { PayPalButtons } from '@paypal/react-paypal-js';
import {
  Upload, X, ArrowRight, ArrowLeft, Image as ImageIcon,
  CreditCard, Check, Camera, ShieldCheck, Package, Info, HelpCircle, Lock,
} from 'lucide-react';
import { Button, Input, Textarea, Select, Card } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { uploadPhoto } from '@/lib/r2';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import type { PricingTier, Category } from '@/types';

interface UploadedPhoto {
  id: string;
  file: File;
  preview: string;
  progress: number;
  uploaded: boolean;
  storageKey?: string;
}

export default function NewSubmission() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Edition
  const [editionId, setEditionId] = useState('');
  const [editions, setEditions] = useState<{ value: string; label: string }[]>([]);

  // Categories (multi-select)
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // Pricing tiers from DB
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [selectedTierId, setSelectedTierId] = useState('');

  // User credits
  const [userCredits, setUserCredits] = useState<{ photo_credits: number; tier_id: string; submissions_remaining: number } | null>(null);

  // Payment
  const [paying, setPaying] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  // Per-category photos: { categoryId: UploadedPhoto[] }
  const [categoryPhotos, setCategoryPhotos] = useState<Record<string, UploadedPhoto[]>>({});

  // Active category in upload step
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);

  // Submission details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // ─── Derived state ───
  const selectedCategories = useMemo(
    () => categories.filter((c) => selectedCategoryIds.includes(c.id)),
    [categories, selectedCategoryIds]
  );

  const paidCategories = useMemo(
    () => selectedCategories.filter((c) => c.price > 0),
    [selectedCategories]
  );

  const hasPaidCategories = paidCategories.length > 0;
  const hasCredits = !!userCredits || paymentComplete;
  const needsPayment = hasPaidCategories && !hasCredits;

  const selectedTier = useMemo(
    () => pricingTiers.find((t) => t.id === selectedTierId) || null,
    [pricingTiers, selectedTierId]
  );

  const paymentAmount = useMemo(() => {
    if (!selectedTier) return 0;
    if (selectedTier.is_bundle) return Number(selectedTier.price);
    return Number(selectedTier.price) * paidCategories.length;
  }, [selectedTier, paidCategories.length]);

  const paidPhotoLimit = useMemo(() => {
    if (userCredits) return userCredits.photo_credits;
    if (selectedTier) return selectedTier.photo_credits;
    return 0;
  }, [userCredits, selectedTier]);

  const activeCategory = selectedCategories[activeCategoryIdx] || null;

  // ─── Data fetching ───

  // Fetch editions
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

  // Fetch categories when edition changes
  useEffect(() => {
    if (!editionId) { setCategories([]); return; }
    supabase
      .from('categories')
      .select('*')
      .eq('edition_id', editionId)
      .order('sort_order')
      .then(({ data }) => setCategories(data || []));
  }, [editionId]);

  // Fetch pricing tiers when edition changes
  useEffect(() => {
    if (!editionId) { setPricingTiers([]); return; }
    supabase
      .from('pricing_tiers')
      .select('*')
      .eq('edition_id', editionId)
      .order('sort_order')
      .then(({ data }) => setPricingTiers(data || []));
  }, [editionId]);

  // Check if user already has credits for this edition
  useEffect(() => {
    if (!editionId || !user?.id) { setUserCredits(null); return; }
    supabase
      .from('user_credits')
      .select('photo_credits, tier_id, submissions_remaining')
      .eq('user_id', user.id)
      .eq('edition_id', editionId)
      .maybeSingle()
      .then(({ data }) => setUserCredits(data || null));
  }, [editionId, user?.id]);

  // ─── Category selection ───
  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  // ─── Photos management ───
  const getPhotosForCategory = (catId: string) => categoryPhotos[catId] || [];

  const getMaxPhotos = (cat: Category) => {
    if (cat.price > 0) return Math.min(cat.max_photos, paidPhotoLimit || cat.max_photos);
    return cat.max_photos;
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!activeCategory) return;
      const catId = activeCategory.id;
      const current = getPhotosForCategory(catId);
      const max = getMaxPhotos(activeCategory);
      const remaining = max - current.length;
      const filesToAdd = acceptedFiles.slice(0, remaining);

      const newPhotos: UploadedPhoto[] = filesToAdd.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        uploaded: false,
      }));

      setCategoryPhotos((prev) => ({
        ...prev,
        [catId]: [...(prev[catId] || []), ...newPhotos],
      }));
    },
    [activeCategory, categoryPhotos, paidPhotoLimit]
  );

  const currentPhotos = activeCategory ? getPhotosForCategory(activeCategory.id) : [];
  const currentMaxPhotos = activeCategory ? getMaxPhotos(activeCategory) : 0;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/tiff': ['.tif', '.tiff'],
    },
    maxSize: 20 * 1024 * 1024,
    disabled: !activeCategory || currentPhotos.length >= currentMaxPhotos,
  });

  const removePhoto = (catId: string, photoId: string) => {
    setCategoryPhotos((prev) => {
      const photos = prev[catId] || [];
      const photo = photos.find((p) => p.id === photoId);
      if (photo) URL.revokeObjectURL(photo.preview);
      return { ...prev, [catId]: photos.filter((p) => p.id !== photoId) };
    });
  };

  // ─── Step navigation ───
  const canProceedStep1 = selectedCategoryIds.length > 0;
  const canProceedUpload = selectedCategories.every(
    (c) => getPhotosForCategory(c.id).length > 0
  );

  // In upload step: find the next category that still needs photos
  const currentCatHasPhotos = activeCategory
    ? getPhotosForCategory(activeCategory.id).length > 0
    : false;
  const nextEmptyCategoryIdx = selectedCategories.findIndex(
    (c, i) => i > activeCategoryIdx && getPhotosForCategory(c.id).length === 0
  );
  const shouldAdvanceCategory = step === 3 && currentCatHasPhotos && nextEmptyCategoryIdx !== -1;

  const goToNextStep = () => {
    if (step === 1 && hasPaidCategories && !hasCredits) {
      setStep(2);
    } else if (step === 1) {
      setStep(3);
      setActiveCategoryIdx(0);
    } else if (step === 2) {
      setStep(3);
      setActiveCategoryIdx(0);
    } else if (step === 3 && shouldAdvanceCategory) {
      setActiveCategoryIdx(nextEmptyCategoryIdx);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const goToPrevStep = () => {
    if (step === 4) setStep(3);
    else if (step === 3 && hasPaidCategories && !userCredits && paymentComplete) setStep(2);
    else if (step === 3) setStep(1);
    else if (step === 2) setStep(1);
  };

  // ─── Submit ───
  const handleSubmit = async (asDraft: boolean) => {
    if (!user?.id) return;

    // Check submissions_remaining for paid categories (anti-spam)
    const submittingPaidCount = selectedCategories.filter((c) => c.price > 0).length;
    if (!asDraft && submittingPaidCount > 0 && userCredits && userCredits.submissions_remaining <= 0) {
      toast.error('You have no submissions remaining for this edition. Contact support if you need assistance.');
      return;
    }

    setLoading(true);
    try {
      let submittedPaidCount = 0;
      for (const cat of selectedCategories) {
        const photos = getPhotosForCategory(cat.id);
        if (photos.length === 0 && !asDraft) continue;

        const isPaid = cat.price > 0;
        const status = asDraft ? 'draft' : (isPaid && !hasCredits ? 'draft' : 'submitted');

        const { data: submission, error: subError } = await supabase
          .from('submissions')
          .insert({
            user_id: user.id,
            edition_id: editionId,
            category_id: cat.id,
            title: title || null,
            description: description || null,
            status,
            submitted_at: status === 'submitted' ? new Date().toISOString() : null,
          })
          .select('id')
          .single();

        if (subError) throw subError;
        if (isPaid && status === 'submitted') submittedPaidCount++;

        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          try {
            const { key } = await uploadPhoto(photo.file, (progress) => {
              setCategoryPhotos((prev) => ({
                ...prev,
                [cat.id]: (prev[cat.id] || []).map((p) =>
                  p.id === photo.id ? { ...p, progress } : p
                ),
              }));
            });

            await supabase.from('submission_photos').insert({
              submission_id: submission.id,
              storage_key: key,
              original_filename: photo.file.name,
              mime_type: photo.file.type,
              file_size: photo.file.size,
              sort_order: i,
            });

            setCategoryPhotos((prev) => ({
              ...prev,
              [cat.id]: (prev[cat.id] || []).map((p) =>
                p.id === photo.id ? { ...p, uploaded: true, storageKey: key } : p
              ),
            }));
          } catch (uploadErr) {
            console.error('Photo upload failed:', uploadErr);
            toast.error(`Failed to upload ${photo.file.name}`);
          }
        }
      }

      // Decrement submissions_remaining for paid submissions
      if (submittedPaidCount > 0 && userCredits) {
        await supabase.rpc('decrement_submissions_remaining', {
          p_user_id: user.id,
          p_edition_id: editionId,
          p_count: submittedPaidCount,
        });
      }

      toast.success(asDraft ? 'Saved as draft!' : t('submission.submitted_success'));
      navigate('/dashboard/submissions');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  // ─── Progress bar ───
  const progressSteps = needsPayment
    ? ['Choose Categories', 'Payment', 'Upload Photos', 'Review & Submit']
    : ['Choose Categories', 'Upload Photos', 'Review & Submit'];

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
          Follow the steps below to submit your photos
        </p>
      </div>

      {/* Progress Steps — Large numbered circles */}
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

      {/* ═══ STEP 1: Select Categories ═══ */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-3"
        >
          {/* Friendly instruction */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary-500/5 border border-primary-500/20">
            <Info className="h-4 w-4 text-primary-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium">Choose the categories you'd like to enter</p>
              <p className="text-xs text-surface-300 mt-0.5">
                Select one or more categories. Some are free, others require a small fee.
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
                setSelectedCategoryIds([]);
              }}
            />

            {editionId && categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-white mb-0.5">
                  Select categories to participate in
                </label>
                <p className="text-xs text-surface-400 mb-2">
                  Click a category to select it.
                </p>
                <div className="space-y-1.5">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryIds.includes(cat.id);
                    const isPaid = cat.price > 0;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-surface-700 hover:border-surface-500 bg-surface-900'
                        }`}
                      >
                        <div
                          className={`h-5 w-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-primary-500 text-white'
                              : 'border border-surface-500'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{cat.name}</p>
                          {cat.description && (
                            <p className="text-xs text-surface-400 line-clamp-1">{cat.description}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0 flex items-center gap-2">
                          <span className="text-xs text-surface-500">Max {cat.max_photos}</span>
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-400 bg-gold-500/10 px-2 py-0.5 rounded-full">
                              <CreditCard className="h-3 w-3" />
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              Free
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedCategoryIds.length > 0 && (
              <div className="p-2.5 rounded-lg bg-surface-800/50 border border-surface-700 space-y-1">
                <p className="text-sm text-white font-medium">
                  ✓ {selectedCategoryIds.length} categor{selectedCategoryIds.length === 1 ? 'y' : 'ies'} selected
                </p>
                {hasPaidCategories && (
                  <p className="text-xs text-gold-400">
                    {paidCategories.length} paid categor{paidCategories.length === 1 ? 'y' : 'ies'} — you'll choose a plan in the next step
                    {hasCredits && (
                      <span className="text-emerald-400 ml-1">
                        — Credits already available ({userCredits?.photo_credits} photos/category)
                      </span>
                    )}
                  </p>
                )}
                {userCredits && userCredits.submissions_remaining <= 0 && hasPaidCategories && (
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 mt-1">
                    <p className="text-xs text-red-400 font-medium">
                      You have used all your paid submissions for this edition. You can still enter free categories.
                      Contact support if you need to submit again.
                    </p>
                  </div>
                )}
                {userCredits && userCredits.submissions_remaining > 0 && hasPaidCategories && (
                  <p className="text-xs text-surface-400">
                    {userCredits.submissions_remaining} paid submission{userCredits.submissions_remaining !== 1 ? 's' : ''} remaining
                  </p>
                )}
              </div>
            )}
          </Card>

          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              icon={<ArrowRight className="h-4 w-4" />}
              onClick={goToNextStep}
              disabled={!canProceedStep1}
            >
              {hasPaidCategories && !hasCredits ? 'Continue to Choose Plan' : 'Continue to Upload Photos'}
            </Button>
          </div>
        </motion.div>
      )}

      {/* ═══ STEP 2: Payment ═══ */}
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
                You now have <strong className="text-white">{paidPhotoLimit} photo credits</strong> per paid category.
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
              {/* Friendly instruction */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gold-500/5 border border-gold-500/20">
                <Info className="h-4 w-4 text-gold-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-white font-medium">Choose your photo plan</p>
                  <p className="text-xs text-surface-300 mt-0.5">
                    Select how many photos per paid category, then complete payment.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 space-y-3">
                  <Card className="p-4">
                    <h2 className="text-sm font-bold text-white mb-0.5">Choose Your Plan</h2>
                    <p className="text-xs text-surface-400 mb-3">
                      {paidCategories.length} paid categor{paidCategories.length === 1 ? 'y' : 'ies'} selected. Pick a plan:
                    </p>

                    <div className="space-y-1.5">
                      {pricingTiers.filter((t) => !t.is_bundle).map((tier) => {
                        const isActive = selectedTierId === tier.id;
                        const total = Number(tier.price) * paidCategories.length;
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
                                {tier.photo_credits} photo{tier.photo_credits > 1 ? 's' : ''}/cat · €{tier.price}/cat × {paidCategories.length}
                              </span>
                            </div>
                            <span className="text-base font-bold text-white">€{total.toFixed(0)}</span>
                          </button>
                        );
                      })}

                      {pricingTiers.filter((t) => t.is_bundle).map((tier) => {
                        const isActive = selectedTierId === tier.id;
                        const regularEquivalent = pricingTiers.find(
                          (t) => !t.is_bundle && t.photo_credits === tier.photo_credits
                        );
                        const regularTotal = regularEquivalent
                          ? Number(regularEquivalent.price) * paidCategories.length
                          : 0;
                        const savings = regularTotal - Number(tier.price);
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => setSelectedTierId(tier.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left cursor-pointer ${
                              isActive
                                ? 'border-emerald-500 bg-emerald-500/10'
                                : 'border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5'
                            }`}
                          >
                            <div
                              className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isActive ? 'border-emerald-500' : 'border-emerald-500/40'
                              }`}
                            >
                              {isActive && <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5">
                                <Package className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-sm text-white font-semibold">{tier.name}</span>
                                {savings > 0 && (
                                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-300">
                                    Save €{savings.toFixed(0)}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-surface-400">
                                {tier.photo_credits} photos · all paid categories
                              </span>
                            </div>
                            <span className="text-base font-bold text-emerald-400">€{Number(tier.price).toFixed(0)}</span>
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
                      {paidCategories.map((c) => (
                        <div key={c.id} className="flex justify-between">
                          <span className="text-surface-400 truncate max-w-[65%]">{c.name}</span>
                          <span className="text-white">
                            {selectedTier?.is_bundle ? '—' : selectedTier ? `€${Number(selectedTier.price).toFixed(0)}` : '—'}
                          </span>
                        </div>
                      ))}
                      {selectedTier && (
                        <>
                          <div className="border-t border-surface-700 pt-2 flex justify-between">
                            <span className="text-surface-400">Plan</span>
                            <span className="text-white">{selectedTier.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-surface-400">Photos/category</span>
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
                          {/* ── Card Payment Section (primary) ── */}
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
                                  body: { tierId: selectedTierId, editionId, categoryIds: paidCategories.map((c) => c.id) },
                                });
                                if (error) {
                                  let msg = error.message;
                                  try { const body = await error.context?.json(); msg = body?.error || body?.details || msg; } catch {}
                                  console.error('create-paypal-order error:', msg, error);
                                  throw new Error(msg);
                                }
                                if (!data?.orderId) { console.error('create-paypal-order bad response:', data); throw new Error(data?.error || 'Failed to create order'); }
                                return data.orderId;
                              }}
                              onApprove={async (data) => {
                                setPaying(true);
                                try {
                                  const { data: res, error } = await supabase.functions.invoke('capture-paypal-order', {
                                    body: { orderId: data.orderID, userId: user!.id, tierId: selectedTierId, editionId },
                                  });
                                  if (error) throw new Error(error.message || 'Capture request failed');
                                  if (res?.success) {
                                    setPaymentComplete(true);
                                    setUserCredits({ photo_credits: selectedTier!.photo_credits, tier_id: selectedTierId, submissions_remaining: paidCategories.length });
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

                          {/* ── Divider ── */}
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

                          {/* ── PayPal Button ── */}
                          <div className="space-y-3">
                            <PayPalButtons
                              style={{ layout: 'vertical', color: 'blue', shape: 'pill', label: 'paypal', height: 38 }}
                              fundingSource="paypal"
                              createOrder={async () => {
                                const { data, error } = await supabase.functions.invoke('create-paypal-order', {
                                  body: { tierId: selectedTierId, editionId, categoryIds: paidCategories.map((c) => c.id) },
                                });
                                if (error) {
                                  let msg = error.message;
                                  try { const body = await error.context?.json(); msg = body?.error || body?.details || msg; } catch {}
                                  console.error('create-paypal-order error:', msg, error);
                                  throw new Error(msg);
                                }
                                if (!data?.orderId) { console.error('create-paypal-order bad response:', data); throw new Error(data?.error || 'Failed to create order'); }
                                return data.orderId;
                              }}
                              onApprove={async (data) => {
                                setPaying(true);
                                try {
                                  const { data: res, error } = await supabase.functions.invoke('capture-paypal-order', {
                                    body: { orderId: data.orderID, userId: user!.id, tierId: selectedTierId, editionId },
                                  });
                                  if (error) throw new Error(error.message || 'Capture request failed');
                                  if (res?.success) {
                                    setPaymentComplete(true);
                                    setUserCredits({ photo_credits: selectedTier!.photo_credits, tier_id: selectedTierId, submissions_remaining: paidCategories.length });
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

                      {/* ── Trust badges ── */}
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

      {/* ═══ STEP 3: Upload Photos (per category) ═══ */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-3"
        >
          {/* Friendly instruction */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary-500/5 border border-primary-500/20">
            <Info className="h-4 w-4 text-primary-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium">Upload your photos</p>
              <p className="text-xs text-surface-300 mt-0.5">
                JPG, PNG, or TIFF · max 20 MB each. Click or drag & drop.
              </p>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-1.5">
            {selectedCategories.map((cat, idx) => {
              const photos = getPhotosForCategory(cat.id);
              const maxPhotos = getMaxPhotos(cat);
              const isActive = activeCategoryIdx === idx;
              const isFull = photos.length >= maxPhotos;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryIdx(idx)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-primary-500/15 text-primary-300 border-primary-500/40'
                      : 'bg-surface-800 text-surface-400 border-transparent hover:border-surface-600'
                  }`}
                >
                  {cat.name}
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    isFull
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : photos.length > 0
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'bg-surface-700 text-surface-500'
                  }`}>
                    {photos.length}/{maxPhotos}
                  </span>
                </button>
              );
            })}
          </div>

          {activeCategory && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">{activeCategory.name}</h3>
                  <p className="text-xs text-surface-400 mt-0.5">
                    {currentPhotos.length}/{currentMaxPhotos} photos
                    {activeCategory.price > 0 && (
                      <> · <span className="text-gold-400">{paidPhotoLimit} credits</span></>
                    )}
                    {activeCategory.price === 0 && (
                      <> · <span className="text-emerald-400">Free</span></>
                    )}
                  </p>
                </div>
                {activeCategory.price > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-gold-500/10 text-xs font-medium text-gold-400">Paid</span>
                )}
              </div>

              {/* Upload zone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-5 sm:p-6 text-center transition-all ${
                  isDragActive
                    ? 'border-primary-500 bg-primary-500/5'
                    : currentPhotos.length >= currentMaxPhotos
                    ? 'border-surface-800 bg-surface-900/50 cursor-not-allowed'
                    : 'border-surface-600 hover:border-primary-500/50 bg-surface-900 cursor-pointer'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className={`h-8 w-8 mx-auto mb-2 ${
                  currentPhotos.length >= currentMaxPhotos ? 'text-surface-700' : 'text-surface-400'
                }`} />
                {currentPhotos.length >= currentMaxPhotos ? (
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

              {/* Photo grid — always-visible remove buttons */}
              {currentPhotos.length > 0 && (
                <div className="mt-3">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {currentPhotos.map((photo) => (
                      <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-surface-800 border border-surface-700">
                        <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removePhoto(activeCategory.id, photo.id)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer"
                          title="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {!photo.uploaded && photo.progress > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-surface-700">
                            <div className="h-full bg-primary-500 transition-all" style={{ width: `${photo.progress}%` }} />
                          </div>
                        )}
                        {photo.uploaded && (
                          <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                            <div className="bg-emerald-500 rounded-full p-1">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Checklist */}
          <Card className="p-3">
            <h4 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-1.5">Checklist</h4>
            <div className="space-y-1">
              {selectedCategories.map((cat) => {
                const photos = getPhotosForCategory(cat.id);
                const hasPhotos = photos.length > 0;
                return (
                  <div key={cat.id} className="flex items-center gap-2 text-xs">
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                      hasPhotos ? 'bg-emerald-500 text-white' : 'bg-surface-700 text-surface-500'
                    }`}>
                      {hasPhotos ? <Check className="h-2.5 w-2.5" /> : <span className="text-[9px]">–</span>}
                    </div>
                    <span className={`${hasPhotos ? 'text-white' : 'text-surface-400'}`}>{cat.name}</span>
                    <span className={`ml-auto ${hasPhotos ? 'text-emerald-400' : 'text-surface-500'}`}>
                      {photos.length} photo{photos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
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
              disabled={!currentCatHasPhotos}
            >
              {canProceedUpload
                ? 'Review'
                : shouldAdvanceCategory
                ? `Next: ${selectedCategories[nextEmptyCategoryIdx]?.name}`
                : 'Add photos'}
            </Button>
          </div>
        </motion.div>
      )}

      {/* ═══ STEP 4: Review & Submit ═══ */}
      {step === 4 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-3"
        >
          {/* Friendly instruction */}
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

              <div className="space-y-1.5">
                {selectedCategories.map((cat) => {
                  const photos = getPhotosForCategory(cat.id);
                  return (
                    <div key={cat.id} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-800/50 border border-surface-700/50">
                      <div className="flex items-center gap-2">
                        <Camera className="h-3.5 w-3.5 text-surface-400" />
                        <span className="text-sm text-white">{cat.name}</span>
                        {cat.price > 0 ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold-500/10 text-gold-400">Paid</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Free</span>
                        )}
                      </div>
                      <span className="text-xs text-surface-300">
                        {photos.length} photo{photos.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>

              {hasPaidCategories && hasCredits && (
                <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" />
                    Payment confirmed — {paidPhotoLimit} photos/paid category
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
                disabled={!title.trim()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Submit
              </Button>
            </div>
          </div>

          {!title.trim() && (
            <p className="text-xs text-surface-400 text-center flex items-center justify-center gap-1">
              <HelpCircle className="h-3 w-3" />
              Enter a title to submit
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
