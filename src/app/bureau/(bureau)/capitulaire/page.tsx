import { AddCandidateForm, AddSessionForm, ChooseBookForm, OpenRoundForm } from "@/components/club/ClubForms";
import { getPublishedBooks } from "@/lib/library";
import { frenchDay, getClub } from "@/lib/club";
import { archiveRound, closeVoting, removeCandidate, removeSession } from "./actions";

export const dynamic = "force-dynamic";

/** Bureau du club : scrutin du mois, candidats (hors bibliothèque), clôture, séances, archives. */
export default async function CapitularyBureau() {
  const [club, books] = await Promise.all([getClub(), getPublishedBooks()]);
  if (!club) return <p className="text-muted">Le club nécessite Supabase et les comptes lecteurs.</p>;
  const { active, archives } = club;
  const sorted = active ? [...active.candidates].sort((a, b) => b.votes - a.votes) : [];
  const total = sorted.reduce((s, c) => s + c.votes, 0);
  const winner = active?.candidates.find((c) => c.id === active.winnerId) ?? null;

  return (
    <div className="space-y-12">
      <header>
        <p className="eyebrow">Salle capitulaire</p>
        <h1 className="display mt-2 text-4xl">Le club de lecture</h1>
        <p className="mt-2 text-sm text-muted">Vous proposez des livres absents de la bibliothèque ; les membres votent ; le gagnant devient la lecture du mois. Vous pouvez aussi choisir directement un livre de la bibliothèque, sans vote.</p>
      </header>

      {!active && (
        <section className="panel space-y-4 p-6">
          <h2 className="display text-2xl">Ouvrir un scrutin</h2>
          <OpenRoundForm />
        </section>
      )}

      {!active && (
        <section className="panel space-y-4 p-6">
          <h2 className="display text-2xl">Ou choisir directement le livre du mois</h2>
          <p className="text-sm text-muted">Sans vote : un livre déjà présent dans la bibliothèque devient la lecture en cours. Vous ajoutez ensuite les séances.</p>
          <ChooseBookForm books={[...books].sort((a, b) => a.title.localeCompare(b.title, "fr")).map((b) => ({ id: b.id, title: b.title, author: b.author }))} />
        </section>
      )}

      {active && (
        <section className="panel space-y-6 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="display text-2xl">{active.label}</h2>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">
              {active.status === "voting" ? `Vote en cours · ${total} voix${active.votingEndsAt ? ` · clôture prévue le ${frenchDay(active.votingEndsAt)}` : ""}` : `Lecture en cours · ${active.members} inscrit${active.members > 1 ? "s" : ""}`}
            </p>
          </div>

          {active.status === "voting" && (
            <>
              {sorted.length === 0 ? (
                <p className="text-sm text-muted">Aucun candidat pour l&apos;instant.</p>
              ) : (
                <ul className="divide-y divide-line border-y border-line">
                  {sorted.map((c) => (
                    <li key={c.id} className="flex items-center gap-4 py-3">
                      {c.coverUrl ? <img src={c.coverUrl} alt="" className="h-14 w-10 object-cover" /> : <span className="h-14 w-10 bg-line" />}
                      <span className="flex-1">
                        <span className="block text-cream">{c.title}</span>
                        <span className="text-sm text-muted">{c.author}{c.year ? `, ${c.year}` : ""}</span>
                      </span>
                      <span className="text-gold">{c.votes} voix</span>
                      <form action={removeCandidate.bind(null, c.id)}><button className="text-xs uppercase tracking-[0.18em] text-muted hover:text-parchment">Retirer</button></form>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-line pt-5">
                <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl text-cream">Proposer un livre</h3>
                <AddCandidateForm roundId={active.id} />
              </div>
              {sorted.length > 0 && (
                <form action={closeVoting} className="flex flex-wrap items-end gap-4 border-t border-line pt-5">
                  <input type="hidden" name="roundId" value={active.id} />
                  <label className="block"><span className="label">Lecture retenue</span>
                    <select name="winnerId" defaultValue={sorted[0].id} className="field">
                      {sorted.map((c) => <option key={c.id} value={c.id}>{c.title} — {c.votes} voix</option>)}
                    </select>
                  </label>
                  <button className="btn">Clore le vote</button>
                  <p className="text-xs text-muted">Le livre le plus voté est proposé ; en cas d&apos;égalité, c&apos;est vous qui tranchez.</p>
                </form>
              )}
            </>
          )}

          {active.status === "reading" && (
            <>
              {winner && <p className="text-cream">Lecture du mois : <span className="font-[family-name:var(--font-display)] text-2xl">{winner.title}</span> <span className="text-muted">— {winner.author}</span></p>}
              <div>
                <h3 className="mb-3 font-[family-name:var(--font-display)] text-xl text-cream">Séances</h3>
                {active.sessions.length === 0 ? <p className="text-sm text-muted">Aucune séance fixée.</p> : (
                  <ul className="mb-4 space-y-2">
                    {active.sessions.map((s) => (
                      <li key={s.id} className="flex items-baseline justify-between gap-3 border-l border-gold/40 pl-3">
                        <span><span className="text-cream">{s.title}</span> <span className="text-sm text-muted">· {frenchDay(s.startsAt)}{s.note ? ` · ${s.note}` : ""}</span></span>
                        <form action={removeSession.bind(null, s.id)}><button className="text-xs uppercase tracking-[0.18em] text-muted hover:text-parchment">Retirer</button></form>
                      </li>
                    ))}
                  </ul>
                )}
                <AddSessionForm roundId={active.id} />
              </div>
              <form action={archiveRound.bind(null, active.id)} className="border-t border-line pt-5">
                <button className="btn btn-ghost">Archiver cette lecture</button>
                <span className="ml-3 text-xs text-muted">Elle rejoindra les archives ; vous pourrez ouvrir le scrutin suivant.</span>
              </form>
            </>
          )}
        </section>
      )}

      <section>
        <h2 className="display text-2xl">Lectures passées · {archives.length}</h2>
        {archives.length === 0 ? <p className="mt-2 text-sm text-muted">Aucune pour l&apos;instant.</p> : (
          <ul className="mt-3 space-y-2">
            {archives.map((r) => {
              const w = r.candidates.find((c) => c.id === r.winnerId);
              return <li key={r.id} className="text-parchment">{r.label} — <span className="text-cream">{w?.title ?? "sans lecture retenue"}</span> <span className="text-sm text-muted">({r.members} inscrit{r.members > 1 ? "s" : ""})</span></li>;
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
