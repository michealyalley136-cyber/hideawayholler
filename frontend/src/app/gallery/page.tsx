import Link from 'next/link';
import { ArrowRight, Camera, MapPin } from 'lucide-react';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingImage } from '@/components/marketing/MarketingImage';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { galleryImages, propertyHighlights } from '@/lib/hideawayMarketing';

export const metadata = {
  title: 'Gallery | Hideaway Holler',
  description: 'Property and lifestyle preview for Hideaway Holler in Pigeon Forge and Sevierville, Tennessee.',
};

export default function PublicGalleryPage() {
  return (
    <div className="min-h-screen bg-[#fffaf2] text-stone-950">
      <MarketingNav />
      <main>
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-900">
              <Camera className="h-4 w-4" />
              Hideaway Holler Gallery
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-tight text-stone-950 sm:text-6xl">
              Mountain housing with room to gather, rest, and explore.
            </h1>
            <p className="mt-5 text-lg leading-8 text-stone-700">
              Preview the cabin-style residences, shared spaces, wooded setting, and outdoor amenities that
              make Hideaway Holler feel like a welcoming home base in the Smokies.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {galleryImages.map((image, index) => (
              <MarketingImage
                key={image.src}
                src={image.src}
                fallbackSrc={image.fallbackSrc}
                gradient={image.gradient}
                alt={image.alt}
                wrapperClassName={index === 0 ? 'aspect-[16/10] rounded-lg md:col-span-2 md:row-span-2' : 'aspect-[16/11] rounded-lg'}
              />
            ))}
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-semibold uppercase text-amber-700">Housing Areas</p>
                <h2 className="mt-2 text-3xl font-bold text-stone-950">Explore the property sections.</h2>
              </div>
              <Link href="/apply" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-950">
                Apply for Housing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {propertyHighlights.map((property) => (
                <article key={property.name} id={property.name.toLowerCase().replace(/\s+/g, '-')} className="overflow-hidden rounded-lg border border-stone-200 bg-[#fffaf2]">
                  <MarketingImage
                    src={property.image.src}
                    fallbackSrc={property.image.fallbackSrc}
                    gradient={property.image.gradient}
                    alt={property.image.alt}
                    wrapperClassName="aspect-[4/3]"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-stone-950">{property.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{property.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-stone-950 p-8 text-white sm:p-10">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-amber-100">
              <MapPin className="h-4 w-4" />
              Pigeon Forge / Sevierville, Tennessee
            </p>
            <h2 className="mt-5 max-w-3xl text-3xl font-bold sm:text-4xl">Ready to start your housing application?</h2>
            <p className="mt-3 max-w-2xl text-stone-300">
              Create your Hideaway Holler applicant account, choose an available season, and follow your
              approval steps through the resident portal.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/apply" className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-stone-950 hover:bg-amber-400">
                Apply Now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/portal" className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20">
                Resident Portal
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
