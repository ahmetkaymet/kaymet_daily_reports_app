import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Uploads a file to OneDrive through the backend API.
 * Tracks upload progress and includes metadata about the file.
 * 
 * @param {File} file - The file to upload.
 * @param {string} formattedFileName - The formatted filename to save as.
 * @param {string} accessToken - The user's access token.
 * @param {function} onProgress - Callback function that receives progress updates.
 * @returns {Promise<void>} A promise that resolves when the upload is complete.
 * @throws {Error} If the upload fails.
 */
export const uploadFile = async (
  file: File,
  formattedFileName: string,
  accessToken: string,
  onProgress: (progress: number) => void
): Promise<void> => {
  console.log('Starting file upload:', {
    fileName: formattedFileName,
    fileSize: file.size,
    fileType: file.type
  });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', formattedFileName);
  
  // Metaveri olarak orijinal dosya adını ve rapor adını ekliyoruz
  formData.append('originalFileName', file.name);
  formData.append('formattedReportName', formattedFileName);

  try {
    const response = await axios.post(`${API_BASE_URL}/api/direct-upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${accessToken}`
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          console.log('Upload progress:', progress);
          onProgress(progress);
        }
      },
    });

    console.log('Upload response:', response.data);
  } catch (error) {
    console.error('Upload error:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to upload file');
    }
    throw new Error('An unexpected error occurred');
  }
}; 