import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowLeft, Award, Calendar, Check, X as XIcon, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Edition } from '@/types';

/* ── Animation ── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6 },
  }),
};

/* ── Theme essay content ── */
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
  { number: '01', title: 'Intimate Breath', titleAl: 'Fryma Intime', description: 'Fragile moments where a single second changes everything — waiting, panic, relief, survival, intimacy.', descriptionAl: 'Momente të brishta ku një sekondë ndryshon gjithçka — pritje, panik, lehtësim, mbijetesë, intimitet.' },
  { number: '02', title: 'Invisible Traces', titleAl: 'Gjurmët e Padukshme', description: 'Small signs where the invisible appears as a trace — condensation, fog on glass, steam, wind in fabric.', descriptionAl: 'Shenja të vogla ku e padukshmja shfaqet si gjurmë — kondensim, mjegull në xham, avull, era në pëlhurë.' },
  { number: '03', title: 'Animated Memory', titleAl: 'Kujtesa e Gjallëruar', description: 'Giving breath to places, objects, archives, and memories — stories that risk remaining voiceless.', descriptionAl: 'T\'u japim frymë vendeve, objekteve, arkivave dhe kujtimeve — histori që rrezikojnë të mbeten pa zë.' },
  { number: '04', title: 'Air as Commons', titleAl: 'Ajri si E Përbashkët', description: 'Oxygen as a gift of natural systems, but also air shaped by pollution, burning, traffic. What does one breath cost?', descriptionAl: 'Oksigjeni si dhuratë e sistemeve natyrore, por edhe ajri i ndikuar nga ndotja, djegiet, trafiku. Sa kushton një frymë?' },
  { number: '05', title: 'The Living Image', titleAl: 'Imazhi i Gjallë', description: 'When machines simulate so much, what remains unmistakable as a sign of the living? Photography that bears witness to life.', descriptionAl: 'Kur makinat simulojnë kaq shumë, çfarë mbetet e pagabueshme si shenjë e së gjallës? Fotografia që dëshmon jetën.' },
];

/* ── Category data ── */
interface CategoryData {
  slug: string;
  title: string;
  titleAl: string;
  heroImage: string;
  accent: string;
  textColor: string;
  borderColor: string;
  prize: string;
  prizeLabel: string;
  format: string;
  subcategories?: { name: string; nameAl: string; prize: string }[];
  description: string;
  descriptionAl: string;
  photoRules: string;
}

