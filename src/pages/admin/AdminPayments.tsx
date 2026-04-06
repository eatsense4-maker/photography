import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Download,
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { Button, Card, Badge, Input, Select, StatsCard } from '@/components/ui';
import { supabase } from '@/lib/supabase';

interface PaymentRow {
  id: string;
  userName: string;
  category: string;
  amount: number;
  currency: string;
  status: string;
  paypalOrderId: string;
  paidAt: string;
}

export default function AdminPayments() {
  const { t } = useTranslation();
  usePageTitle('Payments');
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchPayments = async () => {
      const { data } = await supabase
        .from('payments')
        .select(`
          id, amount, currency, status, paypal_order_id, paid_at, created_at,
          profiles!payments_user_id_fkey(full_name),
          submissions!payments_submission_id_fkey(
            categories!submissions_category_id_fkey(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (data) {
        setPayments(
          data.map((p: any) => ({
            id: p.id,
            userName: p.profiles?.full_name || 'Unknown',
            category: p.submissions?.categories?.name || '—',
            amount: Number(p.amount),
            currency: p.currency || 'EUR',
            status: p.status,
            paypalOrderId: p.paypal_order_id || '',
            paidAt: (p.paid_at || p.created_at || '').slice(0, 10),
          }))
        );
      }
      setLoading(false);
    };
    fetchPayments();
  }, []);

  const totalRevenue = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);
  const completedCount = payments.filter((p) => p.status === 'completed').length;
  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const refundedCount = payments.filter((p) => p.status === 'refunded').length;

  const statusIcons: Record<string, React.ReactNode> = {
    completed: <CheckCircle className="h-4 w-4 text-green-400" />,
    pending: <Clock className="h-4 w-4 text-yellow-400" />,
    refunded: <RefreshCw className="h-4 w-4 text-blue-400" />,
    failed: <XCircle className="h-4 w-4 text-red-400" />,
  };

  const statusBadge: Record<string, string> = {
    completed: 'success',
    pending: 'warning',
    refunded: 'primary',
    failed: 'danger',
  };

  const filtered = payments.filter((p) => {
    const matchSearch =
      p.userName.toLowerCase().includes(search.toLowerCase()) ||
      p.paypalOrderId.includes(search);
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            {t('admin.payments')}
          </h1>
          <p className="text-surface-400 text-sm mt-1">Track and manage all payments</p>
        </div>
        <Button variant="secondary" icon={<Download className="h-4 w-4" />}>
          Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard label="Total Revenue" value={`€${totalRevenue}`} icon={<DollarSign className="h-5 w-5" />} />
        <StatsCard label="Completed" value={completedCount} icon={<CheckCircle className="h-5 w-5" />} />
        <StatsCard label="Pending" value={pendingCount} icon={<Clock className="h-5 w-5" />} />
        <StatsCard label="Refunded" value={refundedCount} icon={<RefreshCw className="h-5 w-5" />} />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name or PayPal ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          <Select
            options={[
              { value: 'completed', label: 'Completed' },
              { value: 'pending', label: 'Pending' },
              { value: 'refunded', label: 'Refunded' },
              { value: 'failed', label: 'Failed' },
            ]}
            placeholder="All statuses"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </Card>

      {/* Payments Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-4">User</th>
                  <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-4">Category</th>
                  <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-4">Amount</th>
                  <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-4">PayPal ID</th>
                  <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((payment, i) => (
                  <motion.tr
                    key={payment.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-white">{payment.userName}</td>
                    <td className="px-6 py-4 text-sm text-surface-300">{payment.category}</td>
                    <td className="px-6 py-4 text-sm text-white font-medium">
                      €{payment.amount}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {statusIcons[payment.status]}
                        <Badge variant={(statusBadge[payment.status] || 'secondary') as 'success' | 'warning' | 'primary' | 'danger'}>
                          {payment.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-surface-500 font-mono">
                      {payment.paypalOrderId || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-surface-400">{payment.paidAt}</td>
                  </motion.tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-surface-500">No payments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
