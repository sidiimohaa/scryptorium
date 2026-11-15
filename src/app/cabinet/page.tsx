import { redirect } from "next/navigation";

/** L'ancien Cabinet des lectures est devenu une salle de l'abbaye : le Chartrier. */
export default function CabinetPage() {
  redirect("/chartrier");
}
