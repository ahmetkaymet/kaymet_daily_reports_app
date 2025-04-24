import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { uploadFile } from '../services';
import kaymetLogo from '../assets/Kaymet-50.-yil-Logo_Beyaz_Tam.png';

// Rapor türleri için enum
enum ReportType {
  ORDER = 'Sipariş tutar ve tonaj raporu',
  OFFER = 'Teklif raporu',
  GUARANTEE = 'Gayri nakdi kullanım raporu',
  ARGE = 'Günlük arge raporu',
  SHIPMENT = 'Sevkiyat raporu',
  CASH_FLOW = 'Nakit akışı',
  OTHER = 'Diğer'
}

interface FileUploaderProps {}

const FileUploader: React.FC<FileUploaderProps> = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accessToken, setAccessToken] = useState<string>('');
  const [selectedReportType, setSelectedReportType] = useState<string>(ReportType.ORDER);
  const [customReportName, setCustomReportName] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status...');
      const response = await fetch('http://localhost:3001/auth/check', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors'
      });
      
      if (!response.ok) {
        console.error('Auth check failed with status:', response.status);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('Auth check response:', data);
      
      // If user is authenticated, get access token
      if (data.isAuthenticated) {
        // Get token from backend
        const tokenResponse = await fetch('http://localhost:3001/auth/token', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          mode: 'cors'
        });
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          setAccessToken(tokenData.accessToken);
          console.log('Access token received');
        }
      }
      
      setIsAuthenticated(data.isAuthenticated);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
    
    if (window.location.search.includes('code=')) {
      console.log('Authorization code detected in URL');
      setTimeout(() => {
        console.log('Rechecking auth status after redirect');
        checkAuthStatus();
      }, 2000);
    }
  }, []);

  const handleLogin = () => {
    console.log('Starting login process...');
    window.location.href = 'http://localhost:3001/auth/login';
  };

  const handleLogout = () => {
    window.location.href = 'http://localhost:3001/auth/logout';
  };

  const formatFileName = (originalName: string): string => {
    const now = new Date();
    const date = format(now, 'dd-MM-yyyy');
    const time = format(now, 'HH.mm.ss');
    const extension = originalName.includes('.') 
      ? originalName.substring(originalName.lastIndexOf('.'))
      : '';
    
    // Rapor türüne göre dosya adını oluştur
    let reportName = selectedReportType;
    
    // Eğer "Diğer" seçeneği seçilmişse, özel girilen adı kullan
    if (selectedReportType === ReportType.OTHER && customReportName.trim()) {
      reportName = customReportName.trim();
    }
    
    return `${date}_${reportName}_${time}${extension}`;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      setSelectedFile(file);
      setError('');
      setUploadSuccess(false);
    }
  };

  const handleReportTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedReportType(event.target.value);
    // Diğer seçeneği seçildiğinde bile custom isimi sıfırlama, kullanıcı düzenleyebilsin
  };

  const handleCustomReportNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCustomReportName(event.target.value);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Lütfen önce bir dosya seçin');
      return;
    }

    // Eğer "Diğer" seçilmişse ve özel isim girilmemişse hata ver
    if (selectedReportType === ReportType.OTHER && !customReportName.trim()) {
      setError('Lütfen özel rapor ismi girin');
      return;
    }

    if (!accessToken) {
      setError('Kimlik doğrulama hatası. Lütfen yeniden giriş yapın.');
      return;
    }

    try {
      console.log('Starting upload process...');
      const formattedFileName = formatFileName(selectedFile.name);
      console.log('Formatted filename:', formattedFileName);

      await uploadFile(selectedFile, formattedFileName, accessToken, (progress: number) => {
        console.log('Upload progress:', progress);
        setUploadProgress(progress);
      });

      console.log('Upload completed successfully');
      setUploadSuccess(true);
      setSelectedFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during upload');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    
    if (error) {
      console.error('Login error:', error);
      setError('Login failed: ' + error);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="file-uploader">
        <div className="container">
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="file-uploader">
      {!isAuthenticated ? (
        <div className="login-container">
          <img src={kaymetLogo} alt="Kaymet Logo" className="app-logo" />
          <h1 className="page-title">Günlük Rapor Yükleme Ekranı</h1>
          <button onClick={handleLogin} className="login-button">
            Microsoft ile Giriş Yap
          </button>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="container">
          <div className="header">
            <button onClick={handleLogout} className="logout-button">
              Çıkış Yap
            </button>
          </div>

          <h1 className="page-title">Günlük Rapor Yükleme</h1>

          <div className="file-input-container">
            <label className="file-input-label">
              <span className="file-input-icon">📁</span>
              <span>Dosya seçmek için tıklayın veya sürükleyin</span>
              <input
                type="file"
                onChange={handleFileSelect}
                ref={fileInputRef}
                className="file-input"
              />
            </label>
          </div>

          {selectedFile && (
            <>
              <div className="selected-file">
                Seçilen dosya: {selectedFile.name}
              </div>
              
              {/* Rapor türü seçme kısmı */}
              <div className="report-type-container">
                <label htmlFor="reportType" className="report-type-label">Rapor Türü:</label>
                <select 
                  id="reportType" 
                  value={selectedReportType}
                  onChange={handleReportTypeChange}
                  className="report-type-select"
                >
                  <option value={ReportType.ORDER}>{ReportType.ORDER}</option>
                  <option value={ReportType.OFFER}>{ReportType.OFFER}</option>
                  <option value={ReportType.GUARANTEE}>{ReportType.GUARANTEE}</option>
                  <option value={ReportType.ARGE}>{ReportType.ARGE}</option>
                  <option value={ReportType.SHIPMENT}>{ReportType.SHIPMENT}</option>
                  <option value={ReportType.CASH_FLOW}>{ReportType.CASH_FLOW}</option>
                  <option value={ReportType.OTHER}>{ReportType.OTHER}</option>
                </select>
              </div>
              
              {/* Eğer "Diğer" seçilmişse, özel isim girme kısmı */}
              {selectedReportType === ReportType.OTHER && (
                <div className="custom-report-name-container">
                  <label htmlFor="customReportName" className="custom-report-label">Özel Rapor İsmi:</label>
                  <input
                    type="text"
                    id="customReportName"
                    value={customReportName}
                    onChange={handleCustomReportNameChange}
                    placeholder="Rapor ismini girin"
                    className="custom-report-input"
                  />
                </div>
              )}
            </>
          )}

          <button 
            onClick={handleUpload}
            disabled={!selectedFile}
            className="upload-button"
          >
            {uploadProgress > 0 && uploadProgress < 100 
              ? 'Yükleniyor...' 
              : 'OneDrive\'a Yükle'}
          </button>
          
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="progress-text">
                {Math.round(uploadProgress)}% tamamlandı
              </div>
            </div>
          )}

          {uploadSuccess && (
            <div className="success-message">
              Rapor başarıyla yüklendi!
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploader; 