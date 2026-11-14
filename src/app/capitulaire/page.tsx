import type { Metadata } from "next";
import Link from "next/link";
import { CapitularyExperience, type ArchiveView, type ClubRoundView, type MemberStatus } from "@/components/library3d/CapitularyExperience";
import { PageShell } from "@/components/PageShell";
import { getClub, getMyClubState } from "@/lib/club";
import { getReader } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "La Salle capitulaire",
  description: "Le club de lecture SCRYPTORIUM : le chapitre élit sa lecture du mois.",
};

export default async function CapitularyPage() {
  const [club, reader] = await Promise.all([getClub(), getReader()]);
  if (!club) {
    return (
      <PageShell>
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <h1 className="display text-5xl">La Salle capitulaire</h1>
          <p className="mt-6 text-muted">Le club n&apos;est pas encore ouvert.</p>
          <Link href="/abbaye" className="btn mt-10">Plan de l&apos;abbaye</Link>
        </div>
      </PageShell>
    );
  }
  const active = club.active && club.active.status !== "archived" ? club.active : null;
  const round: ClubRoundView | null = active
    ? {
        id: active.id,
        label: active.label,
        status: active.status as "voting" | "reading",
        votingEndsAt: active.votingEndsAt,
        winnerId: active.winnerId,
        candidates: active.candidates,
        sessions: active.sessions,
        members: active.members,
      }
    : null;
  const archives: ArchiveView[] = club.archives.map((r) => {
    const w = r.candidates.find((c) => c.id === r.winnerId);
    return { id: r.id, label: r.label, winner: w ? { title: w.title, author: w.author } : null, members: r.members, votes: r.candidates.reduce((s, c) => s + c.votes, 0) };
  });
  const status: MemberStatus = !reader ? "guest" : reader.banned ? "banned" : reader.needsPseudo ? "needsPseudo" : "member";
  const mine = round && reader ? await getMyClubState(round.id) : { vote: null, enrolled: false };
  return <CapitularyExperience round={round} archives={archives} status={status} myVote={mine.vote} enrolled={mine.enrolled} />;
}
