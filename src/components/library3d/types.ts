export type SceneBook = {
  id: string;
  slug: string;
  title: string;
  author: string;
  year: number | null;
  color: string;
  pages: number | null;
  coverUrl: string | null;
};

export type SceneShelf = {
  id: string;
  slug: string;
  name: string;
  inscription: string;
  accent: string;
  books: SceneBook[];
};

export type View =
  | { kind: "intro" }
  | { kind: "hall" }
  | { kind: "shelf"; shelf: number }
  | { kind: "book"; shelf: number; bookId: string }
  | { kind: "desk" };

/** Recommandation écrite par le copiste : un vrai livre de la bibliothèque et une phrase de la fiche. */
export type CopyistNote = {
  key: number;
  title: string;
  author: string;
  year: number | null;
  phrase: string;
  /** En-tête du feuillet (par défaut « Le copiste vous recommande »). */
  heading?: string;
  /** Met la phrase entre guillemets (par défaut oui ; non pour un simple relevé). */
  quoted?: boolean;
  /** Sans animation (préférence « animations réduites » ou bouton « Passer »). */
  instant?: boolean;
};

export const bookKey = (shelf: number, bookId: string) => `${shelf}:${bookId}`;
