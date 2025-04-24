import { Router, Request, Response } from 'express';
import { getRecentFiles } from '../services/oneDriveService';

declare module 'express-session' {
  interface SessionData {
    accessToken?: string;
    idToken?: string;
  }
}

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  console.log('Received request to get files');
  
  try {
    // Check if the user is authenticated
    if (!req.session.accessToken) {
      console.log('User not authenticated');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get the files from OneDrive
    const files = await getRecentFiles(req.session.accessToken);
    console.log(`Retrieved ${files.length} files`);

    return res.status(200).json({
      message: 'Files retrieved successfully',
      files
    });
  } catch (error) {
    console.error('Error retrieving files:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to retrieve files'
    });
  }
});

export const fileRouter = router; 