import { IntroHero } from "@/components/IntroHero";

/** La première page n'est que la porte d'entrée de la bibliothèque. */
export default async function Home({ searchParams }: PageProps<"/">) {
  // Retour par la porte du plan de l'abbaye : pas de sceau de chargement, le voile « Porta » se lève.
  const fromGate = (await searchParams).porte === "1";
  return (
    <main id="contenu">
      <IntroHero fromGate={fromGate} />
    </main>
  );
}
