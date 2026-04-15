import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Camera, Award, Globe2, Heart, MapPin } from 'lucide-react';
import { getPhotoUrl } from '@/lib/r2';


const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6 },
  }),
};

export default function AboutPage() {
  const { t } = useTranslation();
  usePageTitle('About');

  const curators = [
    {
      name: 'Arben Alliaj',
      country: 'Albania',
      photo: getPhotoUrl('curators/arben-alliaj.jpg'),
      roleKey: 'about.curator_arben_role',
      bioKey: 'about.curator_arben_bio',
    },
    {
      name: 'Burim Myftiu',
      country: 'Kosovo / USA',
      photo: getPhotoUrl('curators/burim-myftiu.jpg'),
      roleKey: 'about.curator_burim_role',
      bioKey: 'about.curator_burim_bio',
    },
    {
      name: 'Saimir Ahmeti',
      country: 'Albania',
      photo: getPhotoUrl('curators/saimir-ahmeti.jpg'),
      roleKey: 'about.curator_saimir_role',
      bioKey: 'about.curator_saimir_bio',
    },
    {
      name: 'Elton Koritari',
      country: 'Albania',
      photo: getPhotoUrl('curators/elton-koritari.jpg'),
      roleKey: 'about.curator_elton_role',
      bioKey: 'about.curator_elton_bio',
    },
    {
      name: 'Osman Demiri',
      country: 'North Macedonia',
      photo: getPhotoUrl('curators/osman-demiri.jpg'),
      roleKey: 'about.curator_osman_role',
      bioKey: 'about.curator_osman_bio',
    },
    {
      name: 'Vlora Demiri',
      country: 'North Macedonia',
      photo: getPhotoUrl('curators/vlora-demiri.jpg'),
      roleKey: 'about.curator_vlora_role',
      bioKey: 'about.curator_vlora_bio',
    },
  ];

  const values = [
    {
      icon: <Camera className="h-6 w-6" />,
      titleKey: 'about.value_art_title',
      descKey: 'about.value_art_desc',
    },
    {
      icon: <Globe2 className="h-6 w-6" />,
      titleKey: 'about.value_international_title',
      descKey: 'about.value_international_desc',
    },
    {
      icon: <Award className="h-6 w-6" />,
      titleKey: 'about.value_judging_title',
      descKey: 'about.value_judging_desc',
    },
    {
      icon: <Heart className="h-6 w-6" />,
      titleKey: 'about.value_community_title',
      descKey: 'about.value_community_desc',
    },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative pt-12 pb-20">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage:
                'url(https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=1920&h=600&fit=crop)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-950/90 to-surface-950" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6"
          >
            {t('about.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-surface-300 max-w-2xl mx-auto"
          >
            {t('about.subtitle')}
          </motion.p>
        </div>
      </section>

      {/* Story */}
      <section className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.div custom={0} variants={fadeUp}>
                <span className="text-primary-400 text-sm font-semibold uppercase tracking-widest">
                  {t('about.history')}
                </span>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-white mt-3 mb-6">
                  {t('about.story_heading')}
                </h2>
              </motion.div>
              <motion.p
                custom={1}
                variants={fadeUp}
                className="text-surface-300 leading-relaxed mb-6"
              >
                {t('about.history_text')}
              </motion.p>
              <motion.p
                custom={2}
                variants={fadeUp}
                className="text-surface-300 leading-relaxed mb-6"
              >
                {t('about.mission_text')}
              </motion.p>
              <motion.p
                custom={3}
                variants={fadeUp}
                className="text-surface-400 leading-relaxed"
              >
                {t('about.organizers_text')}
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="aspect-square rounded-2xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800&h=800&fit=crop"
                  alt="Photography"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 rounded-xl bg-gradient-to-br from-primary-500 to-gold-500 opacity-20 blur-2xl" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-12 sm:py-24 bg-surface-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-16"
          >
            <motion.h2
              custom={0}
              variants={fadeUp}
              className="text-3xl md:text-4xl font-display font-bold text-white mb-4"
            >
              {t('about.values_heading')}
            </motion.h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {values.map((val, i) => (
              <motion.div
                key={val.titleKey}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="p-6 rounded-xl bg-surface-900 border border-surface-800 hover:border-surface-700 transition-colors text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-600/10 text-primary-400 mb-4">
                  {val.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{t(val.titleKey)}</h3>
                <p className="text-sm text-surface-400 leading-relaxed">{t(val.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Curators */}
      <section className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-16"
          >
            <motion.span custom={0} variants={fadeUp} className="text-primary-400 text-sm font-semibold uppercase tracking-widest">
              {t('about.curators_label')}
            </motion.span>
            <motion.h2
              custom={1}
              variants={fadeUp}
              className="text-3xl md:text-4xl font-display font-bold text-white mt-3"
            >
              {t('about.curators_heading')}
            </motion.h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            {curators.map((c, i) => (
              <motion.div
                key={c.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="group rounded-2xl overflow-hidden bg-surface-900 border border-surface-800 hover:border-surface-700 transition-colors"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={c.photo}
                    alt={c.name}
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-lg font-display font-bold text-white">{c.name}</h3>
                    <span className="shrink-0 text-xs font-medium text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {t(c.roleKey)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-surface-400 mb-3">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {c.country}
                  </div>
                  <p className="text-sm text-surface-300 leading-relaxed">{t(c.bioKey)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-12 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-display font-bold text-white text-center mb-8 sm:mb-16">
            {t('about.journey_heading')}
          </h2>
          <div className="space-y-8 sm:space-y-12 relative before:absolute before:left-4 sm:before:left-1/2 before:-translate-x-px before:top-0 before:bottom-0 before:w-0.5 before:bg-surface-800">
            {[
              { year: '2006', eventKey: 'about.timeline_2006' },
              { year: '2010', eventKey: 'about.timeline_2010' },
              { year: '2015', eventKey: 'about.timeline_2015' },
              { year: '2020', eventKey: 'about.timeline_2020' },
              { year: '2025', eventKey: 'about.timeline_2025' },
              { year: '2026', eventKey: 'about.timeline_2026' },
            ].map((item, i) => (
              <motion.div
                key={item.year}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className={`flex items-start sm:items-center gap-4 sm:gap-8 pl-10 sm:pl-0 relative ${
                  i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'
                }`}
              >
                <div className={`flex-1 ${i % 2 === 0 ? 'sm:text-right' : 'sm:text-left'}`}>
                  <span className="text-primary-400 font-bold text-lg">{item.year}</span>
                  <p className="text-surface-300 text-sm mt-1">{t(item.eventKey)}</p>
                </div>
                <div className="absolute left-2 sm:relative sm:left-auto w-4 h-4 rounded-full bg-primary-500 border-4 border-surface-950 z-10 flex-shrink-0 mt-1 sm:mt-0" />
                <div className="hidden sm:block flex-1" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
