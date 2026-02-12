/**
 * NextAuth configuration for Microsoft Azure AD authentication
 * Handles OAuth flow, token management, and session
 */

import NextAuth, { NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import CredentialsProvider from 'next-auth/providers/credentials';
import { AuthenticationError } from '@/lib/errors';
import { mockUser } from '@/lib/mock-data';

const isMockMode = process.env.USE_MOCK_AUTH === 'true';

export const authOptions: NextAuthOptions = {
  providers: isMockMode
    ? [
        // Mock authentication provider for development
        CredentialsProvider({
          id: 'mock',
          name: 'Mock Login (Development)',
          credentials: {},
          async authorize() {
            // Auto-login with mock user in development mode
            return {
              id: mockUser.id,
              email: mockUser.email,
              name: mockUser.name,
              image: mockUser.image,
            };
          },
        }),
      ]
    : [
        // Real Azure AD authentication
        AzureADProvider({
          clientId: process.env.AZURE_AD_CLIENT_ID!,
          clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
          tenantId: process.env.AZURE_AD_TENANT_ID!,
          authorization: {
            params: {
              scope: 'openid profile email Chat.Read ChannelMessage.Read.All Team.ReadBasic.All offline_access',
            },
          },
        }),
      ],

  callbacks: {
    /**
     * JWT callback - called when token is created or updated
     * Store access token and refresh token in JWT
     */
    async jwt({ token, account, user }) {
      // Mock mode - use fake access token
      if (isMockMode) {
        return {
          ...token,
          accessToken: 'mock_access_token',
          expiresAt: Math.floor(Date.now() / 1000) + 86400, // 24 hours
        };
      }

      // Initial sign in
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }

      // Check if token needs refresh
      if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000) {
        return token;
      }

      // Token expired, refresh it
      if (token.refreshToken) {
        try {
          const refreshed = await refreshAccessToken(token.refreshToken as string);
          return {
            ...token,
            accessToken: refreshed.access_token,
            refreshToken: refreshed.refresh_token || token.refreshToken,
            expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
          };
        } catch (error) {
          console.error('Error refreshing access token:', error);
          // Return token with error flag
          return { ...token, error: 'RefreshAccessTokenError' };
        }
      }

      return token;
    },

    /**
     * Session callback - add access token to session
     * This makes the token available to the client
     */
    async session({ session, token }) {
      if (token.accessToken) {
        session.accessToken = token.accessToken as string;
      }

      if (token.error) {
        session.error = token.error as string;
      }

      return session;
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  secret: process.env.NEXTAUTH_SECRET,
};

/**
 * Refresh an expired access token using refresh token
 */
async function refreshAccessToken(refreshToken: string) {
  const tokenEndpoint = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: process.env.AZURE_AD_CLIENT_ID!,
    client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new AuthenticationError('Failed to refresh access token');
  }

  return await response.json();
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
