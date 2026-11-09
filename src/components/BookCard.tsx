import Link from "next/link";
import type { Book } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
import { BookCover } from "./BookCover";

export function BookCard({ book }: { book: Book }) {
  return (
    <Link href={`/livres/${book.slug}`} className="group block focus-visible:outline-none">
      <div className="transition-transform duration-700 ease-[var(--ease-quill)] [transform-style:preserve-3d] group-hover:[transform:perspective(900px)_rotateY(-9deg)_translateY(-6px)] group-focus-visible:[transform:perspective(900px)_rotateY(-9deg)_translateY(-6px)]">
        <BookCover book={book} />
      </div>
      <div className="mt-4">
        <h3 className="font-[family-name:var(--font-display)] text-xl leading-tight text-cream transition-colors group-hover:text-gold-bright">
          {book.title}
        </h3>
        <p className="mt-1 text-sm text-muted">
          {book.author}
          {book.year ? <span className="text-gold-soft"> · {book.year}</span> : null}
        </p>
        {book.status && (
          <p className="mt-2 text-[0.62rem] uppercase tracking-[0.22em] text-gold-soft">{STATUS_LABELS[book.status]}</p>
        )}
      </div>
    </Link>
  );
}
