import express from 'express';
import { getAuthUrl, handleAuthCodeResponse, validateUserDomain } from '../middleware/auth';

const router = express.Router();

router.get('/login', async (req, res) => {
  try {
    console.log('1. Login request received');
    
    // Auth URL'i oluşturmadan önce config'i kontrol et
    console.log('2. MSAL Config:', {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      tenantId: process.env.MICROSOFT_TENANT_ID,
      redirectUri: process.env.REDIRECT_URI
    });

    const authUrl = await getAuthUrl();
    console.log('3. Generated Auth URL:', authUrl);

    // Redirect yapmadan önce son kontrol
    console.log('4. Redirecting to Microsoft login...');
    res.redirect(authUrl);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      details: (error as Error).message
    });
  }
});

router.get('/callback', async (req, res) => {
  try {
    console.log('1. Callback received');
    console.log('2. Query params:', req.query);
    
    const { code, error, error_description } = req.query;
    
    if (error) {
      console.error('3. Auth Error:', error, error_description);
      return res.redirect('http://localhost:3000?error=' + encodeURIComponent(error_description as string));
    }

    if (!code) {
      console.error('3. No code received');
      return res.redirect('http://localhost:3000?error=no_code');
    }

    console.log('3. Processing auth code');
    const response = await handleAuthCodeResponse(code as string);
    
    if (!response || !response.accessToken) {
      console.error('4. No access token received');
      return res.redirect('http://localhost:3000?error=no_token');
    }

    // Session'a kaydet
    req.session.accessToken = response.accessToken;
    req.session.idToken = response.idToken;
    
    console.log('5. Tokens set in session:', {
      accessTokenExists: !!req.session.accessToken,
      accessTokenLength: req.session.accessToken?.length,
      idTokenExists: !!req.session.idToken
    });

    // Session'ı kaydet ve bekle
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('6. Session save error:', err);
          reject(err);
        } else {
          console.log('6. Session saved successfully');
          resolve();
        }
      });
    });

    console.log('7. Auth successful, redirecting to frontend');
    res.redirect('http://localhost:3000');
  } catch (error) {
    console.error('Callback error:', error);
    res.redirect('http://localhost:3000?error=' + encodeURIComponent('Authentication failed'));
  }
});

// Add a route to get the access token
router.get('/token', (req, res) => {
  console.log('Token requested');
  
  if (!req.session.accessToken) {
    console.log('No access token in session');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  console.log('Returning access token to client');
  return res.json({ accessToken: req.session.accessToken });
});

router.get('/check', (req, res) => {
  console.log('Auth check requested');
  console.log('Session:', req.session);
  console.log('Access Token exists:', !!req.session.accessToken);
  
  const isAuthenticated = !!req.session.accessToken;
  res.json({ 
    isAuthenticated,
    // Debug için ek bilgiler
    sessionExists: !!req.session,
    hasAccessToken: !!req.session.accessToken
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Logout failed');
    }
    console.log('Logout successful');
    res.redirect('http://localhost:3000');
  });
});

export default router; 