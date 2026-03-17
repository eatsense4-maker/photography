import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, User, Globe2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
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
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuth();
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
      toast.success('Account created! Please check your email to confirm.');
      navigate('/login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch {
      toast.error('Google sign-in failed');
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
              'url(https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200&h=1600&fit=crop)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-950/60 to-surface-950" />
        <div className="relative z-10 flex items-end p-12">
          <div>
            <Link to="/" className="flex items-center space-x-3 mb-8">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center">
                <span className="text-white font-bold text-xl font-display">F</span>
              </div>
              <div>
                <span className="text-white text-xl font-bold font-display tracking-wide">FOKUS</span>
                <span className="text-primary-400 text-xs block -mt-1 tracking-[0.2em]">AWARD</span>
              </div>
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
          <Link to="/" className="lg:hidden flex items-center space-x-3 mb-10">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-gold-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg font-display">F</span>
            </div>
            <span className="text-white text-lg font-bold font-display tracking-wide">FOKUS AWARD</span>
          </Link>

          <h1 className="text-3xl font-display font-bold text-white mb-2">
            {t('auth.register_title')}
          </h1>
          <p className="text-surface-400 mb-8">
            {t('auth.register_subtitle')}
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
