import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { BookCover } from "@/components/BookCover";
import { Prose } from "@/components/Prose";
import { SpoilerReveal } from "@/components/SpoilerReveal";
import { AddToTable } from "@/components/ReadingTable";
import { BookCard } from "@/components/BookCard";
import { connectionsFor, formatRating, getCategories, getPublishedBook, getPublishedBooks, hasReviewContent, personalContentMissing } from "@/lib/library";
import { getRepo } from "@/lib/store";
import { STATUS_LABELS, NOTE_KIND_LABELS, type Review } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/livres/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublishedBook(slug);
  if (!data) return {};
  const { book } = data;
  const description = book.summary.replace(/[#*>\-]/g, "").replace(/\s+/g, " ").trim().slice(0, 160);
  return {
    title: `${book.title} — ${book.author}`,
    description,
    alternates: { canonical: `/livres/${book.slug}` },
    openGraph: { title: book.title, description, type: "book", images: book.coverUrl ? [{ url: book.coverUrl }] : undefined },
  };
}

const dateFr = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;

const REVIEW_FIELDS: { key: keyof Review; label: string }[] = [
  { key: "liked", label: "Ce que j'ai apprécié" },
  { key: "disliked", label: "Ce que j'ai moins aimé" },
  { key: "characters", label: "Les personnages qui m'ont marqué" },
  { key: "themes", label: "Les thèmes que j'ai retenus" },
  { key: "interpretation", label: "Mon interprétation" },
  { key: "learned", label: "Ce que le livre m'a appris" },
  { key: "recommendedFor", label: "À qui je le recommande" },
];

export default async function BookPage({ params }: PageProps<"/livres/[slug]">) {
  const { slug } = await params;
  const data = await getPublishedBook(slug);
  if (!data) notFound();
  const { book, publicNotes, reviews, categories } = data;
  const [all, allCategories, settings] = await Promise.all([getPublishedBooks(), getCategories(), getRepo().getSettings()]);
  const review = reviews[0];
  const draft = personalContentMissing(book, review);
  const rating = formatRating(book.rating, settings.ratingScale);
  const connections = connectionsFor(book, all, allCategories).slice(0, 4);
  const quotes = publicNotes.filter((n) => n.kind === "quote");
  const annotations = publicNotes.filter((n) => n.kind !== "quote");
  const shelf = categories[0];
  // Fiche rédigée par le bibliothécaire lui-même (carnet Google Drive) : résumé et ressenti y sont mêlés.
  const ownSheet = book.sources.summary === "drive";

  const facts: [string, string | number | null][] = [
    ["Auteur", book.author],
    ["Titre original", book.originalTitle && book.originalTitle !== book.title ? book.originalTitle : null],
    ["Première publication", book.year],
    ["Éditeur", book.publisher],
    ["Édition", book.edition],
    ["Pages", book.pages ? `${book.pages} (selon l'édition)` : null],
    ["Nationalité de l'auteur", book.authorNationality],
    ["Langue originale", book.originalLanguage],
    ["ISBN", book.isbn],
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    author: { "@type": "Person", name: book.author },
    ...(book.year && { datePublished: String(book.year) }),
    ...(book.isbn && { isbn: book.isbn }),
    ...(book.coverUrl && { image: book.coverUrl }),
    ...(book.genres.length && { genre: book.genres }),
    inLanguage: book.originalLanguage ?? undefined,
  };

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <article>
        {/* ─── A. Présentation ─── */}
        <header className="relative overflow-hidden">
          <div aria-hidden className="absolute inset-0 opacity-50" style={{ background: `radial-gradient(55% 90% at 20% 30%, ${book.color}, transparent 70%)` }} />
          <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-12 md:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] md:px-10">
            <div>
              <nav aria-label="Fil d'Ariane" className="mb-8 text-xs uppercase tracking-[0.2em] text-muted">
                <Link href="/catalogue" className="link-gilt">Catalogue</Link>
                {shelf && (
                  <>
                    {" "}<span aria-hidden>·</span>{" "}
                    <Link href={`/rayonnages/${shelf.slug}`} className="link-gilt">{shelf.name}</Link>
                  </>
                )}
              </nav>
              <div className="mx-auto max-w-[220px] [perspective:1200px] md:mx-0 md:max-w-xs">
                <div className="rise transition-transform duration-1000 ease-[var(--ease-quill)] [transform:rotateY(10deg)] hover:[transform:rotateY(0)]">
                  <BookCover book={book} priority sizes="(min-width: 768px) 28vw, 70vw" />
                </div>
              </div>
            </div>
            <div className="md:pt-14">
              {draft && (
                <p className="rise mb-6 inline-flex items-center gap-2 border border-gold/40 bg-gold/5 px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.22em] text-gold">
                  <span aria-hidden>✎</span> Fiche en préparation — avis personnel à venir
                </p>
              )}
              <p className="eyebrow rise rise-1">{book.genres.join(" · ") || "Ouvrage"}</p>
              <h1 className="display rise rise-1 mt-4 text-[clamp(2.6rem,6vw,5.5rem)]">{book.title}</h1>
              {book.originalTitle && book.originalTitle !== book.title && (
                <p className="rise rise-2 mt-3 font-[family-name:var(--font-serif)] text-lg italic text-muted">{book.originalTitle}</p>
              )}
              <p className="rise rise-2 mt-5 font-[family-name:var(--font-serif)] text-2xl italic text-gold-bright">{book.author}</p>

              <div className="rise rise-3 mt-10 grid grid-cols-3 gap-px border border-line bg-line">
                <div className="bg-ink/80 p-4">
                  <p className="label">Statut</p>
                  <p className="font-[family-name:var(--font-display)] text-xl text-cream">{book.status ? STATUS_LABELS[book.status] : <span className="text-muted">À renseigner</span>}</p>
                </div>
                <div className="bg-ink/80 p-4">
                  <p className="label">Ma note</p>
                  <p className="font-[family-name:var(--font-display)] text-xl text-cream">{rating ?? <span className="text-muted">Non notée</span>}</p>
                </div>
                <div className="bg-ink/80 p-4">
                  <p className="label">Lu le</p>
                  <p className="font-[family-name:var(--font-display)] text-xl text-cream">{dateFr(book.readFinishedAt) ?? <span className="text-muted">—</span>}</p>
                </div>
              </div>

              <dl className="rise rise-4 mt-8 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                {facts.filter(([, v]) => v !== null && v !== "").map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-line/60 pb-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right text-parchment">{v}</dd>
                  </div>
                ))}
              </dl>

              {book.themes.length > 0 && (
                <ul className="mt-8 flex flex-wrap gap-2" aria-label="Thèmes">
                  {book.themes.map((t) => (
                    <li key={t} className="border border-line px-3 py-1 text-xs text-parchment/80">{t}</li>
                  ))}
                </ul>
              )}

              <div className="mt-10 flex flex-wrap gap-3">
                <Link href={`/bibliotheque?livre=${book.slug}`} className="btn">Voir dans la salle</Link>
                <AddToTable slug={book.slug} />
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-5 md:px-10">
          {/* ─── B. Résumé ─── */}
          <section aria-labelledby="resume" className="grid gap-10 border-t border-line py-20 md:grid-cols-[1fr_3fr]">
            <div>
              <p className="eyebrow">I.</p>
              <h2 id="resume" className="display mt-3 text-4xl">{ownSheet ? "Ma fiche de lecture" : "Résumé"}</h2>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted">{ownSheet ? "De mon carnet de lecture" : "Sans révélation"}</p>
            </div>
            <div className="space-y-12">
              {book.summary && book.summarySpoilers && (
                <p role="note" className="flex max-w-[66ch] items-start gap-3 border border-bordeaux-2/60 bg-bordeaux/15 px-5 py-4 text-sm leading-relaxed text-parchment/85">
                  <span aria-hidden className="text-[#d59aa3]">⚠</span>
                  <span><span className="eyebrow mr-2 text-[#d59aa3]">Révélations</span>Cette fiche dévoile des éléments de l&apos;intrigue, jusqu&apos;à la fin. À lire après le livre, si vous préférez la surprise.</span>
                </p>
              )}
              {book.summary ? <Prose text={book.summary} /> : <p className="font-[family-name:var(--font-serif)] italic text-muted">Le résumé n&apos;a pas encore été rédigé.</p>}
              {book.spoilerAnalysis && (
                <SpoilerReveal>
                  <Prose text={book.spoilerAnalysis} dropCap={false} />
                </SpoilerReveal>
              )}
            </div>
          </section>

          {/* ─── C. Mon avis ─── */}
          {(hasReviewContent(review) || !ownSheet) && (
          <section aria-labelledby="avis" className="grid gap-10 border-t border-line py-20 md:grid-cols-[1fr_3fr]">
            <div>
              <p className="eyebrow">II.</p>
              <h2 id="avis" className="display mt-3 text-4xl">Mon avis</h2>
              {review && reviews.length > 1 && (
                <Link href={`/archives#${book.slug}`} className="link-gilt mt-4 inline-block text-xs uppercase tracking-[0.2em] text-gold">
                  {reviews.length - 1} lecture{reviews.length > 2 ? "s" : ""} antérieure{reviews.length > 2 ? "s" : ""} →
                </Link>
              )}
            </div>
            {hasReviewContent(review) ? (
              <div className="grid gap-10 sm:grid-cols-2">
                {review!.label && <p className="eyebrow sm:col-span-2">{review!.label} · {dateFr(review!.updatedAt)}</p>}
                {REVIEW_FIELDS.filter((f) => String(review![f.key]).trim()).map((f) => (
                  <div key={f.key} className={f.key === "interpretation" ? "sm:col-span-2" : ""}>
                    <h3 className="label text-gold">{f.label}</h3>
                    <Prose text={String(review![f.key])} dropCap={false} className="!text-[1.05rem]" />
                  </div>
                ))}
                {review!.spoilers.trim() && (
                  <div className="sm:col-span-2">
                    <SpoilerReveal label="Mon analyse avec spoilers">
                      <Prose text={review!.spoilers} dropCap={false} />
                    </SpoilerReveal>
                  </div>
                )}
              </div>
            ) : (
              <div className="panel max-w-2xl p-8">
                <p className="font-[family-name:var(--font-display)] text-2xl text-cream">Page encore blanche</p>
                <p className="mt-3 font-[family-name:var(--font-serif)] text-lg leading-relaxed text-muted">
                  Le bibliothécaire n&apos;a pas encore consigné son avis sur cet ouvrage. Il apparaîtra ici, de sa main — jamais rédigé à sa place.
                </p>
              </div>
            )}
          </section>
          )}

          {/* ─── D. Citations ─── */}
          {(quotes.length > 0 || annotations.length > 0) && (
            <section aria-labelledby="citations" className="grid gap-10 border-t border-line py-20 md:grid-cols-[1fr_3fr]">
              <div>
                <p className="eyebrow">III.</p>
                <h2 id="citations" className="display mt-3 text-4xl">Passages & annotations</h2>
              </div>
              <div className="grid gap-8 md:grid-cols-2">
                {quotes.map((q) => (
                  <figure key={q.id} className="parchment relative p-8 md:p-10">
                    <span aria-hidden className="absolute left-5 top-2 font-[family-name:var(--font-display)] text-7xl leading-none text-[#8e3b46]/60">“</span>
                    <blockquote className="relative font-[family-name:var(--font-serif)] text-xl italic leading-relaxed">{q.content}</blockquote>
                    {q.pageRef && <figcaption className="mt-5 text-right text-xs uppercase tracking-[0.2em] text-[#6b4a32]">— p. {q.pageRef}</figcaption>}
                  </figure>
                ))}
                {annotations.map((n) => (
                  <div key={n.id} className="border-l border-gold-soft pl-6">
                    <p className="label">{NOTE_KIND_LABELS[n.kind]}{n.pageRef ? ` · p. ${n.pageRef}` : ""}</p>
                    <p className="font-[family-name:var(--font-serif)] text-lg leading-relaxed text-parchment/90">{n.content}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── E. Explorer ─── */}
          <section aria-labelledby="explorer" className="border-t border-line py-20">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow">Connexions littéraires</p>
                <h2 id="explorer" className="display mt-3 text-4xl">Explorer davantage</h2>
              </div>
              {shelf && <Link href={`/rayonnages/${shelf.slug}`} className="btn btn-ghost">← Retour au rayonnage</Link>}
            </div>
            {connections.length === 0 ? (
              <p className="mt-10 font-[family-name:var(--font-serif)] text-lg italic text-muted">
                Aucun autre ouvrage de la bibliothèque ne partage encore d&apos;auteur, de genre ou de thème avec celui-ci. Les connexions apparaîtront à mesure que les rayonnages se rempliront.
              </p>
            ) : (
              <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
                {connections.map((c) => (
                  <div key={c.book.id}>
                    <BookCard book={c.book} />
                    <ul className="mt-2 space-y-1 text-xs text-muted">
                      {c.reasons.slice(0, 2).map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </article>
    </PageShell>
  );
}
