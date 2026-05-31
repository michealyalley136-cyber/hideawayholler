import {
  BadgeCheck,
  Flame,
  Headphones,
  KeyRound,
  MapPin,
  Mountain,
  ShieldCheck,
  Trees,
  UsersRound,
  WashingMachine,
  Wifi,
} from 'lucide-react';

export type HideawayImage = {
  src: string;
  fallbackSrc: string;
  localPath?: string;
  alt: string;
  gradient: string;
};

const stock = {
  cabin: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1800&q=80',
  porch: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80',
  lounge: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1400&q=80',
  woods: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1400&q=80',
  lodge: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
  loft: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=80',
  stream: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1400&q=80',
  fire: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=1400&q=80',
  mountains: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1400&q=80',
};

export const heroImage: HideawayImage = {
  src: stock.cabin,
  fallbackSrc: stock.cabin,
  localPath: '/images/hideaway/hero-cabin.jpg',
  alt: 'Warm mountain cabin surrounded by trees',
  gradient: 'from-stone-950 via-emerald-950 to-amber-900',
};

export const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Housing', href: '/#housing' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Apply', href: '/apply' },
  { label: 'Resident Portal', href: '/portal' },
];

export const loveCards = [
  {
    title: 'Safe Community',
    text: 'Individual access codes and thoughtful monitoring help residents feel supported from arrival to checkout.',
    icon: ShieldCheck,
    tone: 'bg-emerald-50 text-emerald-800',
  },
  {
    title: 'Free Laundry',
    text: 'Residents have access to laundry without extra weekly fees or off-site trips.',
    icon: WashingMachine,
    tone: 'bg-sky-50 text-sky-800',
  },
  {
    title: 'Outdoor Spaces',
    text: 'Streamside areas, gardens, grills, hammocks, and a private trail make downtime feel restorative.',
    icon: Trees,
    tone: 'bg-lime-50 text-lime-800',
  },
  {
    title: 'Close to Work Areas',
    text: 'A convenient home base for Cultural Exchange Programs in Pigeon Forge, Gatlinburg, and Sevierville.',
    icon: MapPin,
    tone: 'bg-rose-50 text-rose-800',
  },
  {
    title: 'Cultural Exchange Living',
    text: 'Shared housing designed for students, interns, and seasonal workers building friendships in the Smokies.',
    icon: UsersRound,
    tone: 'bg-amber-50 text-amber-800',
  },
  {
    title: 'On-Site Management',
    text: '24/7 property management keeps day-to-day questions and urgent needs close to home.',
    icon: Headphones,
    tone: 'bg-violet-50 text-violet-800',
  },
];

export const propertyHighlights = [
  {
    name: 'The Cottage',
    description: 'A cozy, cabin-style residence with a warm porch feel and easy access to shared outdoor spaces.',
    image: {
      src: stock.porch,
      fallbackSrc: stock.porch,
      localPath: '/images/hideaway/the-cottage.jpg',
      alt: 'Cozy cottage bedroom and porch-inspired housing',
      gradient: 'from-amber-900 via-stone-800 to-emerald-900',
    },
  },
  {
    name: 'The Lounge',
    description: 'A relaxed gathering space for meals, conversation, planning trips, and meeting other residents.',
    image: {
      src: stock.lounge,
      fallbackSrc: stock.lounge,
      localPath: '/images/hideaway/the-lounge.jpg',
      alt: 'Warm shared lounge area',
      gradient: 'from-orange-900 via-stone-800 to-slate-900',
    },
  },
  {
    name: 'The Drey',
    description: 'A tucked-away section with a woodland feel for residents who want a quieter place to recharge.',
    image: {
      src: stock.woods,
      fallbackSrc: stock.woods,
      localPath: '/images/hideaway/the-drey.jpg',
      alt: 'Wooded housing section near trees',
      gradient: 'from-emerald-950 via-green-800 to-stone-900',
    },
  },
  {
    name: 'The Lodge',
    description: 'A mountain-inspired housing area with a friendly, lodge-like atmosphere for seasonal community life.',
    image: {
      src: stock.lodge,
      fallbackSrc: stock.lodge,
      localPath: '/images/hideaway/the-lodge.jpg',
      alt: 'Mountain lodge exterior',
      gradient: 'from-stone-900 via-amber-900 to-slate-900',
    },
  },
  {
    name: 'The Loft',
    description: 'A bright, elevated space designed for comfortable long-term living during a busy work season.',
    image: {
      src: stock.loft,
      fallbackSrc: stock.loft,
      localPath: '/images/hideaway/the-loft.jpg',
      alt: 'Bright loft-style interior',
      gradient: 'from-sky-900 via-slate-800 to-amber-900',
    },
  },
];

export const safetyItems = [
  { title: 'Individual access codes', icon: KeyRound },
  { title: 'Live video monitoring in common areas and exterior grounds', icon: ShieldCheck },
  { title: '24/7 on-site property management', icon: Headphones },
  { title: 'Emergency information through the resident portal', icon: BadgeCheck },
];

export const outdoorAmenities = [
  { title: 'Stream', icon: Mountain },
  { title: 'Private hiking trail', icon: Trees },
  { title: 'Fire pit', icon: Flame },
  { title: 'Park-style grills', icon: Wifi },
  { title: 'Gardens', icon: Trees },
  { title: 'Hammocks', icon: Mountain },
];

export const galleryImages: HideawayImage[] = [
  {
    src: stock.stream,
    fallbackSrc: stock.stream,
    localPath: '/images/hideaway/gallery-stream.jpg',
    alt: 'Stream running through a wooded outdoor area',
    gradient: 'from-cyan-900 via-emerald-900 to-stone-900',
  },
  {
    src: stock.cabin,
    fallbackSrc: stock.cabin,
    localPath: '/images/hideaway/gallery-cabin.jpg',
    alt: 'Cabin in a wooded mountain setting',
    gradient: 'from-stone-950 via-amber-900 to-emerald-900',
  },
  {
    src: stock.fire,
    fallbackSrc: stock.fire,
    localPath: '/images/hideaway/gallery-firepit.jpg',
    alt: 'Outdoor fire pit gathering area',
    gradient: 'from-orange-950 via-stone-900 to-red-900',
  },
  {
    src: stock.lounge,
    fallbackSrc: stock.lounge,
    localPath: '/images/hideaway/gallery-lounge.jpg',
    alt: 'Warm indoor lounge and gathering area',
    gradient: 'from-amber-900 via-stone-800 to-slate-900',
  },
  {
    src: stock.woods,
    fallbackSrc: stock.woods,
    localPath: '/images/hideaway/gallery-trail.jpg',
    alt: 'Private wooded hiking trail',
    gradient: 'from-green-950 via-emerald-900 to-stone-900',
  },
  {
    src: stock.mountains,
    fallbackSrc: stock.mountains,
    localPath: '/images/hideaway/gallery-smokies.jpg',
    alt: 'Smoky Mountain ridgeline near Pigeon Forge',
    gradient: 'from-sky-950 via-blue-900 to-stone-900',
  },
];

export const howItWorks = [
  'Apply Online',
  'Get Approved',
  'Sign Lease',
  'Receive Room Assignment',
  'Check In',
  'Enjoy Your Stay',
];
