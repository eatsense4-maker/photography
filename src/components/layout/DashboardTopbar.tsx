import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, PanelLeftClose } from 'lucide-react';
import { useUIStore } from '@/stores';

/**
 * Maps route paths to translation keys used in the sidebar.
 * Falls back to a cleaned-up version of the last path segment.
 */
const routeTitleMap: Record<string, string> = {
  // Admin
  '/admin': 'admin.dashboard',
  '/admin/editions': 'admin.editions',
  '/admin/categories': 'admin.categories',
  '/admin/submissions': 'admin.submissions',
  '/admin/users': 'admin.users',
  '/admin/jury': 'admin.jury_management',
  '/admin/payments': 'admin.payments',
  '/admin/results': 'admin.results',
  '/admin/content': 'admin.content',
  '/admin/partners': 'admin.partners',
  // Jury
  '/jury': 'jury.dashboard',
  '/jury/review': 'jury.phase_shortlist',
  '/jury/ranking': 'jury.phase_final',
  // User
  '/dashboard': 'user.dashboard',
  '/dashboard/submissions': 'user.submissions',
  '/dashboard/submissions/new': 'user.new_submission',
  // '/dashboard/submissions/:id' handled by fallback
  '/dashboard/certificates': 'user.certificates',
  '/dashboard/profile': 'nav.profile',
  '/dashboard/notifications': 'common.notifications',
};

export default function DashboardTopbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  // Resolve the page title from the route
  const titleKey = routeTitleMap[location.pathname];
  const pageTitle = titleKey
    ? t(titleKey)
    : location.pathname
        .split('/')
        .filter(Boolean)
        .pop()
        ?.replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Dashboard';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800/60">
      <div
        className="flex items-center h-full px-4 sm:px-5 transition-all duration-300"
        style={{ marginLeft: 0 }}
      >
        {/* On lg+, offset for sidebar */}
        <div
          className="hidden lg:block shrink-0 transition-all duration-300"
          style={{ width: sidebarOpen ? 260 : 72 }}
        />
        {/* Sidebar toggle */}
        <button
          onClick={toggleSidebar}
          className="p-2 -ml-2 mr-3 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors cursor-pointer"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>

        {/* Page title */}
        <h1 className="text-lg font-semibold text-white tracking-wide">
          {pageTitle}
        </h1>
      </div>
    </header>
  );
}
