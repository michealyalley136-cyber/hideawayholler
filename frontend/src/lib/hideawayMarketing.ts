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
import {
  cottageStockImages,
  galleryPreviewStockImages,
  heroStockImage,
  propertyStockImages,
  stockImageFallbacks,
} from '@/data/stockImages';

export type HideawayImage = {
  src: string;
  fallbackSrc: string;
  localPath?: string;
  alt: string;
  gradient: string;
};

export const hideawayImagePaths = {
  hero: '/images/hideaway/community-flags-firepit.jpg',
  flowersCabin: '/images/hideaway/flowers-cabin.jpg',
  cottageLoftOverview: '/images/hideaway/cottage-loft-overview.jpg',
  cottageLivingRoom: '/images/hideaway/cottage-living-room.jpg',
  cottageStream: '/images/hideaway/cottage-stream.jpg',
  cottageBunkRoom: '/images/hideaway/cottage-bunk-room.jpg',
  cottageBathroomMudroom: '/images/hideaway/cottage-bathroom-mudroom.jpg',
  cottageBathroomVanity: '/images/hideaway/cottage-bathroom-vanity.jpg',
  cottageKitchenLounge: '/images/hideaway/cottage-kitchen-lounge.jpg',
  cottageEntryOverview: '/images/hideaway/cottage-entry-overview.jpg',
  cottageHallway: '/images/hideaway/cottage-hallway.jpg',
  cottagePorchPlanters: '/images/hideaway/cottage-porch-planters.jpg',
  cottageBedroom: '/images/hideaway/cottage-bedroom.jpg',
  cottageExteriorHammocks: '/images/hideaway/cottage-exterior-hammocks.jpg',
  cottage: '/images/hideaway/the-cottage.jpg',
  lounge: '/images/hideaway/the-lounge.jpg',
  drey: '/images/hideaway/the-drey.jpg',
  lodge: '/images/hideaway/the-lodge.jpg',
  loft: '/images/hideaway/the-loft.jpg',
  stream: '/images/hideaway/gallery-stream.jpg',
  cabin: '/images/hideaway/gallery-cabin.jpg',
  firepit: '/images/hideaway/gallery-firepit.jpg',
  trail: '/images/hideaway/gallery-trail.jpg',
  smokies: '/images/hideaway/gallery-smokies.jpg',
};

const cottageFallback = stockImageFallbacks.cottage;

export const heroImage: HideawayImage = {
  src: heroStockImage.src,
  fallbackSrc: stockImageFallbacks.hero,
  localPath: hideawayImagePaths.hero,
  alt: heroStockImage.alt,
  gradient: heroStockImage.gradient,
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
      src: propertyStockImages.cottage.src,
      fallbackSrc: cottageFallback,
      localPath: hideawayImagePaths.cottageExteriorHammocks,
      alt: propertyStockImages.cottage.alt,
      gradient: propertyStockImages.cottage.gradient,
    },
  },
  {
    name: 'The Lounge',
    description: 'A relaxed gathering space for meals, conversation, planning trips, and meeting other residents.',
    image: {
      src: propertyStockImages.lounge.src,
      fallbackSrc: stockImageFallbacks.lounge,
      localPath: hideawayImagePaths.lounge,
      alt: propertyStockImages.lounge.alt,
      gradient: propertyStockImages.lounge.gradient,
    },
  },
  {
    name: 'The Drey',
    description: 'A tucked-away section with a woodland feel for residents who want a quieter place to recharge.',
    image: {
      src: propertyStockImages.drey.src,
      fallbackSrc: stockImageFallbacks.drey,
      localPath: hideawayImagePaths.drey,
      alt: propertyStockImages.drey.alt,
      gradient: propertyStockImages.drey.gradient,
    },
  },
  {
    name: 'The Lodge',
    description: 'A mountain-inspired housing area with a friendly, lodge-like atmosphere for seasonal community life.',
    image: {
      src: propertyStockImages.lodge.src,
      fallbackSrc: stockImageFallbacks.lodge,
      localPath: hideawayImagePaths.lodge,
      alt: propertyStockImages.lodge.alt,
      gradient: propertyStockImages.lodge.gradient,
    },
  },
  {
    name: 'The Loft',
    description: 'A bright, elevated space designed for comfortable long-term living during a busy work season.',
    image: {
      src: propertyStockImages.loft.src,
      fallbackSrc: stockImageFallbacks.loft,
      localPath: hideawayImagePaths.loft,
      alt: propertyStockImages.loft.alt,
      gradient: propertyStockImages.loft.gradient,
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
    src: galleryPreviewStockImages[0].src,
    fallbackSrc: stockImageFallbacks.community,
    localPath: hideawayImagePaths.stream,
    alt: galleryPreviewStockImages[0].alt,
    gradient: galleryPreviewStockImages[0].gradient,
  },
  {
    src: galleryPreviewStockImages[1].src,
    fallbackSrc: stockImageFallbacks.cottage,
    localPath: hideawayImagePaths.flowersCabin,
    alt: galleryPreviewStockImages[1].alt,
    gradient: galleryPreviewStockImages[1].gradient,
  },
  {
    src: galleryPreviewStockImages[2].src,
    fallbackSrc: stockImageFallbacks.firepit,
    localPath: hideawayImagePaths.hero,
    alt: galleryPreviewStockImages[2].alt,
    gradient: galleryPreviewStockImages[2].gradient,
  },
  {
    src: galleryPreviewStockImages[3].src,
    fallbackSrc: stockImageFallbacks.lounge,
    localPath: hideawayImagePaths.lounge,
    alt: galleryPreviewStockImages[3].alt,
    gradient: galleryPreviewStockImages[3].gradient,
  },
  {
    src: galleryPreviewStockImages[4].src,
    fallbackSrc: stockImageFallbacks.trail,
    localPath: hideawayImagePaths.trail,
    alt: galleryPreviewStockImages[4].alt,
    gradient: galleryPreviewStockImages[4].gradient,
  },
  {
    src: galleryPreviewStockImages[5].src,
    fallbackSrc: stockImageFallbacks.smokies,
    localPath: hideawayImagePaths.smokies,
    alt: galleryPreviewStockImages[5].alt,
    gradient: galleryPreviewStockImages[5].gradient,
  },
];

