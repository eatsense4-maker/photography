import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Camera, Award, Globe2, Heart, MapPin } from 'lucide-react';


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

  const curators = [
    {
      name: 'Arben Alliaj',
      country: 'Albania',
      photo: 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev/curators/arben-alliaj.jpg',
      role: 'Founder & Director',
      bio: 'Born in Patos, Fier (1975). Founder of the FOKUS Artistic Photography Competition in 2006, transformed into the FOKUS Award Festival. Photographer, designer and founder of "Benart Print".',
    },
    {
      name: 'Burim Myftiu',
      country: 'Kosovo / USA',
      photo: 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev/curators/burim-myftiu.jpg',
      role: 'Curator',
      bio: 'MA in Visual Arts (b. Prizren, 1961). Albanian American lecturer, art curator, visual artist and photographer. Co-founder of DOKUFEST. Appointed EU Ambassador of Culture of Kosovo in 2011.',
    },
    {
      name: 'Saimir Ahmeti',
      country: 'Albania',
      photo: 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev/curators/saimir-ahmeti.jpg',
      role: 'Curator & Manager',
      bio: 'Born in Fier (1973). Graduated in Art Management at the Academy of Fine Arts, Tirana. Chairman of the ANTIK Association. Manager of FOKUS AWARD 2007–2021.',
    },
    {
      name: 'Elton Koritari',
      country: 'Albania',
      photo: 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev/curators/elton-koritari.jpg',
      role: 'Curator',
      bio: 'Born in Tirana (1977). Co-founder and administrator of EJAlbum. Represented Albania at La Biennale di Venezia (2018) as curator of the pavilion "Space Zero".',
    },
    {
      name: 'Osman Demiri',
      country: 'North Macedonia',
      photo: 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev/curators/osman-demiri.jpg',
      role: 'Curator',
      bio: 'Born in Kumanovo (1965). Photographer, documentary filmmaker and lecturer at the University of Tetova. John Kaverdash School of Photography alumnus. Jury member in competitions across the Balkans.',
    },
    {
      name: 'Vlora Demiri',
      country: 'North Macedonia',
      photo: 'https://pub-c988af810ab64c9185019688ecf11024.r2.dev/curators/vlora-demiri.jpg',
      role: 'Curator – 13th Edition',
      bio: 'Born in Gostivar (1994). Art historian — Mimar Sinan Fine Arts University, Istanbul. Artistic director of Kult Gallery. Curator of the 13th Edition "The Other".',
    },
  ];

  const values = [
    {
      icon: <Camera className="h-6 w-6" />,
      title: 'Art Photography',
      desc: 'Dedicated to the art of photography and the values it conveys in the vast field of visual arts.',
    },
    {
      icon: <Globe2 className="h-6 w-6" />,
      title: 'International Reach',
      desc: 'Photographers from over 50 countries participate, making FOKUS a truly global platform.',
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: 'Fair Judging',
      desc: 'An independent international jury ensures fair and unbiased evaluation of all submissions.',
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: 'Community',
      desc: 'Promoting positive dialogue on photography based on the experience of various art schools.',
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
            className="text-5xl md:text-6xl font-display font-bold text-white mb-6"
          >
            {t('about.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-surface-300 max-w-2xl mx-auto"
          >
            Since 2006, FOKUS Award has been celebrating photographic excellence,
            bringing together talents from around the world.
          </motion.p>
        </div>
      </section>

      {/* Story */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
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
                  A Legacy of Visual Excellence
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
                The role of organizers has always been and will remain only collecting photos
                and submitting them to an international jury, which will then decide on their assessment.
                This ensures complete transparency and fairness in the competition.
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
      <section className="py-24 bg-surface-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.h2
              custom={0}
              variants={fadeUp}
              className="text-3xl md:text-4xl font-display font-bold text-white mb-4"
            >
              What We Stand For
            </motion.h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((val, i) => (
              <motion.div
                key={val.title}
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
                <h3 className="text-lg font-semibold text-white mb-2">{val.title}</h3>
                <p className="text-sm text-surface-400 leading-relaxed">{val.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Curators */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.span custom={0} variants={fadeUp} className="text-primary-400 text-sm font-semibold uppercase tracking-widest">
              The People Behind FOKUS
            </motion.span>
            <motion.h2
              custom={1}
              variants={fadeUp}
              className="text-3xl md:text-4xl font-display font-bold text-white mt-3"
            >
              Curators
            </motion.h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
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
                      {c.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-surface-400 mb-3">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {c.country}
                  </div>
                  <p className="text-sm text-surface-300 leading-relaxed">{c.bio}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-display font-bold text-white text-center mb-16">
            Our Journey
          </h2>
          <div className="space-y-12 relative before:absolute before:left-1/2 before:-translate-x-px before:top-0 before:bottom-0 before:w-0.5 before:bg-surface-800">
            {[
              { year: '2006', event: 'FOKUS Award founded by a group of photography enthusiasts' },
              { year: '2010', event: 'First international participants join the competition' },
              { year: '2015', event: 'Reached 30+ participating countries' },
              { year: '2020', event: 'Moved to a fully digital submission platform' },
              { year: '2025', event: '16th edition — "The Endless Perspective of Vision"' },
              { year: '2026', event: '17th edition — New platform launch' },
            ].map((item, i) => (
              <motion.div
                key={item.year}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className={`flex items-center gap-8 ${
                  i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                }`}
              >
                <div className={`flex-1 ${i % 2 === 0 ? 'text-right' : 'text-left'}`}>
                  <span className="text-primary-400 font-bold text-lg">{item.year}</span>
                  <p className="text-surface-300 text-sm mt-1">{item.event}</p>
                </div>
                <div className="w-4 h-4 rounded-full bg-primary-500 border-4 border-surface-950 relative z-10 flex-shrink-0" />
                <div className="flex-1" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
