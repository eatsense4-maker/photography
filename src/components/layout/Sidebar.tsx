import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Image,
  PlusCircle,
  Award,
  User,
  Bell,
  // Jury
  ClipboardCheck,
  Star,
  // Admin
  Calendar,
  FolderOpen,
  Users,
  UserCheck,
  CreditCard,
  Trophy,
  Handshake,
  Newspaper,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores';

interface SidebarLink {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export default function Sidebar() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { sidebarOpen } = useUIStore();
  const location = useLocation();

  if (!user) return null;

  const userLinks: SidebarLink[] = [
    { path: '/dashboard', label: t('user.dashboard'), icon: <LayoutDashboard className="h-5 w-5" /> },
    { path: '/dashboard/submissions', label: t('user.submissions'), icon: <Image className="h-5 w-5" /> },
    { path: '/dashboard/submissions/new', label: t('user.new_submission'), icon: <PlusCircle className="h-5 w-5" /> },
    { path: '/dashboard/certificates', label: t('user.certificates'), icon: <Award className="h-5 w-5" /> },
    { path: '/dashboard/profile', label: t('nav.profile'), icon: <User className="h-5 w-5" /> },
    { path: '/dashboard/notifications', label: t('common.notifications'), icon: <Bell className="h-5 w-5" /> },
  ];

  const juryLinks: SidebarLink[] = [
    { path: '/jury', label: t('jury.dashboard'), icon: <LayoutDashboard className="h-5 w-5" /> },
    { path: '/jury/review', label: t('jury.phase_shortlist'), icon: <ClipboardCheck className="h-5 w-5" /> },
    { path: '/jury/ranking', label: t('jury.phase_final'), icon: <Star className="h-5 w-5" /> },
    { path: '/dashboard/profile', label: t('nav.profile'), icon: <User className="h-5 w-5" /> },
    { path: '/dashboard/notifications', label: t('common.notifications'), icon: <Bell className="h-5 w-5" /> },
  ];

  const adminLinks: SidebarLink[] = [
    { path: '/admin', label: t('admin.dashboard'), icon: <LayoutDashboard className="h-5 w-5" /> },
    { path: '/admin/editions', label: t('admin.editions'), icon: <Calendar className="h-5 w-5" /> },
    { path: '/admin/categories', label: t('admin.categories'), icon: <FolderOpen className="h-5 w-5" /> },
    { path: '/admin/submissions', label: t('admin.submissions'), icon: <Image className="h-5 w-5" /> },
    { path: '/admin/users', label: t('admin.users'), icon: <Users className="h-5 w-5" /> },
    { path: '/admin/jury', label: t('admin.jury_management'), icon: <UserCheck className="h-5 w-5" /> },
    { path: '/admin/payments', label: t('admin.payments'), icon: <CreditCard className="h-5 w-5" /> },
    { path: '/admin/results', label: t('admin.results'), icon: <Trophy className="h-5 w-5" /> },
    { path: '/admin/partners', label: t('admin.partners'), icon: <Handshake className="h-5 w-5" /> },
    { path: '/admin/posts', label: 'News & Events', icon: <Newspaper className="h-5 w-5" /> },
  ];

  const links =
    user.role === 'admin'
      ? adminLinks
      : user.role === 'jury'
      ? juryLinks
      : userLinks;

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 260 : 72 }}
      className="fixed left-0 top-16 bottom-0 z-40 bg-surface-950 border-r border-surface-800 flex flex-col overflow-x-hidden"
    >
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive =
            location.pathname === link.path ||
            (link.path !== '/dashboard' &&
              link.path !== '/jury' &&
              link.path !== '/admin' &&
              location.pathname.startsWith(link.path));

          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-primary-600/10 text-primary-400 border-r-2 border-primary-500'
                  : 'text-surface-400 hover:text-white hover:bg-surface-800'
              }`}
            >
              <span className="flex-shrink-0">{link.icon}</span>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="truncate"
                >
                  {link.label}
                </motion.span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-surface-800">
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-surface-400 hover:text-red-400 hover:bg-surface-800 transition-all duration-200 cursor-pointer"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="truncate"
            >
              {t('nav.logout')}
            </motion.span>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
