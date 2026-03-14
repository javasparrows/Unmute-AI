import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prismaAdmin } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prismaAdmin),
  providers: [Google],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.id) return true; // New user, allow sign-in
      const dbUser = await prismaAdmin.user.findUnique({
        where: { id: user.id },
        select: { deletedAt: true },
      });
      if (dbUser?.deletedAt) return false; // Block deleted users
      return true;
    },
    async session({ session, user }) {
      session.user.id = user.id;
      const dbUser = await prismaAdmin.user.findUnique({
        where: { id: user.id },
        select: { plan: true, planOverride: true, role: true, deletedAt: true },
      });
      if (dbUser?.deletedAt) {
        // Force logout for deleted users with existing sessions
        session.user.plan = "FREE";
        session.user.role = "USER";
        return session;
      }
      session.user.plan = dbUser?.planOverride ?? dbUser?.plan ?? "FREE";
      session.user.role = dbUser?.role ?? "USER";
      return session;
    },
  },
});
