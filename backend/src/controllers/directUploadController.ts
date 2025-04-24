import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadToOneDriveWithToken } from '../services/oneDriveService';

const router = Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Direct upload using bearer token
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  console.log('Received direct upload request');
  try {
    if (!req.file) {
      console.log('No file received');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check for authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid authorization header');
      return res.status(401).json({ message: 'Unauthorized - Missing or invalid token' });
    }

    // Extract the token
    const token = authHeader.split(' ')[1];
    console.log('Authorization token received');

    console.log('File received:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Dosya adını ve metaverileri al
    const fileName = req.body.fileName || req.file.originalname;
    const originalFileName = req.body.originalFileName || req.file.originalname;
    const formattedReportName = req.body.formattedReportName || fileName;
    
    console.log('Upload metadata:', {
      fileName,
      originalFileName,
      formattedReportName
    });

    // OneDrive'a yükle - artık metadata bilgisi de gönderilebilir
    await uploadToOneDriveWithToken(
      req.file.buffer, 
      fileName, 
      token,
      { 
        originalFileName,
        reportName: formattedReportName
      }
    );
    
    console.log('File uploaded successfully');

    res.status(200).json({
      message: 'File uploaded successfully',
      fileName,
      originalFileName,
      formattedReportName
    });
  } catch (error) {
    console.error('Direct upload error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to upload file',
    });
  }
});

export const directUploadRouter = router; 