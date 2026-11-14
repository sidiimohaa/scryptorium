"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { castVote, setEnrollment, withdrawVote } from "@/app/capitulaire/actions";
import { arrival, type Passage } from "@/lib/passage";
import { Emblem } from "../Emblem";
import { PassageVeil } from "../PassageVeil";
import { PlanOverlay } from "../PlanOverlay";
import type { ClubBook } from "./CapitularyScene";

const CapitularyScene = dynamic(() => import("./CapitularyScene"), { ssr: false, loading: () => null });

export type ClubRoundView = {
  id: string;
  label: string;
  status: "voting" | "reading";
  votingEndsAt: string | null;
  winnerId: string | null;
  candidates: (ClubBook & { blurb: string })[];
  sessions: { id: string; startsAt: string; title: string; note: string }[];
  members: number;
};
export type ArchiveView = { id: string; label: string; winner: { title: string; author: string } | null; members: number; votes: number };
export type MemberStatus = "guest" | "banned" | "needsPseudo" | "member";

const day = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function CapitularyExperience({ round, archives, status, myVote, enrolled }: {
  round: ClubRoundView | null;
  archives: ArchiveView[];
  status: MemberStatus;
  myVote: string | null;
  enrolled: boolean;
}) {
  const router = useRouter();
  const [support, setSupport] = useState<"checking" | "ok" | "none">("checking");
  const [lowPower, setLowPower] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [veil, setVeil] = useState(true);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only state after hydration
    setSupport(hasWebGL() ? "ok" : "none");
    setPassage(arrival());
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("scr-perf");
    } catch {}
    const weak = (navigator.hardwareConcurrency ?? 8) <= 4 || matchMedia("(max-width: 767px)").matches;
    setLowPower(stored ? stored === "low" : weak);
    if (!hasWebGL()) setVeil(false);
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  const act = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      setNote(r.message);
      if (r.ok) router.refresh();
    });

  const mode = !round ? "none" : round.status;
  const winner = round?.candidates.find((c) => c.id === round.winnerId) ?? null;
  const books: ClubBook[] = !round ? [] : round.status === "voting" ? round.candidates : winner ? [winner] : [];
  const current = round?.candidates.find((c) => c.id === selected) ?? null;
  const total = round?.candidates.reduce((s, c) => s + c.votes, 0) ?? 0;
  const canAct = status === "member";
  const blocked =
    status === "guest" ? <>Pour voter ou vous inscrire, <Link href="/connexion" className="link-gilt text-gold">entrez comme lecteur</Link>.</>
      : status === "needsPseudo" ? <>Choisissez d&apos;abord votre pseudo dans <Link href="/compte" className="link-gilt text-gold">Mon compte</Link>.</>
        : status === "banned" ? "Votre compte ne peut plus participer au club." : null;

  return (
    <div className="fixed inset-0 bg-[#120c09]">
      <div className="absolute inset-0" aria-hidden>
        {support === "ok" && fontsReady && (
          <CapitularyScene mode={mode} books={books} selected={selected} onSelect={setSelected} lowPower={lowPower}
            onDecline={() => setLowPower(true)} onReady={() => setTimeout(() => setVeil(false), 120)} />
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(12_8_6/0.55)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgb(17_16_15/0.8),rgb(17_16_15/0.3)_38%,transparent_62%)]" />
      <PassageVeil visible={veil} passage={passage} tone="#120c09" />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 md:p-6">
        <Link href="/" className="pointer-events-auto flex items-center gap-3 text-gold" aria-label="SCRYPTORIUM — accueil">
          <Emblem className="h-9 w-9" />
          <span className="hidden font-[family-name:var(--font-display)] tracking-[0.34em] text-cream sm:inline">SCRYPTORIUM</span>
        </Link>
        <div className="pointer-events-auto flex gap-2">
          {selected && <button type="button" onClick={() => setSelected(null)} className="btn btn-ghost px-3 py-2 text-[0.68rem] tracking-[0.18em]">Toute la salle</button>}
          <PlanOverlay current="capitulaire" />
        </div>
      </div>

      <div className="pointer-events-none absolute left-4 top-20 md:left-8 md:top-24">
        <p className="eyebrow">L&apos;abbaye · Capitulum</p>
        <h1 className="display mt-2 text-4xl md:text-6xl">La Salle capitulaire</h1>
        <p className="mt-2 max-w-sm font-[family-name:var(--font-serif)] text-parchment/80">
          {mode === "voting" ? "Le chapitre choisit sa prochaine lecture : approchez-vous d'un lutrin." : mode === "reading" ? "La lecture du mois trône au centre du chapitre." : "Le chapitre ne s'est pas encore réuni."}
        </p>
      </div>

      <aside className="absolute inset-x-3 bottom-3 max-h-[50svh] overflow-y-auto border border-line bg-ink/85 p-5 backdrop-blur-md md:inset-x-auto md:bottom-auto md:right-8 md:top-24 md:max-h-[calc(100svh-8rem)] md:w-[420px] md:p-7">
        {!round ? (
          <>
            <p className="eyebrow">Le club</p>
            <p className="mt-3 font-[family-name:var(--font-serif)] text-lg leading-relaxed text-parchment/85">
              Aucun scrutin ouvert pour l&apos;instant. Le bibliothécaire proposera bientôt des livres à élire.
            </p>
          </>
        ) : round.status === "voting" ? (
          current ? (
            <>
              <button type="button" onClick={() => setSelected(null)} className="link-gilt text-[0.65rem] uppercase tracking-[0.2em] text-parchment/70">← Tous les livres proposés</button>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-cream">{current.title}</h2>
              <p className="mt-1 font-[family-name:var(--font-serif)] italic text-gold-soft">{current.author}{current.year ? `, ${current.year}` : ""}</p>
              {current.blurb && <p className="mt-4 font-[family-name:var(--font-serif)] leading-relaxed text-parchment/85">{current.blurb}</p>}
              <p className="mt-4 text-sm text-parchment/80">{current.votes} voix sur {total}</p>
              {canAct ? (
                myVote === current.id ? (
                  <div className="mt-4 flex items-center gap-4">
                    <span className="text-xs uppercase tracking-[0.2em] text-gold">Votre voix</span>
                    <button type="button" disabled={pending} onClick={() => act(() => withdrawVote(round.id))} className="link-gilt text-[0.65rem] uppercase tracking-[0.2em] text-parchment/70">Retirer</button>
                  </div>
                ) : (
                  <button type="button" disabled={pending} onClick={() => act(() => castVote(round.id, current.id))} className="btn mt-4">
                    {myVote ? "Reporter ma voix ici" : "Voter pour ce livre"}
                  </button>
                )
              ) : (
                <p className="mt-4 text-sm text-parchment/80">{blocked}</p>
              )}
            </>
          ) : (
            <>
              <p className="eyebrow">{round.label} · scrutin ouvert</p>
              <p className="mt-2 text-sm text-muted">
                {total} voix · {round.members} inscrit{round.members > 1 ? "s" : ""}
                {round.votingEndsAt ? ` · clôture le ${day(round.votingEndsAt)}` : ""}
              </p>
              {round.candidates.length === 0 ? (
                <p className="mt-3 text-parchment/80">Les livres proposés arrivent bientôt.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line border-y border-line">
                  {round.candidates.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => setSelected(c.id)} className="group flex w-full items-baseline justify-between gap-3 py-3 text-left">
                        <span>
                          <span className="block font-[family-name:var(--font-display)] text-xl text-cream group-hover:text-gold-bright">{c.title}</span>
                          <span className="text-xs text-muted">{c.author}{c.year ? `, ${c.year}` : ""}</span>
                        </span>
                        <span className={`shrink-0 text-sm ${myVote === c.id ? "text-gold" : "text-parchment/70"}`}>{c.votes} voix{myVote === c.id ? " · la vôtre" : ""}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {enrollmentBlock()}
            </>
          )
        ) : (
          <>
            <p className="eyebrow">{round.label} · lecture du mois</p>
            {winner ? (
              <>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-cream">{winner.title}</h2>
                <p className="mt-1 font-[family-name:var(--font-serif)] italic text-gold-soft">{winner.author}{winner.year ? `, ${winner.year}` : ""}</p>
                {winner.blurb && <p className="mt-3 font-[family-name:var(--font-serif)] leading-relaxed text-parchment/85">{winner.blurb}</p>}
              </>
            ) : <p className="mt-2 text-parchment/80">Lecture à venir.</p>}
            <div className="mt-6 border-t border-line pt-5">
              <p className="eyebrow">Séances</p>
              {round.sessions.length === 0 ? <p className="mt-2 text-sm text-muted">Le calendrier sera bientôt fixé.</p> : (
                <ul className="mt-3 space-y-3">
                  {round.sessions.map((s) => (
                    <li key={s.id} className="border-l border-gold/40 pl-3">
                      <p className="text-[0.65rem] uppercase tracking-[0.18em] text-gold">{day(s.startsAt)}</p>
                      <p className="mt-0.5 text-cream">{s.title}</p>
                      {s.note && <p className="text-sm text-muted">{s.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {enrollmentBlock()}
          </>
        )}

        {archives.length > 0 && (
          <div className="mt-6 border-t border-line pt-5">
            <p className="eyebrow">Lectures passées</p>
            <ul className="mt-3 space-y-2">
              {archives.map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="text-muted">{a.label} · </span>
                  <span className="text-parchment">{a.winner ? `${a.winner.title} — ${a.winner.author}` : "sans lecture retenue"}</span>
                  <span className="text-muted"> · {a.members} inscrit{a.members > 1 ? "s" : ""}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {note && <p role="status" className="mt-4 text-sm text-gold">{note}</p>}
        {support === "none" && <p className="mt-6 text-xs text-muted">La salle en 3D n&apos;est pas disponible sur ce navigateur.</p>}
      </aside>
    </div>
  );

  function enrollmentBlock() {
    if (!round) return null;
    return (
      <div className="mt-6 border-t border-line pt-5">
        <p className="eyebrow">Participer à la lecture</p>
        <p className="mt-2 text-sm text-parchment/80">{round.members} membre{round.members > 1 ? "s" : ""} inscrit{round.members > 1 ? "s" : ""}.</p>
        {canAct ? (
          <button type="button" disabled={pending} onClick={() => act(() => setEnrollment(round.id, !enrolled))} className={`mt-3 ${enrolled ? "link-gilt text-[0.65rem] uppercase tracking-[0.2em] text-parchment/70" : "btn"}`}>
            {enrolled ? "Me désinscrire" : "Je participe"}
          </button>
        ) : (
          <p className="mt-2 text-sm text-parchment/80">{blocked}</p>
        )}
      </div>
    );
  }
}
