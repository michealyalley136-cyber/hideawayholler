// These are temporary demo stock images. Replace with official Hideaway Holler photos before production.

export type StockImage = {
  src: string;
  alt: string;
  gradient: string;
};

function unsplash(id: string, width = 1600) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=82`;
}

export function imageFallback(label: string, colors: [string, string, string]) {
  const [start, middle, end] = colors;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" role="img" aria-label="${label}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${start}"/>
          <stop offset="55%" stop-color="${middle}"/>
          <stop offset="100%" stop-color="${end}"/>
        </linearGradient>
        <radialGradient id="glow" cx="70%" cy="30%" r="55%">
          <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#bg)"/>
      <rect width="1600" height="1000" fill="url(#glow)"/>
      <path d="M0 710 C240 650 320 790 520 730 C720 670 900 600 1120 690 C1320 770 1470 710 1600 650 L1600 1000 L0 1000 Z" fill="#111827" opacity="0.34"/>
      <path d="M0 770 C230 710 390 850 610 790 C840 730 980 690 1190 780 C1360 850 1510 810 1600 760 L1600 1000 L0 1000 Z" fill="#022c22" opacity="0.48"/>
      <text x="80" y="130" fill="#fff7ed" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="700">${label}</text>
      <text x="82" y="188" fill="#fde68a" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="600">Hideaway Holler</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const stockImageFallbacks = {
  hero: imageFallback('Cultural Exchange Community', ['#052e16', '#1c1917', '#92400e']),
  community: imageFallback('Community Life', ['#064e3b', '#1c1917', '#92400e']),
  cottage: imageFallback('The Cottage', ['#78350f', '#292524', '#064e3b']),
  lounge: imageFallback('The Lounge', ['#7c2d12', '#292524', '#111827']),
  drey: imageFallback('The Drey', ['#052e16', '#166534', '#1c1917']),
  lodge: imageFallback('The Lodge', ['#1c1917', '#78350f', '#0f172a']),
  loft: imageFallback('The Loft', ['#0c4a6e', '#334155', '#92400e']),
  stream: imageFallback('The Stream', ['#164e63', '#065f46', '#1c1917']),
  firepit: imageFallback('Fire Pit Gathering Area', ['#7f1d1d', '#292524', '#f59e0b']),
  trail: imageFallback('Private Hiking Trail', ['#14532d', '#064e3b', '#1c1917']),
  smokies: imageFallback('Smoky Mountain Area', ['#0c4a6e', '#1e3a8a', '#292524']),
};

export const heroStockImage: StockImage = {
  src: unsplash('photo-1511632765486-a01980e01a18', 2000),
  alt: 'Diverse young adults gathered together in a welcoming cultural exchange community',
  gradient: 'from-stone-950 via-emerald-950 to-amber-900',
};

export const communityLifeStockImages: StockImage[] = [
  {
    src: unsplash('photo-1529156069898-49953e39b3ac'),
    alt: 'Friends and international students gathered outdoors',
    gradient: 'from-emerald-950 via-stone-900 to-amber-900',
  },
  {
    src: unsplash('photo-1529333166437-7750a6dd5a70'),
    alt: 'Young adults sharing a friendly group conversation',
    gradient: 'from-stone-950 via-emerald-900 to-sky-900',
  },
];

export const outdoorAmenityStockImages = {
  stream: {
    src: unsplash('photo-1432405972618-c60b0225b8f9'),
    alt: 'Forest creek running through a wooded retreat',
    gradient: 'from-cyan-900 via-emerald-900 to-stone-900',
  },
  hammocks: {
    src: unsplash('photo-1500530855697-b586d89ba3ee'),
    alt: 'Mountain cabin retreat surrounded by trees',
    gradient: 'from-emerald-950 via-stone-900 to-amber-900',
  },
  firepit: {
    src: unsplash('photo-1478131143081-80f7f84ca84d'),
    alt: 'Outdoor fire pit gathering area in a rustic setting',
    gradient: 'from-orange-950 via-stone-900 to-red-900',
  },
  trail: {
    src: unsplash('photo-1448375240586-882707db888b'),
    alt: 'Private wooded hiking trail through tall trees',
    gradient: 'from-green-950 via-emerald-900 to-stone-900',
  },
  mountains: {
    src: unsplash('photo-1510798831971-661eb04b3739'),
    alt: 'Smoky Mountain ridgeline near Pigeon Forge and Gatlinburg',
    gradient: 'from-sky-950 via-blue-900 to-stone-900',
  },
};

export const propertyStockImages = {
  cottage: {
    src: unsplash('photo-1518780664697-55e3ad937233'),
    alt: 'Rustic cabin exterior surrounded by trees',
    gradient: 'from-amber-900 via-stone-800 to-emerald-900',
  },
  lounge: {
    src: unsplash('photo-1600585152220-90363fe7e115'),
    alt: 'Warm shared lounge with cozy seating and rustic finishes',
    gradient: 'from-orange-900 via-stone-800 to-slate-900',
  },
  drey: {
    src: unsplash('photo-1448375240586-882707db888b'),
    alt: 'Wooded housing area with a quiet forest atmosphere',
    gradient: 'from-emerald-950 via-green-800 to-stone-900',
  },
  lodge: {
    src: unsplash('photo-1500530855697-b586d89ba3ee'),
    alt: 'Mountain lodge exterior in a wooded retreat setting',
    gradient: 'from-stone-900 via-amber-900 to-slate-900',
  },
  loft: {
    src: unsplash('photo-1600566753190-17f0baa2a6c3'),
    alt: 'Bright loft-style interior for comfortable long-term living',
    gradient: 'from-sky-900 via-slate-800 to-amber-900',
  },
};

export const cottageStockImages: StockImage[] = [
  {
    src: unsplash('photo-1518780664697-55e3ad937233'),
    alt: 'Rustic cabin exterior for The Cottage housing section',
    gradient: 'from-emerald-950 via-stone-900 to-amber-900',
  },
  {
    src: unsplash('photo-1505693416388-ac5ce068fe85'),
    alt: 'Cozy student bedroom with warm bedding',
    gradient: 'from-stone-900 via-amber-900 to-slate-900',
  },
  {
    src: unsplash('photo-1600585152220-90363fe7e115'),
    alt: 'Warm kitchen and common area with rustic cabin style',
    gradient: 'from-stone-950 via-amber-900 to-stone-800',
  },
  {
    src: unsplash('photo-1600566753190-17f0baa2a6c3'),
    alt: 'Comfortable loft-style interior with natural light',
    gradient: 'from-amber-900 via-stone-800 to-stone-950',
  },
  {
    src: unsplash('photo-1586023492125-27b2c045efd7'),
    alt: 'Cozy bunk-style room for shared student housing',
    gradient: 'from-orange-950 via-stone-900 to-amber-900',
  },
  {
    src: unsplash('photo-1560185007-cde436f6a4d0'),
    alt: 'Warm bedroom with wood textures and soft lighting',
    gradient: 'from-amber-950 via-stone-900 to-zinc-900',
  },
  {
    src: unsplash('photo-1584622650111-993a426fbf0a'),
    alt: 'Clean bathroom and storage space for long-term housing',
    gradient: 'from-stone-800 via-zinc-700 to-amber-800',
  },
  {
    src: unsplash('photo-1507652313519-d4e9174996dd'),
    alt: 'Simple bathroom vanity and shower area',
    gradient: 'from-stone-700 via-neutral-800 to-amber-800',
  },
  {
    src: unsplash('photo-1519710164239-da123dc03ef4'),
    alt: 'Rustic hallway with cabin-inspired decor',
    gradient: 'from-slate-900 via-stone-800 to-amber-900',
  },
  {
    src: unsplash('photo-1500530855697-b586d89ba3ee'),
    alt: 'Cabin porch with wooded mountain surroundings',
    gradient: 'from-emerald-950 via-stone-800 to-amber-900',
  },
  {
    src: unsplash('photo-1432405972618-c60b0225b8f9'),
    alt: 'Forest creek near a mountain retreat',
    gradient: 'from-green-950 via-emerald-900 to-cyan-900',
  },
  {
    src: unsplash('photo-1518780664697-55e3ad937233'),
    alt: 'Inviting rustic cabin entry in a wooded setting',
    gradient: 'from-amber-900 via-stone-900 to-slate-950',
  },
];

export const galleryPreviewStockImages: StockImage[] = [
  communityLifeStockImages[0],
  {
    src: unsplash('photo-1518780664697-55e3ad937233'),
    alt: 'Cabin exterior in a quiet wooded mountain setting',
    gradient: 'from-stone-950 via-amber-900 to-emerald-900',
  },
  outdoorAmenityStockImages.firepit,
  propertyStockImages.lounge,
  outdoorAmenityStockImages.trail,
  outdoorAmenityStockImages.mountains,
];
