import Image from "next/image";
import type { Book } from "@/lib/types";

/**
 * Real cover when one is recorded; otherwise an honest typographic binding generated from
 * the book's own title, author and cloth colour (never a fake image).
 */
export function BookCover({
  book,
  className = "",
  sizes = "(min-width: 1024px) 22vw, 45vw",
  priority = false,
}: {
  book: Pick<Book, "title" | "author" | "coverUrl" | "color" | "year">;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`relative aspect-[2/3] overflow-hidden rounded-[2px_6px_6px_2px] shadow-[0_30px_50px_-20px_rgba(0,0,0,0.9),inset_4px_0_6px_-2px_rgba(0,0,0,0.5)] ${className}`}
      style={{ backgroundColor: book.color }}
    >
      {book.coverUrl ? (
        <Image src={book.coverUrl} alt={`Couverture de ${book.title}`} fill sizes={sizes} preload={priority} className="object-cover" />
      ) : (
        <GeneratedCover book={book} />
      )}
      {/* spine crease & sheen */}
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[7%] bg-gradient-to-r from-black/45 via-white/10 to-transparent" />
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/30" />
    </div>
  );
}

function GeneratedCover({ book }: { book: Pick<Book, "title" | "author" | "year"> }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between p-[9%] text-center text-gold-bright">
      <div className="absolute inset-[5%] border border-gold/50" />
      <div className="absolute inset-[6.5%] border border-gold/25" />
      <span className="relative mt-[8%] text-[0.55rem] uppercase tracking-[0.3em] opacity-80">{book.author}</span>
      <span className="relative font-[family-name:var(--font-display)] text-[clamp(1rem,2.2vw,1.7rem)] leading-tight text-cream">
        {book.title}
      </span>
      <span className="relative mb-[6%] text-sm opacity-70">❦{book.year ? ` ${book.year}` : ""}</span>
    </div>
  );
}
