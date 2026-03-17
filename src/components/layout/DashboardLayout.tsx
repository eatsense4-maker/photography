import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardTopbar from './DashboardTopbar';
import Sidebar from './Sidebar';
import { useUIStore } from '@/stores';

export default function DashboardLayout() {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-surface-950">
      <DashboardTopbar />
      <Sidebar />
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarOpen ? 260 : 72 }}
        className="pt-16 min-h-screen transition-all duration-300"
      >
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </motion.main>
    </div>
  );
}
