import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
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
  prizeLabelAl: string;
  format: string;
  formatAl: string;
  subcategories?: { name: string; nameAl: string; prize: string }[];
  objective: string;
  objectiveAl: string;
  description: string;
  descriptionAl: string;
  photoRules: string;
  photoRulesAl: string;
  extraRequirement?: string;
  extraRequirementAl?: string;
  customAccepted?: string[];
  customAcceptedAl?: string[];
  customRejected?: string[];
  customRejectedAl?: string[];
}

const CATEGORY_DATA: Record<string, CategoryData> = {
  'main-theme-breath': {
    slug: 'main-theme-breath',
    title: 'Main Theme — BREATH',
    titleAl: 'Tema Kryesore — FRYMË',
    heroImage: 'https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=1920&h=800&fit=crop',
    accent: 'gold',
    textColor: 'text-gold-400',
    borderColor: 'border-gold-500/40',
    prize: '€1,000',
    prizeLabel: 'Cash prize + Trophy',
    prizeLabelAl: 'Çmim monetar + Trofe',
    format: '1 image',
    formatAl: '1 imazh',
    objective: 'To identify and recognize the photograph that most powerfully and originally interprets the theme BREATH — through intimate, social, ecological, or creative dimensions of breathing and being alive.',
    objectiveAl: 'Të identifikojë dhe njohë fotografinë që interpreton më fuqishëm dhe origjinalisht temën FRYMË — përmes dimensioneve intime, sociale, ekologjike ose krijuese të frymëmarrjes dhe të qenies gjallë.',
    description: 'The main theme category invites photographers to explore BREATH / FRYMË — the invisible rhythm of being, the conditions of life, the politics of air, and the human capacity to breathe life into the world. Submissions should address at least one of five thematic entry doors: Intimate Breath, Invisible Traces, Animated Memory, Air as Commons, or The Living Image.',
    descriptionAl: 'Kategoria kryesore fton fotografët të eksplorojnë FRYMË / BREATH — ritmin e padukshëm të qenies, kushtet e jetës, politikën e ajrit, dhe aftësinë njerëzore për t\'i dhënë frymë botës. Aplikimet duhet të adresojnë të paktën një nga pesë drejtimet tematike: Fryma Intime, Gjurmët e Padukshme, Kujtesa e Gjallëruar, Ajri si E Përbashkët, ose Imazhi i Gjallë.',
    photoRules: 'Photos taken between 2022–2026. JPEG, sRGB, 2500–4000 px long side.',
    photoRulesAl: 'Foto të realizuara mes 2022–2026. JPEG, sRGB, 2500–4000 px ana e gjatë.',
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
    prizeLabelAl: 'Çmim monetar + Trofe',
    format: '1 image',
    formatAl: '1 imazh',
    objective: 'To identify and recognize a picture which holds the best informative and social value. This category includes all pictures taken in news-worthy events, sports, and pictures that hold a social meaning produced by media professionals.',
    objectiveAl: 'Të identifikojë dhe njohë një fotografi që mban vlerën më të mirë informative dhe sociale. Kjo kategori përfshin të gjitha fotografitë e realizuara në ngjarje me vlerë lajmi, sport, dhe fotografi që mbajnë një kuptim social të prodhuara nga profesionistë të medias.',
    description: 'Photos with informative and social value from news-worthy events, sports, daily life moments, and social phenomena captured between 2022–2025. The picture must be accompanied by a short written explanation specifying the date, location, and description of the event. This category celebrates photojournalism and documentary photography — images that inform, challenge, and bear witness to the world around us.',
    descriptionAl: 'Foto me vlerë informative dhe shoqërore nga ngjarje me vlerë lajmi, sport, momente të jetës së përditshme dhe fenomene sociale të kapura mes 2022–2025. Fotografia duhet të shoqërohet me një shpjegim të shkurtër me shkrim duke specifikuar datën, vendndodhjen dhe përshkrimin e ngjarjes. Kjo kategori feston fotojournalizmin dhe fotografinë dokumentare — imazhe që informojnë, sfidojnë dhe dëshmojnë botën rreth nesh.',
    photoRules: 'Photos taken between 2022–2025. JPEG, sRGB, 2500–4000 px long side.',
    photoRulesAl: 'Foto të realizuara mes 2022–2025. JPEG, sRGB, 2500–4000 px ana e gjatë.',
    extraRequirement: 'In the application process, the event must be specified by providing the date, location, and a description of it.',
    extraRequirementAl: 'Në procesin e aplikimit, ngjarja duhet të specifikohet duke dhënë datën, vendndodhjen dhe një përshkrim të saj.',
    customAccepted: ['Cropping', 'Contrast and exposure changes', 'Color correction', 'Desaturation', 'HDR', 'Mixing two or three frames into one (same country, same time frame)'],
    customAcceptedAl: ['Prerja', 'Ndryshime kontrasti dhe ekspozimi', 'Korrigjim ngjyre', 'Deaturim', 'HDR', 'Bashkimi i dy ose tri kornizave në një (i njëjti vend, i njëjti interval kohor)'],
    customRejected: ['Importing elements from other photos', 'Importing from the same scene on another day', 'Any technique not in the allowed list', 'AI-generated images'],
    customRejectedAl: ['Importimi i elementeve nga foto të tjera', 'Importimi nga e njëjta skenë në një ditë tjetër', 'Çdo teknikë që nuk është në listën e lejuar', 'Imazhe të gjeneruara nga IA'],
  },
  'life-best-street-photography': {
    slug: 'life-best-street-photography',
    title: 'Life — Best Street Photography',
    titleAl: 'Jeta — Fotografia më e Mirë e Rrugës',
    heroImage: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1920&h=800&fit=crop',
    accent: 'emerald',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    prize: '€500',
    prizeLabel: 'Cash prize',
    prizeLabelAl: 'Çmim monetar',
    format: 'Up to 6 images',
    formatAl: 'Deri në 6 imazhe',
    objective: 'To celebrate the art of street photography — the ability to observe, anticipate, and capture the unscripted beauty of everyday life in public spaces, revealing the extraordinary within the ordinary.',
    objectiveAl: 'Të festojë artin e fotografisë së rrugës — aftësinë për të vëzhguar, parashikuar dhe kapur bukurinë e pa-skriptuar të jetës së përditshme në hapësira publike, duke zbuluar të jashtëzakonshmen brenda të zakonshmes.',
    description: 'Candid and authentic moments captured in public spaces — the art of observing and freezing everyday life as it unfolds on the streets. This category honors photographers with the patience and instinct to find striking compositions, human interactions, humor, drama, or quiet poetry in the rhythms of urban and rural life.',
    descriptionAl: 'Momente autentike të kapura në hapësira publike — arti i vëzhgimit dhe ngrirjes së jetës së përditshme siç zhvillohet në rrugë. Kjo kategori nderon fotografët me durimin dhe instinktin për të gjetur kompozicione mahnitëse, ndërveprime njerëzore, humor, dramë ose poezi të qetë në ritmet e jetës urbane dhe rurale.',
    photoRules: 'Photos taken between 2022–2026. JPEG, sRGB, 2500–4000 px long side.',
    photoRulesAl: 'Foto të realizuara mes 2022–2026. JPEG, sRGB, 2500–4000 px ana e gjatë.',
  },
  'life-best-portrait': {
    slug: 'life-best-portrait',
    title: 'Life — Best Portrait',
    titleAl: 'Jeta — Portreti më i Mirë',
    heroImage: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=1920&h=800&fit=crop',
    accent: 'violet',
    textColor: 'text-violet-400',
    borderColor: 'border-violet-500/40',
    prize: '€500',
    prizeLabel: 'Cash prize',
    prizeLabelAl: 'Çmim monetar',
    format: 'Up to 6 images',
    formatAl: 'Deri në 6 imazhe',
    objective: 'To recognize outstanding portrait photography that goes beyond surface appearance — capturing character, emotion, vulnerability, strength, and the depth of human identity through a single frame or a series.',
    objectiveAl: 'Të njohë fotografinë e jashtëzakonshme të portretit që shkon përtej pamjes sipërfaqësore — duke kapur karakterin, emocionin, cenueshmërinë, forcën dhe thellësinë e identitetit njerëzor përmes një kornize të vetme ose serisë.',
    description: 'Compelling portrait work that reveals character, emotion, and the human condition through the lens. This category recognizes photographers who capture the depth and complexity of individual identity — from environmental portraits to intimate close-ups, from documentary portraiture to conceptual explorations of the self.',
    descriptionAl: 'Punë portretesh bindëse që zbulojnë karakterin, emocionin dhe gjendjen njerëzore përmes objektivit. Kjo kategori njeh fotografët që kapin thellësinë dhe kompleksitetin e identitetit individual — nga portretet mjedisore te afërsirat intime, nga portretistika dokumentare te eksplorime konceptuale të vetvetes.',
    photoRules: 'Photos taken between 2022–2026. JPEG, sRGB, 2500–4000 px long side.',
    photoRulesAl: 'Foto të realizuara mes 2022–2026. JPEG, sRGB, 2500–4000 px ana e gjatë.',
  },
  'land-best-landscape': {
    slug: 'land-best-landscape',
    title: 'Land — Best Landscape',
    titleAl: 'Toka — Peizazhi më i Mirë',
    heroImage: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&h=800&fit=crop',
    accent: 'sky',
    textColor: 'text-sky-400',
    borderColor: 'border-sky-500/40',
    prize: '€500',
    prizeLabel: 'Cash prize',
    prizeLabelAl: 'Çmim monetar',
    format: 'Up to 6 images',
    formatAl: 'Deri në 6 imazhe',
    objective: 'To honor landscape photography that reveals the spirit of place — showcasing the beauty, power, fragility, and transformation of natural and urban environments through masterful use of light, composition, and perspective.',
    objectiveAl: 'Të nderojë fotografinë e peizazhit që zbulon shpirtin e vendit — duke treguar bukurinë, fuqinë, brishtësinë dhe transformimin e mjediseve natyrore dhe urbane përmes përdorimit mjeshtëror të dritës, kompozicionit dhe perspektivës.',
    description: 'Outstanding landscape photography showcasing the beauty, drama, and fragility of natural and urban environments. This category celebrates the photographer\'s ability to reveal the spirit of place — from vast wilderness panoramas to intimate natural details, from dramatic weather phenomena to the quiet geometry of the land.',
    descriptionAl: 'Fotografi e jashtëzakonshme peizazhi që tregon bukurinë, dramën dhe brishtësinë e mjediseve natyrore dhe urbane. Kjo kategori feston aftësinë e fotografit për të zbuluar shpirtin e vendit — nga panoramat e gjera të natyrës së egër te detajet intime natyrore, nga fenomenet dramatike të motit te gjeometria e qetë e tokës.',
    photoRules: 'Photos taken between 2022–2026. JPEG, sRGB, 2500–4000 px long side.',
    photoRulesAl: 'Foto të realizuara mes 2022–2026. JPEG, sRGB, 2500–4000 px ana e gjatë.',
  },
  'land-best-wild-world': {
    slug: 'land-best-wild-world',
    title: 'Land — Best Wild World',
    titleAl: 'Toka — Bota e Egër më e Mirë',
    heroImage: 'https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=1920&h=800&fit=crop',
    accent: 'amber',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    prize: '€500',
    prizeLabel: 'Cash prize',
    prizeLabelAl: 'Çmim monetar',
    format: 'Up to 6 images',
    formatAl: 'Deri në 6 imazhe',
    objective: 'To honor wildlife and nature photography that brings viewers closer to the animal kingdom and wild ecosystems — celebrating patience, fieldcraft, and the ability to capture untamed life in its most authentic and compelling moments.',
    objectiveAl: 'Të nderojë fotografinë e botës së egër dhe natyrës që i afron shikuesit me mbretërinë e kafshëve dhe ekosistemet e egra — duke festuar durimin, mjeshtërinë në terren dhe aftësinë për të kapur jetën e egër në momentet e saj më autentike dhe bindëse.',
    description: 'Wildlife and nature photography capturing animals, ecosystems, and the untamed beauty of the natural world. This category honors photographers who bring us closer to the creatures and habitats we share this planet with — from behavioral studies to dramatic predator-prey encounters, from macro worlds to migratory spectacles.',
    descriptionAl: 'Fotografi e natyrës dhe botës së egër duke kapur kafshët, ekosistemet dhe bukurinë e papërmbajtur të botës natyrore. Kjo kategori nderon fotografët që na afrojnë me krijesat dhe habitatet me të cilat ndajmë këtë planet — nga studime sjelljes te takime dramatike gjahtar-pre, nga botët makro te spektaklet migruese.',
    photoRules: 'Photos taken between 2022–2026. JPEG, sRGB, 2500–4000 px long side.',
    photoRulesAl: 'Foto të realizuara mes 2022–2026. JPEG, sRGB, 2500–4000 px ana e gjatë.',
  },
};

