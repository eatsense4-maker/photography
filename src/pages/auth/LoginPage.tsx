import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores';
import { getPhotoUrl } from '@/lib/r2';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { t } = useTranslation();
  usePageTitle('Login');
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, isAuthenticated, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const dashPath =
        user.role === 'admin'
          ? '/admin'
          : user.role === 'jury'
          ? '/jury'
          : '/dashboard';
      navigate(dashPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await signIn(data.email, data.password);
      toast.success(t('auth.welcome_back_toast'));

      // Navigate immediately using store state — don't wait for useEffect
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        const dashPath =
          currentUser.role === 'admin'
            ? '/admin'
            : currentUser.role === 'jury'
            ? '/jury'
            : '/dashboard';
        navigate(dashPath, { replace: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth.login_failed_toast');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch {
      toast.error(t('auth.google_failed_toast'));
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200&h=1600&fit=crop)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-950/60 to-surface-950" />
        <div className="relative z-10 flex items-end p-12">
          <div>
            <Link to="/" className="flex items-center mb-8">
              <img
                src={getPhotoUrl('brand/fokus-logo.png')}
                alt="FOKUS Award"
                className="h-12 w-auto object-contain"
              />
            </Link>
            <p className="text-2xl font-display text-white/80 italic max-w-md">
              "Photography is the story I fail to put into words."
            </p>
            <p className="text-surface-400 text-sm mt-3">— Destin Sparks</p>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-950">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center mb-10">
            <img
              src={getPhotoUrl('brand/fokus-logo.png')}
              alt="FOKUS Award"
              className="h-10 w-auto object-contain"
            />
          </Link>

          <h1 className="text-3xl font-display font-bold text-white mb-2">
            {t('auth.login_title')}
          </h1>
          <p className="text-surface-400 mb-8">
            {t('auth.login_subtitle')}
          </p>

          {/* Google Button */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-surface-900 border border-surface-700 hover:bg-surface-800 text-white transition-all mb-6 cursor-pointer"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('auth.or_continue')} {t('auth.google')}
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-surface-800" />
            <span className="text-xs text-surface-500 uppercase">or</span>
            <div className="flex-1 h-px bg-surface-800" />
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label={t('auth.email')}
              type="email"
              placeholder="you@example.com"
              icon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
            <div className="relative">
              <Input
                label={t('auth.password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                icon={<Lock className="h-4 w-4" />}
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-surface-500 hover:text-surface-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                {t('auth.forgot_password')}
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              {t('auth.login_button')}
            </Button>
          </form>

          <p className="text-center text-sm text-surface-400 mt-8">
            {t('auth.no_account')}{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">
              {t('nav.register')}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
