import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { AbbeyPlan } from "@/components/AbbeyPlan";

export const metadata: Metadata = {
  title: "Plan de l'abbaye",
  description: "Le plan de l'abbaye SCRYPTORIUM : la bibliothèque, le scriptorium, la salle capitulaire et le réfectoire.",
};

export default function AbbeyPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-10">
        <p className="eyebrow rise">L&apos;abbaye</p>
        <h1 className="display rise rise-1 mt-4 text-5xl md:text-7xl">Plan de l&apos;abbaye</h1>
        <p className="rise rise-2 mt-5 max-w-2xl font-[family-name:var(--font-serif)] text-xl leading-relaxed text-parchment/85">
          Chaque salle de l&apos;abbaye a son office. La bibliothèque, le scriptorium et le réfectoire sont ouverts ; la salle capitulaire se construit pierre à pierre.
        </p>
        <div className="rise rise-3 mt-12">
          <AbbeyPlan />
        </div>
      </div>
    </PageShell>
  );
}
