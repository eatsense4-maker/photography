import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Facebook, Instagram, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const quickLinks = [
    { path: '/about', label: t('nav.about') },
    { path: '/theme', label: t('nav.theme') },
    { path: '/editions', label: t('nav.editions') },
    { path: '/winners', label: t('nav.winners') },
    { path: '/contact', label: t('nav.contact') },
  ];

  return (
    <footer className="bg-surface-950 border-t border-surface-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg font-display">F</span>
              </div>
              <div>
                <span className="text-white text-lg font-bold font-display tracking-wide">
                  FOKUS
                </span>
                <span className="text-primary-400 text-xs block -mt-1 tracking-[0.2em]">
                  AWARD
                </span>
              </div>
            </Link>
            <p className="text-surface-400 text-sm leading-relaxed mb-6">
              {t('footer.tagline')}
            </p>
            <div className="flex items-center space-x-3">
              <a
                href="https://www.facebook.com/FOKUSaward"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-white transition-all"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://www.instagram.com/fokusaward/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-white transition-all"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              {t('footer.quick_links')}
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-surface-400 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              {t('contact.title')}
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-surface-400">
                <Mail className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary-400" />
                <a href="mailto:info@fokusaward.com" className="hover:text-white transition-colors">
                  info@fokusaward.com
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm text-surface-400">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary-400" />
                <span>Tirana, Albania</span>
              </li>
            </ul>
          </div>

          {/* Follow */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              {t('footer.follow_us')}
            </h4>
            <p className="text-sm text-surface-400 leading-relaxed">
              Stay updated with the latest news, winners, and upcoming editions of FOKUS Award.
            </p>
            <div className="mt-4">
              <Link
                to="/register"
                className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white transition-all"
              >
                {t('nav.register')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-surface-500">
              &copy; {year} FOKUS Award. {t('footer.rights')}
            </p>
            <div className="flex items-center space-x-6 text-sm text-surface-500">
              <Link to="/privacy" className="hover:text-surface-300 transition-colors">
                {t('footer.privacy')}
              </Link>
              <Link to="/terms" className="hover:text-surface-300 transition-colors">
                {t('footer.terms')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
