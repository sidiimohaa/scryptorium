"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadThread } from "@/app/refectoire/actions";
import { browserClient } from "@/lib/supabase/browser";
import { Emblem } from "../Emblem";
import { LiveTopic, type LivePost } from "../refectory/LiveTopic";
import { NewTopicForm } from "../refectory/NewTopicForm";
import { SLOTS, type RefectoryPlace } from "./RefectoryScene";
import type { CopyistNote } from "./types";

const RefectoryScene = dynamic(() => import("./RefectoryScene"), { ssr: false, loading: () => null });

export type TopicInfo = {
  id: string;
  title: string;
  author: string;
  postCount: number;
  lastPostAt: string;
  active: boolean;
  book: { title: string; slug: string } | null;
};
export type Thread = { topic: TopicInfo; posts: LivePost[] };
export type ReaderState = { id: string | null; status: "guest" | "banned" | "needsPseudo" | "member" };
type Latest = { topicId: string; topicTitle: string; author: string; content: string } | null;

const reducedMotion = () =>
  document.documentElement.dataset.motion === "reduced" || matchMedia("(prefers-reduced-motion: reduce)").matches;
const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, s.lastIndexOf(" ", max))}…` : s);
const when = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

function lectorNote(latest: Latest, instant: boolean): CopyistNote {
  if (!latest) {
    return { key: Date.now(), heading: "Lu au réfectoire", title: "Le Réfectoire", author: "", year: null, phrase: "La table attend ses premiers convives.", quoted: false, instant };
  }
  return { key: Date.now(), heading: "Lu au réfectoire", title: latest.topicTitle, author: latest.author, year: null, phrase: clip(latest.content, 240), instant };
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function RefectoryExperience({ topics, reader, books, latest, initialThread }: {
  topics: TopicInfo[];
  reader: ReaderState;
  books: { id: string; title: string }[];
  latest: Latest;
  initialThread: Thread | null;
}) {
  const router = useRouter();
  const [support, setSupport] = useState<"checking" | "ok" | "none">("checking");
  const [lowPower, setLowPower] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [veil, setVeil] = useState(true);
  const [selected, setSelected] = useState<string | null>(initialThread?.topic.id ?? null);
  const [thread, setThread] = useState<Thread | null>(initialThread);
  const [lectorView, setLectorView] = useState(false);
  const [lector, setLector] = useState<CopyistNote | null>(null);
  const [creating, setCreating] = useState(false);
  const titles = useRef(new Map(topics.map((t) => [t.id, t.title])));

  const places: RefectoryPlace[] = useMemo(
    () => topics.slice(0, SLOTS.length).map((t) => ({ id: t.id, title: t.title, postCount: t.postCount, active: t.active })),
    [topics],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only state after hydration
    setSupport(hasWebGL() ? "ok" : "none");
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("scr-perf");
    } catch {}
    const weak = (navigator.hardwareConcurrency ?? 8) <= 4 || matchMedia("(max-width: 767px)").matches;
    setLowPower(stored ? stored === "low" : weak);
    if (!hasWebGL()) setVeil(false);
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  // Le lecteur recopie le dernier message ; puis chaque nouveau message sans révélations, en direct.
  useEffect(() => {
    if (!fontsReady) return;
    const t = setTimeout(() => setLector(lectorNote(latest, reducedMotion())), 1200);
    const supabase = browserClient();
    if (!supabase) return () => clearTimeout(t);
    const channel = supabase
      .channel("refectoire:lecteur")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "refectory_posts" }, async (payload) => {
        const r = payload.new as { topic_id: string; author_id: string; content: string; has_spoilers: boolean; hidden: boolean };
        if (r.has_spoilers || r.hidden) return;
        const { data } = await supabase.from("profiles").select("display_name").eq("id", r.author_id).maybeSingle();
        const topicTitle = titles.current.get(r.topic_id) ?? "Un sujet du réfectoire";
        setLector(lectorNote({ topicId: r.topic_id, topicTitle, author: (data?.display_name as string | undefined) ?? "lecteur", content: r.content }, reducedMotion()));
      })
      .subscribe();
    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [fontsReady, latest]);

  const select = useCallback(async (id: string) => {
    setSelected(id);
    setLectorView(false);
    setCreating(false);
    const url = new URL(window.location.href);
    url.searchParams.set("sujet", id);
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
    const data = await loadThread(id);
    if (data) {
      titles.current.set(data.topic.id, data.topic.title);
      setThread(data);
    }
  }, []);

  const backToHall = useCallback(() => {
    setSelected(null);
    setThread(null);
    setLectorView(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("sujet");
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
  }, []);

  const onCreated = useCallback(
    (id: string) => {
      router.refresh();
      void select(id);
    },
    [router, select],
  );

  const onReady = useCallback(() => setTimeout(() => setVeil(false), 120), []);
  const blocked =
    reader.status === "guest" ? "Pour écrire, entrez comme lecteur depuis la page Connexion."
      : reader.status === "banned" ? "Votre compte ne peut plus écrire au Réfectoire."
        : reader.status === "needsPseudo" ? "Choisissez d'abord votre pseudo dans « Mon compte »."
          : null;
  const current = thread && thread.topic.id === selected ? thread : null;

  return (
    <div className="fixed inset-0 bg-[#1a1511]">
      <div className="absolute inset-0" aria-hidden>
        {support === "ok" && fontsReady && (
          <RefectoryScene
            places={places}
            selected={selected}
            lectorView={lectorView}
            onSelect={(id) => void select(id)}
            onLector={() => {
              setSelected(null);
              setLectorView(true);
            }}
            lector={lector}
            lowPower={lowPower}
            onDecline={() => setLowPower(true)}
            onReady={onReady}
          />
        )}
      </div>
      {/* voile sombre en haut à gauche : le titre reste lisible sur la pierre claire */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgb(17_16_15/0.82),rgb(17_16_15/0.35)_38%,transparent_62%)]" />
      <div className={`pointer-events-none absolute inset-0 bg-[#1a1511] transition-opacity duration-[1400ms] ${veil ? "opacity-100" : "opacity-0"}`} />

      {/* accès sans 3D */}
      <nav aria-label="Sujets du réfectoire" className="sr-only">
        <ul>{topics.map((t) => <li key={t.id}><Link href={`/refectoire/${t.id}`}>{t.title}</Link></li>)}</ul>
      </nav>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 md:p-6">
        <Link href="/" className="pointer-events-auto flex items-center gap-3 text-gold" aria-label="SCRYPTORIUM — accueil">
          <Emblem className="h-9 w-9" />
          <span className="hidden font-[family-name:var(--font-display)] tracking-[0.34em] text-cream sm:inline">SCRYPTORIUM</span>
        </Link>
        <div className="pointer-events-auto flex gap-2">
          {(selected || lectorView) && <button type="button" onClick={backToHall} className="btn btn-ghost px-3 py-2 text-[0.68rem] tracking-[0.18em]">Toute la salle</button>}
          <Link href="/abbaye" className="btn btn-ghost px-3 py-2 text-[0.68rem] tracking-[0.18em]">Plan de l&apos;abbaye</Link>
        </div>
      </div>

      <div className="pointer-events-none absolute left-4 top-20 md:left-8 md:top-24">
        <p className="eyebrow">L&apos;abbaye · Refectorium</p>
        <h1 className="display mt-2 text-4xl md:text-6xl">Le Réfectoire</h1>
        {!selected && !lectorView && (
          <p className="mt-2 max-w-sm font-[family-name:var(--font-serif)] text-parchment/80">Chaque couvert est un sujet : approchez-vous d&apos;une place, ou écoutez le lecteur en chaire.</p>
        )}
      </div>

      <aside className="absolute inset-x-3 bottom-3 max-h-[50svh] overflow-y-auto border border-line bg-ink/85 p-5 backdrop-blur-md md:inset-x-auto md:bottom-auto md:right-8 md:top-24 md:max-h-[calc(100svh-8rem)] md:w-[420px] md:p-7">
        {selected ? (
          current ? (
            <>
              <button type="button" onClick={backToHall} className="link-gilt text-[0.65rem] uppercase tracking-[0.2em] text-parchment/70">← Tous les sujets</button>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-cream">{current.topic.title}</h2>
              <p className="mt-1 text-sm text-muted">
                Ouvert par {current.topic.author}
                {current.topic.book && <> · <Link href={`/livres/${current.topic.book.slug}`} className="link-gilt text-gold-soft">{current.topic.book.title}</Link></>}
              </p>
              <div className="mt-5">
                <LiveTopic topicId={current.topic.id} initial={current.posts} me={reader.id} canWrite={blocked === null} blockedReason={blocked} />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Le fil se déplie…</p>
          )
        ) : lectorView ? (
          <>
            <p className="eyebrow">Le lecteur en chaire</p>
            {latest ? (
              <>
                <p className="mt-3 font-[family-name:var(--font-serif)] text-lg leading-relaxed text-parchment/90">« {clip(latest.content, 400)} »</p>
                <p className="mt-2 text-sm text-muted">{latest.author}, dans « {latest.topicTitle} »</p>
                <button type="button" onClick={() => void select(latest.topicId)} className="btn mt-5">Rejoindre la table</button>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">Aucun message n&apos;a encore été lu au réfectoire.</p>
            )}
          </>
        ) : creating ? (
          <>
            <button type="button" onClick={() => setCreating(false)} className="link-gilt text-[0.65rem] uppercase tracking-[0.2em] text-parchment/70">← Tous les sujets</button>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-cream">Ouvrir un sujet</h2>
            <div className="mt-5"><NewTopicForm books={books} onCreated={onCreated} /></div>
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <p className="eyebrow">Sujets · {topics.length}</p>
              {reader.status === "member" && (
                <button type="button" onClick={() => setCreating(true)} className="link-gilt text-[0.65rem] uppercase tracking-[0.2em] text-gold">+ Ouvrir un sujet</button>
              )}
            </div>
            {topics.length === 0 ? (
              <p className="mt-3 font-[family-name:var(--font-serif)] text-lg text-parchment/80">Aucun sujet pour l&apos;instant : la table attend ses premiers convives.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {topics.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => void select(t.id)} className="group block w-full py-3 text-left">
                      <span className="block font-[family-name:var(--font-display)] text-xl text-cream group-hover:text-gold-bright">{t.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {t.author} · {t.postCount} message{t.postCount > 1 ? "s" : ""} · {when(t.lastPostAt)}{t.book ? ` · ${t.book.title}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {blocked && (
              <p className="mt-5 text-sm text-parchment/80">
                {reader.status === "guest" ? (
                  <>La lecture est libre ; pour écrire, <Link href="/connexion" className="link-gilt text-gold">entrez comme lecteur</Link>.</>
                ) : reader.status === "needsPseudo" ? (
                  <>Choisissez d&apos;abord votre pseudo dans <Link href="/compte" className="link-gilt text-gold">Mon compte</Link>.</>
                ) : (
                  blocked
                )}
              </p>
            )}
            {topics.length > SLOTS.length && <p className="mt-3 text-xs text-muted">Les {SLOTS.length} sujets les plus récents ont leur place à table.</p>}
          </>
        )}
        {support === "none" && <p className="mt-6 text-xs text-muted">La salle en 3D n&apos;est pas disponible sur ce navigateur.</p>}
      </aside>
    </div>
  );
}
