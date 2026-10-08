import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "./admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if ((session.user as any).role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <AdminSidebar>{children}</AdminSidebar>;
}
