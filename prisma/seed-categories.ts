import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const categories = [
  { name: "RDP", slug: "rdp", icon: "Monitor", order: 1 },
  { name: "Shell", slug: "shell", icon: "Terminal", order: 2 },
  { name: "cPanel", slug: "cpanel", icon: "Server", order: 3 },
  { name: "Send", slug: "send", icon: "Send", order: 4 },
  { name: "Mailers", slug: "mailers", icon: "Mail", order: 5 },
  { name: "SMTPs", slug: "smtps", icon: "AtSign", order: 6 },
  { name: "Cards", slug: "cards", icon: "CreditCard", order: 7 },
  { name: "Banks", slug: "banks", icon: "Landmark", order: 8 },
  { name: "Premium/Dating/Shop", slug: "premium", icon: "Sparkles", order: 9 },
  { name: "Leads", slug: "leads", icon: "Users", order: 10 },
  { name: "Scampage", slug: "scampage", icon: "AlertTriangle", order: 11 },
  { name: "Tutorial/Method", slug: "tutorial", icon: "BookOpen", order: 12 },
];

async function main() {
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log("Seeded categories");
}

main().finally(() => prisma.$disconnect());
