import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X as XIcon, Calendar, AlertTriangle, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Edition } from '@/types';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6 },
  }),
};

const CONCEPT_EN = [
  `BREATH is the most ordinary miracle: constant, unconscious, and taken for granted until the loss of a single breath changes everything. This theme understands breathing not only as a biological function, but as a way of being: as presence, as a relationship with the body and the world, as both a right and an ecological responsibility, and as an act of creation. Breath is the minimal rhythm that keeps us alive, but also the force that makes life feel tangible: it can be interrupted, held, trained, shared, stolen, or protected, and in every case it reminds us how fragile and how powerful we are at the same time.`,
  `As anchors for thought, the theme opens into several philosophical directions that place air at the center of human experience. For the Stoics, pneuma (breath) is understood as a life-giving, organizing principle — an energy that holds body and world together. In Luce Irigaray, philosophy is criticized for its forgetting of air: to breathe is to have space to be, a bridge between the body and consciousness. In Peter Sloterdijk, air appears as a political medium: the atmosphere is not neutral, but a condition of life that can be harmed, poisoned, controlled. And in Albert Camus, breath becomes a figure of existential endurance — the idea that even in the poorest conditions of meaning, as long as one is alive, as long as one can breathe, a human being finds a way to continue living, continue hoping.`,
  `From these starting points, Breath invites photographers to enter the theme through situations where breath becomes palpable: in fragile moments where a single second changes everything — waiting, panic, relief, survival, intimacy; in small signs where the invisible appears as a trace — condensation, fog on glass, steam, wind in fabric, in hair, in grass; in the ways we animate places, objects, archives, and memories, as if giving breath to stories that risk remaining voiceless. The city itself can be read as a body: as a living organism among industry, agriculture, craft, streets and stages, asking what breathes, and what is out of breath.`,
  `At the same time, breath reminds us of both privilege and ecological debt: oxygen as a gift of natural systems, but also air as a shared commons shaped by pollution, burning, traffic, dust, pesticides, and indoor living conditions. Here photography can become a form of public attention: what does one breath cost, and who pays for it? And finally comes the question of our time: when machines can simulate so much, what remains unmistakable as a sign of the living? Between the synthetic image and the embodied image, between the eye of the machine and the body's experience — lungs, heart, time — this theme calls for photography that does not copy life, but bears witness to it.`,
  `FRYMË / BREATH is therefore an invitation to photograph not only what is seen, but what sustains us: the invisible rhythm of being, the conditions of life, the politics of air, and the human capacity to breathe life into the world — through an image, through memory, through a simple act of presence. The question remains open, but sharper: what, in a photograph, still feels unmistakably alive?`,
];

