import { getPhotoUrl } from '@/lib/r2';

type LocalizedText = {
  en: string;
  al: string;
};

type LocalizedParagraphs = {
  en: string[];
  al: string[];
};

export interface CuratorProfile {
  slug: string;
  name: string;
  photo: string;
  role: LocalizedText;
  shortBio: LocalizedText;
  bio: LocalizedParagraphs;
}

export const CURATORS: CuratorProfile[] = [
  {
    slug: 'arben-alliaj',
    name: 'Arben Alliaj',
    photo: getPhotoUrl('curators/arben-alliaj.jpg'),
    role: {
      en: 'Founder & Director',
      al: 'Themelues & Drejtor',
    },
    shortBio: {
      en: 'Born in Patos, Fier (1975). Founder of the FOKUS Artistic Photography Competition in 2006, transformed into the FOKUS Award Festival. Photographer, designer and founder of "Benart Print".',
      al: 'Lindur në Patos, Fier (1975). Themelues i Konkursit Artistik të Fotografisë FOKUS në 2006, transformuar në Festivalin FOKUS Award. Fotograf, dizajner dhe themelues i "Benart Print".',
    },
    bio: {
      en: [
        'Born in Patos, Fier in 1975, Arben Alliaj is the founder of the FOKUS Artistic Photography Competition, launched in 2006 and later transformed into the FOKUS Award Festival.',
        'Alongside his work as a photographer and designer, he is also the founder of Benart Print and has played a central role in shaping the festival’s long-term direction and identity.',
      ],
      al: [
        'I lindur në Patos, Fier në vitin 1975, Arben Alliaj është themeluesi i Konkursit Artistik të Fotografisë FOKUS, i nisur në vitin 2006 dhe i transformuar më pas në Festivalin FOKUS Award.',
        'Krahas punës së tij si fotograf dhe dizajner, ai është edhe themelues i Benart Print dhe ka luajtur një rol qendror në formësimin e drejtimit afatgjatë dhe identitetit të festivalit.',
      ],
    },
  },
  {
    slug: 'albes-fusha',
    name: 'Albes Fusha',
    photo: getPhotoUrl('curators/albes-fusha.jpg'),
    role: {
      en: 'Curator & Educator',
      al: 'Kurator & Pedagog',
    },
    shortBio: {
      en: 'Associate Professor and head of the Photography Department at the Faculty of Fine Arts, University of Arts in Tirana. Curator and jury member for numerous national and international exhibitions.',
      al: 'Profesor i Asociuar dhe përgjegjës i Departamentit të Fotografisë në Fakultetin e Arteve të Bukura, Universiteti i Arteve në Tiranë. Kurator dhe anëtar jurie në shumë ekspozita kombëtare dhe ndërkombëtare.',
    },
    bio: {
      en: [
        'Albes Fusha comes from a family with a strong tradition in photography. He graduated from the Academy of Fine Arts in 1994. With an accomplished career and notable contributions to the arts, he is also a committed educator for young photographers, sharing his expertise and enthusiasm with new generations.',
        'As a curator and jury member for numerous national and international exhibitions and events, he has played a key role in showcasing emerging talents and promoting Albanian art globally. His work as a curator and organizer has involved collaboration with many cultural and artistic institutions, helping to organize a variety of events. These experiences have given him a broad perspective and deep understanding of photography and painting, significantly influencing his career and enhancing his creative work.',
        'Well-known in the Albanian photography and painting scene for his artistic elegance and sensitivity, he has exhibited his photography and paintings at several solo and group shows.',
        'He is currently an Associate Professor and the head of the Photography Department at the Faculty of Fine Arts, University of Arts in Tirana. In this position, he plays a vital role in developing an innovative program aimed at preparing students for successful careers in photography and visual arts. He actively contributes to shaping the future of Albanian photography and is dedicated to discovering and supporting new talent.',
      ],
      al: [
        'Albes Fusha vjen nga një familje me një traditë të fortë në fotografi. Ai u diplomua në Akademinë e Arteve të Bukura në vitin 1994 dhe që prej asaj kohe ka ndërtuar një karrierë të konsoliduar, me kontribute të rëndësishme në art. Krahas krijimtarisë së tij artistike, ai është edhe një pedagog i përkushtuar, duke ndarë me pasion njohuritë dhe duke frymëzuar brezat e rinj të fotografëve.',
        'Si kurator dhe anëtar jurie në shumë ekspozita dhe aktivitete kombëtare dhe ndërkombëtare, ai ka luajtur një rol të rëndësishëm në promovimin e talenteve të reja dhe në prezantimin e artit shqiptar në arenën ndërkombëtare. Puna e tij si kurator dhe organizator ka përfshirë bashkëpunime me institucione të ndryshme kulturore dhe artistike, duke kontribuar në realizimin e një sërë aktivitetesh artistike. Këto përvoja i kanë dhënë një perspektivë të gjerë dhe një kuptim të thellë të fotografisë dhe pikturës, duke ndikuar ndjeshëm në zhvillimin e tij krijues.',
        'I njohur në skenën shqiptare të fotografisë dhe pikturës për elegancën dhe ndjeshmërinë artistike, ai ka ekspozuar punimet e tij në shumë ekspozita personale dhe kolektive.',
        'Aktualisht, ai mban titullin Profesor i Asociuar dhe është përgjegjës i Departamentit të Fotografisë në Fakultetin e Arteve të Bukura, Universiteti i Arteve në Tiranë. Në këtë rol, ai luan një rol kyç në zhvillimin e programeve inovative akademike, të cilat synojnë përgatitjen e studentëve për karriera të suksesshme në fotografi dhe artet pamore. Përmes angazhimit të tij, ai vazhdon të ndikojë në formësimin e së ardhmes së fotografisë shqiptare dhe në zbulimin e mbështetjen e talenteve të reja.',
      ],
    },
  },
  {
    slug: 'blerta-kambo',
    name: 'Blerta Kambo',
    photo: getPhotoUrl('curators/blerta-kambo.jpg'),
    role: {
      en: 'Curator & Visual Artist',
      al: 'Kuratore & Artiste Vizuale',
    },
    shortBio: {
      en: 'Albanian visual artist, photographer, and filmmaker based in Tirana. Her practice moves between documentary, conceptual image-making, and public interventions exploring social and environmental justice.',
      al: 'Artiste vizuale, fotografe dhe regjisore shqiptare me bazë në Tiranë. Praktika e saj lëviz mes dokumentarit, imazhit konceptual dhe ndërhyrjeve në hapësirën publike duke trajtuar drejtësinë sociale dhe mjedisore.',
    },
    bio: {
      en: [
        'Blerta Kambo is an Albanian visual artist, photographer, and filmmaker based in Tirana. With an academic background in environmental engineering, later completing an MA in Filmmaking, and nearly two decades of professional experience, her practice moves between documentary, conceptual image-making, and public interventions.',
        'She explores social and environmental justice through ecofeminism, archives, multiple truths, and the ways architecture and public space shape everyday life. Her work has been exhibited in Albania and internationally.',
      ],
      al: [
        'Blerta Kambo është artiste vizuale, fotografe dhe regjisore shqiptare me bazë në Tiranë. Me formim akademik në inxhinieri mjedisi, më pas me një MA në realizim filmi, dhe gati dy dekada përvojë profesionale, praktika e saj lëviz mes dokumentarit, imazhit konceptual dhe ndërhyrjeve në hapësirën publike.',
        'Ajo trajton drejtësinë sociale dhe mjedisore përmes ekofeminizmit, arkivave, të vërtetave të shumëfishta, si edhe mënyrës se si arkitektura dhe hapësira publike formësojnë jetën e përditshme. Puna e saj është ekspozuar në Shqipëri dhe ndërkombëtarisht.',
      ],
    },
  },
  {
    slug: 'saimir-ahmeti',
    name: 'Saimir Ahmeti',
    photo: getPhotoUrl('curators/saimir-ahmeti.jpg'),
    role: {
      en: 'Curator & Manager',
      al: 'Kurator & Menaxher',
    },
    shortBio: {
      en: 'Born in Fier (1973). Graduated in Art Management at the Academy of Fine Arts, Tirana. Chairman of the ANTIK Association. Manager of FOKUS AWARD 2007–2021.',
      al: 'Lindur në Fier (1973). Diplomuar në Menaxhim Arti në Akademinë e Arteve të Bukura, Tiranë. Kryetar i Shoqatës ANTIK. Menaxher i FOKUS AWARD 2007–2021.',
    },
    bio: {
      en: [
        'Born in Fier in 1973, Saimir Ahmeti graduated in Art Management at the Academy of Fine Arts in Tirana and has long been active in Albania’s cultural field.',
        'He serves as chairman of the ANTIK Association and was the manager of FOKUS AWARD from 2007 to 2021, contributing to the organizational growth of the festival across multiple editions.',
      ],
      al: [
        'I lindur në Fier në vitin 1973, Saimir Ahmeti është diplomuar në Menaxhim Arti në Akademinë e Arteve të Bukura në Tiranë dhe ka qenë për shumë vite aktiv në fushën kulturore në Shqipëri.',
        'Ai është kryetar i Shoqatës ANTIK dhe ka qenë menaxher i FOKUS AWARD nga viti 2007 deri në vitin 2021, duke kontribuar në rritjen organizative të festivalit përgjatë shumë edicioneve.',
      ],
    },
  },
];

export function getCuratorBySlug(curatorSlug: string) {
  return CURATORS.find((curator) => curator.slug === curatorSlug) ?? null;
}