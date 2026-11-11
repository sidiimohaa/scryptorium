import { z } from "zod";

export const READING_STATUSES = ["to_read", "reading", "finished", "abandoned", "to_reread"] as const;
export type ReadingStatus = (typeof READING_STATUSES)[number];

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  to_read: "Prochainement",
  reading: "En cours",
  finished: "Terminé",
  abandoned: "Abandonné",
  to_reread: "À relire",
};

export const VISIBILITIES = ["draft", "published", "archived"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  draft: "Brouillon",
  published: "Publiée",
  archived: "Archivée",
};

/** Where a piece of bibliographic data came from — shown in the admin so nothing is ever silently invented. */
export type DataSource = "manual" | "openlibrary" | "googlebooks" | "scryptorium";

export const bookSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1).max(160),
  title: z.string().trim().min(1, "Le titre est requis").max(300),
  originalTitle: z.string().trim().max(300).nullable().default(null),
  author: z.string().trim().min(1, "L'auteur est requis").max(200),
  authorNationality: z.string().trim().max(100).nullable().default(null),
  originalLanguage: z.string().trim().max(100).nullable().default(null),
  edition: z.string().trim().max(200).nullable().default(null),
  publisher: z.string().trim().max(200).nullable().default(null),
  year: z.number().int().min(-3000).max(3000).nullable().default(null),
  pages: z.number().int().min(1).max(20000).nullable().default(null),
  isbn: z.string().trim().max(20).nullable().default(null),
  coverUrl: z.string().trim().max(2000).nullable().default(null),
  /** Cloth colour used for the 3D binding and the generated cover. */
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#51252C"),
  genres: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  themes: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  categoryIds: z.array(z.string()).default([]),
  summary: z.string().max(20000).default(""),
  spoilerAnalysis: z.string().max(30000).default(""),
  /** Le résumé lui-même révèle des éléments de l'intrigue : un avertissement s'affiche au-dessus. */
  summarySpoilers: z.boolean().default(false),
  /** Personal editorial shown in the Cabinet des Coups de Cœur. */
  editorial: z.string().max(20000).default(""),
  status: z.enum(READING_STATUSES).nullable().default(null),
  /** Personal rating normalised on /10. `null` = not rated yet (never invented). */
  rating: z.number().min(0).max(10).nullable().default(null),
  readStartedAt: z.string().nullable().default(null),
  readFinishedAt: z.string().nullable().default(null),
  visibility: z.enum(VISIBILITIES).default("draft"),
  driveRefs: z.array(z.string().url()).max(20).default([]),
  sources: z.record(z.string(), z.string()).default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Book = z.infer<typeof bookSchema>;

export const categorySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  inscription: z.string().trim().max(200).default(""),
  description: z.string().max(2000).default(""),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#C3A16B"),
  order: z.number().int().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Category = z.infer<typeof categorySchema>;

export const NOTE_KINDS = ["note", "quote", "annotation"] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];
export const NOTE_KIND_LABELS: Record<NoteKind, string> = {
  note: "Note",
  quote: "Citation",
  annotation: "Annotation",
};

export const noteSchema = z.object({
  id: z.string().min(1),
  bookId: z.string().min(1),
  kind: z.enum(NOTE_KINDS).default("note"),
  content: z.string().trim().min(1).max(4000),
  pageRef: z.string().trim().max(40).nullable().default(null),
  visibility: z.enum(["private", "public"]).default("private"),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Note = z.infer<typeof noteSchema>;

/** A review is versioned: every re-reading can add a new version, older ones live in Les Archives. */
export const reviewSchema = z.object({
  id: z.string().min(1),
  bookId: z.string().min(1),
  liked: z.string().max(10000).default(""),
  disliked: z.string().max(10000).default(""),
  characters: z.string().max(10000).default(""),
  themes: z.string().max(10000).default(""),
  interpretation: z.string().max(20000).default(""),
  learned: z.string().max(10000).default(""),
  recommendedFor: z.string().max(5000).default(""),
  spoilers: z.string().max(20000).default(""),
  label: z.string().max(120).default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Review = z.infer<typeof reviewSchema>;

export const IMPORT_STATUSES = ["pending", "processed", "linked", "failed"] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];
export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  pending: "En attente",
  processed: "Texte extrait",
  linked: "Associé à une fiche",
  failed: "Échec",
};

export const importSchema = z.object({
  id: z.string().min(1),
  bookId: z.string().nullable().default(null),
  source: z.enum(["upload", "paste", "drive_ref", "drive_api"]),
  fileName: z.string().max(300).nullable().default(null),
  mimeType: z.string().max(200).nullable().default(null),
  driveUrl: z.string().max(2000).nullable().default(null),
  driveFileId: z.string().max(200).nullable().default(null),
  text: z.string().default(""),
  contentHash: z.string().nullable().default(null),
  status: z.enum(IMPORT_STATUSES).default("pending"),
  error: z.string().nullable().default(null),
  /** AI drafts are stored here for review — never published automatically. */
  aiDraft: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ImportRecord = z.infer<typeof importSchema>;

export const settingsSchema = z.object({
  ratingScale: z.union([z.literal(5), z.literal(10)]).default(5),
  readingGoal: z.object({ year: z.number().int(), target: z.number().int().min(0) }).nullable().default(null),
  featuredBookId: z.string().nullable().default(null),
  driveFolderId: z.string().nullable().default(null),
  driveFolderName: z.string().nullable().default(null),
});
export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});
