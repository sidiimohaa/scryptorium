"use client";
import Link from "next/link";
import { deleteBook, setVisibility } from "@/app/bureau/actions";
import type { Book } from "@/lib/types";

export function BookActions({ book }: { book: Book }) {
  return (
    <div className="flex flex-wrap gap-2">
      {book.visibility === "published" ? (
        <>
          <Link href={`/livres/${book.slug}`} className="btn btn-ghost px-4 py-2">Voir la fiche</Link>
          <button type="button" onClick={() => setVisibility(book.id, "draft")} className="btn btn-ghost px-4 py-2">Dépublier</button>
        </>
      ) : (
        <button type="button" onClick={() => setVisibility(book.id, "published")} className="btn px-4 py-2">Publier</button>
      )}
      {book.visibility !== "archived" && (
        <button type="button" onClick={() => setVisibility(book.id, "archived")} className="btn btn-ghost px-4 py-2">Archiver</button>
      )}
      <button
        type="button"
        onClick={() => {
          if (confirm(`Supprimer définitivement « ${book.title} », ses notes et ses avis ? Cette action est irréversible. (Préférez « Archiver » pour la masquer.)`)) deleteBook(book.id);
        }}
        className="btn btn-danger px-4 py-2"
      >
        Supprimer
      </button>
    </div>
  );
}
