import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  Calendar,
  CreditCard,
  FileText,
  Home,
  Image,
  LogIn,
  MapPin,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react';

const portalModules = [
  { label: 'Resident dashboard', icon: Home },
  { label: 'Journey tracker', icon: Calendar },
  { label: 'Housing', icon: Users },
  { label: 'Leases', icon: FileText },
  { label: 'Manual payments', icon: CreditCard },
  { label: 'Notices', icon: Bell },
  { label: 'Maintenance', icon: Wrench },
  { label: 'Gallery', icon: Image },
  { label: 'Local guide', icon: MapPin },
  { label: 'Emergency', icon: AlertTriangle },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
                <Home className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">HollerHub</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Hideaway Holler resident portal</h1>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Manage applications, resident records, housing, leases, payments, notices, maintenance,
                check-in/check-out, emergency information, and alumni access from one clean portal.
              </p>
            </div>

            <div className="grid min-w-full gap-3 sm:min-w-[260px]">
              <Link
                href="/portal"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                <LogIn className="h-4 w-4" />
                Open portal
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                <UserPlus className="h-4 w-4" />
                Register / apply
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Residents</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              View your journey status, profile, lease, payment status, notices, maintenance requests,
              local guide, check-in, check-out, and emergency information.
            </p>
            <Link href="/dashboard" className="mt-4 inline-flex text-sm font-semibold text-brand-700 hover:text-brand-800">
              Go to resident dashboard
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Admins</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review applications, manage seasons, rooms, beds, leases, manual payments, notices,
              maintenance, gallery items, local guide entries, and check-ins.
            </p>
            <Link href="/admin" className="mt-4 inline-flex text-sm font-semibold text-brand-700 hover:text-brand-800">
              Go to admin dashboard
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Portal modules</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {portalModules.map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-700">
                <item.icon className="h-4 w-4 shrink-0 text-brand-600" />
                <span className="font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
