import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

export async function requireOwner() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "OWNER") {
    redirect("/");
  }

  return user;
}
