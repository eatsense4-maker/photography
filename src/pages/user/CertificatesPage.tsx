import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { motion } from 'framer-motion';
import { Award, Download, Calendar } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface CertificateRow {
  id: string;
  type: string;
  certificate_url: string | null;
  created_at: string;
  edition: { title: string; year: number } | null;
}

export default function CertificatesPage() {
  const { t } = useTranslation();
  usePageTitle('Certificates');
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<CertificateRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from('certificates')
      .select('id, type, certificate_url, created_at, editions(title, year)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCertificates(
          (data || []).map((c: any) => ({
            id: c.id,
            type: c.type,
            certificate_url: c.certificate_url,
            created_at: c.created_at,
            edition: c.editions,
          }))
        );
        setLoading(false);
      });
  }, [user?.id]);

  const typeLabel = (type: string) => {
    switch (type) {
      case 'participation':
        return 'Certificate of Participation';
      case 'winner':
        return 'Winner Certificate';
      case 'honorable_mention':
        return 'Honorable Mention';
      default:
        return type;
    }
  };

  const typeBadgeColor = (type: string) => {
    switch (type) {
      case 'winner':
        return 'bg-gold-500/10 text-gold-400';
      case 'honorable_mention':
        return 'bg-primary-500/10 text-primary-400';
      default:
        return 'bg-surface-700 text-surface-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">
          {t('user.certificates')}
        </h1>
        <p className="text-surface-400 text-sm mt-1">
          Download your participation and award certificates
        </p>
      </div>

      {certificates.length === 0 ? (
        <Card className="p-12 text-center">
          <Award className="h-16 w-16 text-surface-600 mx-auto mb-4" />
          <p className="text-surface-400 text-lg">No certificates yet</p>
          <p className="text-surface-500 text-sm mt-2">
            Certificates will appear here when results are announced
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert, i) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-6 space-y-4 hover:ring-1 hover:ring-surface-700 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gold-500/10">
                      <Award className="h-6 w-6 text-gold-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{typeLabel(cert.type)}</h3>
                      {cert.edition && (
                        <p className="text-sm text-surface-400">
                          {cert.edition.title} — {cert.edition.year}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeBadgeColor(cert.type)}`}>
                    {cert.type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(cert.created_at).toLocaleDateString()}
                  </span>
                  {cert.certificate_url && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Download className="h-4 w-4" />}
                      onClick={() => window.open(cert.certificate_url!, '_blank')}
                    >
                      Download
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
