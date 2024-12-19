import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  session: {
    strategy: "jwt", // Keep JWT-based sessions
    maxAge: 30 * 24 * 60 * 60, // Sessions last 30 days
  },

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