const CONCEPT_AL = [
  `FRYMË / BREATH është mrekullia më e zakonshme: e pandërprerë, e pavetëdijshme dhe e marrë si e mirëqenë, derisa humbja e një fryme të vetme ndryshon gjithçka. Kjo temë e sheh frymëmarrjen jo vetëm si funksion biologjik, por si mënyrë të qenies: si prani, si marrëdhënie me trupin dhe me botën, si e drejtë dhe si përgjegjësi ekologjike, si akt krijimi. Fryma është ritmi minimal që na mban të gjallë, por edhe forca që e bën jetën të ndjeshme: ajo mund të ndërpritet, të mbahet, të stërvitet, të ndahet, të vidhet ose të mbrohet dhe në çdo rast na kujton sa e brishtë dhe sa e fuqishme është njëkohësisht.`,
  `Si ankora mendimi, tema hapet në disa drejtime filozofike që e vendosin "ajrin" në qendër të përvojës njerëzore. Te stoikët, "pneuma" (fryma) kuptohet si parim jetëdhënës dhe organizues, një energji që mban bashkë trupin dhe botën. Te Luce Irigaray, filozofia kritikohet për "harresën e ajrit": të marrë frymë do të thotë të kesh hapësirë për të qenë, një urë mes trupit dhe ndërgjegjës. Te Peter Sloterdijk, ajri shfaqet si medium politik: atmosfera nuk është neutrale, por kusht i jetës që mund të cenohet, të helmohet, të kontrollohet. Dhe te Albert Camus, fryma bëhet figurë e qëndrueshëmrisë ekzistenciale — ideja se, edhe në kushtet më të varfra të kuptimit, sa kohë je gjallë, sa kohë merr frymë, njeriu gjen mënyrën të vazhdojë.`,
  `Nga këto pikënisje, "Frymëmarrja" fton fotografët të hyjnë në temë përmes situatave ku fryma bëhet e prekshme: në momente të brishta ku një sekondë ndryshon gjithçka — pritje, panik, lehtësim, mbijetesë, intimitet; në shenja të vogla ku e padukshmja shfaqet si gjurmë — kondensim, mjegull në xham, avull, era në pëlhurë, në flokë, në bar; në mënyrën si i "gjallërojmë" vendet, objektet, arkivat dhe kujtimet, sikur t'u japim frymë historive që rrezikojnë të mbeten pa zë. Edhe qyteti mund të lexohet si trup: si organizëm i gjallë mes industrisë, bujqësisë, artizanatit, rrugëve e skenave, duke pyetur çfarë "merr frymë" dhe çfarë është "pa frymë".`,
  `Në të njëjtën kohë, fryma na e kujton privilegjin dhe borxhin ekologjik: oksigjeni si dhuratë e sistemeve natyrore, por edhe ajri si e përbashkët që ndikohet nga ndotja, djegiet, trafiku, pluhuri, pesticidet, kushtet e brendshme të banimit. Këtu fotografia mund të bëhet një formë vëmendjeje publike: sa kushton një frymë dhe kush e paguan? Dhe, në fund, vjen pyetja e epokës sonë: kur makinat mund të simulojnë kaq shumë, çfarë mbetet e pagabueshme si shenjë e së gjallës? Mes imazhit sintetik dhe imazhit të mishëruar, mes "syrit të makinerisë" dhe përvojës së trupit — mushkëri, zemër, kohë — kjo temë kërkon një fotografi që nuk e kopjon jetën, por e dëshmon atë.`,
  `FRYMË / BREATH është, pra, një ftesë për të fotografuar jo vetëm atë që shihet, por atë që na mban: ritmin e padukshëm të qenies, kushtet e jetës, politikën e ajrit, dhe aftësinë njerëzore për t'i dhënë frymë botës — me një imazh, me një kujtesë, me një akt të thjeshtë pranie. Pyetja mbetet e hapur, por bëhet më e mprehtë: çfarë, në një fotografi, ende ndihet pa asnjë dyshim e gjallë?`,
];

const ENTRY_DOORS = [
  {
    number: '01',
    title: 'Intimate Breath',
    titleAl: 'Fryma Intime',
    description: 'Fragile moments where a single second changes everything — waiting, panic, relief, survival, intimacy. Breath as the invisible threshold between states of being.',
    descriptionAl: 'Momente të brishta ku një sekondë ndryshon gjithçka — pritje, panik, lehtësim, mbijetesë, intimitet. Fryma si pragun e padukshëm mes gjendjeve të qenies.',
  },
  {
    number: '02',
    title: 'Invisible Traces',
    titleAl: 'Gjurmët e Padukshme',
    description: 'Small signs where the invisible appears as a trace — condensation, fog on glass, steam, wind in fabric, in hair, in grass. Photographs of what cannot be seen, but only felt.',
    descriptionAl: 'Shenja të vogla ku e padukshmja shfaqet si gjurmë — kondensim, mjegull në xham, avull, era në pëlhurë, në flokë, në bar. Fotografi e asaj që nuk shihet, por ndihet.',
  },
  {
    number: '03',
    title: 'Animated Memory',
    titleAl: 'Kujtesa e Gjallëruar',
    description: 'Giving breath to places, objects, archives, and memories — stories that risk remaining voiceless. The city as a living body: what breathes, and what is out of breath?',
    descriptionAl: 'T\'u japim frymë vendeve, objekteve, arkivave dhe kujtimeve — histori që rrezikojnë të mbeten pa zë. Qyteti si trup i gjallë: çfarë "merr frymë" dhe çfarë është "pa frymë"?',
  },
  {
    number: '04',
    title: 'Air as Commons',
    titleAl: 'Ajri si E Përbashkët',
    description: 'Oxygen as a gift of natural systems, but also air as a shared commons shaped by pollution, burning, traffic, dust, and pesticides. What does one breath cost, and who pays for it?',
    descriptionAl: 'Oksigjeni si dhuratë e sistemeve natyrore, por edhe ajri si e përbashkët që ndikohet nga ndotja, djegiet, trafiku, pluhuri, pesticidet. Sa kushton një frymë dhe kush e paguan?',
  },
  {
    number: '05',
    title: 'The Living Image',
    titleAl: 'Imazhi i Gjallë',
    description: 'When machines can simulate so much, what remains unmistakable as a sign of the living? Photography between the synthetic and the embodied — lungs, heart, time — that bears witness to life, not copies it.',
    descriptionAl: 'Kur makinat mund të simulojnë kaq shumë, çfarë mbetet e pagabueshme si shenjë e së gjallës? Fotografia mes imazhit sintetik dhe atij të mishëruar — mushkëri, zemër, kohë — që dëshmon jetën.',
  },
];

