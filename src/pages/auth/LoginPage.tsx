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
import { getDashboardPath } from '@/lib/auth-utils';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { t } = useTranslation();
  usePageTitle('Login');
  const navigate = useNavigate();
  const { signIn, isAuthenticated, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getDashboardPath(user.role), { replace: true });
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
        navigate(getDashboardPath(currentUser.role), { replace: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth.login_failed_toast');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${getPhotoUrl('auth/touch-with-eyes-side.jpg')})`,
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
