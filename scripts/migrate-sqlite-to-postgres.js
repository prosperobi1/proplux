/*
 * One-shot data copy: local SQLite (prisma/dev.db) -> Postgres.
 *
 * Used when moving to a hosted Postgres (Vercel + Neon). Re-runnable: rows
 * whose cuid already exists in Postgres are skipped, so a half-finished run
 * can simply be repeated.
 *
 * Usage:  DATABASE_URL=postgresql://... node scripts/migrate-sqlite-to-postgres.js
 */
const { DatabaseSync } = require("node:sqlite");
const { PrismaClient } = require("@prisma/client");
const path = require("path");

const sqlite = new DatabaseSync(path.join(__dirname, "..", "prisma", "dev.db"), {
  readOnly: true,
});
const prisma = new PrismaClient();

// [sqlite table, prisma delegate, DateTime columns, Boolean columns]
// Insert order respects foreign keys.
const TABLES = [
  ["CategoryGroup", "categoryGroup", ["createdAt"], []],
  ["Category", "category", ["createdAt"], ["visible", "sellOnce"]],
  ["User", "user", ["resetTokenExpiry", "createdAt"], ["banned"]],
  ["Session", "session", ["expires"], []],
  ["Product", "product", ["soldAt", "createdAt"], []],
  ["Order", "order", ["createdAt"], []],
  ["Ticket", "ticket", ["createdAt", "updatedAt"], []],
  [
    "TicketMessage",
    "ticketMessage",
    ["createdAt", "readByOwnerAt", "readByStaffAt"],
    ["isStaff"],
  ],
  ["Withdrawal", "withdrawal", ["createdAt", "updatedAt"], []],
  ["News", "news", ["createdAt"], []],
  ["Report", "report", ["createdAt"], []],
  ["Rating", "rating", ["createdAt"], []],
  ["SellerRequest", "sellerRequest", ["createdAt", "updatedAt"], []],
  ["SellerRequestMessage", "sellerRequestMessage", ["createdAt"], ["isAdmin"]],
  ["Deposit", "deposit", ["createdAt"], []],
  ["Setting", "setting", [], []],
];

function convert(row, dateCols, boolCols) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null) {
      out[key] = null;
    } else if (dateCols.includes(key)) {
      // SQLite holds DateTime as ms since epoch (number) or ISO string.
      out[key] = new Date(typeof value === "number" ? value : Date.parse(value));
    } else if (boolCols.includes(key)) {
      out[key] = value === 1 || value === true;
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function main() {
  for (const [table, delegate, dateCols, boolCols] of TABLES) {
    const rows = sqlite
      .prepare(`SELECT * FROM "${table}"`)
      .all()
      .map((row) => convert(row, dateCols, boolCols));
    if (rows.length === 0) {
      console.log(`${table}: 0 rows`);
      continue;
    }
    const res = await prisma[delegate].createMany({
      data: rows,
      skipDuplicates: true,
    });
    console.log(`${table}: ${res.count}/${rows.length} rows copied`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    sqlite.close();
    await prisma.$disconnect();
  });
