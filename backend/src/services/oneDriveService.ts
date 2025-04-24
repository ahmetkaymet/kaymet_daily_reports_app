import { getAuthenticatedClient } from '../utils/auth';
import { Client } from '@microsoft/microsoft-graph-client';
import { Buffer } from 'buffer';

/**
 * Interface for drive item details from Microsoft Graph API.
 */
interface DriveItem {
  id: string;
  name: string;
  webUrl: string;
  createdDateTime: string;
  size: number;
}

/**
 * Interface for file metadata when uploading files.
 */
interface FileMetadata {
  originalFileName?: string;
  reportName?: string;
  [key: string]: any;
}

// Root folder path for simplicity
const FOLDER_PATH = '';

/**
 * Creates a Microsoft Graph client authenticated with the user's token.
 * 
 * @param {string} accessToken - The user's access token.
 * @returns {Client} The authenticated Microsoft Graph client.
 */
const getGraphClientWithToken = (accessToken: string): Client => {
  console.log('Creating Graph client with delegated user token');
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    }
  });
};

/**
 * Gets the current date formatted as DD-MM-YYYY for folder creation.
 * 
 * @returns {string} The formatted date string.
 */
const getCurrentDateFolder = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Creates a folder in the specified drive if it doesn't already exist.
 * 
 * @param {Client} graphClient - The Microsoft Graph client.
 * @param {string} driveId - The ID of the drive where the folder will be created.
 * @param {string} folderName - The name of the folder to create.
 * @returns {Promise<void>} A promise that resolves when the folder is created or already exists.
 */
const createFolderIfNotExists = async (graphClient: Client, driveId: string, folderName: string): Promise<void> => {
  try {
    console.log(`Checking if folder exists: ${folderName}`);
    
    // Try to get the folder to see if it exists
    try {
      await graphClient.api(`/drives/${driveId}/root:/${folderName}`).get();
      console.log(`Folder ${folderName} already exists`);
      return;
    } catch (error) {
      console.log(`Folder ${folderName} does not exist, creating it`);
    }
    
    // Create the folder
    const folderCreationBody = {
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "replace"
    };
    
    await graphClient.api(`/drives/${driveId}/root/children`).post(folderCreationBody);
    console.log(`Folder ${folderName} created successfully`);
  } catch (error) {
    console.error(`Error creating folder ${folderName}:`, error);
    throw error;
  }
};

/**
 * Gets the drives available to the user.
 * 
 * @param {Client} graphClient - The Microsoft Graph client.
 * @returns {Promise<string>} A promise that resolves with the ID of the first drive.
 * @throws {Error} If no drives are found for the user.
 */
const getUserDrives = async (graphClient: Client) => {
  try {
    console.log('Getting user drives...');
    const response = await graphClient.api('/me/drives').get();
    console.log('User drives:', response.value);
    
    if (response.value && response.value.length > 0) {
      // Return the first drive (usually the main OneDrive for Business drive)
      return response.value[0].id;
    }
    
    throw new Error('No drives found for user');
  } catch (error) {
    console.error('Error getting user drives:', error);
    throw error;
  }
};

/**
 * Uploads a file to OneDrive using the provided access token.
 * 
 * @param {Buffer} fileBuffer - The file content as a buffer.
 * @param {string} fileName - The name to save the file as.
 * @param {string} accessToken - The user's access token.
 * @returns {Promise<void>} A promise that resolves when the upload is complete.
 * @throws {Error} If the upload fails.
 */
