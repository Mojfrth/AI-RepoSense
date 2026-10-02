import type { NextAuthConfig } from "next-auth";
import Github from "next-auth/providers/github";

export const authConfig = {
  providers: [
    Github({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname;
      const isProtected =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/projects") ||
        pathname.startsWith("/settings");

      if (isProtected) return !!auth;
      return true;
    },
    async jwt({ token, user, account }) {
      const authToken = token as typeof token & { authProvider?: string | null };

      if (user) {
        authToken.sub = user.id;
      }
      if (account) {
        authToken.authProvider = account.provider;
      }

      return authToken;
    },
    async session({ session, token }) {
      const sessionUser = session.user as typeof session.user & {
        authProvider?: string | null;
      };
      const authToken = token as typeof token & { authProvider?: string | null };

      if (sessionUser && token.sub) {
        sessionUser.id = token.sub;
      }
      if (sessionUser && typeof authToken.authProvider === "string") {
        sessionUser.authProvider = authToken.authProvider;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;