import { ConfidentialClientApplication } from '@azure/msal-node';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET || !process.env.MICROSOFT_TENANT_ID || !process.env.REDIRECT_URI) {
  throw new Error('Missing required environment variables');
}

const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
  }
};

// Microsoft Graph API için gerekli scope'lar
const scopes = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'https://graph.microsoft.com/.default'
];

const redirectUri = process.env.REDIRECT_URI;

const msalClient = new ConfidentialClientApplication(msalConfig);

export const getAuthUrl = async () => {
  try {
    if (!redirectUri) {
      throw new Error('Redirect URI is not configured');
    }

    const authUrl = await msalClient.getAuthCodeUrl({
      scopes: scopes,
      redirectUri: redirectUri,
      responseMode: 'query',
      prompt: 'select_account'
    });
    return authUrl;
  } catch (error) {
    console.error('Error generating auth URL:', error);
    throw error;
  }
};

export const handleAuthCodeResponse = async (authCode: string) => {
  try {
    if (!redirectUri) {
      throw new Error('Redirect URI is not configured');
    }

    const response = await msalClient.acquireTokenByCode({
      code: authCode,
      scopes: scopes,
      redirectUri: redirectUri
    });
    return response;
  } catch (error) {
    console.error('Token acquisition error:', error);
    throw error;
  }
};

export const validateUserDomain = (email: string): boolean => {
  return email.endsWith('@kaymet.com');
}; 