const JURY_CRITERIA = [
  { label: 'Coherence with the theme', labelAl: 'Koherenca me temën', detail: 'How clearly and deeply the project articulates breath — intimate, social, ecological, or creative.', detailAl: 'Sa qartë dhe thellë projekti artikulon frymën — intime, sociale, ekologjike ose krijuese.' },
  { label: 'Visual & narrative strength', labelAl: 'Forca vizuale dhe narrative', detail: 'Composition, rhythm, use of light, consistency of the series, ability to hold attention.', detailAl: 'Kompozicioni, ritmi, përdorimi i dritës, konsistenca e serisë, aftësia për të mbajtur vëmendjen.' },
  { label: 'Originality of perspective', labelAl: 'Origjinaliteti i perspektivës', detail: 'Avoiding clichés; discovering a new form of the "invisible."', detailAl: 'Shmangja e klisheve; zbulimi i një forme të re të "të padukshmes."' },
  { label: 'Ethical sensitivity', labelAl: 'Ndjeshmëria etike', detail: 'Respect for subjects, context, and the consequences of representation.', detailAl: 'Respekti për subjektet, kontekstin dhe pasojat e përfaqësimit.' },
  { label: 'Local relevance / universality', labelAl: 'Relevanca lokale / universaliteti', detail: 'Connection to concrete realities and the ability to speak beyond them.', detailAl: 'Lidhja me realitete konkrete dhe aftësia për të folur përtej tyre.' },
  { label: 'Photographic integrity', labelAl: 'Integriteti fotografik', detail: 'Clarity about process and limits of manipulation; exclusion of AI-generated images.', detailAl: 'Qartësia rreth procesit dhe kufijve të manipulimit; përjashtimi i imazheve të gjeneruara nga IA.' },
];

