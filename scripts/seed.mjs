// Génère data/library.json (archive locale) avec les rayonnages initiaux
// et la première fiche : Le Meurtre de Roger Ackroyd.
// Usage : npm run seed   (n'écrase rien si l'archive existe, sauf --force)
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

const file = path.join(process.cwd(), "data", "library.json");
const force = process.argv.includes("--force");

try {
  await fs.access(file);
  if (!force) {
    console.log("data/library.json existe déjà — rien n'a été modifié (utilisez --force pour réinitialiser).");
    process.exit(0);
  }
} catch {}

const now = new Date().toISOString();
const categories = [
  ["litterature-classique", "Littérature classique", "Les voix qui ont traversé les siècles", "#C3A16B"],
  ["romans-policiers", "Romans policiers & thrillers", "Où chaque indice est une promesse", "#8E3B46"],
  ["litterature-contemporaine", "Littérature contemporaine", "Le monde tel qu'il s'écrit", "#9A8A6A"],
  ["philosophie", "Philosophie & réflexion", "Connais-toi toi-même", "#7D8A7A"],
  ["fantasy-imaginaire", "Fantasy & imaginaire", "Au-delà des cartes connues", "#5E6E8C"],
  ["theatre-poesie", "Théâtre & poésie", "Le vers, la scène, le souffle", "#A0716A"],
  ["histoire-civilisation", "Histoire & civilisation", "Mémoire des peuples", "#8C7356"],
  ["coups-de-coeur", "Mes coups de cœur", "Les livres qui m'ont changé", "#B5838D"],
].map(([slug, name, inscription, accent], order) => ({
  id: `cat-${slug}`,
  slug,
  name,
  inscription,
  description: "",
  accent,
  order,
  createdAt: now,
  updatedAt: now,
}));

const summary = `## Le contexte

King's Abbot, un village anglais des années 1920 où tout se sait — ou se devine. Derrière les haies bien taillées et les thés de l'après-midi, chacun surveille son voisin, et la rumeur circule plus vite que le courrier.

## La voix du récit

L'histoire nous est racontée par le docteur James Sheppard, médecin du village, qui partage sa maison avec sa sœur Caroline, observatrice infatigable et redoutable collectionneuse de ragots.

## L'intrigue

Mrs Ferrars, veuve que l'on soupçonnait à mi-voix d'avoir empoisonné son mari, meurt d'une surdose de véronal. Le lendemain soir, Roger Ackroyd — riche veuf qu'elle devait, disait-on, épouser — reçoit une lettre qu'il hésite à lire devant témoin. Quelques heures plus tard, il est retrouvé poignardé dans son bureau de Fernly Park. Son beau-fils, Ralph Paton, a disparu.

Le hasard veut qu'un étrange voisin, récemment retiré à King's Abbot pour y cultiver des courges, ne soit autre qu'Hercule Poirot. À la demande de Flora, la nièce d'Ackroyd, le détective belge reprend du service.

## Les personnages principaux

- **Le docteur James Sheppard**, narrateur, médecin de famille de la victime.
- **Caroline Sheppard**, sa sœur, dont le réseau d'informatrices n'a rien à envier à Scotland Yard.
- **Hercule Poirot**, détective à la retraite et à ses « petites cellules grises ».
- **Ralph Paton**, beau-fils endetté et introuvable.
- **Flora Ackroyd**, nièce de la victime, et sa mère **Mrs Cecil Ackroyd**.
- **Le major Hector Blunt**, chasseur de fauves taciturne ; **Geoffrey Raymond**, le secrétaire ; **Parker**, le majordome ; **Miss Russell**, la gouvernante ; **Ursula Bourne**, la femme de chambre.
- **L'inspecteur Raglan**, chargé officiellement de l'enquête.

## Les enjeux

Chaque habitant de Fernly Park semble avoir quelque chose à cacher : dettes, fiançailles secrètes, passé inavouable. Poirot doit démêler ces petits mensonges pour atteindre la vérité, tout en composant avec une police pressée de désigner le coupable le plus commode.

## Les thèmes

Le chantage et le poids du secret · la rumeur et la vie de village · l'argent et l'héritage · les apparences de la respectabilité · l'art de la déduction.`;

const spoilerAnalysis = `> Rédaction SCRYPTORIUM à partir de faits littéraires largement documentés — à relire et valider par le bibliothécaire.

**Le narrateur est le meurtrier.** Le docteur Sheppard, qui tient le récit, est à la fois le maître chanteur de Mrs Ferrars et l'assassin de Roger Ackroyd. Il a utilisé un dictaphone programmé pour faire croire qu'Ackroyd était encore vivant après son départ de Fernly Park.

Toute l'architecture du roman repose sur ce que le narrateur *ne dit pas* : il ne ment jamais tout à fait, mais il omet. Le chapitre final, son « apologie », révèle que le manuscrit que nous lisons est lui-même une pièce du dossier.

Ce procédé a suscité, dès 1926, un vif débat sur la loyauté du roman d'énigme envers son lecteur. Il fait aujourd'hui du livre l'un des exemples les plus cités de narrateur non fiable dans la littérature policière.

Poirot, plutôt que de livrer immédiatement Sheppard à la police, lui laisse une issue — pour épargner à Caroline la honte d'un procès.`;

const book = {
  id: randomUUID(),
  slug: "le-meurtre-de-roger-ackroyd",
  title: "Le Meurtre de Roger Ackroyd",
  originalTitle: "The Murder of Roger Ackroyd",
  author: "Agatha Christie",
  authorNationality: "Britannique",
  originalLanguage: "Anglais",
  edition: null,
  publisher: "William Collins, Sons (première édition britannique)",
  year: 1926,
  pages: null,
  isbn: null,
  coverUrl: "https://covers.openlibrary.org/b/id/13151356-L.jpg",
  color: "#5A1F27",
  genres: ["Roman policier", "Roman d'énigme"],
  themes: ["Chantage", "Secrets de famille", "Rumeur", "Vie de village", "Déduction"],
  categoryIds: ["cat-romans-policiers", "cat-litterature-classique"],
  summary,
  spoilerAnalysis,
  editorial: "",
  status: null,
  rating: null,
  readStartedAt: null,
  readFinishedAt: null,
  currentPage: null,
  visibility: "published",
  driveRefs: [],
  sources: {
    title: "manual",
    originalTitle: "openlibrary",
    year: "openlibrary",
    coverUrl: "openlibrary",
    summary: "scryptorium",
    spoilerAnalysis: "scryptorium",
  },
  createdAt: now,
  updatedAt: now,
};

const archive = {
  version: 1,
  books: [book],
  categories,
  notes: [],
  reviews: [],
  imports: [],
  settings: { ratingScale: 5, readingGoal: null, featuredBookId: null, driveFolderId: null, driveFolderName: null },
};

await fs.mkdir(path.dirname(file), { recursive: true });
await fs.writeFile(file, JSON.stringify(archive, null, 2) + "\n");
console.log("Archive SCRYPTORIUM créée : data/library.json");
