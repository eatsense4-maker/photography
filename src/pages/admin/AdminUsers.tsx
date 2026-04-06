import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { motion } from 'framer-motion';
import { Search, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Card, Badge, Input, Select, Modal, SkeletonTable } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface ManagedUser {
  id: string;
  full_name: string;
  email: string;
  role: 'user' | 'jury' | 'admin';
  country: string | null;
  created_at: string;
}

export default function AdminUsers() {
  const { t } = useTranslation();
  usePageTitle('Users');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [roleModal, setRoleModal] = useState<{ user: ManagedUser; newRole: string } | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, country, created_at')
      .order('created_at', { ascending: false });
    setUsers((data as ManagedUser[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const roleColors: Record<string, string> = {
    user: 'secondary',
    jury: 'warning',
    admin: 'danger',
  };

  const filtered = users.filter((u) => {
    const matchSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleRoleChange = async () => {
    if (!roleModal) return;
    const { error } = await supabase
      .from('profiles')
      .update({ role: roleModal.newRole })
      .eq('id', roleModal.user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${roleModal.user.full_name} is now ${roleModal.newRole}`);
    setRoleModal(null);
    fetchUsers();
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">{t('admin.users')}</h1>
        </div>
        <Card className="p-4"><SkeletonTable rows={8} cols={5} /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">
          {t('admin.users')}
        </h1>
        <p className="text-surface-400 text-sm mt-1">{users.length} registered users</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          <Select
            options={[
              { value: 'user', label: 'Users' },
              { value: 'jury', label: 'Jury' },
              { value: 'admin', label: 'Admins' },
            ]}
            placeholder="All roles"
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          />
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-4">User</th>
                <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-4">Role</th>
                <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-4">Country</th>
                <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-4">Joined</th>
                <th className="text-right text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((user, i) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-white">{user.full_name}</p>
                      <p className="text-xs text-surface-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={roleColors[user.role] as 'secondary' | 'warning' | 'danger'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-300">{user.country || '—'}</td>
                  <td className="px-6 py-4 text-sm text-surface-400">
                    {user.created_at?.slice(0, 10)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Select
                        options={[
                          { value: 'user', label: 'User' },
                          { value: 'jury', label: 'Jury' },
                          { value: 'admin', label: 'Admin' },
                        ]}
                        value={user.role}
                        onChange={(e) =>
                          setRoleModal({ user, newRole: e.target.value })
                        }
                      />
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-surface-500">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-surface-400">
            {t('common.showing_range', { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, filtered.length), total: filtered.length })}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} icon={<ChevronLeft className="h-4 w-4" />}>
              {t('common.previous')}
            </Button>
            <span className="text-sm text-surface-300 tabular-nums">
              {t('common.page_of', { page, totalPages })}
            </span>
            <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              {t('common.next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Role Change Confirm */}
      <Modal isOpen={!!roleModal} onClose={() => setRoleModal(null)} title="Change User Role">
        <p className="text-surface-300 mb-1">
          Change <span className="text-white font-medium">{roleModal?.user.full_name}</span>'s
          role to <Badge variant="primary">{roleModal?.newRole}</Badge>?
        </p>
        <p className="text-xs text-surface-500 mb-6">
          This will immediately update their permissions and dashboard access.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setRoleModal(null)}>Cancel</Button>
          <Button variant="primary" icon={<Shield className="h-4 w-4" />} onClick={handleRoleChange}>
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
}
