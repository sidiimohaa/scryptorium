import Link from "next/link";
import type { Book } from "@/lib/types";
import { BookCover } from "./BookCover";

function excerpt(md: string, max = 320): string {
  const plain = md
    .split(/\n{2,}/)
    .filter((b) => !b.startsWith("#") && !b.startsWith("- "))
    .join(" ")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? plain.slice(0, plain.lastIndexOf(" ", max)) + "…" : plain;
}

/** Le Livre du Jour — présentation cinématographique d'un ouvrage de la collection. */
export function FeaturedBook({ book }: { book: Book }) {
  return (
    <section aria-labelledby="livre-du-jour" className="relative overflow-hidden border-b border-line">
      <div aria-hidden className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(60% 80% at 25% 50%, ${book.color}, transparent 70%)` }} />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] md:px-10">
        <div className="mx-auto w-full max-w-[220px] [perspective:1200px] md:max-w-xs">
          <div className="transition-transform duration-1000 ease-[var(--ease-quill)] [transform:rotateY(12deg)_rotateX(2deg)] hover:[transform:rotateY(0deg)]">
            <BookCover book={book} priority sizes="(min-width: 768px) 25vw, 60vw" />
          </div>
        </div>
        <div>
          <p className="eyebrow">Le Livre du Jour</p>
          <h2 id="livre-du-jour" className="display mt-5 text-[clamp(2.2rem,5vw,4.4rem)]">{book.title}</h2>
          <p className="mt-4 font-[family-name:var(--font-serif)] text-xl italic text-gold-bright">
            {book.author}
            {book.year ? `, ${book.year}` : ""}
          </p>
          {book.summary && (
            <p className="mt-8 max-w-[58ch] font-[family-name:var(--font-serif)] text-lg leading-relaxed text-parchment/85">{excerpt(book.summary)}</p>
          )}
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href={`/livres/${book.slug}`} className="btn">Ouvrir la fiche</Link>
            <Link href={`/bibliotheque?livre=${book.slug}`} className="btn btn-ghost">Le trouver dans la salle</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
