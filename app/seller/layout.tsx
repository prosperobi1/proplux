import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SellerSidebar } from "./seller-sidebar";
import { TelegramJoin } from "../components/TelegramJoin";

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;
  if (role !== "SELLER" && role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <SellerSidebar>
      {children}
      <TelegramJoin />
    </SellerSidebar>
  );
}
