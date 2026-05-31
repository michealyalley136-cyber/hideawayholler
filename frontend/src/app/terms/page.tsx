import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingNav } from '@/components/marketing/MarketingNav';

export const metadata = {
  title: 'Terms | Hideaway Holler',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#fffaf2] text-stone-950">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase text-emerald-800">Terms</p>
        <h1 className="mt-2 text-4xl font-bold">Hideaway Holler Terms</h1>
        <div className="mt-6 space-y-5 text-base leading-8 text-stone-700">
          <p>
            The Hideaway Holler Resident Portal supports housing applications, leases, payment status,
            notices, maintenance requests, check-in/check-out details, and resident communication.
            Portal access is intended for applicants, residents, alumni, and authorized staff.
          </p>
          <p>
            Housing details, lease obligations, payment terms, and community rules are governed by the
            applicable application, lease, and resident communications. For questions, contact
            Hideawayhollerpf@gmail.com.
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
