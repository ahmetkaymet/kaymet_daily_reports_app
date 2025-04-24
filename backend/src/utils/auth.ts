import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import dotenv from 'dotenv';

dotenv.config();

const getAuthenticatedClient = async (): Promise<Client> => {
  try {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const tenantId = process.env.MICROSOFT_TENANT_ID;

    console.log('Checking authentication configuration...');
    
    if (!clientId || !clientSecret || !tenantId) {
      console.error('Missing environment variables:', {
        clientId: !!clientId,
        clientSecret: !!clientSecret,
        tenantId: !!tenantId
      });
      throw new Error('Missing required environment variables for authentication');
    }

    console.log('Creating credential with tenant ID:', tenantId);
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    
    console.log('Initializing Microsoft Graph client...');
    const client = Client.init({
      authProvider: async (done) => {
        try {
          console.log('Requesting access token from Microsoft Graph...');
          const token = await credential.getToken(['https://graph.microsoft.com/.default']);
          console.log('Token received successfully');
          done(null, token.token);
        } catch (error) {
          console.error('Error getting token:', error);
          if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
          }
          done(error as Error, null);
        }
      }
    });
    
    console.log('Microsoft Graph client initialized successfully');
    return client;
  } catch (error) {
    console.error('Authentication error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
};

export { getAuthenticatedClient }; 