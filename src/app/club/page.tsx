import { redirect } from "next/navigation";

/** Le club de lecture vit désormais dans la Salle capitulaire. */
export default function ClubPage() {
  redirect("/capitulaire");
}
