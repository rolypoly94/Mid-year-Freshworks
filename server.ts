import express from 'express';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client Lazily
let genAI: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. AI features will be disabled.');
      return null;
    }
    genAI = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return genAI;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint - respond immediately
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV 
    });
  });

  // Load Firebase config gracefully
  let firebaseConfig: any = {};
  try {
    const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(firebaseConfigPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    } else {
       console.warn('firebase-applet-config.json not found');
    }
  } catch (err) {
    console.error('Error loading firebase config:', err);
  }

  // Initialize Firebase Admin
  let db: any;
  if (firebaseConfig.projectId) {
    try {
      console.log('Initializing Firebase Admin with project ID:', firebaseConfig.projectId);
      const adminApp = admin.apps.length === 0 
        ? admin.initializeApp({ projectId: firebaseConfig.projectId }) 
        : admin.app();
      
      const rawDbId = firebaseConfig.firestoreDatabaseId;
      const dbId = (rawDbId && typeof rawDbId === 'string' && rawDbId.trim() !== '') 
        ? rawDbId.trim() 
        : '(default)';
      db = getFirestore(adminApp, dbId);
      console.log(`Firestore initialized for database: ${dbId}`);
    } catch (error) {
      console.error('Firestore initialization failed:', error);
    }
  }

  // --- Auth middleware ---
  // Verifies a Firebase ID token (passed as `Authorization: Bearer <token>`).
  // Used to gate API routes that should not be open to the public internet.
  const requireAuth = async (req: any, res: any, next: any) => {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer (.+)$/);
    if (!match) return res.status(401).json({ error: 'Missing Authorization header' });
    if (admin.apps.length === 0) {
      return res.status(503).json({ error: 'Auth service not available' });
    }
    try {
      const decoded = await admin.auth().verifyIdToken(match[1]);
      const email = decoded.email?.toLowerCase();
      if (!email || !email.endsWith('@freshworks.com')) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      req.userEmail = email;
      next();
    } catch (err) {
      console.error('Auth verification failed:', err);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };

  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!db) return res.status(503).json({ error: 'Database service not available' });
    try {
      const adminDoc = await db.collection('admins').doc(req.userEmail).get();
      if (!adminDoc.exists) return res.status(403).json({ error: 'Admin access required' });
      next();
    } catch (err) {
      console.error('Admin check failed:', err);
      return res.status(500).json({ error: 'Admin check failed' });
    }
  };

  // --- Gemini AI Routes ---

  app.post('/api/gemini/refine-feedback', requireAuth, async (req, res) => {
    const { feedback, context } = req.body;
    if (!feedback) return res.status(400).json({ error: 'Feedback text is required' });

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'AI service is temporarily unavailable (check API key configuration).' });
    }

    try {
      const prompt = `
        You are an expert HR coach specializing in performance feedback.
        Refine the following performance feedback to be more professional, constructive, and actionable.
        
        CONTEXT: ${context || 'General performance feedback'}
        
        FEEDBACK TO REFINE:
        "${feedback}"
        
        GUIDELINES:
        1. Keep the original intent and key points.
        2. Use professional language typical of high-performing tech companies.
        3. Make it constructive (focus on growth) even if critical.
        4. Be concise but specific.
        5. Use bullet points if multiple points are raised.
        6. If the input is very short, expand it into a well-structured paragraph or list.
        
        Return ONLY the refined text. No preamble, no greetings.
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const refinedText = result.text;
      res.json({ refinedText });
    } catch (error: any) {
      console.error('Gemini Error:', error);
      const errorMessage = error?.message || '';
      if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('API_KEY_INVALID')) {
        return res.status(403).json({ 
          error: 'Gemini API Permission Denied. Please check your API key in the Settings > Secrets panel.' 
        });
      }
      res.status(500).json({ error: 'Failed to refine feedback using AI' });
    }
  });

  // --- Admin API Routes ---

  // Short-lived cache for the pending-employees scan so repeat clicks
  // within ~60s don't re-scan the collection.
  let remindersCache: { at: number; emailedTo: string[] } | null = null;
  const REMINDERS_CACHE_TTL_MS = 60_000;

  app.post('/api/admin/reminders', requireAuth, requireAdmin, async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database service not available' });
    try {
      const now = Date.now();
      if (remindersCache && now - remindersCache.at < REMINDERS_CACHE_TTL_MS) {
        return res.json({
          message: `Reminders already sent in the last minute to ${remindersCache.emailedTo.length} managers.`,
          emailedTo: remindersCache.emailedTo,
          cached: true,
        });
      }

      const pendingEmployeesSnapshot = await db.collection('employees')
        .where('status', '==', 'Pending')
        .get();

      if (pendingEmployeesSnapshot.empty) {
        return res.json({ message: 'No pending reports found. No emails sent.' });
      }

      const managersToEmail = new Set<string>();
      pendingEmployeesSnapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.manager_email) managersToEmail.add(data.manager_email);
      });

      const emailedManagers = Array.from(managersToEmail);
      console.log('--- BATCH EMAIL REMINDERS ---');
      emailedManagers.forEach(email => console.log(`Sending reminder to: ${email}`));
      console.log('-----------------------------');

      remindersCache = { at: now, emailedTo: emailedManagers };

      res.json({
        message: `Success! Reminders sent to ${emailedManagers.length} managers.`,
        emailedTo: emailedManagers,
      });
    } catch (error) {
      console.error('Admin API Error:', error);
      res.status(500).json({ error: 'Failed to send reminders' });
    }
  });

  // --- Vite Middleware ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
