import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { PayPalButtons } from '@paypal/react-paypal-js';
import PayPalProvider from '@/components/PayPalProvider';
import {
  ArrowRight, ArrowLeft, X, Upload, Check, Camera,
  ShieldCheck, Calendar, Award, Wind, Eye, Leaf, Film,
  Image as ImageIcon, HelpCircle,
} from 'lucide-react';
import { Button, Input, Textarea } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { uploadPhoto } from '@/lib/r2';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores';
import toast from 'react-hot-toast';
import type { PricingTier, Category } from '@/types';

/* -- Hardcoded theme data (compressed from ThemePage) -- */
const THEME_DIRECTIONS = [
  { icon: <Eye className="h-4 w-4" />, title: 'Intimate Breath', desc: 'The body, vulnerability, presence' },
  { icon: <Wind className="h-4 w-4" />, title: 'Invisible Traces', desc: 'Pollution, ecology, absence of air' },
  { icon: <Film className="h-4 w-4" />, title: 'Animated Memory', desc: 'Archives, breath of the past' },
  { icon: <Leaf className="h-4 w-4" />, title: 'Air as Commons', desc: 'Politics, shared space, public breath' },
  { icon: <Camera className="h-4 w-4" />, title: 'The Living Image', desc: 'Photography as breathing' },
];

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

