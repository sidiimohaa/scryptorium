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
  | { kind: "book"; shelf: number; bookId: string };

export const bookKey = (shelf: number, bookId: string) => `${shelf}:${bookId}`;
