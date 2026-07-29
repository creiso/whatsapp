import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("E-mail e senha são obrigatórios.");
        }

        const email = credentials.email.toLowerCase();

        // Check for brute force lock
        let attemptRecord = await prisma.loginAttempt.findUnique({
          where: { email }
        });

        if (attemptRecord && attemptRecord.lockedUntil && attemptRecord.lockedUntil > new Date()) {
          throw new Error("Muitas tentativas falhas. Conta temporariamente bloqueada por 5 minutos.");
        }

        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user) {
          throw new Error("Usuário não encontrado.");
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password);

        if (!passwordMatch) {
          // Increment failed attempts
          const newAttempts = (attemptRecord?.attempts || 0) + 1;
          const lockedUntil = newAttempts >= 10 ? new Date(Date.now() + 5 * 60 * 1000) : null;
          
          await prisma.loginAttempt.upsert({
            where: { email },
            update: { attempts: newAttempts, lockedUntil },
            create: { email, attempts: newAttempts, lockedUntil }
          });

          if (lockedUntil) {
            throw new Error("Muitas tentativas falhas. Conta temporariamente bloqueada por 5 minutos.");
          }

          throw new Error("Senha incorreta.");
        }

        // On successful login, reset attempts
        if (attemptRecord) {
          await prisma.loginAttempt.update({
            where: { email },
            data: { attempts: 0, lockedUntil: null }
          });
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          teamId: user.teamId
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 10 * 60 * 60, // 10 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.teamId = (user as any).teamId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).teamId = token.teamId;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