/* -------------------------------------------------- */
export default function CompetitionModal({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signIn, signUp, signInWithGoogle } = useAuth();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // -- Modal step: 0=info, 1=auth, 2=category, 3=payment, 4=upload, 5=review --
  const [step, setStep] = useState(0);

  // -- Auth state --
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('signup');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');

  // -- Submission state - single category --
  const [editionId, setEditionId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [selectedTierId, setSelectedTierId] = useState('');
  const [userCredits, setUserCredits] = useState<{ photo_credits: number; photo_credits_used: number; tier_id: string | null } | null>(null);
  const [submittedByCategory, setSubmittedByCategory] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // -- Derived --
  const selectedCategory = useMemo(() => categories.find(c => c.id === selectedCategoryId) || null, [categories, selectedCategoryId]);
  const isPaid = selectedCategory ? selectedCategory.price > 0 : false;
  const hasCredits = !!userCredits || paymentComplete;
  const needsPayment = isPaid && !hasCredits;
  const selectedTier = useMemo(() => pricingTiers.find(t => t.id === selectedTierId) || null, [pricingTiers, selectedTierId]);
  const paymentAmount = useMemo(() => selectedTier ? Number(selectedTier.price) : 0, [selectedTier]);
  const paidPhotoLimit = useMemo(() => {
    if (userCredits) return Math.max(userCredits.photo_credits - userCredits.photo_credits_used, 0);
    return selectedTier?.photo_credits ?? 0;
  }, [userCredits, selectedTier]);
  const maxPhotos = selectedCategory ? (isPaid ? Math.min(selectedCategory.max_photos, paidPhotoLimit || selectedCategory.max_photos) : selectedCategory.max_photos) : 0;
  const hasPhotos = photos.length > 0;

  // -- Fetch edition + categories + tiers --
  useEffect(() => {
    if (!isOpen) return;
    supabase.from('editions').select('id, title, year').eq('status', 'open').eq('published', true).order('year', { ascending: false }).limit(1).single()
      .then(({ data }) => { if (data) setEditionId(data.id); });
  }, [isOpen]);

  useEffect(() => {
    if (!editionId) return;
    supabase.from('categories').select('*').eq('edition_id', editionId).eq('is_active', true).or(`submission_deadline.is.null,submission_deadline.gt.${new Date().toISOString()}`).order('sort_order').then(({ data }) => setCategories(data || []));
  }, [editionId]);

  useEffect(() => {
    if (!editionId) { setPricingTiers([]); return; }
    let q = supabase.from('pricing_tiers').select('*').eq('edition_id', editionId).eq('is_bundle', false);
    q = selectedCategoryId
      ? q.or(`category_id.is.null,category_id.eq.${selectedCategoryId}`)
      : q.is('category_id', null);
    q.order('sort_order').then(({ data }) => setPricingTiers(data || []));
  }, [editionId, selectedCategoryId]);

  useEffect(() => {
    if (!editionId || !user?.id || !selectedCategoryId) { setUserCredits(null); return; }
    supabase.from('user_credits')
      .select('photo_credits, photo_credits_used, tier_id')
      .eq('user_id', user.id)
      .eq('edition_id', editionId)
      .eq('category_id', selectedCategoryId)
      .maybeSingle()
      .then(({ data }) => setUserCredits(data || null));
  }, [editionId, user?.id, selectedCategoryId, paymentComplete]);

  useEffect(() => {
    if (!editionId || !user?.id) { setSubmittedByCategory({}); return; }
    supabase.from('submissions')
      .select('id, category_id, status')
      .eq('user_id', user.id)
      .eq('edition_id', editionId)
      .neq('status', 'draft')
      .then(({ data }) => {
        const map: Record<string, string> = {};
        for (const row of data || []) { map[(row as any).category_id] = (row as any).id; }
        setSubmittedByCategory(map);
      });
  }, [editionId, user?.id]);

  // Auto-skip auth step if already logged in
  useEffect(() => {
    if (step === 1 && isAuthenticated) setStep(2);
  }, [step, isAuthenticated]);

  // -- Auth handlers --
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
    if (password.length < 8) { setAuthError('Password must be at least 8 characters'); return; }
    if (!fullName.trim()) { setAuthError('Please enter your full name'); return; }
    setAuthLoading(true);
    try {
      await signUp(email, password, fullName, country || undefined);
      try {
        await signIn(email, password);
        setStep(2);
      } catch (signInErr: any) {
        const msg = String(signInErr?.message || '').toLowerCase();
        if (msg.includes('not confirmed') || msg.includes('email not confirmed')) {
          setAuthError('We sent a verification email. Please confirm your address, then sign in to continue.');
          setAuthTab('login');
        } else {
          throw signInErr;
        }
      }
    } catch (err: any) { setAuthError(err.message || 'Sign up failed'); }
    finally { setAuthLoading(false); }
  };

  // -- Category select (single) --
  const selectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    setPhotos([]);
  };

  // -- Photos management --
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!selectedCategory) return;
    const remaining = maxPhotos - photos.length;
    const filesToAdd = acceptedFiles.slice(0, remaining);
    const newPhotos: UploadedPhoto[] = filesToAdd.map(file => ({
      id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), progress: 0, uploaded: false,
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
  }, [selectedCategory, photos.length, maxPhotos]);

  const removePhoto = (photoId: string) => {
    setPhotos(prev => {
      const p = prev.find(x => x.id === photoId);
      if (p) URL.revokeObjectURL(p.preview);
      return prev.filter(x => x.id !== photoId);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/tiff': ['.tif', '.tiff'] },
    maxSize: 20 * 1024 * 1024,
    disabled: !selectedCategory || photos.length >= maxPhotos,
  });

  // -- Submit --
  const handleSubmit = async () => {
    if (!user?.id || !selectedCategory || photos.length === 0) return;
    if (submittedByCategory[selectedCategory.id]) {
      toast.error('You already have a submission for this category. Only one entry per category is allowed.');
      return;
    }
    if (isPaid && (!userCredits || userCredits.photo_credits - userCredits.photo_credits_used < photos.length)) {
      toast.error('Not enough photo credits for this category.');
      return;
    }
    setLoading(true);
    try {
      const status = isPaid && !hasCredits ? 'draft' : 'submitted';
      const { data: submission, error: subError } = await supabase.from('submissions').insert({
        user_id: user.id, edition_id: editionId, category_id: selectedCategory.id,
        title: title || null, description: description || null, status,
        submitted_at: status === 'submitted' ? new Date().toISOString() : null,
      }).select('id').single();
      if (subError) throw subError;

      setUploadProgress({ current: 0, total: photos.length });
      for (let i = 0; i < photos.length; i++) {
        setUploadProgress({ current: i + 1, total: photos.length });
        const photo = photos[i];
        try {
          const { key } = await uploadPhoto(photo.file, (progress) => {
            setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, progress } : p));
          });
          await supabase.from('submission_photos').insert({
            submission_id: submission.id, storage_key: key, original_filename: photo.file.name,
            mime_type: photo.file.type, file_size: photo.file.size, sort_order: i,
          });
          setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, uploaded: true, storageKey: key } : p));
        } catch (uploadErr) {
          console.error('Photo upload failed:', uploadErr);
          toast.error(`Failed to upload ${photo.file.name}`);
        }
      }

      if (isPaid && status === 'submitted') {
        const { data: refreshed } = await supabase
          .from('user_credits')
          .select('photo_credits, photo_credits_used, tier_id')
          .eq('user_id', user.id)
          .eq('edition_id', editionId)
          .eq('category_id', selectedCategory.id)
          .maybeSingle();
        setUserCredits(refreshed || null);
      }
      setSubmitSuccess(true);
      toast.success('Submission successful!');
    } catch (err: any) { toast.error(err.message || 'Failed to submit'); }
    finally { setLoading(false); setUploadProgress(null); }
  };

  // -- Step navigation --
  const goNext = () => {
    if (step === 0) { setStep(isAuthenticated ? 2 : 1); }
    else if (step === 2 && needsPayment) { setStep(3); }
    else if (step === 2) { setStep(4); }
    else if (step === 3) { setStep(4); }
    else if (step === 4) { setStep(5); }
  };

  const goBack = () => {
    if (step === 5) setStep(4);
    else if (step === 4) setStep(2);
    else if (step === 3) setStep(2);
    else if (step === 2) setStep(0);
    else if (step === 1) setStep(0);
  };

  // -- Pipeline labels --
  const pipelineSteps = isAuthenticated
    ? ['Info', 'Category', needsPayment ? 'Payment' : null, 'Upload', 'Review'].filter(Boolean) as string[]
    : ['Info', 'Account', 'Category', needsPayment ? 'Payment' : null, 'Upload', 'Review'].filter(Boolean) as string[];

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

  return (
    <PayPalProvider>
    <div className="public-invert fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
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
          <button onClick={onClose} aria-label="Close" className="text-surface-400 hover:text-white transition-colors cursor-pointer p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pipeline indicator */}
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

        {/* Content -- scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* === STEP 0: Theme Info === */}
          {step === 0 && (
            <div className="space-y-5">
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

              {/* Category cards preview */}
              {categories.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2">Competition Categories</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categories.map((cat, i) => {
                      const accent = CAT_ACCENTS[i % CAT_ACCENTS.length];
                      return (
                        <div key={cat.id} className={`rounded-lg border ${accent.border} bg-surface-800/40 overflow-hidden`}>
                          {cat.image_url && (
                            <div className="h-20 overflow-hidden">
                              <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="p-2.5">
                            <p className="text-xs font-semibold text-white leading-tight">{cat.name}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] text-surface-500">Max {cat.max_photos}</span>
                              {cat.price > 0 ? (
                                <span className={`text-[10px] font-bold ${accent.text}`}>€{Number(cat.price).toFixed(0)}</span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-400">Free</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-surface-800/50 border border-surface-700/50 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-surface-300">Quick Rules</p>
                <ul className="text-[11px] text-surface-400 space-y-1 list-disc list-inside">
                  <li>Photos taken between 2022–2026</li>
                  <li>JPG, PNG, or TIFF - max 20 MB each</li>
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

          {/* === STEP 1: Auth === */}
          {step === 1 && !isAuthenticated && (
            <div className="max-w-sm mx-auto space-y-5">
              <div className="text-center">
                <h2 className="text-lg font-bold text-white">Create an Account or Log In</h2>
                <p className="text-sm text-surface-400 mt-1">To submit your photos, you need an account.</p>
              </div>

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
                Back to info
              </button>
            </div>
          )}

          {/* === STEP 2: Category Selection - Card Grid === */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-white">Choose a Category</h2>
                <p className="text-xs text-surface-400 mt-0.5">Select one category to enter. You can submit to other categories separately.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.map((cat, i) => {
                  const isSelected = selectedCategoryId === cat.id;
                  const accent = CAT_ACCENTS[i % CAT_ACCENTS.length];
                  const alreadySubmitted = !!submittedByCategory[cat.id];
                  return (
                    <button key={cat.id} type="button"
                      onClick={() => !alreadySubmitted && selectCategory(cat.id)}
                      disabled={alreadySubmitted}
                      className={`group relative rounded-xl overflow-hidden text-left transition-all border-2 ${
                        alreadySubmitted
                          ? 'border-surface-800 opacity-50 cursor-not-allowed'
                          : isSelected
                            ? `${accent.border} ring-1 ring-white/20 cursor-pointer`
                            : 'border-surface-700 hover:border-surface-500 cursor-pointer'
                      }`}>
                      {/* Image */}
                      <div className="h-28 sm:h-32 bg-surface-800 overflow-hidden relative">
                        {cat.image_url ? (
                          <img src={cat.image_url} alt={cat.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-surface-800 to-surface-900 flex items-center justify-center">
                            <Camera className="h-8 w-8 text-surface-700" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/40 to-transparent" />
                        {alreadySubmitted ? (
                          <div className="absolute top-2 right-2 h-6 px-2 rounded-full bg-emerald-500 flex items-center gap-1">
                            <Check className="h-3 w-3 text-white" />
                            <span className="text-[10px] font-semibold text-white">Submitted</span>
                          </div>
                        ) : isSelected && (
                          <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary-500 flex items-center justify-center">
                            <Check className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}
                        {/* Price badge */}
                        <div className="absolute top-2 left-2">
                          {cat.price > 0 ? (
                            <span className="text-[10px] font-bold text-gold-400 bg-surface-950/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
                              €{Number(cat.price).toFixed(0)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-400 bg-surface-950/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
                              Free
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Content */}
                      <div className="p-3 bg-surface-900">
                        <p className="text-sm font-semibold text-white leading-tight">{cat.name}</p>
                        {cat.description && <p className="text-[11px] text-surface-400 line-clamp-2 mt-1">{cat.description}</p>}
                        <p className="text-[10px] text-surface-500 mt-1.5">Max {cat.max_photos} photo{cat.max_photos > 1 ? 's' : ''}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedCategory && (
                <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700 text-sm text-white flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>{selectedCategory.name}</span>
                  {isPaid && <span className="text-gold-400 text-xs">· €{Number(selectedCategory.price).toFixed(0)}</span>}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={goBack}>Back</Button>
                <Button variant="primary" size="sm" icon={<ArrowRight className="h-4 w-4" />} onClick={goNext} disabled={!selectedCategoryId}>
                  {needsPayment ? 'Choose Plan' : 'Upload Photos'}
                </Button>
              </div>
            </div>
          )}

          {/* === STEP 3: Payment === */}
          {step === 3 && (
            <div className="space-y-4">
              {paymentComplete ? (
                <div className="text-center py-6 space-y-3">
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-emerald-500/10">
                    <Check className="h-7 w-7 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Payment Confirmed!</h3>
                  <p className="text-sm text-surface-300">{paidPhotoLimit} photo credits for {selectedCategory?.name}.</p>
                  <Button variant="primary" size="sm" icon={<ArrowRight className="h-4 w-4" />} onClick={goNext}>
                    Continue to Upload
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-base font-bold text-white">Choose Your Plan</h2>
                    <p className="text-xs text-surface-400 mt-0.5">Select how many photos you want to upload for {selectedCategory?.name}.</p>
                  </div>

                  <div className="space-y-2">
                    {pricingTiers.map(tier => {
                      const isActive = selectedTierId === tier.id;
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
                              {tier.photo_credits} photo{tier.photo_credits > 1 ? 's' : ''}
                            </span>
                          </div>
                          <span className="text-base font-bold text-white">€{Number(tier.price).toFixed(0)}</span>
                        </button>
                      );
                    })}
                  </div>

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
                                body: { tierId: selectedTierId, editionId, categoryIds: [selectedCategory!.id] },
                              });
                              if (error) { let msg = error.message; try { const body = await error.context?.json(); msg = body?.error || body?.details || msg; } catch {} throw new Error(msg); }
                              if (!data?.orderId) throw new Error(data?.error || 'Failed to create order');
                              return data.orderId;
                            }}
                            onApprove={async (data) => {
                              setPaying(true);
                              try {
                                const { data: res, error } = await supabase.functions.invoke('capture-paypal-order', {
                                  body: { orderId: data.orderID, userId: user!.id, tierId: selectedTierId, editionId, categoryIds: [selectedCategory!.id] },
                                });
                                if (error) throw new Error(error.message || 'Capture failed');
                                if (res?.success) {
                                  setPaymentComplete(true);
                                  const { data: refreshed } = await supabase
                                    .from('user_credits')
                                    .select('photo_credits, photo_credits_used, tier_id')
                                    .eq('user_id', user!.id)
                                    .eq('edition_id', editionId)
                                    .eq('category_id', selectedCategory!.id)
                                    .maybeSingle();
                                  setUserCredits(refreshed || null);
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
                                body: { tierId: selectedTierId, editionId, categoryIds: [selectedCategory!.id] },
                              });
                              if (error) { let msg = error.message; try { const body = await error.context?.json(); msg = body?.error || body?.details || msg; } catch {} throw new Error(msg); }
                              if (!data?.orderId) throw new Error(data?.error || 'Failed to create order');
                              return data.orderId;
                            }}
                            onApprove={async (data) => {
                              setPaying(true);
                              try {
                                const { data: res, error } = await supabase.functions.invoke('capture-paypal-order', {
                                  body: { orderId: data.orderID, userId: user!.id, tierId: selectedTierId, editionId, categoryIds: [selectedCategory!.id] },
                                });
                                if (error) throw new Error(error.message || 'Capture failed');
                                if (res?.success) {
                                  setPaymentComplete(true);
                                  const { data: refreshed } = await supabase
                                    .from('user_credits')
                                    .select('photo_credits, photo_credits_used, tier_id')
                                    .eq('user_id', user!.id)
                                    .eq('edition_id', editionId)
                                    .eq('category_id', selectedCategory!.id)
                                    .maybeSingle();
                                  setUserCredits(refreshed || null);
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
                            <span>256-bit SSL encrypted - Secure checkout</span>
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

          {/* === STEP 4: Upload Photos === */}
          {step === 4 && selectedCategory && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-white">Upload Photos - {selectedCategory.name}</h2>
                <p className="text-xs text-surface-400 mt-0.5">
                  {photos.length}/{maxPhotos} photos - JPG, PNG, or TIFF - up to 20 MB each
                </p>
              </div>

              {/* Upload zone */}
              <div {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all ${
                  isDragActive ? 'border-primary-500 bg-primary-500/5' : photos.length >= maxPhotos
                    ? 'border-surface-800 bg-surface-900/50 cursor-not-allowed' : 'border-surface-600 hover:border-primary-500/50 bg-surface-900 cursor-pointer'
                }`}>
                <input {...getInputProps()} />
                <Upload className={`h-8 w-8 mx-auto mb-2 ${photos.length >= maxPhotos ? 'text-surface-700' : 'text-surface-400'}`} />
                {photos.length >= maxPhotos ? (
                  <p className="text-sm text-surface-500">Max photos reached</p>
                ) : isDragActive ? (
                  <p className="text-sm text-primary-400">Drop here!</p>
                ) : (
                  <p className="text-sm text-surface-300">Click to choose or drag & drop</p>
                )}
              </div>

              {/* Photo grid */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {photos.map(photo => (
                    <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-surface-800 border border-surface-700">
                      <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(photo.id)}
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

              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={goBack}>Back</Button>
                <Button variant="primary" size="sm" icon={<ArrowRight className="h-4 w-4" />} onClick={goNext} disabled={!hasPhotos}>
                  Review
                </Button>
              </div>
            </div>
          )}

          {/* === STEP 5: Review & Submit === */}
          {step === 5 && !submitSuccess && selectedCategory && (
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
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-surface-400" />
                    <span className="text-sm text-white">{selectedCategory.name}</span>
                    {isPaid ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold-500/10 text-gold-400">Paid</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Free</span>
                    )}
                  </div>
                  <span className="text-xs text-surface-300">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
                </div>
                {isPaid && hasCredits && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" /> Payment confirmed - {paidPhotoLimit} photo credits
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
              {uploadProgress && (
                <div className="text-center space-y-2 pt-1">
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
              {!title.trim() && (
                <p className="text-xs text-surface-400 text-center flex items-center justify-center gap-1">
                  <HelpCircle className="h-3 w-3" /> Enter a title above
                </p>
              )}
            </div>
          )}

          {/* === Success State === */}
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
    </PayPalProvider>
  );
}

