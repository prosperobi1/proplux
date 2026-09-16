import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create a seller user
  const seller = await prisma.user.upsert({
    where: { email: "seller@proplux.com" },
    update: {},
    create: {
      email: "seller@proplux.com",
      username: "seller18",
      password: "placeholder",
      role: "SELLER",
    },
  });

  // Add products
  const products = [
    { country: "🇺🇸 USA", tld: ".com", hosting: "AWS", price: 12.5, checkStatus: "Valid" },
    { country: "🇬🇧 UK", tld: ".co.uk", hosting: "Cloudflare", price: 8.0, checkStatus: "Valid" },
    { country: "🇩🇪 Germany", tld: ".de", hosting: "DigitalOcean", price: 15.75, checkStatus: "Checking" },
    { country: "🇫🇷 France", tld: ".fr", hosting: "OVH", price: 10.0, checkStatus: "Valid" },
  ];

  for (const p of products) {
    await prisma.product.create({
      data: { ...p, sellerId: seller.id },
    });
  }

  console.log("✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });