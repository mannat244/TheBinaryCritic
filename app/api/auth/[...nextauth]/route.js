import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const authOptions = {
  providers: [
    // ⭐ GOOGLE LOGIN
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),

    // ⭐ EMAIL + PASSWORD LOGIN (CREDENTIALS)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await connectDB();

        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const user = await User.findOne({ email: credentials.email });
        if (!user) throw new Error("No account found");

        if (user.provider === "google") {
          throw new Error("This email is registered via Google. Please sign in with Google.");
        }

        const validPassword = await bcrypt.compare(credentials.password, user.password);
        if (!validPassword) throw new Error("Incorrect password");

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar, // ⭐ FIX: Return avatar for session
        };
      },
    }),
  ],

  // JWT STRATEGY
  session: {
    strategy: "jwt",
  },

  callbacks: {
    // ⭐ MERGE GOOGLE + EMAIL ACCOUNTS
    async signIn({ user, account }) {
      await connectDB();

      if (account.provider === "google") {
        const existing = await User.findOne({ email: user.email });

        if (!existing) {
          // Create user from Google login
          await User.create({
            name: user.name,
            email: user.email,
            avatar: user.image,
            provider: "google",
            onboardingCompleted: false, // New users need onboarding
          });
        }
      }

      return true;
    },

    // ⭐ MAIN FIX → ALWAYS USE MongoDB _id, NOT GOOGLE PROFILE ID
    async jwt({ token, user, trigger, session }) {
      // Initial Sign In
      if (user) {
        await connectDB();
        const dbUser = await User.findOne({ email: user.email });
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.onboardingCompleted = dbUser.onboardingCompleted;
        }
      }

      // Handle session update (allows client to update token after onboarding)
      if (trigger === "update" && session?.onboardingCompleted !== undefined) {
        token.onboardingCompleted = session.onboardingCompleted;
      }

      return token;
    },

    // ⭐ MAKE USER ID AVAILABLE IN SESSION
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id;

        // Fetch fresh data from DB to avoid stale session and large cookies
        try {
          await connectDB();
          const dbUser = await User.findById(token.id).select("avatar onboardingCompleted name createdAt");
          if (dbUser) {
            session.user.image = dbUser.avatar;
            session.user.avatar = dbUser.avatar;
            session.user.onboardingCompleted = dbUser.onboardingCompleted;
            session.user.name = dbUser.name;
            session.user.createdAt = dbUser.createdAt;
          }
        } catch (error) {
          console.error("Error fetching user session data:", error);
        }
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

// API route handler
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
