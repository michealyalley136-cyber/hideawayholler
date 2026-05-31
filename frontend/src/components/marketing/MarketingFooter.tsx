import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer id="contact" className="bg-stone-950 text-stone-100">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_1fr] lg:px-8">
        <div>
          <h2 className="text-xl font-semibold">Hideaway Holler</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-stone-300">
            Pigeon Forge / Sevierville, Tennessee housing for Cultural Exchange Program participants,
            J1 students, interns, and seasonal workers.
          </p>
          <a className="mt-4 inline-block text-sm font-semibold text-amber-300" href="mailto:Hideawayhollerpf@gmail.com">
            Hideawayhollerpf@gmail.com
          </a>
        </div>
        <nav className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Link href="/apply" className="text-stone-300 hover:text-white">Apply</Link>
          <Link href="/portal" className="text-stone-300 hover:text-white">Resident Portal</Link>
          <Link href="/gallery" className="text-stone-300 hover:text-white">Gallery</Link>
          <a href="mailto:Hideawayhollerpf@gmail.com" className="text-stone-300 hover:text-white">Contact</a>
          <Link href="/privacy-policy" className="text-stone-300 hover:text-white">Privacy Policy</Link>
          <Link href="/terms" className="text-stone-300 hover:text-white">Terms</Link>
        </nav>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-stone-500">
        (c) {new Date().getFullYear()} Hideaway Holler. All rights reserved.
      </div>
    </footer>
  );
}
