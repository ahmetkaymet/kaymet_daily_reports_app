// Imports necessary for Microsoft Graph API
const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');
require('dotenv').config();

// Function to create authenticated client
const getAuthenticatedClient = async () => {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID;

  console.log('Creating credential with tenant ID:', tenantId);
  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  
  const client = Client.init({
    authProvider: async (done) => {
      try {
        const token = await credential.getToken(['https://graph.microsoft.com/.default']);
        done(null, token.token);
      } catch (error) {
        console.error('Error getting token:', error);
        done(error, null);
      }
    }
  });
  
  return client;
};

// Test function to get SharePoint sites
const testSharePointAccess = async () => {
  try {
    console.log('Testing SharePoint access...');
    
    const client = await getAuthenticatedClient();
    console.log('Client authenticated successfully');
    
    // Format 1: domain,site,name
    try {
      console.log('Format 1: /sites/kaymet365.sharepoint.com,sites,dailyreports');
      const response = await client.api('/sites/kaymet365.sharepoint.com,sites,dailyreports').get();
      console.log('Format 1 successful:', response);
    } catch (error) {
      console.error('Format 1 failed:', error.message);
    }
    
    // Format 2: domain:/sites/name:/
    try {
      console.log('Format 2: /sites/kaymet365.sharepoint.com:/sites/dailyreports:/');
      const response = await client.api('/sites/kaymet365.sharepoint.com:/sites/dailyreports:/').get();
      console.log('Format 2 successful:', response);
    } catch (error) {
      console.error('Format 2 failed:', error.message);
    }
    
    // Format 3: Using beta endpoint
    try {
      console.log('Format 3: beta/sites/kaymet365.sharepoint.com:/sites/dailyreports');
      const response = await client.api('https://graph.microsoft.com/beta/sites/kaymet365.sharepoint.com:/sites/dailyreports').get();
      console.log('Format 3 successful:', response);
    } catch (error) {
      console.error('Format 3 failed:', error.message);
    }
    
    // Try listing all sites
    try {
      console.log('Listing all sites');
      const allSites = await client.api('/sites?search=*').get();
      console.log('All sites:', allSites.value);
    } catch (error) {
      console.error('Failed to list sites:', error.message);
    }
    
    // Try listing top-level sites
    try {
      console.log('Listing root sites');
      const rootSites = await client.api('/sites/root').get();
      console.log('Root site:', rootSites);
    } catch (error) {
      console.error('Failed to list root site:', error.message);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testSharePointAccess();
