import type { Metadata } from "next";
import { ChartrierExperience, type ChartrierView } from "@/components/library3d/ChartrierExperience";
import { formatRating, getCategories, getPublishedBooks } from "@/lib/library";
import { getRepo } from "@/lib/store";
import { computeStats } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Le Chartrier",
  description: "Le cabinet des lectures : le parcours de lecteur du bibliothécaire, établi d'après ses véritables lectures.",
};

const monthYear = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" });

export default async function ChartrierPage() {
  const [books, categories, settings] = await Promise.all([getPublishedBooks(), getCategories(), getRepo().getSettings()]);
  const s = computeStats(books, categories);
  const goal = settings.readingGoal;
  const notes = [
    s.pagesKnownFor < s.finishedCount && s.finishedCount > 0 ? `Pages connues pour ${s.pagesKnownFor} livre(s) sur ${s.finishedCount}.` : "",
    s.ratedCount > 0 ? `Moyenne calculée sur ${s.ratedCount} livre(s) noté(s).` : "",
    s.finishedCount === 0 ? "Aucune lecture n'est encore marquée « Terminé » : le registre se remplira au fil des fiches." : "",
  ].filter(Boolean);
  const timeline = s.timeline.map((b) => ({ id: b.id, slug: b.slug, date: monthYear(b.readFinishedAt!), title: b.title, author: b.author }));
  const view: ChartrierView = {
    finished: s.finishedCount,
    reading: s.readingCount,
    pages: s.pagesKnownFor ? s.pagesRead.toLocaleString("fr-FR") : "—",
    rating: s.averageRating !== null ? formatRating(s.averageRating, settings.ratingScale)! : "—",
    pagesNote: notes.join(" "),
    byAuthor: s.byAuthor,
    byShelf: s.byShelf,
    byGenre: s.byGenre,
    byYear: s.byYear,
    goal: goal ? { year: goal.year, target: goal.target, done: s.timeline.filter((b) => b.readFinishedAt!.startsWith(String(goal.year))).length } : null,
    timeline: timeline.map(({ date, title, author }) => ({ date, title, author })),
    timelineFull: timeline,
  };
  return <ChartrierExperience view={view} />;
}
