import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ArrowLeft } from 'lucide-react';
import { getPhotoUrl } from '@/lib/r2';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6 },
  }),
};

interface CuratorDetail {
  slug: string;
  name: string;
  role: string;
  roleAl: string;
  photo: string;
  bioEn: string[];
  bioAl: string[];
}

const CURATOR_DETAILS: Record<string, CuratorDetail> = {
  'albes-fusha': {
    slug: 'albes-fusha',
    name: 'Albes Fusha',
    role: 'Curator & Educator',
    roleAl: 'Kurator & Pedagog',
    photo: getPhotoUrl('curators/albes-fusha.jpg'),
    bioEn: [
      'Albes Fusha comes from a family with a strong tradition in photography. He graduated from the Academy of Fine Arts in 1994. With an accomplished career and notable contributions to the arts, he is also a committed educator for young photographers, sharing his expertise and enthusiasm with new generations.',
      'As a curator and jury member for numerous national and international exhibitions and events, he has played a key role in showcasing emerging talents and promoting Albanian art globally. His work as a curator and organizer has involved collaboration with many cultural and artistic institutions, helping to organize a variety of events. These experiences have given him a broad perspective and deep understanding of photography and painting, significantly influencing his career and enhancing his creative work.',
      'Well-known in the Albanian photography and painting scene for his artistic elegance and sensitivity, he has exhibited his photography and paintings at several solo and group shows.',
      'He is currently an Associate Professor and the head of the Photography Department at the Faculty of Fine Arts, University of Arts in Tirana. In this position, he plays a vital role in developing an innovative program aimed at preparing students for successful careers in photography and visual arts. He actively contributes to shaping the future of Albanian photography and is dedicated to discovering and supporting new talent.',
    ],
    bioAl: [
      'Albes Fusha vjen nga një familje me një traditë të fortë në fotografi. Ai u diplomua në Akademinë e Arteve të Bukura në vitin 1994 dhe që prej asaj kohe ka ndërtuar një karrierë të konsoliduar, me kontribute të rëndësishme në art. Krahas krijimtarisë së tij artistike, ai është edhe një pedagog i përkushtuar, duke ndarë me pasion njohuritë dhe duke frymëzuar brezat e rinj të fotografëve.',
      'Si kurator dhe anëtar jurie në shumë ekspozita dhe aktivitete kombëtare dhe ndërkombëtare, ai ka luajtur një rol të rëndësishëm në promovimin e talenteve të reja dhe në prezantimin e artit shqiptar në arenën ndërkombëtare. Puna e tij si kurator dhe organizator ka përfshirë bashkëpunime me institucione të ndryshme kulturore dhe artistike, duke kontribuar në realizimin e një sërë aktivitetesh artistike. Këto përvoja i kanë dhënë një perspektivë të gjerë dhe një kuptim të thellë të fotografisë dhe pikturës, duke ndikuar ndjeshëm në zhvillimin e tij krijues.',
      'I njohur në skenën shqiptare të fotografisë dhe pikturës për elegancën dhe ndjeshmërinë artistike, ai ka ekspozuar punimet e tij në shumë ekspozita personale dhe kolektive.',
      'Aktualisht, ai mban titullin Profesor i Asociuar dhe është përgjegjës i Departamentit të Fotografisë në Fakultetin e Arteve të Bukura, Universiteti i Arteve në Tiranë. Në këtë rol, ai luan një rol kyç në zhvillimin e programeve inovative akademike, të cilat synojnë përgatitjen e studentëve për karriera të suksesshme në fotografi dhe artet pamore. Përmes angazhimit të tij, ai vazhdon të ndikojë në formësimin e së ardhmes së fotografisë shqiptare dhe në zbulimin e mbështetjen e talenteve të reja.',
    ],
  },
  'blerta-kambo': {
    slug: 'blerta-kambo',
    name: 'Blerta Kambo',
    role: 'Curator & Visual Artist',
    roleAl: 'Kuratore & Artiste Vizuale',
    photo: getPhotoUrl('curators/blerta-kambo.jpg'),
    bioEn: [
      'Blerta Kambo is an Albanian visual artist, photographer, and filmmaker based in Tirana. With an academic background in environmental engineering, later completing an MA in Filmmaking, and nearly two decades of professional experience, her practice moves between documentary, conceptual image-making, and public interventions.',
      'She explores social and environmental justice through ecofeminism, archives, multiple truths, and the ways architecture and public space shape everyday life. Her work has been exhibited in Albania and internationally.',
    ],
    bioAl: [
      'Blerta Kambo është artiste vizuale, fotografe dhe regjisore shqiptare me bazë në Tiranë. Me formim akademik në inxhinieri mjedisi, më pas me një MA në realizim filmi, dhe gati dy dekada përvojë profesionale, praktika e saj lëviz mes dokumentarit, imazhit konceptual dhe ndërhyrjeve në hapësirën publike.',
      'Ajo trajton drejtësinë sociale dhe mjedisore përmes ekofeminizmit, arkivave, të vërtetave të shumëfishta, si edhe mënyrës se si arkitektura dhe hapësira publike formësojnë jetën e përditshme. Puna e saj është ekspozuar në Shqipëri dhe ndërkombëtarisht.',
    ],
  },
};

export default function CuratorDetailPage() {
  const { curatorSlug } = useParams<{ curatorSlug: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'al' ? 'al' : 'en';

  const curator = curatorSlug ? CURATOR_DETAILS[curatorSlug] : null;
  if (!curator) return <Navigate to="/curators" replace />;

  usePageTitle(curator.name);

  const paragraphs = lang === 'al' ? curator.bioAl : curator.bioEn;

  return (
    <div className="pb-24">
      {/* Hero with photo */}
      <section className="relative h-[40vh] sm:h-[50vh] min-h-[250px] sm:min-h-[350px] overflow-hidden">
        <img
          src={curator.photo}
          alt={curator.name}
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/60 to-surface-950/30" />
        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-6 sm:pb-10">
            <Link
              to="/curators"
              className="inline-flex items-center gap-2 text-sm text-surface-300 hover:text-primary-400 transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" /> {t('curators.all_curators')}
            </Link>

            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="inline-block text-xs font-semibold uppercase tracking-[0.3em] text-primary-400 mb-3 border border-primary-400/30 px-4 py-1.5 rounded-full"
            >
              {lang === 'al' ? curator.roleAl : curator.role}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white leading-none tracking-tight"
            >
              {curator.name}
            </motion.h1>
          </div>
        </div>
      </section>

      {/* Bio content */}
      <section className="py-10 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-6"
          >
            {paragraphs.map((p, i) => (
              <motion.p
                key={i}
                custom={i}
                variants={fadeUp}
                className="text-base sm:text-lg text-surface-300 leading-relaxed"
              >
                {p}
              </motion.p>
            ))}
          </motion.div>

          {/* Back link */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-12 pt-8 border-t border-surface-800"
          >
            <Link
              to="/curators"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-400 hover:text-primary-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> {t('curators.all_curators')}
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
