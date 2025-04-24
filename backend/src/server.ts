import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import { uploadRouter } from './controllers/uploadController';
import { directUploadRouter } from './controllers/directUploadController';
import { fileRouter } from './controllers/fileController';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200
}));
app.use(express.json());

// Session middleware - IMPORTANT: configure properly for auth
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true in production with https
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 saat
  }
}));

// Enable pre-flight requests for all routes
app.options('*', cors());

// Add a middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Session ID:', req.sessionID);
  console.log('Has access token:', !!req.session.accessToken);
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'OneDrive Upload API is running' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/upload', uploadRouter);
app.use('/api/direct-upload', directUploadRouter);
app.use('/api/files', fileRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 