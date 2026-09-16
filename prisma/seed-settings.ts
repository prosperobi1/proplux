import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const defaults = [
  { key: "siteName", value: "Proplux" },
  { key: "siteDescription", value: "Digital Marketplace Platform" },
  { key: "logoUrl", value: "" },
  { key: "primaryColor", value: "#dc2626" },
  { key: "commissionPercent", value: "65" },
  { key: "minWithdrawal", value: "10" },
  { key: "walletBTC", value: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" },
  { key: "walletETH", value: "" },
  { key: "walletUSDT", value: "" },
  { key: "supportEmail", value: "support@proplux.shop" },
  { key: "adminAlertEmail", value: "" },
  { key: "termsUrl", value: "" },
  { key: "privacyUrl", value: "" },
  { key: "maintenanceMode", value: "false" },
  { key: "enableMarketplace", value: "true" },
  { key: "enableTickets", value: "true" },
];

async function main() {
  for (const s of defaults) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log("Seeded " + defaults.length + " settings");
}

main().finally(() => prisma.$disconnect());
