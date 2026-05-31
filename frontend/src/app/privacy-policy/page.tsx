import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingNav } from '@/components/marketing/MarketingNav';

export const metadata = {
  title: 'Privacy Policy | Hideaway Holler',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#fffaf2] text-stone-950">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase text-emerald-800">Privacy Policy</p>
        <h1 className="mt-2 text-4xl font-bold">Hideaway Holler Privacy Policy</h1>
        <div className="mt-6 space-y-5 text-base leading-8 text-stone-700">
          <p>
            Hideaway Holler uses applicant and resident information to manage housing applications,
            leases, room assignments, payments, notices, maintenance requests, emergency information,
            and related resident services.
          </p>
          <p>
            Information submitted through HollerHub is used for housing operations and resident support.
            For privacy questions, contact Hideawayhollerpf@gmail.com.
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
