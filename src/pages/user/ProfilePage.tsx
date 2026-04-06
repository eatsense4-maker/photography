import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { motion } from 'framer-motion';
import { User, Camera, MapPin, Globe, Save, Upload, CreditCard, Download, CheckCircle, Clock, XCircle, RotateCcw } from 'lucide-react';
import { Button, Input, Textarea, Card, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

interface UserPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  paid_at: string | null;
  created_at: string;
  category: string;
  tier_name: string | null;
}

export default function ProfilePage() {
  const { t } = useTranslation();
  usePageTitle('Profile');
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [payments, setPayments] = useState<UserPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  // Load current profile
  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || '');
          setBio(data.bio || '');
          setCountry(data.country || '');
          setWebsite(data.website || '');
          setInstagram(data.instagram || '');
          if (data.avatar_url) setAvatarPreview(data.avatar_url);
        }
        setFetching(false);
      });
  }, [user?.id]);

  // Fetch user payments
  useEffect(() => {
    if (!user?.id) return;

    const fetchPayments = async () => {
      const { data } = await supabase
        .from('payments')
        .select(`
          id, amount, currency, status, paypal_order_id, paypal_capture_id, paid_at, created_at,
          submissions!payments_submission_id_fkey(
            categories!submissions_category_id_fkey(name)
          ),
          pricing_tiers!payments_tier_id_fkey(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setPayments(data.map((p: any) => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          paypal_order_id: p.paypal_order_id,
          paypal_capture_id: p.paypal_capture_id,
          paid_at: p.paid_at,
          created_at: p.created_at,
          category: p.submissions?.categories?.name || '—',
          tier_name: p.pricing_tiers?.name || null,
        })));
      }
      setPaymentsLoading(false);
    };

    fetchPayments();
  }, [user?.id]);

  const downloadReceipt = (payment: UserPayment) => {
    const date = payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('en-GB') : new Date(payment.created_at).toLocaleDateString('en-GB');
    const lines = [
      '═══════════════════════════════════════',
      '           FOKUS AWARD — RECEIPT',
      '═══════════════════════════════════════',
      '',
      `Date:            ${date}`,
      `Receipt ID:      ${payment.id.slice(0, 8).toUpperCase()}`,
      `Status:          ${payment.status.toUpperCase()}`,
      '',
      '───────────────────────────────────────',
      '  DETAILS',
      '───────────────────────────────────────',
      '',
      `Category:        ${payment.category}`,
      ...(payment.tier_name ? [`Tier:            ${payment.tier_name}`] : []),
      `Amount:          €${Number(payment.amount).toFixed(2)}`,
      '',
      '───────────────────────────────────────',
      '  PAYMENT INFO',
      '───────────────────────────────────────',
      '',
      `PayPal Order:    ${payment.paypal_order_id || '—'}`,
      `Capture ID:      ${payment.paypal_capture_id || '—'}`,
      `Paid by:         ${fullName || 'N/A'}`,
      '',
      '═══════════════════════════════════════',
      '  Thank you for your participation!',
      '  FOKUS Award Photography Competition',
      '═══════════════════════════════════════',
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fokus-receipt-${payment.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
      // TODO: upload avatar to R2 and save URL
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          bio: bio || null,
          country: country || null,
          website: website || null,
          instagram: instagram || null,
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success(t('common.saved'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">
          {t('user.profile')}
        </h1>
        <p className="text-surface-400 text-sm mt-1">Manage your profile and preferences</p>
      </div>

      {/* Avatar Section */}
      <Card className="p-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-surface-800 flex items-center justify-center overflow-hidden border-2 border-surface-700">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-surface-500" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary-500 text-white cursor-pointer hover:bg-primary-600 transition-colors">
              <Upload className="h-3.5 w-3.5" />
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </label>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{fullName || 'Your Name'}</h3>
            <p className="text-sm text-surface-400">{country || 'Country not set'}</p>
          </div>
        </div>
      </Card>

      {/* Personal Info */}
      <Card className="p-6 space-y-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <User className="h-5 w-5 text-primary-500" />
          Personal Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Input
            label={t('auth.full_name')}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
          />
          <Input
            label={t('auth.country')}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Albania"
            icon={<MapPin className="h-4 w-4" />}
          />
        </div>
        <Textarea
          label="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself..."
          rows={3}
        />
      </Card>

      {/* Links */}
      <Card className="p-6 space-y-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary-500" />
          Links
        </h2>
        <Input
          label="Website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://yourwebsite.com"
          icon={<Globe className="h-4 w-4" />}
        />
        <Input
          label="Instagram"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="@username"
          icon={<Camera className="h-4 w-4" />}
        />
      </Card>

      {/* Payments */}
      <Card className="p-6 space-y-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary-500" />
          Payment History
        </h2>

        {paymentsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
          </div>
        ) : payments.length === 0 ? (
          <p className="text-surface-400 text-sm text-center py-8">No payments yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-surface-400 border-b border-surface-800">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {payments.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="text-surface-300 hover:bg-surface-800/50 transition-colors"
                  >
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {(p.paid_at || p.created_at).slice(0, 10)}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="text-white">{p.tier_name || 'Submission'}</div>
                      <div className="text-xs text-surface-500">{p.category}</div>
                    </td>
                    <td className="py-3 pr-4 font-medium text-white">
                      €{Number(p.amount).toFixed(2)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={
                          p.status === 'completed' ? 'success' :
                          p.status === 'pending' ? 'warning' :
                          p.status === 'refunded' ? 'info' : 'danger'
                        }
                      >
                        <span className="flex items-center gap-1">
                          {p.status === 'completed' && <CheckCircle className="h-3 w-3" />}
                          {p.status === 'pending' && <Clock className="h-3 w-3" />}
                          {p.status === 'refunded' && <RotateCcw className="h-3 w-3" />}
                          {p.status === 'failed' && <XCircle className="h-3 w-3" />}
                          {p.status}
                        </span>
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      {p.status === 'completed' && (
                        <button
                          onClick={() => downloadReceipt(p)}
                          className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors text-xs"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Save */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-end"
      >
        <Button
          variant="primary"
          icon={<Save className="h-4 w-4" />}
          loading={loading}
          onClick={handleSave}
        >
          {t('common.save')}
        </Button>
      </motion.div>
    </div>
  );
}
