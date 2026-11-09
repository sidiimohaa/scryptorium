import { SettingsForm } from "@/components/bureau/SettingsForm";
import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/store";
import { aiConfigured } from "@/lib/ai";
import { driveConfigured } from "@/lib/drive";

export const metadata = { title: "Réglages" };

export default async function SettingsPage() {
  await requireAdmin();
  const repo = getRepo();
  const [settings, books] = await Promise.all([repo.getSettings(), repo.listBooks()]);
  const published = books.filter((b) => b.visibility === "published").map((b) => ({ id: b.id, title: b.title }));
  const env: [string, boolean, string][] = [
    ["Stockage Supabase", repo.driver === "supabase", "NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY"],
    ["Google Drive", driveConfigured(), "GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET"],
    ["Assistant IA", aiConfigured(), "ANTHROPIC_API_KEY"],
    ["Google Books (quota étendu)", Boolean(process.env.GOOGLE_BOOKS_API_KEY), "GOOGLE_BOOKS_API_KEY (facultatif)"],
  ];
  return (
    <div className="space-y-12">
      <div>
        <p className="eyebrow">Préférences</p>
        <h1 className="display mt-3 text-5xl">Réglages</h1>
      </div>
      <SettingsForm settings={settings} books={published} />
      <section className="max-w-3xl space-y-3">
        <h2 className="display text-3xl">Intégrations</h2>
        <ul className="divide-y divide-line border-y border-line text-sm">
          {env.map(([name, ok, vars]) => (
            <li key={name} className="flex flex-wrap justify-between gap-3 py-3">
              <span>{name}</span>
              <span className={ok ? "text-gold-bright" : "text-muted"}>{ok ? "actif" : `inactif — ${vars}`}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
