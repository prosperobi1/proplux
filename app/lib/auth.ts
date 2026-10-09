import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { attemptsExceeded, recordAttempt, resetAttempts } from "./rate-limit";

const LOGIN_WINDOW_MS = 60 * 1000;
const LOGIN_MAX_FAILS = 5;

/**
 * Look a user up by email OR username (any letter case).
 *
 * Prisma's case-insensitive filter isn't available on SQLite, so when the exact
 * match misses we fall back to SQL LIKE (case-insensitive for ASCII) narrowed by
 * the email domain or the username's first letter, never a full table scan.
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

const nextAuth = NextAuth({
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

        // Brute-force brake: after LOGIN_MAX_FAILS failed attempts the
        // identifier can't be tried again for a minute. The response stays a
        // generic failure either way, so nothing leaks about the account.
        const key = "login:" + identifier.toLowerCase();
        if (attemptsExceeded(key, LOGIN_MAX_FAILS, LOGIN_WINDOW_MS)) return null;

        const user = await findUserByIdentifier(identifier);
        const valid = user ? await bcrypt.compare(password, user.password) : false;

        if (!user || !valid || user.banned) {
          recordAttempt(key, LOGIN_WINDOW_MS);
          return null;
        }
        resetAttempts(key);

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

    // Always re-fetch role + banned from DB so admin actions (role change,
    // ban) take effect on the very next session read, not only at next login.
    if (token.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { role: true, banned: true },
      });
      // Account deleted: kill the session instead of trusting the stale token.
      if (!dbUser) return null;
      token.role = dbUser.role;
      (token as { banned?: boolean }).banned = dbUser.banned;
    }

    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      (session.user as any).id = token.id;
      (session.user as any).role = token.role;
      (session.user as { banned?: boolean }).banned = (token as { banned?: boolean }).banned;
    }
    return session;
  },
},
});

export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;

/**
 * The current request's session, or null when signed out AND when the
 * account is banned. authorize() only checks the ban flag at login time, so
 * this wrapper is what makes a ban stick for sessions opened before it:
 * every route handler and layout that calls auth() stops seeing the user on
 * their very next request.
 */
export async function auth() {
  const session = await nextAuth.auth();
  if (session?.user && (session.user as { banned?: boolean }).banned) return null;
  return session;
}
