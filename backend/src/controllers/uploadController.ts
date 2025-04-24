import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadToOneDrive } from '../services/oneDriveService';

declare module 'express-session' {
  interface SessionData {
    accessToken?: string;
    idToken?: string;
  }
}

const router = Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  console.log('Received upload request');
  try {
    if (!req.file) {
      console.log('No file received');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if user is authenticated
    if (!req.session.accessToken) {
      console.log('User is not authenticated');
      return res.status(401).json({ message: 'Unauthorized - User not authenticated' });
    }

    console.log('File received:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    const fileName = req.body.fileName || req.file.originalname;
    console.log('Using filename:', fileName);

    await uploadToOneDrive(req.file.buffer, fileName, req.session.accessToken);
    console.log('File uploaded successfully');

    res.status(200).json({
      message: 'File uploaded successfully',
      fileName,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to upload file',
    });
  }
});

export const uploadRouter = router; 