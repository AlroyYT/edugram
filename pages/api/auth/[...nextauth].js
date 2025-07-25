import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "../../../lib/mongodb"; // adjust path as needed

const id = process.env.GOOGLE_CLIENT_ID;
const secret = process.env.GOOGLE_CLIENT_SECRET;

const featureToRoute = {
  BlindAssistance: "/voice-assistant",
  DeafAssistance: "/deaf",
  AutismSupport: "/autism-support",
  PersonalizedLearning: "/topic-explorer",
};

export const authOptions = {
  adapter: MongoDBAdapter(clientPromise),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
    }),    
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("👤 USER:", user); // Should contain name/email/etc
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.accessToken = token.accessToken;
      return session;
    },
    async redirect({ url, baseUrl }, req) {
      // Try to get the token from the request (NextAuth v4+)
      let email;
      if (req?.token?.email) {
        email = req.token.email;
      } else if (req?.session?.user?.email) {
        email = req.session.user.email;
      }
      if (!email) {
        return baseUrl + "/features";
      }

      // Query the database for the user
      const client = await clientPromise;
      const db = client.db("test");
      const dbUser = await db.collection("users").findOne({ email });

      if (!dbUser || !dbUser.featureCounters) {
        return baseUrl + "/features";
      }

      // Find the feature with the highest counter
      const counters = dbUser.featureCounters;
      let maxFeature = null;
      let maxValue = -1;
      for (const [feature, value] of Object.entries(counters)) {
        console.log("🔑 FEATURE:", feature);
        console.log("🔑 VALUE:", value);
        if (value > maxValue) {
          maxFeature = feature;
          maxValue = value;
        }
      }

      if (!maxFeature || maxValue <= 0) {
        return baseUrl + "/features";
      }

      const route = featureToRoute[maxFeature] || "/features";
      return baseUrl + route;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
  },
};

export default NextAuth(authOptions);
