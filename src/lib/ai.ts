import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Assistant de lecture — travaille UNIQUEMENT à partir des notes importées par le bibliothécaire.
 * Le résultat est un brouillon stocké pour relecture ; il n'est jamais publié automatiquement.
 */
export const AI_TASKS = {
  synthese: "Une synthèse de lecture",
  resume: "Un résumé structuré, sans révélation",
  themes: "La liste des thèmes majeurs",
  pistes: "Des pistes de réflexion",
  fiche: "Une fiche de lecture complète",
  club: "Des questions pour le club de lecture",
} as const;
export type AiTask = keyof typeof AI_TASKS;

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM = `Tu es l'assistant de rédaction de SCRYPTORIUM, la bibliothèque personnelle d'un lecteur francophone.
Tu aides le bibliothécaire à mettre en forme SES propres notes de lecture. Tu écris en français, dans une langue soignée et sobre.

Règles impératives :
- Tu ne rédiges jamais d'opinion, de note, de souvenir ou de ressenti à la place du lecteur. Si ses notes n'en contiennent pas, tu l'indiques.
- Tu sépares toujours deux sections : « D'après vos notes » (uniquement ce qui figure dans les documents fournis) et « Repères généraux — à vérifier » (connaissances générales sur l'œuvre, signalées comme non issues des notes).
- Tu termines par une section « Incertitudes » qui liste ce qui est ambigu, contradictoire ou absent des notes.
- Tu ne reproduis pas de longs passages de l'œuvre : au plus une ou deux citations très courtes déjà présentes dans les notes.
- Tu ne révèles pas la fin ni les retournements décisifs, sauf dans une section finale explicitement intitulée « Avec révélations », et seulement si la tâche l'exige.
- Format : Markdown simple (## titres, - listes, **gras**, *italique*). Pas de tableau, pas de HTML.`;

export async function draftFromNotes(opts: { task: AiTask; title: string; author: string; notes: string }): Promise<string> {
  if (!aiConfigured()) throw new Error("Assistant IA non configuré (ANTHROPIC_API_KEY manquante).");
  const client = new Anthropic();
  const notes = opts.notes.trim();
  if (!notes) throw new Error("Aucune note importée pour cet ouvrage.");
  if (notes.length > 400_000) throw new Error("Notes trop volumineuses : scindez-les en plusieurs imports.");

  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "medium" },
    // Server-side fallback if a request is declined by a safety classifier.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Ouvrage : « ${opts.title} » — ${opts.author}\nTâche : ${AI_TASKS[opts.task]}.\n\n<notes_du_lecteur>\n${notes}\n</notes_du_lecteur>`,
      },
    ],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error("L'assistant a décliné cette demande.");
  const text = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n\n")
    .trim();
  if (!text) throw new Error("Réponse vide de l'assistant.");
  return text + (message.stop_reason === "max_tokens" ? "\n\n> Brouillon tronqué (longueur maximale atteinte)." : "");
}
