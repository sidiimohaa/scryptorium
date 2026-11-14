"use client";
import { useActionState, useRef, useState } from "react";
import { addCandidate, addSession, openRound, type ClubFormState } from "@/app/bureau/(bureau)/capitulaire/actions";

function Status({ state }: { state: ClubFormState }) {
  if (!state) return null;
  return <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-gold" : "text-[#e08a7a]"}`}>{state.message}</p>;
}

export function OpenRoundForm() {
  const [state, action, pending] = useActionState<ClubFormState, FormData>(openRound, null);
  return (
    <form action={action} className="grid gap-4 md:grid-cols-[1fr_12rem_auto] md:items-end">
      <label className="block"><span className="label">Intitulé</span><input name="label" required minLength={3} maxLength={80} className="field" placeholder="Lecture de décembre 2026" /></label>
      <label className="block"><span className="label">Fin du vote (facultatif)</span><input name="votingEndsAt" type="date" className="field" /></label>
      <button className="btn" disabled={pending}>{pending ? "Ouverture…" : "Ouvrir le scrutin"}</button>
      <div className="md:col-span-3"><Status state={state} /></div>
    </form>
  );
}

type Found = { title: string; author: string | null; year: number | null; coverUrl: string | null; description: string | null };

/** Ajout d'un candidat : recherche Open Library pour préremplir, ou saisie libre. */
export function AddCandidateForm({ roundId }: { roundId: string }) {
  const [state, action, pending] = useActionState<ClubFormState, FormData>(addCandidate, null);
  const [q, setQ] = useState({ title: "", author: "" });
  const [found, setFound] = useState<Found[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [v, setV] = useState({ title: "", author: "", year: "", coverUrl: "", blurb: "" });
  const form = useRef<HTMLFormElement>(null);
  // Candidat ajouté : on vide le formulaire (ajusté pendant le rendu, sans effet).
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state?.ok) {
      setV({ title: "", author: "", year: "", coverUrl: "", blurb: "" });
      setFound(null);
    }
  }
  const search = async () => {
    if (!q.title.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/metadata?title=${encodeURIComponent(q.title)}&author=${encodeURIComponent(q.author)}`);
      const json = await res.json();
      setFound(Array.isArray(json) ? json.slice(0, 6) : Array.isArray(json?.candidates) ? json.candidates.slice(0, 6) : []);
    } catch {
      setFound([]);
    } finally {
      setSearching(false);
    }
  };
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((o) => ({ ...o, [k]: e.target.value }));
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="block"><span className="label">Rechercher un titre</span><input value={q.title} onChange={(e) => setQ({ ...q, title: e.target.value })} className="field" /></label>
        <label className="block"><span className="label">Auteur</span><input value={q.author} onChange={(e) => setQ({ ...q, author: e.target.value })} className="field" /></label>
        <button type="button" onClick={search} className="btn btn-ghost" disabled={searching}>{searching ? "Recherche…" : "Chercher"}</button>
      </div>
      {found && (
        found.length === 0 ? <p className="text-sm text-muted">Rien trouvé : saisissez le livre à la main ci-dessous.</p> : (
          <ul className="grid gap-2 md:grid-cols-2">
            {found.map((f, i) => (
              <li key={i}>
                <button type="button" className="flex w-full gap-3 border border-line p-2 text-left hover:border-gold"
                  onClick={() => setV({ title: f.title, author: f.author ?? "", year: f.year ? String(f.year) : "", coverUrl: f.coverUrl ?? "", blurb: v.blurb })}>
                  {f.coverUrl ? <img src={f.coverUrl} alt="" className="h-16 w-11 shrink-0 object-cover" loading="lazy" /> : <span className="h-16 w-11 shrink-0 bg-line" />}
                  <span className="text-sm"><span className="block text-cream">{f.title}</span><span className="text-muted">{f.author ?? "Auteur inconnu"} · {f.year ?? "année ?"}</span></span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}
      <form ref={form} action={action} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="roundId" value={roundId} />
        <label className="block"><span className="label">Titre</span><input name="title" required value={v.title} onChange={set("title")} className="field" /></label>
        <label className="block"><span className="label">Auteur</span><input name="author" value={v.author} onChange={set("author")} className="field" /></label>
        <label className="block"><span className="label">Année</span><input name="year" inputMode="numeric" value={v.year} onChange={set("year")} className="field" /></label>
        <label className="block"><span className="label">Couverture (adresse https)</span><input name="coverUrl" value={v.coverUrl} onChange={set("coverUrl")} className="field" /></label>
        <label className="block md:col-span-2"><span className="label">Pourquoi ce livre ? (votre présentation, facultative)</span><textarea name="blurb" rows={3} maxLength={1000} value={v.blurb} onChange={set("blurb")} className="field" /></label>
        <div className="flex items-center gap-4 md:col-span-2">
          <button className="btn" disabled={pending}>{pending ? "Ajout…" : "Ajouter au scrutin"}</button>
          <Status state={state} />
        </div>
      </form>
    </div>
  );
}

export function AddSessionForm({ roundId }: { roundId: string }) {
  const [state, action, pending] = useActionState<ClubFormState, FormData>(addSession, null);
  return (
    <form action={action} className="grid gap-4 md:grid-cols-[13rem_1fr] md:items-end">
      <input type="hidden" name="roundId" value={roundId} />
      <label className="block"><span className="label">Date et heure (Paris)</span><input name="startsAt" type="datetime-local" required className="field" /></label>
      <label className="block"><span className="label">Séance</span><input name="title" required maxLength={160} className="field" placeholder="Chapitres 1 à 10" /></label>
      <label className="block md:col-span-2"><span className="label">Note (lieu, lien, consigne…)</span><input name="note" maxLength={500} className="field" /></label>
      <div className="flex items-center gap-4 md:col-span-2"><button className="btn" disabled={pending}>{pending ? "Ajout…" : "Ajouter la séance"}</button><Status state={state} /></div>
    </form>
  );
}
