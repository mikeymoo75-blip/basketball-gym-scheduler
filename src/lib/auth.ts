import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "User name or email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(credentials.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
      }
      if (trigger === "update" && session?.user) {
        token.mustChangePassword = Boolean(session.user.mustChangePassword);
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.id);
      session.user.role = token.role as typeof session.user.role;
      session.user.mustChangePassword = Boolean(token.mustChangePassword);
      return session;
    },
    redirect({ url }) {
      if (url.startsWith("/")) return url;
      try {
        return new URL(url).pathname + new URL(url).search || "/schedule";
      } catch {
        return "/schedule";
      }
    },
  },
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth(authConfig);
