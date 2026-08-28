import { redirect } from "next/navigation";

/** Folded into the flags control room (2026-08-28) — the version gate lives
 *  at the bottom of /flags now. Old links and muscle memory land here. */
export default function AppVersionPage() {
  redirect("/flags#version-gate");
}
