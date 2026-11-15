import { redirect } from "next/navigation";

/** Les coups de cœur sont désormais exposés dans une salle de l'abbaye : le Trésor. */
export default function FavoritesPage() {
  redirect("/tresor");
}
