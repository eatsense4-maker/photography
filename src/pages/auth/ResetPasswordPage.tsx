import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  usePageTitle('Reset Password');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function prepareRecoverySession() {
      try {
        const params = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const code = params.get('code');
        const tokenHash = params.get('token_hash') || hash.get('token_hash');
        const type = params.get('type') || hash.get('type');
        const accessToken = hash.get('access_token') || params.get('access_token');
        const refreshToken = hash.get('refresh_token') || params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await withTimeout(
            supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }),
            8000,
            'Timed out while restoring recovery session.'
          );
          if (error) throw error;
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (tokenHash && type === 'recovery') {
          const { error } = await withTimeout(
            supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash }),
            8000,
            'Timed out while verifying recovery link.'
          );
          if (error) throw error;
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (code) {
          const { error } = await withTimeout(
            supabase.auth.exchangeCodeForSession(code),
            8000,
            'Timed out while exchanging recovery code.'
          );
          if (error) throw error;
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          5000,
          'Timed out while loading recovery session.'
        );
        if (error) throw error;

        if (!data.session) {
          const message = 'Password reset link is invalid or expired. Please request a new one.';
          if (mounted) setLinkError(message);
          return;
        }

        if (mounted) setReady(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid or expired reset link';
        if (mounted) setLinkError(message);
      }
    }

    prepareRecoverySession();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (linkError) {
      toast.error(linkError);
    }
  }, [linkError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated successfully');
      navigate('/login', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (linkError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
        <div className="max-w-sm w-full space-y-5 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-white mb-2">Reset link unavailable</h1>
            <p className="text-sm text-surface-400">{linkError}</p>
          </div>
          <Button type="button" variant="primary" className="w-full" onClick={() => navigate('/forgot-password', { replace: true })}>
            Request a new reset link
          </Button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
        <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 px-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary-400" />
          </div>
          <h1 className="text-xl font-display font-bold text-white">Set New Password</h1>
          <p className="text-sm text-surface-400">Enter your new password below.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 6 characters"
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            required
          />
          <Button type="submit" variant="primary" className="w-full" loading={loading}>
            {t('common.save')} Password
          </Button>
        </form>
      </div>
    </div>
  );
}
