import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { PayPalButtons } from '@paypal/react-paypal-js';
import {
  ArrowRight, ArrowLeft, X, Upload, Check, Camera,
  ShieldCheck, Package, Calendar, Award, Wind, Eye, Leaf, Film,
  Image as ImageIcon, HelpCircle,
} from 'lucide-react';
import { Button, Input, Textarea } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { uploadPhoto } from '@/lib/r2';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores';
import toast from 'react-hot-toast';
import type { PricingTier, Category } from '@/types';

/* ── Hardcoded theme data (compressed from ThemePage) ── */
const THEME_DIRECTIONS = [
  { icon: <Eye className="h-4 w-4" />, title: 'Intimate Breath', desc: 'The body, vulnerability, presence' },
  { icon: <Wind className="h-4 w-4" />, title: 'Invisible Traces', desc: 'Pollution, ecology, absence of air' },
  { icon: <Film className="h-4 w-4" />, title: 'Animated Memory', desc: 'Archives, breath of the past' },
  { icon: <Leaf className="h-4 w-4" />, title: 'Air as Commons', desc: 'Politics, shared space, public breath' },
  { icon: <Camera className="h-4 w-4" />, title: 'The Living Image', desc: 'Photography as breathing' },
];

interface UploadedPhoto {
  id: string;
  file: File;
  preview: string;
  progress: number;
  uploaded: boolean;
  storageKey?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/* ────────────────────────────────────────────── */
export default function CompetitionModal({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const { user, signIn, signUp, signInWithGoogle } = useAuth();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // ── Modal step: 0=info, 1=auth, 2=categories, 3=payment, 4=upload, 5=review ──
  const [step, setStep] = useState(0);

  // ── Auth state ──
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('signup');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');

  // ── Submission state (mirrors NewSubmission) ──
  const [editionId, setEditionId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [selectedTierId, setSelectedTierId] = useState('');
  const [userCredits, setUserCredits] = useState<{ photo_credits: number; tier_id: string; submissions_remaining: number } | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [categoryPhotos, setCategoryPhotos] = useState<Record<string, UploadedPhoto[]>>({});
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ── Derived ──
  const selectedCategories = useMemo(() => categories.filter(c => selectedCategoryIds.includes(c.id)), [categories, selectedCategoryIds]);
  const paidCategories = useMemo(() => selectedCategories.filter(c => c.price > 0), [selectedCategories]);
  const hasPaidCategories = paidCategories.length > 0;
  const hasCredits = !!userCredits || paymentComplete;
  const needsPayment = hasPaidCategories && !hasCredits;
  const selectedTier = useMemo(() => pricingTiers.find(t => t.id === selectedTierId) || null, [pricingTiers, selectedTierId]);
  const paymentAmount = useMemo(() => {
    if (!selectedTier) return 0;
    return selectedTier.is_bundle ? Number(selectedTier.price) : Number(selectedTier.price) * paidCategories.length;
  }, [selectedTier, paidCategories.length]);
  const paidPhotoLimit = useMemo(() => userCredits?.photo_credits ?? selectedTier?.photo_credits ?? 0, [userCredits, selectedTier]);
  const activeCategory = selectedCategories[activeCategoryIdx] || null;
  const getPhotosForCategory = (catId: string) => categoryPhotos[catId] || [];
  const getMaxPhotos = (cat: Category) => cat.price > 0 ? Math.min(cat.max_photos, paidPhotoLimit || cat.max_photos) : cat.max_photos;
  const currentPhotos = activeCategory ? getPhotosForCategory(activeCategory.id) : [];
  const currentMaxPhotos = activeCategory ? getMaxPhotos(activeCategory) : 0;
  const canProceedUpload = selectedCategories.every(c => getPhotosForCategory(c.id).length > 0);
  const currentCatHasPhotos = activeCategory ? getPhotosForCategory(activeCategory.id).length > 0 : false;
  const nextEmptyCategoryIdx = selectedCategories.findIndex((c, i) => i > activeCategoryIdx && getPhotosForCategory(c.id).length === 0);
  const shouldAdvanceCategory = step === 4 && currentCatHasPhotos && nextEmptyCategoryIdx !== -1;

  // ── Fetch edition + categories + tiers ──
  useEffect(() => {
    if (!isOpen) return;
    supabase.from('editions').select('id, title, year').eq('status', 'open').eq('published', true).order('year', { ascending: false }).limit(1).single()
      .then(({ data }) => { if (data) setEditionId(data.id); });
  }, [isOpen]);

  useEffect(() => {
    if (!editionId) return;
    supabase.from('categories').select('*').eq('edition_id', editionId).order('sort_order').then(({ data }) => setCategories(data || []));
    supabase.from('pricing_tiers').select('*').eq('edition_id', editionId).order('sort_order').then(({ data }) => setPricingTiers(data || []));
  }, [editionId]);

  useEffect(() => {
    if (!editionId || !user?.id) { setUserCredits(null); return; }
    supabase.from('user_credits').select('photo_credits, tier_id, submissions_remaining').eq('user_id', user.id).eq('edition_id', editionId).maybeSingle()
      .then(({ data }) => setUserCredits(data || null));
  }, [editionId, user?.id]);

  // Auto-skip auth step if already logged in
  useEffect(() => {
    if (step === 1 && isAuthenticated) setStep(2);
  }, [step, isAuthenticated]);

  // ── Auth handlers ──
  const handleLogin = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      await signIn(email, password);
      setStep(2);
    } catch (err: any) { setAuthError(err.message || 'Login failed'); }
    finally { setAuthLoading(false); }
  };

  const handleSignUp = async () => {
    setAuthError('');
    if (password !== confirmPassword) { setAuthError('Passwords do not match'); return; }
    if (password.length < 6) { setAuthError('Password must be at least 6 characters'); return; }
    if (!fullName.trim()) { setAuthError('Please enter your full name'); return; }
    setAuthLoading(true);
    try {
      await signUp(email, password, fullName, country || undefined);
      // Auto-login after signup
      await signIn(email, password);
      setStep(2);
    } catch (err: any) { setAuthError(err.message || 'Sign up failed'); }
    finally { setAuthLoading(false); }
  };

  // ── Category toggle ──
  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds(prev => prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]);
  };

  // ── Photos management ──
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!activeCategory) return;
    const catId = activeCategory.id;
    const current = getPhotosForCategory(catId);
    const max = getMaxPhotos(activeCategory);
    const remaining = max - current.length;
    const filesToAdd = acceptedFiles.slice(0, remaining);
    const newPhotos: UploadedPhoto[] = filesToAdd.map(file => ({
      id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), progress: 0, uploaded: false,
    }));
    setCategoryPhotos(prev => ({ ...prev, [catId]: [...(prev[catId] || []), ...newPhotos] }));
  }, [activeCategory, categoryPhotos, paidPhotoLimit]);

  const removePhoto = (catId: string, photoId: string) => {
    setCategoryPhotos(prev => {
      const photos = prev[catId] || [];
      const p = photos.find(x => x.id === photoId);
      if (p) URL.revokeObjectURL(p.preview);
      return { ...prev, [catId]: photos.filter(x => x.id !== photoId) };
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/tiff': ['.tif', '.tiff'] },
    maxSize: 20 * 1024 * 1024,
    disabled: !activeCategory || currentPhotos.length >= currentMaxPhotos,
  });

  // ── Submit ──
  const handleSubmit = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      let submittedPaidCount = 0;
      for (const cat of selectedCategories) {
        const photos = getPhotosForCategory(cat.id);
        if (photos.length === 0) continue;
        const isPaid = cat.price > 0;
        const status = isPaid && !hasCredits ? 'draft' : 'submitted';
        const { data: submission, error: subError } = await supabase.from('submissions').insert({
          user_id: user.id, edition_id: editionId, category_id: cat.id,
          title: title || null, description: description || null, status,
          submitted_at: status === 'submitted' ? new Date().toISOString() : null,
        }).select('id').single();
        if (subError) throw subError;
        if (isPaid && status === 'submitted') submittedPaidCount++;
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          try {
            const { key } = await uploadPhoto(photo.file, (progress) => {
              setCategoryPhotos(prev => ({
                ...prev, [cat.id]: (prev[cat.id] || []).map(p => p.id === photo.id ? { ...p, progress } : p),
              }));
            });
            await supabase.from('submission_photos').insert({
              submission_id: submission.id, storage_key: key, original_filename: photo.file.name,
              mime_type: photo.file.type, file_size: photo.file.size, sort_order: i,
            });
            setCategoryPhotos(prev => ({
              ...prev, [cat.id]: (prev[cat.id] || []).map(p => p.id === photo.id ? { ...p, uploaded: true, storageKey: key } : p),
            }));
          } catch (uploadErr) {
            console.error('Photo upload failed:', uploadErr);
            toast.error(`Failed to upload ${photo.file.name}`);
          }
        }
      }
      if (submittedPaidCount > 0 && userCredits) {
        await supabase.rpc('decrement_submissions_remaining', { p_user_id: user.id, p_edition_id: editionId, p_count: submittedPaidCount });
      }
      setSubmitSuccess(true);
      toast.success('Submission successful!');
    } catch (err: any) { toast.error(err.message || 'Failed to submit'); }
    finally { setLoading(false); }
  };

  // ── Step navigation ──
  const goNext = () => {
    if (step === 0) { setStep(isAuthenticated ? 2 : 1); }
    else if (step === 1) { /* handled by auth success */ }
    else if (step === 2 && needsPayment) { setStep(3); }
    else if (step === 2) { setStep(4); setActiveCategoryIdx(0); }
    else if (step === 3) { setStep(4); setActiveCategoryIdx(0); }
    else if (step === 4 && shouldAdvanceCategory) { setActiveCategoryIdx(nextEmptyCategoryIdx); }
    else if (step === 4) { setStep(5); }
  };

  const goBack = () => {
    if (step === 5) setStep(4);
    else if (step === 4 && needsPayment && paymentComplete) setStep(3);
    else if (step === 4) setStep(2);
    else if (step === 3) setStep(2);
    else if (step === 2) setStep(0);
    else if (step === 1) setStep(0);
  };

  // ── Pipeline labels ──
  const pipelineSteps = isAuthenticated
    ? ['Info', 'Categories', needsPayment ? 'Payment' : null, 'Upload', 'Review'].filter(Boolean) as string[]
    : ['Info', 'Account', 'Categories', needsPayment ? 'Payment' : null, 'Upload', 'Review'].filter(Boolean) as string[];

  const pipelineIdx = (() => {
    if (step === 0) return 0;
    if (step === 1) return 1;
    const base = isAuthenticated ? 0 : 1;
    if (step === 2) return base + 1;
    if (step === 3) return base + 2;
    if (step === 4) return base + (needsPayment ? 3 : 2);
    if (step === 5) return pipelineSteps.length - 1;
    return 0;
  })();

  if (!isOpen) return null;

  const paidCats = categories.filter(c => c.price > 0);
  const freeCats = categories.filter(c => c.price === 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <motion.div className="fixed inset-0 bg-black/80 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="relative w-full max-w-5xl bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-800 shrink-0">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-gold-400" />
            <span className="text-sm font-semibold text-white">IFFA 17 · 2026</span>
          </div>
          <button onClick={onClose} className="text-surface-400 hover:text-white transition-colors cursor-pointer p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pipeline indicator — shown for steps 1+ */}
        {step > 0 && !submitSuccess && (
          <div className="flex items-center justify-center gap-1 px-5 py-2.5 border-b border-surface-800/50 shrink-0 overflow-x-auto">
            {pipelineSteps.map((label, i) => {
              const done = i < pipelineIdx;
              const active = i === pipelineIdx;
              return (
                <div key={label} className="flex items-center">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      done ? 'bg-emerald-500 text-white' : active ? 'bg-primary-600 text-white' : 'bg-surface-800 text-surface-500'
                    }`}>
                      {done ? <Check className="h-3 w-3" /> : i + 1}
                    </div>
                    <span className={`text-xs font-medium hidden sm:inline ${done ? 'text-emerald-400' : active ? 'text-primary-400' : 'text-surface-500'}`}>
                      {label}
                    </span>
                  </div>
                  {i < pipelineSteps.length - 1 && <div className={`h-0.5 w-4 sm:w-6 mx-1 rounded-full ${done ? 'bg-emerald-500' : 'bg-surface-700'}`} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* ═══ STEP 0: Theme Info + Pricing ═══ */}
          {step === 0 && (
            <div className="space-y-5">
              {/* Hero */}
              <div className="text-center space-y-2">
                <h2 className="text-xl font-display font-bold text-white">FRYMË / BREATH</h2>
                <p className="text-sm text-surface-300 leading-relaxed max-w-lg mx-auto">
                  The invisible rhythm of being, the conditions of life, the politics of air.
                  An invitation to explore breath as a philosophical, ecological, and photographic act.
                </p>
                <div className="flex items-center justify-center gap-3 text-xs text-surface-400">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Deadline: 30 June 2026</span>
                  <span>·</span>
                  <span>€4,000 in prizes</span>
                </div>
              </div>

              {/* Thematic Directions */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2">Five Entry Doors</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {THEME_DIRECTIONS.map(d => (
                    <div key={d.title} className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-800/60 border border-surface-700/50">
                      <div className="text-primary-400 mt-0.5">{d.icon}</div>
                      <div>
                        <p className="text-xs font-semibold text-white leading-tight">{d.title}</p>
                        <p className="text-[11px] text-surface-400 leading-snug">{d.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Categories & Pricing */}
              {categories.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-400">Competition Categories</h3>
                  {paidCats.length > 0 && (
                    <div className="rounded-lg border border-gold-500/20 bg-gold-500/5 p-3">
                      <p className="text-xs font-semibold text-gold-400 mb-2">Paid Categories</p>
                      <div className="space-y-1.5">
                        {paidCats.map(c => (
                          <div key={c.id} className="flex items-center justify-between text-xs">
                            <span className="text-surface-200">{c.name}</span>
                            <span className="text-gold-400 font-semibold">€{Number(c.price).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {freeCats.length > 0 && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <p className="text-xs font-semibold text-emerald-400 mb-2">Free Categories</p>
                      <div className="flex flex-wrap gap-1.5">
                        {freeCats.map(c => (
                          <span key={c.id} className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tier pricing summary */}
                  {pricingTiers.length > 0 && paidCats.length > 0 && (
                    <div className="rounded-lg border border-surface-700 p-3">
                      <p className="text-xs font-semibold text-surface-300 mb-2">Photo Plans (for paid categories)</p>
                      <div className="space-y-1.5">
                        {pricingTiers.map(t => (
                          <div key={t.id} className="flex items-center justify-between text-xs">
                            <span className="text-surface-300">
                              {t.name} — {t.photo_credits} photo{t.photo_credits > 1 ? 's' : ''}/category
                            </span>
                            <span className="text-white font-semibold">
                              {t.is_bundle ? `€${Number(t.price).toFixed(0)} flat` : `€${Number(t.price).toFixed(0)}/cat`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Guidelines summary */}
              <div className="rounded-lg bg-surface-800/50 border border-surface-700/50 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-surface-300">Quick Rules</p>
                <ul className="text-[11px] text-surface-400 space-y-1 list-disc list-inside">
                  <li>Photos taken between 2022–2026</li>
                  <li>JPG, PNG, or TIFF — max 20 MB each</li>
                  <li>Minimal editing allowed (cropping, exposure, color)</li>
                  <li>No composites, cloning, or AI-generated images</li>
                  <li>Open to all photographers worldwide</li>
                </ul>
              </div>

              <Button variant="gold" size="lg" className="w-full" icon={<ArrowRight className="h-4 w-4" />} onClick={goNext}>
                Participate Now
              </Button>
            </div>
          )}

          {/* ═══ STEP 1: Auth ═══ */}
          {step === 1 && !isAuthenticated && (
            <div className="max-w-sm mx-auto space-y-5">
              <div className="text-center">
                <h2 className="text-lg font-bold text-white">Create an Account or Log In</h2>
                <p className="text-sm text-surface-400 mt-1">To submit your photos, you need an account.</p>
              </div>

              {/* Tabs */}
              <div className="flex bg-surface-800 rounded-lg p-0.5">
                {(['signup', 'login'] as const).map(tab => (
                  <button key={tab} onClick={() => { setAuthTab(tab); setAuthError(''); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                      authTab === tab ? 'bg-surface-700 text-white' : 'text-surface-400 hover:text-white'
                    }`}>
                    {tab === 'signup' ? 'Sign Up' : 'Log In'}
                  </button>
                ))}
              </div>

              {authError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">{authError}</div>
              )}

              {authTab === 'signup' && (
                <div className="space-y-3">
                  <Input label="Full Name" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} />
                  <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                  <Input label="Country (optional)" placeholder="e.g. Kosovo" value={country} onChange={e => setCountry(e.target.value)} />
                  <Input label="Password" type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
                  <Input label="Confirm Password" type="password" placeholder="Re-enter password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  <Button variant="primary" className="w-full" loading={authLoading} onClick={handleSignUp}>
                    Create Account & Continue
                  </Button>
                </div>
              )}

              {authTab === 'login' && (
                <div className="space-y-3">
                  <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                  <Input label="Password" type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} />
                  <Button variant="primary" className="w-full" loading={authLoading} onClick={handleLogin}>
                    Log In & Continue
                  </Button>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-700" /></div>
                <div className="relative flex justify-center"><span className="px-3 bg-surface-900 text-xs text-surface-500">or</span></div>
              </div>

              <button
                onClick={() => {
                  localStorage.setItem('iffa17_modal_return', 'true');
                  signInWithGoogle();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-surface-600 bg-surface-800 text-sm font-medium text-white hover:bg-surface-700 transition-colors cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>

              <button onClick={goBack} className="w-full text-center text-xs text-surface-500 hover:text-surface-300 transition-colors cursor-pointer py-1">
                ← Back to info
              </button>
            </div>
          )}

          {/* ═══ STEP 2: Category Selection ═══ */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-white">Choose Your Categories</h2>
                <p className="text-xs text-surface-400 mt-0.5">Select one or more categories to enter.</p>
              </div>

              <div className="space-y-2">
                {categories.map(cat => {
                  const isSelected = selectedCategoryIds.includes(cat.id);
                  const isPaid = cat.price > 0;
                  return (
                    <button key={cat.id} type="button" onClick={() => toggleCategory(cat.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left cursor-pointer ${
                        isSelected ? 'border-primary-500 bg-primary-500/10' : 'border-surface-700 hover:border-surface-500 bg-surface-800/50'
                      }`}>
                      <div className={`h-5 w-5 rounded flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-primary-500 text-white' : 'border border-surface-500'
                      }`}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{cat.name}</p>
                        {cat.description && <p className="text-xs text-surface-400 line-clamp-1">{cat.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-surface-500">Max {cat.max_photos}</span>
                        {isPaid ? (
                          <span className="text-xs font-medium text-gold-400 bg-gold-500/10 px-2 py-0.5 rounded-full">€{Number(cat.price).toFixed(0)}</span>
                        ) : (
                          <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Free</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedCategoryIds.length > 0 && (
                <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700 text-sm text-white">
                  ✓ {selectedCategoryIds.length} categor{selectedCategoryIds.length === 1 ? 'y' : 'ies'} selected
                  {hasPaidCategories && <span className="text-gold-400 ml-1">({paidCategories.length} paid)</span>}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={goBack}>Back</Button>
                <Button variant="primary" size="sm" icon={<ArrowRight className="h-4 w-4" />} onClick={goNext} disabled={selectedCategoryIds.length === 0}>
                  {needsPayment ? 'Choose Plan' : 'Upload Photos'}
                </Button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Payment ═══ */}
          {step === 3 && (
            <div className="space-y-4">
              {paymentComplete ? (
                <div className="text-center py-6 space-y-3">
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-emerald-500/10">
                    <Check className="h-7 w-7 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Payment Confirmed!</h3>
                  <p className="text-sm text-surface-300">{paidPhotoLimit} photo credits per paid category.</p>
                  <Button variant="primary" size="sm" icon={<ArrowRight className="h-4 w-4" />} onClick={goNext}>
                    Continue to Upload
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-base font-bold text-white">Choose Your Plan</h2>
                    <p className="text-xs text-surface-400 mt-0.5">{paidCategories.length} paid categor{paidCategories.length === 1 ? 'y' : 'ies'} selected. Pick a plan:</p>
                  </div>

                  {/* Tier selection */}
                  <div className="space-y-2">
                    {pricingTiers.filter(t => !t.is_bundle).map(tier => {
                      const isActive = selectedTierId === tier.id;
                      const total = Number(tier.price) * paidCategories.length;
                      return (
                        <button key={tier.id} type="button" onClick={() => setSelectedTierId(tier.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left cursor-pointer ${
                            isActive ? 'border-gold-500 bg-gold-500/10' : 'border-surface-700 hover:border-surface-500 bg-surface-800/50'
                          }`}>
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isActive ? 'border-gold-500' : 'border-surface-600'}`}>
                            {isActive && <div className="h-2.5 w-2.5 rounded-full bg-gold-500" />}
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-white">{tier.name}</span>
                            <span className="text-xs text-surface-400 ml-2">
                              {tier.photo_credits} photo{tier.photo_credits > 1 ? 's' : ''}/cat · €{tier.price}/cat × {paidCategories.length}
                            </span>
                          </div>
                          <span className="text-base font-bold text-white">€{total.toFixed(0)}</span>
                        </button>
                      );
                    })}
                    {pricingTiers.filter(t => t.is_bundle).map(tier => {
                      const isActive = selectedTierId === tier.id;
                      return (
                        <button key={tier.id} type="button" onClick={() => setSelectedTierId(tier.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left cursor-pointer ${
                            isActive ? 'border-emerald-500 bg-emerald-500/10' : 'border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5'
                          }`}>
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isActive ? 'border-emerald-500' : 'border-emerald-500/40'}`}>
                            {isActive && <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-sm font-semibold text-white">{tier.name}</span>
                            </div>
                            <span className="text-xs text-surface-400">{tier.photo_credits} photos · all paid categories</span>
                          </div>
                          <span className="text-base font-bold text-emerald-400">€{Number(tier.price).toFixed(0)}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Order summary + PayPal */}
                  {selectedTier && paymentAmount > 0 && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-surface-800 border border-surface-700">
                        <span className="text-sm text-surface-300">Total</span>
                        <span className="text-lg font-bold text-gold-400">€{paymentAmount.toFixed(2)}</span>
                      </div>

                      {paying ? (
                        <div className="flex flex-col items-center py-8 gap-2">
                          <div className="animate-spin h-6 w-6 border-2 border-gold-500 border-t-transparent rounded-full" />
                          <span className="text-sm text-surface-300">Processing payment...</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <PayPalButtons
                            style={{ layout: 'vertical', color: 'black', shape: 'pill', label: 'pay', height: 45 }}
                            fundingSource="card"
                            createOrder={async () => {
                              const { data, error } = await supabase.functions.invoke('create-paypal-order', {
                                body: { tierId: selectedTierId, editionId, categoryIds: paidCategories.map(c => c.id) },
                              });
                              if (error) { let msg = error.message; try { const body = await error.context?.json(); msg = body?.error || body?.details || msg; } catch {} throw new Error(msg); }
                              if (!data?.orderId) throw new Error(data?.error || 'Failed to create order');
                              return data.orderId;
                            }}
                            onApprove={async (data) => {
                              setPaying(true);
                              try {
                                const { data: res, error } = await supabase.functions.invoke('capture-paypal-order', {
                                  body: { orderId: data.orderID, userId: user!.id, tierId: selectedTierId, editionId },
                                });
                                if (error) throw new Error(error.message || 'Capture failed');
                                if (res?.success) {
                                  setPaymentComplete(true);
                                  setUserCredits({ photo_credits: selectedTier!.photo_credits, tier_id: selectedTierId, submissions_remaining: paidCategories.length });
                                  toast.success('Payment successful!');
                                } else throw new Error(res?.error || 'Capture failed');
                              } catch (err: any) { toast.error(err.message || 'Payment failed.'); }
                              finally { setPaying(false); }
                            }}
                            onError={() => toast.error('Card payment failed.')}
                            onCancel={() => toast('Payment cancelled.', { icon: '⚠️' })}
                          />
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-700" /></div>
                            <div className="relative flex justify-center"><span className="px-3 bg-surface-900 text-xs text-surface-500">or</span></div>
                          </div>
                          <PayPalButtons
                            style={{ layout: 'vertical', color: 'blue', shape: 'pill', label: 'paypal', height: 40 }}
                            fundingSource="paypal"
                            createOrder={async () => {
                              const { data, error } = await supabase.functions.invoke('create-paypal-order', {
                                body: { tierId: selectedTierId, editionId, categoryIds: paidCategories.map(c => c.id) },
                              });
                              if (error) { let msg = error.message; try { const body = await error.context?.json(); msg = body?.error || body?.details || msg; } catch {} throw new Error(msg); }
                              if (!data?.orderId) throw new Error(data?.error || 'Failed to create order');
                              return data.orderId;
                            }}
                            onApprove={async (data) => {
                              setPaying(true);
                              try {
                                const { data: res, error } = await supabase.functions.invoke('capture-paypal-order', {
                                  body: { orderId: data.orderID, userId: user!.id, tierId: selectedTierId, editionId },
                                });
                                if (error) throw new Error(error.message || 'Capture failed');
                                if (res?.success) {
                                  setPaymentComplete(true);
                                  setUserCredits({ photo_credits: selectedTier!.photo_credits, tier_id: selectedTierId, submissions_remaining: paidCategories.length });
                                  toast.success('Payment successful!');
                                } else throw new Error(res?.error || 'Capture failed');
                              } catch (err: any) { toast.error(err.message || 'Payment failed.'); }
                              finally { setPaying(false); }
                            }}
                            onError={() => toast.error('PayPal error.')}
                            onCancel={() => toast('Payment cancelled.', { icon: '⚠️' })}
                          />
                          <div className="flex items-center justify-center gap-1.5 text-[11px] text-surface-500">
                            <ShieldCheck className="h-3 w-3 text-emerald-400" />
                            <span>256-bit SSL encrypted · Secure checkout</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-start pt-2">
                    <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={goBack}>Back</Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ STEP 4: Upload Photos ═══ */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-white">Upload Your Photos</h2>
                <p className="text-xs text-surface-400 mt-0.5">JPG, PNG, or TIFF · up to 20 MB each</p>
              </div>

              {/* Category tabs */}
              <div className="flex flex-wrap gap-1.5">
                {selectedCategories.map((cat, idx) => {
                  const photos = getPhotosForCategory(cat.id);
                  const maxP = getMaxPhotos(cat);
                  const isActive = activeCategoryIdx === idx;
                  const isFull = photos.length >= maxP;
                  return (
                    <button key={cat.id} type="button" onClick={() => setActiveCategoryIdx(idx)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                        isActive ? 'bg-primary-500/15 text-primary-300 border-primary-500/40' : 'bg-surface-800 text-surface-400 border-transparent hover:border-surface-600'
                      }`}>
                      {cat.name}
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                        isFull ? 'bg-emerald-500/20 text-emerald-400' : photos.length > 0 ? 'bg-primary-500/20 text-primary-400' : 'bg-surface-700 text-surface-500'
                      }`}>{photos.length}/{maxP}</span>
                    </button>
                  );
                })}
              </div>

              {activeCategory && (
                <div>
                  {/* Upload zone */}
                  <div {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all ${
                      isDragActive ? 'border-primary-500 bg-primary-500/5' : currentPhotos.length >= currentMaxPhotos
                        ? 'border-surface-800 bg-surface-900/50 cursor-not-allowed' : 'border-surface-600 hover:border-primary-500/50 bg-surface-900 cursor-pointer'
                    }`}>
                    <input {...getInputProps()} />
                    <Upload className={`h-8 w-8 mx-auto mb-2 ${currentPhotos.length >= currentMaxPhotos ? 'text-surface-700' : 'text-surface-400'}`} />
                    {currentPhotos.length >= currentMaxPhotos ? (
                      <p className="text-sm text-surface-500">Max photos reached</p>
                    ) : isDragActive ? (
                      <p className="text-sm text-primary-400">Drop here!</p>
                    ) : (
                      <p className="text-sm text-surface-300">Click to choose or drag & drop</p>
                    )}
                  </div>

                  {/* Photo grid */}
                  {currentPhotos.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                      {currentPhotos.map(photo => (
                        <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-surface-800 border border-surface-700">
                          <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => removePhoto(activeCategory.id, photo.id)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-red-600 hover:bg-red-500 text-white cursor-pointer">
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
                  )}
                </div>
              )}

              {/* Upload checklist */}
              <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700 space-y-1.5">
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Checklist</p>
                {selectedCategories.map(cat => {
                  const photos = getPhotosForCategory(cat.id);
                  return (
                    <div key={cat.id} className="flex items-center gap-2 text-xs">
                      <div className={`h-4 w-4 rounded-full flex items-center justify-center ${photos.length > 0 ? 'bg-emerald-500 text-white' : 'bg-surface-700 text-surface-500'}`}>
                        {photos.length > 0 ? <Check className="h-2.5 w-2.5" /> : <span className="text-[9px]">–</span>}
                      </div>
                      <span className={photos.length > 0 ? 'text-white' : 'text-surface-400'}>{cat.name}</span>
                      <span className={`ml-auto ${photos.length > 0 ? 'text-emerald-400' : 'text-surface-500'}`}>{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={goBack}>Back</Button>
                <Button variant="primary" size="sm" icon={<ArrowRight className="h-4 w-4" />} onClick={goNext} disabled={!currentCatHasPhotos}>
                  {canProceedUpload ? 'Review' : shouldAdvanceCategory ? `Next: ${selectedCategories[nextEmptyCategoryIdx]?.name}` : 'Add photos'}
                </Button>
              </div>
            </div>
          )}

          {/* ═══ STEP 5: Review & Submit ═══ */}
          {step === 5 && !submitSuccess && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-white">Review & Submit</h2>
                <p className="text-xs text-surface-400 mt-0.5">Give your submission a title and review before submitting.</p>
              </div>

              <div className="space-y-3">
                <Input label="Title" placeholder="Give your submission a title" value={title} onChange={e => setTitle(e.target.value)} />
                <Textarea label="Description (optional)" placeholder="A brief statement about your work" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Summary</p>
                {selectedCategories.map(cat => {
                  const photos = getPhotosForCategory(cat.id);
                  return (
                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-surface-400" />
                        <span className="text-sm text-white">{cat.name}</span>
                        {cat.price > 0 ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold-500/10 text-gold-400">Paid</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Free</span>
                        )}
                      </div>
                      <span className="text-xs text-surface-300">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
                    </div>
                  );
                })}
                {hasPaidCategories && hasCredits && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" /> Payment confirmed — {paidPhotoLimit} photos per paid category
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={goBack}>Back</Button>
                <Button
                  variant="primary" size="sm"
                  icon={<ImageIcon className="h-4 w-4" />}
                  onClick={handleSubmit}
                  loading={loading}
                  disabled={!title.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25"
                >
                  Submit My Photos
                </Button>
              </div>
              {!title.trim() && (
                <p className="text-xs text-surface-400 text-center flex items-center justify-center gap-1">
                  <HelpCircle className="h-3 w-3" /> Enter a title above
                </p>
              )}
            </div>
          )}

          {/* ═══ Success State ═══ */}
          {submitSuccess && (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/10">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Submission Complete!</h3>
              <p className="text-sm text-surface-300">Your photos have been submitted. You can view and manage them in your dashboard.</p>
              <div className="flex justify-center gap-3">
                <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
                <Button variant="primary" size="sm" onClick={() => { onClose(); navigate('/dashboard/submissions'); }}>
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
