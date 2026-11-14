import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Emblem } from "@/components/Emblem";
import { PageShell } from "@/components/PageShell";
import { MagicLinkForm } from "@/components/reader/MagicLinkForm";
import { readerAuthEnv } from "@/lib/supabase/env";
import { getReader } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Connexion des lecteurs", robots: { index: false } };

export default async function ReaderLoginPage({ searchParams }: PageProps<"/connexion">) {
  if (await getReader()) redirect("/compte");
  const sp = await searchParams;
  const linkError = sp.erreur === "lien";
  return (
    <PageShell>
      <div className="flex min-h-[70svh] items-center justify-center px-5 py-16">
        <div className="panel rise w-full max-w-md p-10 text-center">
          <Emblem className="mx-auto h-16 w-16 text-gold" />
          <p className="eyebrow mt-6">L&apos;abbaye</p>
          <h1 className="display mt-2 text-4xl">Entrer comme lecteur</h1>
          {linkError && <p role="alert" className="mt-4 text-sm text-[#e08a7a]">Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.</p>}
          {readerAuthEnv() ? (
            <MagicLinkForm />
          ) : (
            <p className="mt-6 text-sm leading-relaxed text-muted">Les comptes lecteurs ne sont pas encore ouverts.</p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