const CATEGORY_DATA: Record<string, CategoryData> = {
  theme: {
    slug: 'theme',
    title: 'Theme — BREATH',
    titleAl: 'Tema — FRYMË',
    heroImage: 'https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=1920&h=800&fit=crop',
    accent: 'gold',
    textColor: 'text-gold-400',
    borderColor: 'border-gold-500/40',
    prize: '€1,000',
    prizeLabel: 'Cash prize + Trophy',
    format: 'Series (6–12 images) or Single (1–3 images)',
    description: 'The main theme category invites photographers to explore BREATH / FRYMË — the invisible rhythm of being, the conditions of life, the politics of air, and the human capacity to breathe life into the world. Submissions should address at least one of five thematic entry doors.',
    descriptionAl: 'Kategoria kryesore fton fotografët të eksplorojnë FRYMË / BREATH — ritmin e padukshëm të qenies, kushtet e jetës, politikën e ajrit, dhe aftësinë njerëzore për t\'i dhënë frymë botës. Aplikimet duhet të adresojnë të paktën një nga pesë drejtimet tematike.',
    photoRules: 'Photos taken between 2022–2026. JPEG, sRGB, 2500–4000 px long side.',
  },
  'press-news': {
    slug: 'press-news',
    title: 'Press & News',
    titleAl: 'Shtypi & Lajmet',
    heroImage: 'https://images.unsplash.com/photo-1504711434969-e33886168d9c?w=1920&h=800&fit=crop',
    accent: 'blue',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/40',
    prize: '€1,000',
    prizeLabel: 'Cash prize + Trophy',
    format: 'Series (6–12 images) or Single (1–3 images)',
    description: 'Photos with informative and social value from news-worthy events, sports, daily life moments, and social phenomena captured between 2022–2025. This category celebrates photojournalism and documentary photography — images that inform, challenge, and bear witness to the world around us.',
    descriptionAl: 'Foto me vlerë informative dhe shoqërore nga ngjarje të rëndësishme lajmesh, sport, momente të jetës së përditshme dhe fenomene sociale të kapura mes 2022–2025. Kjo kategori feston fotojournalizmin dhe fotografinë dokumentare.',
    photoRules: 'Photos taken between 2022–2025. JPEG, sRGB, 2500–4000 px long side.',
  },
  life: {
    slug: 'life',
    title: 'Life',
    titleAl: 'Jeta',
    heroImage: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1920&h=800&fit=crop',
    accent: 'emerald',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    prize: '2 × €500',
    prizeLabel: 'Cash prize per sub-category',
    format: 'Up to 6 images per sub-category',
    subcategories: [
      { name: 'Best Street Photography', nameAl: 'Fotografia më e Mirë e Rrugës', prize: '€500' },
      { name: 'Best Portrait', nameAl: 'Portreti më i Mirë', prize: '€500' },
    ],
    description: 'Style, fashion, objects, products, people, weddings, architecture — the beauty of everyday life captured through the lens. This category is divided into two sub-awards: Street Photography and Portrait, each recognizing distinct approaches to photographing human life and culture.',
    descriptionAl: 'Stili, moda, objekte, produkte, njerëz, dasma, arkitektura — bukuria e jetës së përditshme e kapur përmes objektivit. Kjo kategori ndahet në dy nën-çmime: Fotografia e Rrugës dhe Portreti.',
    photoRules: 'Photos taken between 2022–2026. JPEG, sRGB, 2500–4000 px long side. 1 photo per sub-category entry.',
  },
  land: {
    slug: 'land',
    title: 'Land',
    titleAl: 'Toka',
    heroImage: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&h=800&fit=crop',
    accent: 'sky',
    textColor: 'text-sky-400',
    borderColor: 'border-sky-500/40',
    prize: '2 × €500',
    prizeLabel: 'Cash prize per sub-category',
    format: 'Up to 6 images per sub-category',
    subcategories: [
      { name: 'Best Landscape', nameAl: 'Peizazhi më i Mirë', prize: '€500' },
      { name: 'Best Wild World', nameAl: 'Bota e Egër më e Mirë', prize: '€500' },
    ],
    description: 'Landscape, animals, plants, natural processes — celebrating the beauty of nature and the importance of environmental protection. This category recognizes excellence in two sub-awards: Landscape Photography and Wildlife Photography.',
    descriptionAl: 'Peizazhi, kafshët, bimët, proceset natyrore — duke festuar bukurinë e natyrës dhe rëndësinë e mbrojtjes së mjedisit. Kjo kategori njeh ekselencën në dy nën-çmime: Fotografia e Peizazhit dhe Fotografia e Botës së Egër.',
    photoRules: 'Photos taken between 2022–2026. JPEG, sRGB, 2500–4000 px long side. 1 photo per sub-category entry.',
  },
};

const JURY_CRITERIA = [
  { label: 'Coherence with the theme', detail: 'How clearly and deeply the project articulates breath — intimate, social, ecological, or creative.' },
  { label: 'Visual & narrative strength', detail: 'Composition, rhythm, use of light, consistency of the series, ability to hold attention.' },
  { label: 'Originality of perspective', detail: 'Avoiding clichés; discovering a new form of the "invisible."' },
  { label: 'Ethical sensitivity', detail: 'Respect for subjects, context, and the consequences of representation.' },
  { label: 'Local relevance / universality', detail: 'Connection to concrete realities and the ability to speak beyond them.' },
  { label: 'Photographic integrity', detail: 'Clarity about process and limits of manipulation; exclusion of AI-generated images.' },
];

