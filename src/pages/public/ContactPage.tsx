import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Send, MapPin, Mail, Phone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Textarea } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  subject: z.string().min(3, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactForm = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const { t } = useTranslation();
  usePageTitle('Contact');
  const [sending, setSending] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactForm) => {
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          kind: 'contact',
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
        },
      });
      if (error) throw error;
      toast.success(t('contact.success'));
      reset();
    } catch {
      toast.error(t('contact.error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative pt-12 pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/85 to-transparent" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6"
          >
            {t('contact.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-surface-300"
          >
            {t('contact.subtitle')}
          </motion.p>
        </div>
      </section>

      {/* Contact Form + Info */}
      <section className="py-10 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2 space-y-8"
            >
              <div className="rounded-2xl border border-surface-700 bg-white/85 p-6 shadow-sm">
                <h3 className="text-xl font-display font-bold text-white mb-6">
                  Get in Touch
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-surface-800 text-primary-400">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-surface-400">Email</p>
                      <a
                        href="mailto:info@fokusaward.com"
                        className="text-white hover:text-primary-400 transition-colors"
                      >
                        info@fokusaward.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-surface-800 text-primary-400">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-surface-400">Location</p>
                      <p className="text-white">Tirana, Albania</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-surface-800 text-primary-400">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-surface-400">Phone</p>
                      <a href="tel:+355693949167" className="text-white hover:text-primary-400 transition-colors">+355 69 394 9167</a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social */}
              <div className="rounded-2xl border border-surface-700 bg-white/85 p-6 shadow-sm">
                <h4 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-4">
                  Follow Us
                </h4>
                <div className="flex gap-3">
                  <a
                    href="https://www.facebook.com/FOKUSaward"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white text-sm transition-all"
                  >
                    Facebook
                  </a>
                  <a
                    href="https://www.instagram.com/fokusaward/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white text-sm transition-all"
                  >
                    Instagram
                  </a>
                </div>
              </div>
            </motion.div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-3"
            >
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5 rounded-2xl border border-surface-700 bg-white/85 p-4 shadow-sm sm:space-y-6 sm:p-6 lg:p-8"
              >
                <div className="grid sm:grid-cols-2 gap-6">
                  <Input
                    label={t('contact.name')}
                    placeholder="John Doe"
                    error={errors.name?.message}
                    {...register('name')}
                  />
                  <Input
                    label={t('contact.email')}
                    type="email"
                    placeholder="john@example.com"
                    error={errors.email?.message}
                    {...register('email')}
                  />
                </div>
                <Input
                  label={t('contact.subject')}
                  placeholder="How can we help?"
                  error={errors.subject?.message}
                  {...register('subject')}
                />
                <Textarea
                  label={t('contact.message')}
                  placeholder="Your message..."
                  rows={6}
                  error={errors.message?.message}
                  {...register('message')}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={sending}
                  icon={<Send className="h-4 w-4" />}
                  className="w-full"
                >
                  {t('contact.send')}
                </Button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
