import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { User, Camera, MapPin, Globe, Save, Upload } from 'lucide-react';
import { Button, Input, Textarea, Card } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');

  // Load current profile
  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || '');
          setBio(data.bio || '');
          setCountry(data.country || '');
          setWebsite(data.website || '');
          setInstagram(data.instagram || '');
          if (data.avatar_url) setAvatarPreview(data.avatar_url);
        }
        setFetching(false);
      });
  }, [user?.id]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
      // TODO: upload avatar to R2 and save URL
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          bio: bio || null,
          country: country || null,
          website: website || null,
          instagram: instagram || null,
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success(t('common.saved'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">
          {t('user.profile')}
        </h1>
        <p className="text-surface-400 text-sm mt-1">Manage your profile and preferences</p>
      </div>

      {/* Avatar Section */}
      <Card className="p-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-surface-800 flex items-center justify-center overflow-hidden border-2 border-surface-700">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-surface-500" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary-500 text-white cursor-pointer hover:bg-primary-600 transition-colors">
              <Upload className="h-3.5 w-3.5" />
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </label>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{fullName || 'Your Name'}</h3>
            <p className="text-sm text-surface-400">{country || 'Country not set'}</p>
          </div>
        </div>
      </Card>

      {/* Personal Info */}
      <Card className="p-6 space-y-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <User className="h-5 w-5 text-primary-500" />
          Personal Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Input
            label={t('auth.full_name')}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
          />
          <Input
            label={t('auth.country')}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Albania"
            icon={<MapPin className="h-4 w-4" />}
          />
        </div>
        <Textarea
          label="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself..."
          rows={3}
        />
      </Card>

      {/* Links */}
      <Card className="p-6 space-y-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary-500" />
          Links
        </h2>
        <Input
          label="Website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://yourwebsite.com"
          icon={<Globe className="h-4 w-4" />}
        />
        <Input
          label="Instagram"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="@username"
          icon={<Camera className="h-4 w-4" />}
        />
      </Card>

      {/* Save */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-end"
      >
        <Button
          variant="primary"
          icon={<Save className="h-4 w-4" />}
          loading={loading}
          onClick={handleSave}
        >
          {t('common.save')}
        </Button>
      </motion.div>
    </div>
  );
}
