import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { accounts, sessions, users } from "@/db/schema";

// Env: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET (Auth.js reads them on its own)
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, { usersTable: users, accountsTable: accounts, sessionsTable: sessions }),
  providers: [Google],
  pages: { signIn: "/login" },
  callbacks: { session: ({ session, user }) => ({ ...session, user: { ...session.user, id: user.id } }) },
});