export const uploadToOneDrive = async (
  fileBuffer: Buffer,
  fileName: string,
  accessToken: string
): Promise<void> => {
  try {
    console.log(`Uploading file to OneDrive for Business: ${fileName}`);
    
    // Get Graph client with user's access token
    const graphClient = getGraphClientWithToken(accessToken);
    console.log('Graph client obtained successfully with delegated token');
    
    // For files smaller than 4MB, we can use simple upload
    if (fileBuffer.length < 4 * 1024 * 1024) {
      // Use OneDrive for Business endpoint (SharePoint) - root folder
      console.log(`Using simple upload method for file: ${fileName}`);
      const apiPath = `/me/drive/root:${FOLDER_PATH}/${fileName}:/content`;
      console.log(`API Path: ${apiPath}`);
      
      await graphClient
        .api(apiPath)
        .put(fileBuffer);
    } else {
      // For larger files, use upload session
      console.log(`Using upload session for large file: ${fileName}`);
      const apiPath = `/me/drive/root:${FOLDER_PATH}/${fileName}:/createUploadSession`;
      console.log(`API Path: ${apiPath}`);
      
      const uploadSession = await graphClient
        .api(apiPath)
        .post({});
      
      const uploadUrl = uploadSession.uploadUrl;
      console.log(`Upload URL obtained: ${uploadUrl}`);
      
      // Upload the file in chunks
      const maxChunkSize = 4 * 1024 * 1024; // 4MB
      let offset = 0;
      
      while (offset < fileBuffer.length) {
        const chunkSize = Math.min(maxChunkSize, fileBuffer.length - offset);
        const chunk = fileBuffer.slice(offset, offset + chunkSize);
        
        console.log(`Uploading chunk: ${offset} to ${offset + chunkSize - 1} of ${fileBuffer.length}`);
        
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': `${chunkSize}`,
            'Content-Range': `bytes ${offset}-${offset + chunkSize - 1}/${fileBuffer.length}`
          },
          body: chunk
        });
        
        offset += chunkSize;
      }
    }
    
    console.log(`Upload completed successfully for file: ${fileName}`);
  } catch (error) {
    console.error('OneDrive upload error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw new Error(`Failed to upload file to OneDrive: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Tries different approaches to upload a file to OneDrive or SharePoint.
 * Will attempt multiple methods to find a valid upload location.
 * 
 * @param {Buffer} fileBuffer - The file content as a buffer.
 * @param {string} fileName - The name to save the file as.
 * @param {string} accessToken - The user's access token.
 * @param {FileMetadata} [metadata] - Optional metadata about the file.
 * @returns {Promise<void>} A promise that resolves when the upload is complete.
 * @throws {Error} If all upload attempts fail.
 */
export const uploadToOneDriveWithToken = async (
  fileBuffer: Buffer,
  fileName: string,
  accessToken: string,
  metadata?: FileMetadata
): Promise<void> => {
  try {
    console.log(`Direct token upload to OneDrive: ${fileName}`);
    if (metadata) {
      console.log('File metadata:', metadata);
    }
    
    // Get Graph client with the provided token
    const graphClient = getGraphClientWithToken(accessToken);
    console.log('Graph client created with provided token');
    
    // Get the current date folder name
    const dateFolder = getCurrentDateFolder();
    console.log(`Using date folder: ${dateFolder}`);
    
    // Try to use user's personal OneDrive storage
    try {
      console.log("Attempt 1: Trying with user's personal OneDrive");
      
      // Get the user's default drive
      const drive = await graphClient.api('/me/drive').get();
      const driveId = drive.id;
      
      // Create folder for today if it doesn't exist
      await createFolderIfNotExists(graphClient, driveId, dateFolder);
      
      // Upload file to the date folder
      const apiPath = `/drives/${driveId}/root:/${dateFolder}/${fileName}:/content`;
      console.log(`Upload path: ${apiPath}`);
      
      await graphClient.api(apiPath).put(fileBuffer);
      console.log("Upload successful to user's personal OneDrive");
      return;
    } catch (error) {
      console.log("Failed to upload to user's personal OneDrive, trying alternate method");
      console.error(error);
    }
    
    // Try SharePoint document library with a direct site path
    try {
      console.log("Attempt 2: Trying with SharePoint site document library");
      
      // Try different formats of SharePoint site URL
      try {
        console.log("Trying format 1: /sites/kaymet365.sharepoint.com,sites,dailyreports");
        const response = await graphClient.api('/sites/kaymet365.sharepoint.com,sites,dailyreports').get();
        console.log("SharePoint site response format 1:", response);
        
        // Get the default document library
        const drives = await graphClient.api(`/sites/${response.id}/drives`).get();
        
        if (drives.value && drives.value.length > 0) {
          const driveId = drives.value[0].id;
          
          // Create folder for today if it doesn't exist
          await createFolderIfNotExists(graphClient, driveId, dateFolder);
          
          // Upload file to the date folder
          const apiPath = `/drives/${driveId}/root:/${dateFolder}/${fileName}:/content`;
          console.log(`SharePoint upload path: ${apiPath}`);
          
          await graphClient.api(apiPath).put(fileBuffer);
          console.log("Upload successful to SharePoint site");
          return;
        }
      } catch (error) {
        console.log("Format 1 failed:", error);
      }
      
      // Try format 2
      try {
        console.log("Trying format 2: /sites/kaymet365.sharepoint.com:/sites/dailyreports:/");
        const response = await graphClient.api('/sites/kaymet365.sharepoint.com:/sites/dailyreports:/').get();
        console.log("SharePoint site response format 2:", response);
        
        // Get the default document library
        const drives = await graphClient.api(`/sites/${response.id}/drives`).get();
        
        if (drives.value && drives.value.length > 0) {
          const driveId = drives.value[0].id;
          
          // Create folder for today if it doesn't exist
          await createFolderIfNotExists(graphClient, driveId, dateFolder);
          
          // Upload file to the date folder
          const apiPath = `/drives/${driveId}/root:/${dateFolder}/${fileName}:/content`;
          console.log(`SharePoint upload path: ${apiPath}`);
          
          await graphClient.api(apiPath).put(fileBuffer);
          console.log("Upload successful to SharePoint site");
          return;
        }
      } catch (error) {
        console.log("Format 2 failed:", error);
      }
      
      // Try format 3
      try {
        console.log("Trying format 3 with graph beta: /sites/kaymet365.sharepoint.com:/sites/dailyreports");
        const response = await graphClient
          .api('https://graph.microsoft.com/beta/sites/kaymet365.sharepoint.com:/sites/dailyreports')
          .get();
        console.log("SharePoint site response format 3:", response);
        
        // Get the default document library
        const drives = await graphClient
          .api(`https://graph.microsoft.com/beta/sites/${response.id}/drives`)
          .get();
          
        if (drives.value && drives.value.length > 0) {
          const driveId = drives.value[0].id;
          
          // Create folder for today if it doesn't exist
          await createFolderIfNotExists(graphClient, driveId, dateFolder);
          
          // Upload file to the date folder
          const apiPath = `/drives/${driveId}/root:/${dateFolder}/${fileName}:/content`;
          console.log(`SharePoint upload path: ${apiPath}`);
          
          await graphClient.api(apiPath).put(fileBuffer);
          console.log("Upload successful to SharePoint site");
          return;
        }
      } catch (error) {
        console.log("Format 3 failed:", error);
      }
      
      throw new Error("Could not access SharePoint site with any method");
    } catch (error) {
      console.log("Failed to upload to SharePoint site, trying final method");
      console.error(error);
    }
    
    // Final attempt - try to find sites and upload to the first one
    console.log("Attempt 3: Trying to find sites and upload to first one");
    await uploadToFirstAvailableSiteWithFolder(graphClient, fileBuffer, fileName, dateFolder);
    console.log("Upload successful to first available site");
  } catch (error) {
    console.error('OneDrive direct token upload error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw new Error(`Failed to upload file to OneDrive: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Uploads a file directly to the user's OneDrive.
 * 
 * @param {Client} graphClient - The Microsoft Graph client.
 * @param {Buffer} fileBuffer - The file content as a buffer.
 * @param {string} fileName - The name to save the file as.
 * @returns {Promise<void>} A promise that resolves when the upload is complete.
 */
async function uploadToUserOneDrive(graphClient: Client, fileBuffer: Buffer, fileName: string): Promise<void> {
  const apiPath = `/me/drive/root:/${fileName}:/content`;
  console.log(`Upload path: ${apiPath}`);
  
  await graphClient.api(apiPath).put(fileBuffer);
}

/**
 * Uploads a file to a SharePoint site.
 * Will try different formats of SharePoint site URLs.
 * 
 * @param {Client} graphClient - The Microsoft Graph client.
 * @param {string} sitePath - The path to the SharePoint site.
 * @param {Buffer} fileBuffer - The file content as a buffer.
 * @param {string} fileName - The name to save the file as.
 * @returns {Promise<void>} A promise that resolves when the upload is complete.
 * @throws {Error} If all upload attempts fail.
 */
async function uploadToSharePointSite(graphClient: Client, sitePath: string, fileBuffer: Buffer, fileName: string): Promise<void> {
  // Try different formats of SharePoint site URL
  try {
    console.log("Trying format 1: /sites/kaymet365.sharepoint.com,sites,dailyreports");
    const response = await graphClient.api('/sites/kaymet365.sharepoint.com,sites,dailyreports').get();
    console.log("SharePoint site response format 1:", response);
    
    const driveId = response.id;
    const apiPath = `/drives/${driveId}/root:/${fileName}:/content`;
    console.log(`SharePoint upload path: ${apiPath}`);
    
    await graphClient.api(apiPath).put(fileBuffer);
    return;
  } catch (error) {
    console.log("Format 1 failed:", error);
  }
  
  // Try format 2
  try {
    console.log("Trying format 2: /sites/kaymet365.sharepoint.com:/sites/dailyreports:/");
    const response = await graphClient.api('/sites/kaymet365.sharepoint.com:/sites/dailyreports:/').get();
    console.log("SharePoint site response format 2:", response);
    
    const driveId = response.id;
    const apiPath = `/drives/${driveId}/root:/${fileName}:/content`;
    console.log(`SharePoint upload path: ${apiPath}`);
    
    await graphClient.api(apiPath).put(fileBuffer);
    return;
  } catch (error) {
    console.log("Format 2 failed:", error);
  }
  
  // Try format 3
  try {
    console.log("Trying format 3 with graph beta: /sites/kaymet365.sharepoint.com:/sites/dailyreports");
    const response = await graphClient
      .api('https://graph.microsoft.com/beta/sites/kaymet365.sharepoint.com:/sites/dailyreports')
      .get();
    console.log("SharePoint site response format 3:", response);
    
    // Get the default document library
    const drives = await graphClient
      .api(`https://graph.microsoft.com/beta/sites/${response.id}/drives`)
      .get();
      
    if (drives.value && drives.value.length > 0) {
      const driveId = drives.value[0].id;
      const apiPath = `/drives/${driveId}/root:/${fileName}:/content`;
      console.log(`SharePoint upload path: ${apiPath}`);
      
      await graphClient.api(apiPath).put(fileBuffer);
      return;
    }
  } catch (error) {
    console.log("Format 3 failed:", error);
    throw new Error("Could not access SharePoint site with any method");
  }
}

/**
 * Attempts to upload a file to the first available site.
 * 
 * @param {Client} graphClient - The Microsoft Graph client.
 * @param {Buffer} fileBuffer - The file content as a buffer.
 * @param {string} fileName - The name to save the file as.
 * @returns {Promise<void>} A promise that resolves when the upload is complete.
 * @throws {Error} If no sites are available or all upload attempts fail.
 */
async function uploadToFirstAvailableSite(graphClient: Client, fileBuffer: Buffer, fileName: string): Promise<void> {
  // Get all sites the user has access to
  const sitesResponse = await graphClient.api('/sites').get();
  console.log("Sites available:", sitesResponse.value);
  
  if (!sitesResponse.value || sitesResponse.value.length === 0) {
    throw new Error("No SharePoint sites found");
  }
  
  // Try each site until one works
  let uploadSuccess = false;
  let lastError = null;
  
  for (const site of sitesResponse.value) {
    try {
      console.log(`Trying site: ${site.displayName}`);
      // Get drives in this site
      const drivesResponse = await graphClient.api(`/sites/${site.id}/drives`).get();
      console.log(`Drives in site ${site.displayName}:`, drivesResponse.value);
      
      if (drivesResponse.value && drivesResponse.value.length > 0) {
        // Use the first drive
        const driveId = drivesResponse.value[0].id;
        const apiPath = `/drives/${driveId}/root:/${fileName}:/content`;
        console.log(`Upload path for site ${site.displayName}: ${apiPath}`);
        
        await graphClient.api(apiPath).put(fileBuffer);
        uploadSuccess = true;
        break;
      }
    } catch (error) {
      console.log(`Failed to upload to site ${site.displayName}`);
      lastError = error;
    }
  }
  
  if (!uploadSuccess) {
    throw lastError || new Error("Could not upload to any available site");
  }
}

/**
 * Attempts to upload a file to the first available site with a specified folder.
 * 
 * @param {Client} graphClient - The Microsoft Graph client.
 * @param {Buffer} fileBuffer - The file content as a buffer.
 * @param {string} fileName - The name to save the file as.
 * @param {string} folderName - The name of the folder to upload to.
 * @returns {Promise<void>} A promise that resolves when the upload is complete.
 * @throws {Error} If no sites are available or all upload attempts fail.
 */
async function uploadToFirstAvailableSiteWithFolder(graphClient: Client, fileBuffer: Buffer, fileName: string, folderName: string): Promise<void> {
  // Get all sites the user has access to
  const sitesResponse = await graphClient.api('/sites').get();
  console.log("Sites available:", sitesResponse.value);
  
  if (!sitesResponse.value || sitesResponse.value.length === 0) {
    throw new Error("No SharePoint sites found");
  }
  
  // Try each site until one works
  let uploadSuccess = false;
  let lastError = null;
  
  for (const site of sitesResponse.value) {
    try {
      console.log(`Trying site: ${site.displayName}`);
      // Get drives in this site
      const drivesResponse = await graphClient.api(`/sites/${site.id}/drives`).get();
      console.log(`Drives in site ${site.displayName}:`, drivesResponse.value);
      
      if (drivesResponse.value && drivesResponse.value.length > 0) {
        // Use the first drive
        const driveId = drivesResponse.value[0].id;
        
        // Create folder for today if it doesn't exist
        await createFolderIfNotExists(graphClient, driveId, folderName);
        
        // Upload file to the date folder
        const apiPath = `/drives/${driveId}/root:/${folderName}/${fileName}:/content`;
        console.log(`Upload path for site ${site.displayName}: ${apiPath}`);
        
        await graphClient.api(apiPath).put(fileBuffer);
        uploadSuccess = true;
        break;
      }
    } catch (error) {
      console.log(`Failed to upload to site ${site.displayName}`);
      lastError = error;
    }
  }
  
  if (!uploadSuccess) {
    throw lastError || new Error("Could not upload to any available site");
  }
}

/**
 * Gets recent files from the user's OneDrive.
 * 
 * @param {string} accessToken - The user's access token.
 * @returns {Promise<DriveItem[]>} A promise that resolves with an array of drive items.
 * @throws {Error} If the operation fails.
 */
export const getRecentFiles = async (accessToken: string): Promise<DriveItem[]> => {
  try {
    console.log('Getting recent files from OneDrive for Business');
    
    // Get Graph client with user's access token
    const graphClient = getGraphClientWithToken(accessToken);
    console.log('Graph client obtained successfully for file listing with delegated token');
    
    // Try to get all drives the user has access to
    try {
      const drivesResponse = await graphClient.api('/me/drives').get();
      console.log('User drives:', drivesResponse.value);
      
      if (drivesResponse.value && drivesResponse.value.length > 0) {
        // Use the first drive
        const driveId = drivesResponse.value[0].id;
        const filesResponse = await graphClient
          .api(`/drives/${driveId}/root/children`)
          .select('id,name,webUrl,createdDateTime,size')
          .orderby('createdDateTime desc')
          .top(20)
          .get();
        
        console.log(`Retrieved ${filesResponse.value.length} files from drive`);
        return filesResponse.value as DriveItem[];
      }
    } catch (error) {
      console.log("Failed to get files from user drives");
    }
    
    // Fallback to personal OneDrive
    try {
      const response = await graphClient
        .api('/me/drive/root/children')
        .select('id,name,webUrl,createdDateTime,size')
        .orderby('createdDateTime desc')
        .top(20)
        .get();
      
      console.log(`Retrieved ${response.value.length} files from personal OneDrive`);
      return response.value as DriveItem[];
    } catch (error) {
      console.log("Failed to get files from personal OneDrive");
    }
    
    // Return empty array if nothing worked
    return [];
  } catch (error) {
    console.error('Error getting recent files:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw new Error(`Failed to retrieve files from OneDrive: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}; 