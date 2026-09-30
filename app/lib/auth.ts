import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

/**
 * Look a user up by email OR username (any letter case).
 *
 * Prisma's case-insensitive filter isn't available on SQLite, so when the exact
 * match misses we fall back to SQL LIKE (case-insensitive for ASCII) narrowed by
 * the email domain or the username's first letter — never a full table scan.
 */
async function findUserByIdentifier(identifier: string) {
  const exact = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] },
  });
  if (exact) return exact;

  const q = identifier.toLowerCase();
  const pool = identifier.includes("@")
    ? await prisma.user.findMany({
        where: { email: { endsWith: "@" + identifier.split("@").pop()!.toLowerCase() } },
      })
    : await prisma.user.findMany({
        where: { username: { startsWith: identifier.charAt(0) } },
      });

  return (
    pool.find(
      (u) =>
        u.email.trim().toLowerCase() === q ||
        u.username.trim().toLowerCase() === q
    ) ?? null
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = String(credentials?.identifier ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!identifier || !password) return null;

        const user = await findUserByIdentifier(identifier);
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) return null;
        if (user.banned) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          role: user.role,
        } as any;
      },
    }),
  ],
  callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = (user as any).id;
    }

    // Always re-fetch role from DB so role changes take effect immediately
    if (token.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { role: true },
      });
      if (dbUser) {
        token.role = dbUser.role;
      }
    }

    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      (session.user as any).id = token.id;
      (session.user as any).role = token.role;
    }
    return session;
  },
},
});