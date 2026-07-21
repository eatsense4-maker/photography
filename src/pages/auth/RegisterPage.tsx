import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getPhotoUrl } from '@/lib/r2';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, User, Globe2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores';
import { getDashboardPath } from '@/lib/auth-utils';
import toast from 'react-hot-toast';

const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email address'),
    country: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { t } = useTranslation();
  usePageTitle('Register');
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await signUp(data.email, data.password, data.full_name, data.country);
      toast.success(t('auth.registered_toast'));
      const currentUser = useAuthStore.getState().user;
      navigate(getDashboardPath(currentUser?.role ?? 'user'), { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth.registration_failed_toast');
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
            backgroundImage: `url(${getPhotoUrl('submissions/1fc13921-3dda-4cfc-afc7-51d090d7817e-register.jpeg')})`,
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
              "The camera is an instrument that teaches people how to see without a camera."
            </p>
            <p className="text-surface-400 text-sm mt-3">— Dorothea Lange</p>
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
          <Link to="/" className="lg:hidden flex items-center mb-10">
            <img
              src={getPhotoUrl('brand/fokus-logo.png')}
              alt="FOKUS Award"
              className="h-10 w-auto object-contain"
            />
          </Link>

          <h1 className="text-3xl font-display font-bold text-white mb-2">
            {t('auth.register_title')}
          </h1>
          <p className="text-surface-400 mb-8">
            {t('auth.register_subtitle')}
          </p>

          {/* Registration Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label={t('auth.full_name')}
              placeholder="John Doe"
              icon={<User className="h-4 w-4" />}
              error={errors.full_name?.message}
              {...register('full_name')}
            />

            <Input
              label={t('auth.email')}
              type="email"
              placeholder="you@example.com"
              icon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label={t('auth.country')}
              placeholder="e.g. Albania"
              icon={<Globe2 className="h-4 w-4" />}
              error={errors.country?.message}
              {...register('country')}
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

            <Input
              label={t('auth.confirm_password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              icon={<Lock className="h-4 w-4" />}
              error={errors.confirm_password?.message}
              {...register('confirm_password')}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              {t('auth.register_button')}
            </Button>
          </form>

          <p className="text-center text-sm text-surface-400 mt-8">
            {t('auth.have_account')}{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
              {t('auth.login_button')}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
