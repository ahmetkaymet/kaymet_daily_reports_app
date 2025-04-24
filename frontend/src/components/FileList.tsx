import React, { useState, useEffect } from 'react';
import './FileList.css';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface File {
  id: string;
  name: string;
  webUrl: string;
  createdDateTime: string;
  size: number;
}

const FileList: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/files', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Dosyalar alınamadı');
        }

        const data = await response.json();
        setFiles(data.files);
      } catch (err) {
        console.error('Dosya listesi alınırken hata oluştu:', err);
        setError('Dosya listesi alınamadı. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  // Dosya boyutunu formatla (KB, MB, GB)
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return <div className="file-list loading">Dosyalar yükleniyor...</div>;
  }

  if (error) {
    return <div className="file-list error">{error}</div>;
  }

  if (files.length === 0) {
    return <div className="file-list empty">Henüz hiç dosya yüklenmemiş</div>;
  }

  return (
    <div className="file-list">
      <h2>Son Yüklenen Dosyalar</h2>
      <table>
        <thead>
          <tr>
            <th>Dosya Adı</th>
            <th>Yüklenme Tarihi</th>
            <th>Boyut</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr key={file.id}>
              <td>{file.name}</td>
              <td>
                {formatDistanceToNow(new Date(file.createdDateTime), { 
                  addSuffix: true,
                  locale: tr 
                })}
              </td>
              <td>{formatFileSize(file.size)}</td>
              <td>
                <a href={file.webUrl} target="_blank" rel="noopener noreferrer">
                  Görüntüle
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FileList; 