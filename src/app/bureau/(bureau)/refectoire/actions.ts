"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { serviceClient } from "@/lib/supabase/admin";

async function db() {
  await requireAdmin();
  const s = serviceClient();
  if (!s) throw new Error("Supabase n'est pas configuré.");
  return s;
}
const done = () => {
  revalidatePath("/bureau/refectoire");
  revalidatePath("/refectoire", "layout");
};

export async function setPostHidden(postId: string, hidden: boolean) {
  const s = await db();
  await s.from("refectory_posts").update({ hidden }).eq("id", postId);
  if (hidden) await s.from("refectory_reports").update({ resolved: true }).eq("post_id", postId);
  done();
}

export async function setTopicHidden(topicId: string, hidden: boolean) {
  const s = await db();
  await s.from("refectory_topics").update({ hidden }).eq("id", topicId);
  done();
}

export async function setBanned(profileId: string, banned: boolean) {
  const s = await db();
  await s.from("profiles").update({ banned }).eq("id", profileId);
  done();
}

export async function resolveReport(reportId: string) {
  const s = await db();
  await s.from("refectory_reports").update({ resolved: true }).eq("id", reportId);
  done();
}
