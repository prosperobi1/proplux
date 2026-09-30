import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const categories = [
  { name: "RDP", slug: "rdp", icon: "Monitor", order: 1, fields: [
    { name: "ip", label: "IP/Host", type: "text", required: true },
    { name: "port", label: "Port", type: "number", required: false, placeholder: "3389" },
    { name: "login", label: "Login", type: "text", required: true },
    { name: "password", label: "Password", type: "text", required: true },
    { name: "windows", label: "Windows", type: "select", required: true, options: ["2012", "2016", "2019", "2022", "2025"] },
    { name: "ram", label: "RAM", type: "text", required: false, placeholder: "4GB" },
    { name: "location", label: "Country", type: "country", required: false },
    { name: "access", label: "Access Level", type: "select", required: true, options: ["USER", "ADMIN"] },
    { name: "price", label: "Price (USD)", type: "number", required: true },
  ]},
  { name: "Shell", slug: "shell", icon: "Terminal", order: 2, fields: [
    { name: "url", label: "URL", type: "text", required: true },
    { name: "host", label: "Host", type: "text", required: true },
    { name: "login", label: "Login", type: "text", required: false },
    { name: "password", label: "Password", type: "text", required: false },
    { name: "shellType", label: "Shell Type", type: "select", required: true, options: ["c99", "r57", "b374k", "other"] },
    { name: "uploader", label: "Uploader", type: "select", required: false, options: ["Yes", "No"] },
    { name: "price", label: "Price (USD)", type: "number", required: true },
  ]},
  { name: "cPanel", slug: "cpanel", icon: "Server", order: 3, fields: [
    { name: "domain", label: "Domain/URL", type: "text", required: true },
    { name: "username", label: "Username", type: "text", required: true },
    { name: "password", label: "Password", type: "text", required: true },
    { name: "cpanelType", label: "cPanel Type", type: "select", required: false, options: ["Shared", "Reseller", "VPS"] },
    { name: "location", label: "Country", type: "country", required: false },
    { name: "price", label: "Price (USD)", type: "number", required: true },
  ]},
  { name: "SMTPs", slug: "smtps", icon: "AtSign", order: 4, fields: [
    { name: "host", label: "Host", type: "text", required: true },
    { name: "port", label: "Port", type: "number", required: true, placeholder: "587" },
    { name: "email", label: "Email", type: "text", required: true },
    { name: "password", label: "Password", type: "text", required: true },
    { name: "type", label: "Type", type: "select", required: true, options: ["SMTP", "IMAP", "POP3"] },
    { name: "security", label: "SSL/TLS", type: "select", required: true, options: ["SSL", "TLS", "STARTTLS", "None"] },
    { name: "country", label: "Country", type: "country", required: false },
    { name: "price", label: "Price (USD)", type: "number", required: true },
  ]},
  { name: "Mailers", slug: "mailers", icon: "Mail", order: 5, fields: [
    { name: "smtpHost", label: "SMTP Host", type: "text", required: true },
    { name: "port", label: "Port", type: "number", required: true },
    { name: "email", label: "Email", type: "text", required: true },
    { name: "password", label: "Password", type: "text", required: true },
    { name: "mailerType", label: "Mailer Type", type: "select", required: true, options: ["PHP", "SMTP", "Bomber"] },
    { name: "sendLimit", label: "Send Limit", type: "text", required: false, placeholder: "10k/hour" },
    { name: "country", label: "Country", type: "country", required: false },
    { name: "price", label: "Price (USD)", type: "number", required: true },
  ]},
  { name: "Send", slug: "send", icon: "Send", order: 6, fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "fromEmail", label: "From Email", type: "text", required: true },
    { name: "smtpHost", label: "SMTP Host", type: "text", required: true },
    { name: "port", label: "Port", type: "number", required: true },
    { name: "password", label: "Password", type: "text", required: true },
    { name: "country", label: "Country", type: "country", required: false },
    { name: "price", label: "Price (USD)", type: "number", required: true },
  ]},
  { name: "Cards", slug: "cards", icon: "CreditCard", order: 7, fields: [
    { name: "bin", label: "BIN", type: "text", required: true, placeholder: "first 6 digits" },
    { name: "country", label: "Country", type: "country", required: true },
    { name: "expiry", label: "Expiry", type: "text", required: true, placeholder: "MM/YY" },
    { name: "cardholder", label: "Cardholder", type: "text", required: false },
    { name: "type", label: "Type", type: "select", required: true, options: ["Visa", "Mastercard", "Amex", "Discover"] },
    { name: "level", label: "Card Level", type: "select", required: false, options: ["Classic", "Gold", "Platinum", "Business"] },
    { name: "price", label: "Price (USD)", type: "number", required: true },
  ]},
  { name: "Banks", slug: "banks", icon: "Landmark", order: 8, fields: [
    { name: "bankName", label: "Bank Name", type: "text", required: true },
    { name: "country", label: "Country", type: "country", required: true },
    { name: "accountType", label: "Account Type", type: "select", required: true, options: ["Checking", "Savings", "Business", "Crypto"] },
    { name: "balance", label: "Balance (USD)", type: "number", required: false },
    { name: "login", label: "Login", type: "text", required: false },
    { name: "price", label: "Price (USD)", type: "number", required: true },
  ]},
  { name: "Premium/Dating/Shop", slug: "premium", icon: "Sparkles", order: 9, fields: [
    { name: "service", label: "Service", type: "text", required: true, placeholder: "Netflix, Spotify, Tinder..." },
    { name: "country", label: "Country", type: "country", required: false },
    { name: "username", label: "Username", type: "text", required: true },
    { name: "password", label: "Password", type: "text", required: true },
    { name: "subscription", label: "Subscription", type: "text", required: false, placeholder: "1 year Premium" },
    { name: "price", label: "Price (USD)", type: "number", required: true },
  ]},
  { name: "Leads", slug: "leads", icon: "Users", order: 10, fields: [
    { name: "country", label: "Country", type: "country", required: true },
    { name: "leadType", label: "Lead Type", type: "select", required: true, options: ["Email", "Phone", "Full Info", "B2B"] },
    { name: "count", label: "Count", type: "number", required: true, placeholder: "10000" },
    { name: "format", label: "Format", type: "select", required: false, options: ["CSV", "TXT", "XLSX"] },
    { name: "sampleUrl", label: "Sample URL", type: "text", required: false },
    { name: "price", label: "Price (USD)", type: "number", required: true },
  ]},
  { name: "Scampage", slug: "scampage", icon: "AlertTriangle", order: 11, fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea", required: true },
    { name: "target", label: "Target", type: "text", required: true, placeholder: "PayPal, Chase, etc." },
    { name: "type", label: "Type", type: "select", required: false, options: ["Full kit", "HTML only", "Redirect"] },
    { name: "demoUrl", label: "Demo URL", type: "text", required: false },
    { name: "price", label: "Price (USD)", type: "number", required: true },
  ]},
  { name: "Tutorial/Method", slug: "tutorial", icon: "BookOpen", order: 12, fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "category", label: "Category", type: "text", required: false, placeholder: "Carding, SE, Crypto..." },
    { name: "format", label: "Format", type: "select", required: true, options: ["PDF", "Video", "Text", "Multiple"] },
    { name: "language", label: "Language", type: "select", required: false, options: ["English", "Russian", "Spanish", "Other"] },
    { name: "sampleUrl", label: "Sample URL", type: "text", required: false },
    { name: "price", label: "Price (USD)", type: "number", required: true },
  ]},
];

async function main() {
  for (const cat of categories) {
    const fieldsJson = JSON.stringify(cat.fields);
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, order: cat.order, fields: fieldsJson },
      create: { name: cat.name, slug: cat.slug, icon: cat.icon, order: cat.order, fields: fieldsJson },
    });
  }
  console.log("Seeded " + categories.length + " categories with country fields");
}

main().finally(() => prisma.$disconnect());