export default function CategoryDetailPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const lang = i18n.language === 'al' ? 'al' : 'en';
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

  const cat = categorySlug ? CATEGORY_DATA[categorySlug] : null;
  if (!cat) return <Navigate to="/apply" replace />;

  const isOpen = edition?.status === 'open';
  const isTheme = cat.slug === 'theme';
  const conceptParagraphs = lang === 'en' ? CONCEPT_EN : CONCEPT_AL;

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img src={cat.heroImage} alt={cat.title} className="w-full h-full object-cover opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-surface-950/95 to-surface-950" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <Link to="/apply" className="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-primary-400 transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" /> {lang === 'en' ? 'All Categories' : 'Të gjitha Kategoritë'}
          </Link>

          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`inline-block text-xs font-semibold uppercase tracking-[0.3em] ${cat.textColor} mb-3 border ${cat.borderColor} px-4 py-1.5 rounded-full`}
          >
            IFFA 17 · 2026
          </motion.span>

          {isTheme ? (
            <>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-5xl md:text-6xl font-display font-bold text-white leading-none tracking-tight"
              >
                FRYMË
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-primary-400">
                  BREATH
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-surface-300 font-display italic max-w-2xl leading-relaxed mt-4"
              >
                "the invisible rhythm of being, the conditions of life, the politics of air"
              </motion.p>
            </>
          ) : (
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-5xl md:text-6xl font-display font-bold text-white leading-none tracking-tight"
            >
              {lang === 'al' ? cat.titleAl : cat.title}
            </motion.h1>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-6 flex items-center gap-4 flex-wrap text-sm text-surface-400"
          >
            {isOpen && (
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {lang === 'en' ? 'Submissions Open' : 'Aplikimet Hapur'}
              </span>
            )}
            <span className="flex items-center gap-2">
              <Award className={`h-4 w-4 ${cat.textColor}`} />
              <strong className="text-white">{cat.prize}</strong> {cat.prizeLabel}
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary-400" />
              {lang === 'en' ? 'Deadline:' : 'Afati:'} <strong className="text-white">30 June 2026</strong>
            </span>
          </motion.div>
        </div>
      </section>

      {/* ── Description ── */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-display font-bold text-white mb-6">
            {lang === 'en' ? 'About this Category' : 'Rreth kësaj Kategorie'}
          </h2>
          <p className="text-lg text-surface-200 leading-relaxed">
            {lang === 'al' ? cat.descriptionAl : cat.description}
          </p>

          {/* Subcategories */}
          {cat.subcategories && (
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {cat.subcategories.map((sub, i) => (
                <motion.div
                  key={sub.name}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  variants={fadeUp}
                  className={`p-5 rounded-xl bg-surface-900 border ${cat.borderColor}`}
                >
                  <p className={`text-xs font-semibold ${cat.textColor} uppercase tracking-widest mb-1`}>
                    {lang === 'al' ? sub.nameAl : sub.name}
                  </p>
                  <p className="text-2xl font-bold text-white">{sub.prize}</p>
                  <p className="text-sm text-surface-400 mt-1">{cat.format}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Format & rules summary */}
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-surface-900 border border-surface-800">
              <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-2">Format</h3>
              <p className="text-sm text-surface-300">{cat.format}</p>
            </div>
            <div className="p-5 rounded-xl bg-surface-900 border border-surface-800">
              <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-2">
                {lang === 'en' ? 'Technical Requirements' : 'Kërkesat Teknike'}
              </h3>
              <p className="text-sm text-surface-300">{cat.photoRules}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Theme-only: Concept Essay ── */}
      {isTheme && (
        <>
          {/* Opening quote */}
          <section className="py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <blockquote className="relative">
                <span className="absolute -top-6 left-0 text-7xl text-primary-400/20 font-display leading-none select-none">"</span>
                <p className="text-2xl md:text-3xl font-display italic text-surface-100 leading-relaxed px-8">
                  {lang === 'en'
                    ? 'BREATH is the most ordinary miracle: constant, unconscious, and taken for granted until the loss of a single breath changes everything.'
                    : 'FRYMË / BREATH është mrekullia më e zakonshme: e pandërprerë, e pavetëdijshme dhe e marrë si e mirëqenë, derisa humbja e një fryme të vetme ndryshon gjithçka.'}
                </p>
                <span className="absolute -bottom-8 right-0 text-7xl text-primary-400/20 font-display leading-none select-none rotate-180">"</span>
              </blockquote>
            </div>
          </section>

          {/* Essay */}
          <section className="py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-display font-bold text-white mb-10">{lang === 'en' ? 'The Concept' : 'Koncepti'}</h2>
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

          {/* Five entry doors */}
          <section className="py-20 bg-surface-900/40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-14">
                <span className="text-primary-400 text-xs font-semibold uppercase tracking-widest">{lang === 'en' ? 'Thematic directions' : 'Drejtimet tematike'}</span>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-white mt-3">
                  {lang === 'en' ? 'Five Doors into the Theme' : 'Pesë Dyer në Temë'}
                </h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ENTRY_DOORS.map((door, i) => (
                  <motion.div
                    key={door.number}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    custom={i}
                    variants={fadeUp}
                    className={`p-7 rounded-2xl border bg-surface-900 border-surface-700 hover:border-primary-500/50 transition-colors ${i === 4 ? 'md:col-span-2 lg:col-span-1' : ''}`}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <span className="text-3xl font-display font-black text-primary-500/30 leading-none">{door.number}</span>
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
        </>
      )}

      {/* ── Submission Guidelines ── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-primary-400 text-xs font-semibold uppercase tracking-widest">{lang === 'en' ? 'How to apply' : 'Si të aplikoni'}</span>
            <h2 className="text-3xl font-display font-bold text-white mt-3">{lang === 'en' ? 'Submission Guidelines' : 'Udhëzimet e Aplikimit'}</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800">
              <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-4">{lang === 'en' ? 'Who can apply' : 'Kush mund të aplikojë'}</h3>
              <ul className="space-y-2 text-surface-300 text-sm">
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />{lang === 'en' ? 'Professional and emerging photographers (18+)' : 'Fotografë profesionistë dhe në zhvillim (18+)'}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />{lang === 'en' ? 'Projects may be previously produced or new' : 'Projektet mund të jenë të prodhuara më parë ose të reja'}</li>
              </ul>
            </div>
            <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800">
              <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-4">{lang === 'en' ? 'Copyright & Usage' : 'E drejta e autorit'}</h3>
              <ul className="space-y-2 text-surface-300 text-sm">
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />{lang === 'en' ? 'Author retains full rights to their work' : 'Autori ruan të drejtat e plota mbi punën e tij'}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />{lang === 'en' ? 'Non-exclusive use for exhibition/communication only' : 'Përdorim jo-ekskluziv vetëm për ekspozitë/komunikim'}</li>
              </ul>
            </div>
            <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800">
              <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Check className="h-4 w-4" /> {lang === 'en' ? 'Accepted' : 'E pranueshme'}
              </h3>
              <ul className="space-y-1.5 text-sm text-surface-300">
                {['Cropping', 'Contrast and exposure changes', 'Color correction', 'Desaturation', 'Minimal retouching'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800">
              <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <XIcon className="h-4 w-4" /> {lang === 'en' ? 'Not accepted' : 'E papranueshme'}
              </h3>
              <ul className="space-y-1.5 text-sm text-surface-300">
                {['Importing elements from other photos', 'Cloning and deleting parts', 'AI-generated images'].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <XIcon className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <div className="mt-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">AI-generated images are strictly excluded.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Jury Criteria (theme only) ── */}
      {isTheme && (
        <section className="py-20 bg-surface-900/40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-display font-bold text-white mb-8">{lang === 'en' ? 'Jury Criteria' : 'Kriteret e Jurisë'}</h2>
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
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      {isOpen && (
        <section className="py-16">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-display font-bold text-white mb-4">
              {lang === 'en' ? 'Ready to Submit?' : 'Gati për të Dërguar?'}
            </h2>
            <p className="text-surface-400 mb-6">
              {lang === 'en'
                ? 'Create your account and submit your work before the deadline.'
                : 'Krijoni llogarinë tuaj dhe dërgoni punën para afatit.'}
            </p>
            <Link to={isAuthenticated ? '/dashboard/submissions/new' : '/register'}>
              <Button variant="gold" size="lg" icon={<ArrowRight className="h-5 w-5" />}>
                {isAuthenticated
                  ? (lang === 'en' ? 'Submit Your Work' : 'Dërgo Punën Tënde')
                  : (lang === 'en' ? 'Register & Submit' : 'Regjistrohu & Dërgo')}
              </Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
