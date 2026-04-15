import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardTopbar from './DashboardTopbar';
import Sidebar from './Sidebar';
import { useUIStore } from '@/stores';

export default function DashboardLayout() {
  const { sidebarOpen, closeSidebar } = useUIStore();

  return (
    <div className="min-h-screen bg-surface-950">
      <DashboardTopbar />
      <Sidebar />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarOpen ? 260 : 72 }}
        className="hidden lg:block pt-16 min-h-screen transition-all duration-300"
      >
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </motion.main>

      {/* Mobile main — always full width */}
      <main className="lg:hidden pt-16 min-h-screen">
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
