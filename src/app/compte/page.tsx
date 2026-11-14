import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { PseudoForm } from "@/components/reader/PseudoForm";
import { signOut } from "@/app/connexion/actions";
import { getReader } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };

export default async function AccountPage() {
  const reader = await getReader();
  if (!reader) redirect("/connexion");
  return (
    <PageShell>
      <div className="mx-auto max-w-2xl px-5 py-16 md:px-10">
        <p className="eyebrow rise">L&apos;abbaye</p>
        <h1 className="display rise rise-1 mt-4 text-5xl md:text-6xl">{reader.needsPseudo ? "Bienvenue, lecteur" : reader.displayName}</h1>
        <section className="panel rise rise-2 mt-10 space-y-6 p-8">
          {reader.needsPseudo ? (
            <p className="font-[family-name:var(--font-serif)] text-lg leading-relaxed text-parchment/85">
              Choisissez le pseudo sous lequel vous apparaîtrez dans l&apos;abbaye. Votre adresse e-mail reste privée.
            </p>
          ) : (
            <p className="font-[family-name:var(--font-serif)] text-lg leading-relaxed text-parchment/85">C&apos;est sous ce nom que vous apparaissez dans l&apos;abbaye.</p>
          )}
          <PseudoForm current={reader.needsPseudo ? "" : reader.displayName} />
        </section>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/abbaye" className="btn btn-ghost">Plan de l&apos;abbaye</Link>
          <form action={signOut}>
            <button type="submit" className="link-gilt text-xs uppercase tracking-[0.2em] text-parchment/70">Se déconnecter</button>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
