export type Product = {
  id: string;
  country: string;
  tld: string;
  hosting: string;
  seller: string;
  price: number;
  addedOn: string;
  check: string;
};

export const products: Product[] = [
  {
    id: "1",
    country: "🇺🇸 USA",
    tld: ".com",
    hosting: "AWS",
    seller: "seller18",
    price: 12.5,
    addedOn: "2026-09-16",
    check: "✅ Valid",
  },
  {
    id: "2",
    country: "🇬🇧 UK",
    tld: ".co.uk",
    hosting: "Cloudflare",
    seller: "proseller",
    price: 8.0,
    addedOn: "2026-09-15",
    check: "✅ Valid",
  },
  {
    id: "3",
    country: "🇩🇪 Germany",
    tld: ".de",
    hosting: "DigitalOcean",
    seller: "trustedhost",
    price: 15.75,
    addedOn: "2026-09-14",
    check: "⏳ Checking",
  },
  {
    id: "4",
    country: "🇫🇷 France",
    tld: ".fr",
    hosting: "OVH",
    seller: "seller18",
    price: 10.0,
    addedOn: "2026-09-13",
    check: "✅ Valid",
  },
];