export const cottageGalleryImages: HideawayImage[] = [
  {
    src: cottageStockImages[0].src,
    fallbackSrc: cottageFallback,
    localPath: hideawayImagePaths.cottageExteriorHammocks,
    alt: cottageStockImages[0].alt,
    gradient: cottageStockImages[0].gradient,
  },
  {
    src: cottageStockImages[1].src,
    fallbackSrc: cottageFallback,
    localPath: hideawayImagePaths.cottageLivingRoom,
    alt: cottageStockImages[1].alt,
    gradient: cottageStockImages[1].gradient,
  },
  {
    src: cottageStockImages[2].src,
    fallbackSrc: cottageFallback,
    localPath: hideawayImagePaths.cottageKitchenLounge,
    alt: cottageStockImages[2].alt,
    gradient: cottageStockImages[2].gradient,
  },
  {
    src: cottageStockImages[3].src,
    fallbackSrc: cottageFallback,
    localPath: hideawayImagePaths.cottageLoftOverview,
    alt: cottageStockImages[3].alt,
    gradient: cottageStockImages[3].gradient,
  },
  {
    src: cottageStockImages[4].src,
    fallbackSrc: cottageFallback,
    localPath: hideawayImagePaths.cottageBunkRoom,
    alt: cottageStockImages[4].alt,
    gradient: cottageStockImages[4].gradient,
  },
  {
    src: cottageStockImages[5].src,
    fallbackSrc: cottageFallback,
    localPath: hideawayImagePaths.cottageBedroom,
    alt: cottageStockImages[5].alt,
    gradient: cottageStockImages[5].gradient,
  },
  {
    src: cottageStockImages[6].src,
    fallbackSrc: cottageFallback,
    localPath: hideawayImagePaths.cottageBathroomMudroom,
    alt: cottageStockImages[6].alt,
    gradient: cottageStockImages[6].gradient,
  },
  {
    src: cottageStockImages[7].src,
    fallbackSrc: cottageFallback,
    localPath: hideawayImagePaths.cottageBathroomVanity,
    alt: cottageStockImages[7].alt,
    gradient: cottageStockImages[7].gradient,
  },
  {
    src: cottageStockImages[8].src,
    fallbackSrc: cottageFallback,
    localPath: hideawayImagePaths.cottageHallway,
    alt: cottageStockImages[8].alt,
    gradient: cottageStockImages[8].gradient,
  },
  {
    src: cottageStockImages[9].src,
    fallbackSrc: cottageFallback,
    localPath: hideawayImagePaths.cottagePorchPlanters,
    alt: cottageStockImages[9].alt,
    gradient: cottageStockImages[9].gradient,
  },
  {
    src: cottageStockImages[10].src,
    fallbackSrc: stockImageFallbacks.stream,
    localPath: hideawayImagePaths.cottageStream,
    alt: cottageStockImages[10].alt,
    gradient: cottageStockImages[10].gradient,
  },
  {
    src: cottageStockImages[11].src,
    fallbackSrc: cottageFallback,
    localPath: hideawayImagePaths.cottageEntryOverview,
    alt: cottageStockImages[11].alt,
    gradient: cottageStockImages[11].gradient,
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
