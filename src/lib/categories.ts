/** Rayonnages initiaux. Ils sont semés une seule fois puis entièrement gérés depuis le Bureau. */
export const INITIAL_CATEGORIES = [
  { slug: "litterature-classique", name: "Littérature classique", inscription: "Les voix qui ont traversé les siècles", accent: "#C3A16B" },
  { slug: "romans-policiers", name: "Romans policiers & thrillers", inscription: "Où chaque indice est une promesse", accent: "#8E3B46" },
  { slug: "litterature-contemporaine", name: "Littérature contemporaine", inscription: "Le monde tel qu'il s'écrit", accent: "#9A8A6A" },
  { slug: "philosophie", name: "Philosophie & réflexion", inscription: "Connais-toi toi-même", accent: "#7D8A7A" },
  { slug: "fantasy-imaginaire", name: "Fantasy & imaginaire", inscription: "Au-delà des cartes connues", accent: "#5E6E8C" },
  { slug: "theatre-poesie", name: "Théâtre & poésie", inscription: "Le vers, la scène, le souffle", accent: "#A0716A" },
  { slug: "histoire-civilisation", name: "Histoire & civilisation", inscription: "Mémoire des peuples", accent: "#8C7356" },
  { slug: "coups-de-coeur", name: "Mes coups de cœur", inscription: "Les livres qui m'ont changé", accent: "#B5838D" },
] as const;

export const FAVORITES_SLUG = "coups-de-coeur";
