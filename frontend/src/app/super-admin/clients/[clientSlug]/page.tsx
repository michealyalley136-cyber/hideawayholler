import Link from 'next/link';
import { redirect } from 'next/navigation';

const KNOWN_CLIENT_SLUGS = new Set(['hideaway-holler']);

export default async function SuperAdminClientSlugPage({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;

  if (KNOWN_CLIENT_SLUGS.has(clientSlug)) {
    redirect('/super-admin/clients/hideaway-holler');
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Super Admin / Clients</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Client not found</h1>
        <p className="mt-3 text-sm text-slate-600">
          We could not find a Super Admin client for <span className="font-semibold text-slate-900">{clientSlug}</span>.
          Use the client list to open an available client account.
        </p>
        <Link
          href="/super-admin/clients"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          Back to clients
        </Link>
      </div>
    </main>
  );
}
