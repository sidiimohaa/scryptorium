import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Emblem } from "@/components/Emblem";
import { LoginForm } from "@/components/bureau/LoginForm";
import { adminConfigured, isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bureau du Bibliothécaire", robots: { index: false } };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/bureau");
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="panel rise w-full max-w-md p-10 text-center">
        <Emblem className="mx-auto h-16 w-16 text-gold" />
        <h1 className="display mt-6 text-4xl">Le Bureau du Bibliothécaire</h1>
        {adminConfigured() ? (
          <LoginForm />
        ) : (
          <p className="mt-6 text-sm leading-relaxed text-muted">
            Le Bureau n&apos;est pas encore configuré. Définissez <code className="text-gold">ADMIN_PASSWORD</code> et{" "}
            <code className="text-gold">SESSION_SECRET</code> (32 caractères minimum) dans les variables d&apos;environnement, puis redémarrez le serveur.
          </p>
        )}
      </div>
    </main>
  );
}