export default function CategoryDetailPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { t, i18n } = useTranslation();
  usePageTitle(categorySlug ? categorySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Category');
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
  const isTheme = cat.slug === 'main-theme-breath';
  const conceptParagraphs = lang === 'en' ? CONCEPT_EN : CONCEPT_AL;

  return (
    <div className="pb-24">
      {/* ── Hero with prominent image ── */}
      <section className="relative h-[50vh] min-h-[300px] sm:min-h-[400px] overflow-hidden">
        <img src={cat.heroImage} alt={lang === 'al' ? cat.titleAl : cat.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/60 to-surface-950/30" />
        <div className="absolute inset-0 flex flex-col justify-end">
            <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-6 sm:pb-10">
            <Link to="/apply" className="inline-flex items-center gap-2 text-sm text-surface-300 hover:text-primary-400 transition-colors mb-4">
              <ArrowLeft className="h-4 w-4" /> {t('apply.all_categories')}
            </Link>

            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`inline-block text-xs font-semibold uppercase tracking-[0.3em] ${cat.textColor} mb-3 border ${cat.borderColor} px-4 py-1.5 rounded-full`}
            >
              {t('apply.edition_badge')}
            </motion.span>

            {isTheme ? (
              <>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white leading-none tracking-tight"
                >
                  FRYMË
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-primary-400">
                    BREATH
                  </span>
                </motion.h1>
              </>
            ) : (
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white leading-none tracking-tight"
              >
                {lang === 'al' ? cat.titleAl : cat.title}
              </motion.h1>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-4 flex items-center gap-4 flex-wrap text-sm text-surface-300"
            >
              {isOpen && (
                <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {t('apply.submissions_open')}
                </span>
              )}
              <span className="flex items-center gap-2">
                <Award className={`h-4 w-4 ${cat.textColor}`} />
                <strong className="text-white">{cat.prize}</strong> {lang === 'al' ? cat.prizeLabelAl : cat.prizeLabel}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary-400" />
                {t('apply.deadline')}: <strong className="text-white">{t('apply.deadline_date')}</strong>
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Objective & Description ── */}
      <section className="detail-section">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Objective */}
          <div className={`p-5 rounded-xl bg-surface-900 border ${cat.borderColor} mb-8`}>
            <h3 className={`text-xs font-semibold ${cat.textColor} uppercase tracking-widest mb-2`}>
              {t('apply.objective')}
            </h3>
            <p className="detail-body text-surface-200">
              {lang === 'al' ? cat.objectiveAl : cat.objective}
            </p>
          </div>

          {/* Hero image in content */}
          <div className="rounded-2xl overflow-hidden mb-8 border border-surface-800">
            <img
              src={cat.heroImage}
              alt={lang === 'al' ? cat.titleAl : cat.title}
              className="w-full h-56 sm:h-72 object-cover"
              loading="lazy"
            />
          </div>

          <h2 className="detail-heading font-display font-bold text-white mb-5">
            {t('apply.about_category')}
          </h2>
          <p className="detail-body text-surface-200">
            {lang === 'al' ? cat.descriptionAl : cat.description}
          </p>

          {/* Extra requirement callout (e.g. Press & News context requirement) */}
          {cat.extraRequirement && (
            <div className="mt-5 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-start gap-3">
              <AlertTriangle className={`h-5 w-5 ${cat.textColor} flex-shrink-0 mt-0.5`} />
              <p className="text-sm text-surface-200">
                {lang === 'al' ? cat.extraRequirementAl : cat.extraRequirement}
              </p>
            </div>
          )}

          {/* Subcategories */}
          {cat.subcategories && (
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
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
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-surface-900 border border-surface-800">
              <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-2">{t('apply.format')}</h3>
              <p className="text-sm text-surface-300">{lang === 'al' ? cat.formatAl : cat.format}</p>
            </div>
            <div className="p-5 rounded-xl bg-surface-900 border border-surface-800">
              <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-2">
                {t('apply.tech_requirements')}
              </h3>
              <p className="text-sm text-surface-300">{lang === 'al' ? cat.photoRulesAl : cat.photoRules}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Theme-only: Concept Essay ── */}
      {isTheme && (
        <>
          {/* Opening quote */}
          <section className="py-10">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <blockquote className="relative">
                <span className="absolute -top-6 left-0 text-7xl text-primary-400/20 font-display leading-none select-none">"</span>
                <p className="text-base sm:text-xl md:text-2xl font-display italic text-surface-100 leading-relaxed px-4 sm:px-8">
                  {lang === 'en'
                    ? 'BREATH is the most ordinary miracle: constant, unconscious, and taken for granted until the loss of a single breath changes everything.'
                    : 'FRYMË / BREATH është mrekullia më e zakonshme: e pandërprerë, e pavetëdijshme dhe e marrë si e mirëqenë, derisa humbja e një fryme të vetme ndryshon gjithçka.'}
                </p>
                <span className="absolute -bottom-8 right-0 text-7xl text-primary-400/20 font-display leading-none select-none rotate-180">"</span>
              </blockquote>
            </div>
          </section>

          {/* Essay */}
          <section className="detail-section">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="detail-heading font-display font-bold text-white mb-8">{t('apply.the_concept')}</h2>
              <div className="space-y-5">
                {conceptParagraphs.map((paragraph, i) => (
                  <motion.p
                    key={`${lang}-${i}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                    className="detail-body text-surface-200"
                  >
                    {paragraph}
                  </motion.p>
                ))}
              </div>
            </div>
          </section>

          {/* Five entry doors */}
          <section className="py-16 bg-surface-900/40">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <span className="text-primary-400 text-xs font-semibold uppercase tracking-widest">{t('apply.thematic_directions')}</span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white mt-3">
                  {t('apply.five_doors')}
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
                        <h3 className="text-lg font-display font-bold text-white">{lang === 'al' ? door.titleAl : door.title}</h3>
                        <p className="text-sm text-gold-400 italic">{lang === 'al' ? door.title : door.titleAl}</p>
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
      <section className="detail-section">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-primary-400 text-xs font-semibold uppercase tracking-widest">{t('apply.how_to_apply')}</span>
            <h2 className="text-3xl font-display font-bold text-white mt-3">{t('apply.submission_guidelines')}</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800">
              <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-3">{t('apply.who_can_apply')}</h3>
              <ul className="space-y-2 text-surface-300 text-sm">
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />{t('apply.pro_photographers')}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />{t('apply.previously_produced')}</li>
              </ul>
            </div>
            <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800">
              <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-3">{t('apply.copyright_usage')}</h3>
              <ul className="space-y-2 text-surface-300 text-sm">
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />{t('apply.author_retains')}</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />{t('apply.non_exclusive')}</li>
              </ul>
            </div>
            <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800">
              <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Check className="h-4 w-4" /> {t('apply.accepted')}
              </h3>
              <ul className="space-y-1.5 text-sm text-surface-300">
                {cat.customAccepted
                  ? (lang === 'al' ? cat.customAcceptedAl! : cat.customAccepted).map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> {item}
                      </li>
                    ))
                  : ['accepted_cropping', 'accepted_contrast', 'accepted_color', 'accepted_desat', 'accepted_retouch'].map((key) => (
                      <li key={key} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> {t(`apply.${key}`)}
                      </li>
                    ))
                }
              </ul>
            </div>
            <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800">
              <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <XIcon className="h-4 w-4" /> {t('apply.not_accepted')}
              </h3>
              <ul className="space-y-1.5 text-sm text-surface-300">
                {cat.customRejected
                  ? (lang === 'al' ? cat.customRejectedAl! : cat.customRejected).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <XIcon className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" /> {item}
                      </li>
                    ))
                  : ['rejected_import', 'rejected_clone', 'rejected_ai'].map((key) => (
                      <li key={key} className="flex items-start gap-2">
                        <XIcon className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" /> {t(`apply.${key}`)}
                      </li>
                    ))
                }
              </ul>
              <div className="mt-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{t('apply.ai_excluded')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Jury Criteria (theme only) ── */}
      {isTheme && (
        <section className="py-16 bg-surface-900/40">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="detail-heading font-display font-bold text-white mb-6">{t('apply.jury_criteria')}</h2>
            <div className="space-y-4">
              {JURY_CRITERIA.map((c, i) => (
                <div key={i} className="flex gap-3">
                  <span className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-primary-500/15 border border-primary-500/40 flex items-center justify-center text-xs font-bold text-primary-400">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{lang === 'al' ? c.labelAl : c.label}</p>
                    <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">{lang === 'al' ? c.detailAl : c.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Floating Apply Button ── */}
      {isOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-5">
            <Link to={isAuthenticated ? '/dashboard/submissions/new' : '/register'} className="pointer-events-auto block">
              <Button variant="gold" size="lg" className="w-full shadow-lg shadow-gold-500/20" icon={<ArrowRight className="h-5 w-5" />}>
                {isAuthenticated
                  ? t('apply.submit_your_work')
                  : t('apply.register_submit')}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
