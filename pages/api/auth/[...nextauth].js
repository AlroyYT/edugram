import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const id = process.env.GOOGLE_CLIENT_ID;
const secret = process.env.GOOGLE_CLIENT_SECRET;

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: id,
      clientSecret: secret,
    }),
  ],

  session: {
    strategy: "jwt", // Keep JWT-based sessions
    maxAge: 30 * 24 * 60 * 60, // Sessions last 30 days
  },

  // ADD THIS COOKIE CONFIGURATION FOR AWS AMPLIFY
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: process.env.NODE_ENV === "production" ? ".amplifyapp.com" : undefined,
      }
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: process.env.NODE_ENV === "production" ? ".amplifyapp.com" : undefined,
      }
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: process.env.NODE_ENV === "production" ? ".amplifyapp.com" : undefined,
      }
    },
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        maxAge: 60 * 15, // 15 minutes
        domain: process.env.NODE_ENV === "production" ? ".amplifyapp.com" : undefined,
      }
    },
    state: {
      name: "next-auth.state",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        maxAge: 60 * 15, // 15 minutes
        domain: process.env.NODE_ENV === "production" ? ".amplifyapp.com" : undefined,
      }
    },
    nonce: {
      name: "next-auth.nonce",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: process.env.NODE_ENV === "production" ? ".amplifyapp.com" : undefined,
      }
    }
  },

  // ADD THIS FOR AMPLIFY
  useSecureCookies: process.env.NODE_ENV === "production",

  callbacks: {
    async jwt({ token, account }) {
      // Add access token if available
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Pass access token to the session object
      session.user.accessToken = token.accessToken;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Redirect to the features page after login
      return "/features";
    },
  },

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/auth/signin", // Login page
  },
});