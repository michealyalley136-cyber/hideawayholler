import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { navLinks } from '@/lib/hideawayMarketing';

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-[#fffaf2]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <img src="/hideaway-logo.png" alt="Hideaway Holler" className="h-11 w-11 shrink-0 rounded-full object-cover shadow-sm" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-stone-950">Hideaway Holler</span>
            <span className="block truncate text-xs text-stone-600">Cultural Exchange Community</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-stone-700 hover:text-emerald-800">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/apply"
            className="hidden rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 sm:inline-flex"
          >
            Apply
          </Link>
          <Link
            href="/portal"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
          >
            <LogIn className="h-4 w-4" />
            Portal
          </Link>
        </div>
      </div>
    </header>
  );
}
