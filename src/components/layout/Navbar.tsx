import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Menu, X, Globe, Bell, ChevronDown, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationStore, useUIStore } from '@/stores';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, signOut } = useAuth();
  const { unreadCount } = useNotificationStore();
  const { mobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useUIStore();
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();

  const isLanding = location.pathname === '/' || location.pathname === '/en' || location.pathname === '/al';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    closeMobileMenu();
    setProfileOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { path: '/', label: t('nav.home') },
    { path: '/about', label: t('nav.about') },
    { path: '/apply', label: t('nav.apply') },
    { path: '/winners', label: t('nav.winners') },
    { path: '/gallery', label: t('nav.gallery') },
    { path: '/contact', label: t('nav.contact') },
  ];

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'al' : 'en';
    i18n.changeLanguage(newLang);
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'admin': return '/admin';
      case 'jury': return '/jury';
      default: return '/dashboard';
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled || !isLanding
          ? 'glass shadow-lg shadow-black/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <img
              src="https://pub-c988af810ab64c9185019688ecf11024.r2.dev/brand/fokus-logo.png"
              alt="FOKUS Award"
              className="h-10 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === link.path
                    ? 'text-white bg-white/10'
                    : 'text-surface-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="hidden lg:flex items-center space-x-3">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-surface-300 hover:text-white hover:bg-white/5 transition-all text-sm cursor-pointer"
            >
              <Globe className="h-4 w-4" />
              {i18n.language === 'en' ? 'AL' : 'EN'}
            </button>

            {isAuthenticated && user ? (
              <>
                {/* Notifications */}
                <Link
                  to="/dashboard/notifications"
                  className="relative p-2 rounded-lg text-surface-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary-500 text-[10px] font-bold text-white flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-4 w-4 text-surface-400" />
                      )}
                    </div>
                    <span className="text-sm text-surface-200 max-w-[120px] truncate">
                      {user.full_name}
                    </span>
                    <ChevronDown className="h-4 w-4 text-surface-400" />
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        className="absolute right-0 mt-2 w-56 bg-surface-900 border border-surface-700 rounded-xl shadow-2xl py-2 overflow-hidden"
                      >
                        <div className="px-4 py-2 border-b border-surface-800">
                          <p className="text-sm font-medium text-white truncate">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-surface-400 capitalize">
                            {user.role}
                          </p>
                        </div>
                        <Link
                          to={getDashboardPath()}
                          className="flex items-center px-4 py-2.5 text-sm text-surface-300 hover:text-white hover:bg-surface-800 transition-colors"
                        >
                          {t('nav.dashboard')}
                        </Link>
                        <Link
                          to="/dashboard/profile"
                          className="flex items-center px-4 py-2.5 text-sm text-surface-300 hover:text-white hover:bg-surface-800 transition-colors"
                        >
                          {t('nav.profile')}
                        </Link>
                        <hr className="border-surface-800 my-1" />
                        <button
                          onClick={signOut}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-surface-800 transition-colors cursor-pointer"
                        >
                          {t('nav.logout')}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-surface-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white transition-all shadow-lg shadow-primary-600/25"
                >
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 rounded-lg text-surface-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden glass border-t border-surface-800 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`block px-4 py-3 rounded-lg text-base font-medium transition-all ${
                    location.pathname === link.path
                      ? 'text-white bg-white/10'
                      : 'text-surface-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              <hr className="border-surface-800 my-4" />

              <button
                onClick={toggleLanguage}
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-surface-300 hover:text-white hover:bg-white/5 transition-all w-full cursor-pointer"
              >
                <Globe className="h-5 w-5" />
                {i18n.language === 'en' ? 'Shqip' : 'English'}
              </button>

              {isAuthenticated ? (
                <>
                  <Link
                    to={getDashboardPath()}
                    className="block px-4 py-3 rounded-lg text-surface-300 hover:text-white hover:bg-white/5"
                  >
                    {t('nav.dashboard')}
                  </Link>
                  <button
                    onClick={signOut}
                    className="w-full text-left px-4 py-3 rounded-lg text-red-400 hover:bg-white/5 cursor-pointer"
                  >
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <div className="space-y-2 pt-2">
                  <Link
                    to="/login"
                    className="block px-4 py-3 rounded-lg text-center text-surface-300 border border-surface-700 hover:bg-white/5"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    to="/register"
                    className="block px-4 py-3 rounded-lg text-center bg-primary-600 hover:bg-primary-700 text-white"
                  >
                    {t('nav.register')}
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
