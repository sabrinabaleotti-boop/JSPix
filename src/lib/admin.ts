import { redirect } from "next/navigation";
import { cache } from "react";
import { getAdminId } from "@/lib/auth";
import { db } from "@/lib/db";

// cache(): layout e página chamam isto na mesma renderização; o banco é consultado uma vez só.
export const requireAdmin = cache(async () => {
  const id = await getAdminId();
  if (!id) redirect("/admin/login");
  const admin = await db.admin.findUnique({ where: { id } });
  if (!admin) redirect("/admin/login");
  return admin;
});
