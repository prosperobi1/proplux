import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarLayout } from "../sidebar-layout";
import { TelegramJoin } from "../components/TelegramJoin";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return (
    <SidebarLayout>
      {children}
      <TelegramJoin />
    </SidebarLayout>
  );
}
