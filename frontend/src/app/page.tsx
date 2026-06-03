import Link from 'next/link';
import { ArrowRight, CheckCircle2, Mail, MapPin, ShieldCheck, Trees } from 'lucide-react';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingImage } from '@/components/marketing/MarketingImage';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import {
  galleryImages,
  heroImage,
  outdoorAmenities,
  propertyHighlights,
  safetyItems,
} from '@/lib/hideawayMarketing';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fffaf2] text-stone-950">
      <MarketingNav />

      <section className="relative isolate overflow-hidden">
        <MarketingImage
          src={heroImage.src}
          fallbackSrc={heroImage.fallbackSrc}
          gradient={heroImage.gradient}
          alt={heroImage.alt}
          wrapperClassName="absolute inset-0 -z-10"
          className="object-[center_45%] opacity-95"
          loading="eager"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-stone-950/90 via-stone-950/68 to-stone-950/20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-stone-950/50 via-transparent to-stone-950/15" />
        <div className="mx-auto flex min-h-[76svh] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold text-amber-100 backdrop-blur">
              Cultural Exchange Community in Pigeon Forge
            </p>
            <h1 className="mt-6 max-w-2xl text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
              Welcome to Hideaway Holler
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-100 sm:text-xl">
              A warm, resort-style housing community for J1 students, interns, and seasonal workers in
              the Smoky Mountain area.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-base font-semibold text-stone-950 shadow-lg shadow-black/20 transition hover:bg-amber-400"
              >
                Apply for Housing
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/portal"
                className="inline-flex items-center justify-center rounded-lg border border-white/35 bg-white/15 px-6 py-3 text-base font-semibold text-white backdrop-blur transition hover:bg-white/25"
              >
                Resident Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      <main>
        <section className="border-y border-amber-900/10 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase text-amber-700">Our Mission</p>
              <h2 className="mt-2 text-3xl font-bold text-stone-950 sm:text-4xl">
                Long-term housing with a community heart.
              </h2>
            </div>
            <p className="text-lg leading-8 text-stone-700">
              Hideaway Holler is an exclusive resort-style community dedicated to providing the best
              long-term housing for those participating in Cultural Exchange Programs while working in
              Pigeon Forge and Gatlinburg.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
          <div className="rounded-lg bg-emerald-900 p-6 text-white shadow-sm sm:p-8">
            <ShieldCheck className="h-10 w-10 text-amber-200" />
            <h2 className="mt-5 text-3xl font-bold">Safety & Support</h2>
            <p className="mt-3 leading-7 text-emerald-50">
              Residents are supported by individual access codes, free laundry, live video monitoring in
              common areas and exterior grounds, and 24/7 on-site property management.
            </p>
            <div className="mt-6 grid gap-3">
              {safetyItems.slice(0, 4).map((item) => (
                <div key={item.title} className="flex gap-3 rounded-lg bg-white/10 p-4">
                  <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
                  <p className="text-sm font-medium leading-6">{item.title}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <Trees className="h-10 w-10 text-emerald-800" />
            <h2 className="mt-5 text-3xl font-bold">Outdoor Amenities</h2>
            <p className="mt-3 leading-7 text-stone-600">
              A mountain setting gives residents space to relax, gather, and enjoy time outside between
              work shifts.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {outdoorAmenities.map((item) => (
                <div key={item.title} className="flex items-center gap-3 rounded-lg bg-[#fff7e6] p-4">
                  <item.icon className="h-5 w-5 shrink-0 text-emerald-800" />
                  <span className="text-sm font-semibold text-stone-800">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="housing" className="bg-stone-950 py-16 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase text-amber-300">Property Highlights</p>
                <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
                  Cabin-style spaces with distinct personalities.
                </h2>
              </div>
              <Link href="/gallery" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-200 hover:text-white">
                View Full Gallery
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {propertyHighlights.map((property) => (
                <article key={property.name} className="overflow-hidden rounded-lg border border-white/10 bg-white/10">
                  <MarketingImage
                    src={property.image.src}
                    fallbackSrc={property.image.fallbackSrc}
                    gradient={property.image.gradient}
                    alt={property.image.alt}
                    wrapperClassName="aspect-[4/3]"
                  />
                  <div className="p-5">
                    <h3 className="text-lg font-semibold">{property.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-300">{property.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-semibold uppercase text-amber-700">Gallery Preview</p>
                <h2 className="mt-2 text-3xl font-bold text-stone-950 sm:text-4xl">
                  A glimpse of life at the Holler.
                </h2>
              </div>
              <Link
                href="/gallery"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
              >
                View Full Gallery
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {galleryImages.map((image, index) => (
                <MarketingImage
                  key={image.src}
                  src={image.src}
                  fallbackSrc={image.fallbackSrc}
                  gradient={image.gradient}
                  alt={image.alt}
                  wrapperClassName={index === 0 || index === 5 ? 'aspect-[4/5] rounded-lg md:row-span-2' : 'aspect-square rounded-lg'}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f0f7f4] py-16">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase text-emerald-900">Resident Portal</p>
              <h2 className="mt-2 text-3xl font-bold text-stone-950 sm:text-4xl">
                Already accepted or living here?
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-700">
                Use the resident portal to view your lease, notices, payment status, maintenance
                requests, local guide, and check-in/check-out information.
              </p>
              <Link
                href="/portal"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
              >
                Go to Resident Portal
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3 rounded-lg bg-white p-5 shadow-sm">
              {['Lease status', 'Notices', 'Payment status', 'Maintenance requests', 'Local guide', 'Check-in and check-out'].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-stone-200 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  <span className="text-sm font-semibold text-stone-800">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-stone-900 py-16 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.28),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.22),_transparent_30%)]" />
          <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-amber-100">
              <MapPin className="h-4 w-4" />
              Pigeon Forge / Sevierville, Tennessee
            </p>
            <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-bold sm:text-5xl">
              Coming to the Smokies for work or cultural exchange?
            </h2>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-base font-semibold text-stone-950 transition hover:bg-amber-400"
              >
                Apply Now
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="mailto:Hideawayhollerpf@gmail.com"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/20"
              >
                <Mail className="h-5 w-5" />
                Hideawayhollerpf@gmail.com
              </a>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
