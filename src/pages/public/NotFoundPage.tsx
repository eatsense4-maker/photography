import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  usePageTitle('Page Not Found');

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <p className="text-8xl font-display font-bold text-primary-500">404</p>
        <div className="space-y-2">
          <h1 className="text-xl font-display font-bold text-white">
            Page not found
          </h1>
          <p className="text-sm text-surface-400">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-700 text-surface-300 hover:text-white hover:border-surface-500 text-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
