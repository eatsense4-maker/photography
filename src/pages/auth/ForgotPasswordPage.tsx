import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotForm = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ForgotForm) => {
    setLoading(true);
    try {
      await resetPassword(data.email);
      setSent(true);
      toast.success(t('auth.reset_success'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Reset failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        <h1 className="text-3xl font-display font-bold text-white mb-2">
          {t('auth.reset_title')}
        </h1>
        <p className="text-surface-400 mb-8">
          {t('auth.reset_subtitle')}
        </p>

        {sent ? (
          <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <p className="text-emerald-400 font-medium">{t('auth.reset_success')}</p>
            <Link
              to="/login"
              className="inline-block mt-4 text-sm text-primary-400 hover:text-primary-300"
            >
              Return to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label={t('auth.email')}
              type="email"
              placeholder="you@example.com"
              icon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              {t('auth.reset_button')}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
