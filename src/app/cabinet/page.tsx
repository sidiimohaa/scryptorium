import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { getCategories, getPublishedBooks, formatRating } from "@/lib/library";
import { getRepo } from "@/lib/store";
import { computeStats } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Le Cabinet des lectures", description: "Le parcours de lecteur du bibliothécaire, établi d'après ses véritables lectures." };

function Ledger({ title, rows, total }: { title: string; rows: [string, number][]; total: number }) {
  return (
    <section className="panel p-6">
      <h2 className="eyebrow">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 font-[family-name:var(--font-serif)] italic text-muted">Rien à consigner pour l&apos;instant.</p>
      ) : (
        <ol className="mt-5 space-y-3">
          {rows.slice(0, 8).map(([k, v]) => (
            <li key={k}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-[family-name:var(--font-serif)] text-lg text-parchment">{k}</span>
                <span className="tabular-nums text-gold-soft">{v}</span>
              </div>
              <div className="mt-1 h-px bg-line">
                <div className="h-px bg-gold" style={{ width: `${(v / Math.max(total, 1)) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default async function CabinetPage() {
  const [books, categories, settings] = await Promise.all([getPublishedBooks(), getCategories(), getRepo().getSettings()]);
  const s = computeStats(books, categories);
  const goal = settings.readingGoal;
  const goalDone = goal ? s.timeline.filter((b) => b.readFinishedAt!.startsWith(String(goal.year))).length : 0;
  const maxYear = Math.max(1, ...s.byYear.map(([, n]) => n));

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-10">
        <p className="eyebrow rise">Carnet du bibliothécaire</p>
        <h1 className="display rise rise-1 mt-4 text-6xl md:text-7xl">Le Cabinet des lectures</h1>
        <p className="rise rise-2 mt-5 max-w-2xl font-[family-name:var(--font-serif)] text-lg italic text-muted">
          Chaque chiffre est tiré des fiches publiées. Rien n&apos;est estimé, rien n&apos;est arrondi pour faire bonne figure.
        </p>

        <dl className="rise rise-3 mt-14 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
          {[
            ["Livres lus", String(s.finishedCount)],
            ["Pages lues", s.pagesKnownFor ? s.pagesRead.toLocaleString("fr-FR") : "—"],
            ["Note moyenne", s.averageRating !== null ? formatRating(s.averageRating, settings.ratingScale)! : "—"],
            ["En cours", String(s.readingCount)],
          ].map(([k, v]) => (
            <div key={k} className="bg-ink p-6">
              <dt className="label">{k}</dt>
              <dd className="font-[family-name:var(--font-display)] text-5xl text-cream">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted">
          {s.pagesKnownFor < s.finishedCount && s.finishedCount > 0 && `Pages connues pour ${s.pagesKnownFor} livre(s) sur ${s.finishedCount}. `}
          {s.ratedCount > 0 && `Moyenne calculée sur ${s.ratedCount} livre(s) noté(s).`}
          {s.finishedCount === 0 && "Aucune lecture n'est encore marquée « Terminé » — le carnet se remplira au fil des fiches."}
        </p>

        {goal && (
          <section className="panel mt-10 p-6">
            <h2 className="eyebrow">Objectif {goal.year}</h2>
            <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-cream">{goalDone} / {goal.target} livres</p>
            <div className="mt-4 h-1 bg-line"><div className="h-1 bg-gold" style={{ width: `${Math.min(100, (goalDone / Math.max(goal.target, 1)) * 100)}%` }} /></div>
          </section>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Ledger title="Par genre" rows={s.byGenre} total={s.finishedCount} />
          <Ledger title="Par auteur" rows={s.byAuthor} total={s.finishedCount} />
          <Ledger title="Par rayonnage" rows={s.byShelf} total={s.finishedCount} />
        </div>

        <section className="panel mt-6 p-6">
          <h2 className="eyebrow">Livres lus par année</h2>
          {s.byYear.length === 0 ? (
            <p className="mt-4 font-[family-name:var(--font-serif)] italic text-muted">Renseignez la date de fin de lecture pour voir apparaître les années.</p>
          ) : (
            <div className="mt-6 flex h-48 items-end gap-4" role="img" aria-label={s.byYear.map(([y, n]) => `${y} : ${n}`).join(", ")}>
              {s.byYear.map(([y, n]) => (
                <div key={y} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs tabular-nums text-gold-soft">{n}</span>
                  <div className="w-full max-w-14 bg-gradient-to-t from-bordeaux to-gold/80" style={{ height: `${(n / maxYear) * 140}px` }} />
                  <span className="text-xs tabular-nums text-muted">{y}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-20">
          <p className="eyebrow">Chronologie</p>
          <h2 className="display mt-3 text-5xl">Histoire d&apos;un lecteur</h2>
          {s.timeline.length === 0 ? (
            <p className="mt-8 font-[family-name:var(--font-serif)] text-lg italic text-muted">La chronologie commencera avec la première lecture datée.</p>
          ) : (
            <ol className="relative mt-12 space-y-10 border-l border-line pl-8">
              {s.timeline.map((b) => (
                <li key={b.id} className="relative">
                  <span aria-hidden className="absolute -left-[37px] top-2 h-2 w-2 rotate-45 bg-gold" />
                  <p className="text-xs uppercase tracking-[0.2em] text-gold-soft">{new Date(b.readFinishedAt!).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
                  <Link href={`/livres/${b.slug}`} className="font-[family-name:var(--font-display)] text-3xl text-cream hover:text-gold-bright">{b.title}</Link>
                  <p className="text-muted">{b.author}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </PageShell>
  );
}