const JURY_CRITERIA = [
  { label: 'Coherence with the theme', detail: 'How clearly and deeply the project articulates breath — intimate, social, ecological, or creative.' },
  { label: 'Visual & narrative strength', detail: 'Composition, rhythm, use of light, consistency of the series, ability to hold attention.' },
  { label: 'Originality of perspective', detail: 'Avoiding clichés; discovering a new form of the "invisible."' },
  { label: 'Ethical sensitivity', detail: 'Respect for subjects, context, and the consequences of representation — especially in topics such as health, trauma, poverty, or pollution.' },
  { label: 'Local relevance / universality', detail: 'Connection to concrete realities and the ability to speak beyond them.' },
  { label: 'Photographic integrity', detail: 'Clarity about process and limits of manipulation; exclusion of AI-generated images.' },
];

export default function ThemePage() {
  const [lang, setLang] = useState<'en' | 'al'>('en');
  const [edition, setEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('editions')
      .select('*')
      .eq('published', true)
      .order('year', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setEdition(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const conceptParagraphs = lang === 'en' ? CONCEPT_EN : CONCEPT_AL;

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-10"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=1920&h=800&fit=crop)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-950/95 to-surface-950" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-block text-primary-400 text-xs font-semibold uppercase tracking-[0.3em] mb-6 border border-primary-400/30 px-4 py-1.5 rounded-full"
          >
            IFFA 17 · 2026 Edition
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-6xl md:text-7xl font-display font-bold text-white mt-2 mb-6 leading-none tracking-tight"
          >
            FRYMË
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-primary-400">
              BREATH
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-surface-300 font-display italic max-w-2xl mx-auto leading-relaxed"
          >
            "the invisible rhythm of being, the conditions of life, the politics of air"
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-10 flex items-center justify-center gap-4 flex-wrap text-sm text-surface-400"
          >
            {edition?.status === 'open' && (
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Submissions Open
              </span>
            )}
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary-400" />
              Deadline: <strong className="text-white">30 June 2026</strong>
            </span>
          </motion.div>
        </div>
      </section>

      {/* ── Opening quote ── */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.blockquote
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <span className="absolute -top-6 left-0 text-7xl text-primary-400/20 font-display leading-none select-none">"</span>
            <p className="text-2xl md:text-3xl font-display italic text-surface-100 leading-relaxed px-8">
              {lang === 'en'
                ? 'BREATH is the most ordinary miracle: constant, unconscious, and taken for granted until the loss of a single breath changes everything.'
                : 'FRYMË / BREATH është mrekullia më e zakonshme: e pandërprerë, e pavetëdijshme dhe e marrë si e mirëqenë, derisa humbja e një fryme të vetme ndryshon gjithçka.'}
            </p>
            <span className="absolute -bottom-8 right-0 text-7xl text-primary-400/20 font-display leading-none select-none rotate-180">"</span>
          </motion.blockquote>
        </div>
      </section>

      {/* ── Concept essay ── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Language toggle */}
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-2xl font-display font-bold text-white">The Concept</h2>
            <div className="flex rounded-lg overflow-hidden border border-surface-700">
              <button
                onClick={() => setLang('en')}
                className={`px-5 py-2 text-sm font-semibold transition-colors ${
                  lang === 'en' ? 'bg-primary-500 text-white' : 'text-surface-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('al')}
                className={`px-5 py-2 text-sm font-semibold transition-colors ${
                  lang === 'al' ? 'bg-primary-500 text-white' : 'text-surface-400 hover:text-white'
                }`}
              >
                AL
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {conceptParagraphs.map((paragraph, i) => (
              <motion.p
                key={`${lang}-${i}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="text-lg text-surface-200 leading-relaxed"
              >
                {paragraph}
              </motion.p>
            ))}
          </div>
        </div>
      </section>

      {/* ── Five entry doors ── */}
      <section className="py-24 bg-surface-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-primary-400 text-xs font-semibold uppercase tracking-widest">Thematic directions</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mt-3">
              Five Doors into the Theme
            </h2>
            <p className="text-surface-400 mt-3 max-w-xl mx-auto">
              Your submission should address at least one of these approaches. State which door your project enters through.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ENTRY_DOORS.map((door, i) => (
              <motion.div
                key={door.number}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className={`p-7 rounded-2xl border bg-surface-900 border-surface-700 hover:border-primary-500/50 transition-colors ${
                  i === 4 ? 'md:col-span-2 lg:col-span-1' : ''
                }`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <span className="text-3xl font-display font-black text-primary-500/30 leading-none">
                    {door.number}
                  </span>
                  <div>
                    <h3 className="text-lg font-display font-bold text-white">{door.title}</h3>
                    <p className="text-sm text-gold-400 italic">{door.titleAl}</p>
                  </div>
                </div>
                <p className="text-sm text-surface-300 leading-relaxed">
                  {lang === 'en' ? door.description : door.descriptionAl}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Submission guidelines ── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <span className="text-primary-400 text-xs font-semibold uppercase tracking-widest">How to apply</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mt-3">Submission Guidelines</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Who can apply */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
              className="p-7 rounded-2xl bg-surface-900 border border-surface-800"
            >
              <h3 className="text-base font-semibold text-primary-400 uppercase tracking-wider mb-4">Who can apply</h3>
              <ul className="space-y-2 text-surface-300 text-sm">
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />Professional and emerging photographers (18+)</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />Projects may be previously produced or new</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />Must clearly relate to the theme "Breath"</li>
              </ul>
            </motion.div>

            {/* Works & format */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
              className="p-7 rounded-2xl bg-surface-900 border border-surface-800"
            >
              <h3 className="text-base font-semibold text-primary-400 uppercase tracking-wider mb-4">Works & Format</h3>
              <ul className="space-y-2 text-surface-300 text-sm">
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />Series: <strong className="text-white">6–12 images</strong> (one project)</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />Single image: <strong className="text-white">1–3 images</strong> maximum</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />Format: <strong className="text-white">JPEG, sRGB</strong>, 2500–4000 px long side</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />Documentary, conceptual, portrait, landscape, experimental</li>
              </ul>
            </motion.div>

            {/* Required texts */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp}
              className="p-7 rounded-2xl bg-surface-900 border border-surface-800"
            >
              <h3 className="text-base font-semibold text-primary-400 uppercase tracking-wider mb-4">Accompanying Texts</h3>
              <ul className="space-y-2 text-surface-300 text-sm">
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />Project title + image titles, year, location</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Short <strong className="text-white">statement</strong>: how the project relates to "Breath" and which of the 5 entry doors it addresses most
                </li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />Short <strong className="text-white">bio</strong> (max 100 words) + contact</li>
              </ul>
            </motion.div>

            {/* Rights */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} custom={3} variants={fadeUp}
              className="p-7 rounded-2xl bg-surface-900 border border-surface-800"
            >
              <h3 className="text-base font-semibold text-primary-400 uppercase tracking-wider mb-4">Copyright & Usage</h3>
              <ul className="space-y-2 text-surface-300 text-sm">
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />Author retains full rights to their work</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Organizer receives a <strong className="text-white">non-exclusive</strong> right for exhibition/communication (online/print) only for promoting the competition, with full credit
                </li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />Winners may be asked to submit hi-res files for printing</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Prizes + Jury criteria ── */}
      <section className="py-24 bg-surface-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">

            {/* Prizes */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
              className="p-8 rounded-2xl bg-surface-900 border border-surface-800"
            >
              <h3 className="text-2xl font-display font-bold text-white mb-8 flex items-center gap-3">
                <Award className="h-6 w-6 text-gold-400" />
                Prizes
              </h3>
              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-gradient-to-r from-gold-500/10 to-transparent border border-gold-500/30">
                  <p className="text-xs font-semibold text-gold-400 uppercase tracking-widest mb-1">Main Theme — BREATH</p>
                  <p className="text-3xl font-bold text-white">€1,000</p>
                  <p className="text-sm text-surface-400 mt-1">Cash prize + Trophy</p>
                </div>
                <div className="p-5 rounded-xl bg-gradient-to-r from-gold-500/10 to-transparent border border-gold-500/30">
                  <p className="text-xs font-semibold text-gold-400 uppercase tracking-widest mb-1">Press & News</p>
                  <p className="text-3xl font-bold text-white">€1,000</p>
                  <p className="text-sm text-surface-400 mt-1">Cash prize + Trophy</p>
                </div>
                <div className="p-5 rounded-xl bg-surface-800/60 border border-surface-700">
                  <p className="text-xs font-semibold text-surface-400 uppercase tracking-widest mb-1">Land · Life · Portrait</p>
                  <p className="text-xl font-bold text-white">Honorary Award</p>
                  <p className="text-sm text-surface-400 mt-1">Certificate + Trophy</p>
                </div>
              </div>
            </motion.div>

            {/* Jury criteria */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
              className="p-8 rounded-2xl bg-surface-900 border border-surface-800"
            >
              <h3 className="text-2xl font-display font-bold text-white mb-8">Jury Criteria</h3>
              <div className="space-y-4">
                {JURY_CRITERIA.map((c, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-primary-500/15 border border-primary-500/40 flex items-center justify-center text-xs font-bold text-primary-400">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{c.label}</p>
                      <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">{c.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Rules ── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <span className="text-primary-400 text-xs font-semibold uppercase tracking-widest">Technical requirements</span>
            <h2 className="text-3xl font-display font-bold text-white mt-3">Rules</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Photo period + Accepted */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
              className="space-y-6"
            >
              <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
                <h4 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Photo Period
                </h4>
                <p className="text-surface-200 font-semibold">2022 – 2026</p>
              </div>

              <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
                <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Check className="h-4 w-4" /> Accepted processing
                </h4>
                <ul className="space-y-2 text-sm text-surface-300">
                  {['Cropping', 'Contrast and exposure changes', 'Color correction', 'Desaturation', 'Minimal retouching'].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Not accepted + AI notice */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
              className="space-y-6"
            >
              <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
                <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <XIcon className="h-4 w-4" /> Not accepted
                </h4>
                <ul className="space-y-2 text-sm text-surface-300">
                  {[
                    'Importing elements from other photos',
                    'Cloning and deleting parts of the photo',
                    'AI-generated images (text-to-image / image generation)',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <XIcon className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-200">
                  <p className="font-semibold mb-1">Composites & collages</p>
                  <p className="text-amber-300/80">Works with major interventions require full transparency about the process in your statement.</p>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-red-500/5 border border-red-500/20 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">
                  AI-generated images are strictly excluded. This competition celebrates photography that bears witness to life — not simulations of it.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
