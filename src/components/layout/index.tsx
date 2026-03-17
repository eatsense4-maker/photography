import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

// Public layout: Navbar + content + Footer (for landing pages)
export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

// Dashboard layout: Navbar + Sidebar + content (for authenticated users)
export { default as DashboardLayout } from './DashboardLayout';
