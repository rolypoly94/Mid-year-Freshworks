import express from 'express';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase config
const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

// Initialize Firebase Admin
let db: any;

try {
  console.log('Initializing Firebase Admin with project ID:', firebaseConfig.projectId);
  // Initialize with projectId from config to ensure we target the correct project
  const adminApp = admin.apps.length === 0 
    ? admin.initializeApp({ projectId: firebaseConfig.projectId }) 
    : admin.app();
  
  // Use the specific database ID from config
  const rawDbId = firebaseConfig.firestoreDatabaseId;
  const dbId = (rawDbId && typeof rawDbId === 'string' && rawDbId.trim() !== '') 
    ? rawDbId.trim() 
    : '(default)';
  db = getFirestore(adminApp, dbId);
  console.log(`Firestore initialized for database: ${dbId}`);
} catch (error) {
  console.error('Firestore initialization failed:', error);
  process.exit(1);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Admin API Routes ---

  // Batch Email Reminders logic
  app.post('/api/admin/reminders', async (req, res) => {
    try {
      // 1. Get all employees with 'Pending' status
      const pendingEmployeesSnapshot = await db.collection('employees')
        .where('status', '==', 'Pending')
        .get();

      if (pendingEmployeesSnapshot.empty) {
        return res.json({ message: 'No pending reports found. No emails sent.' });
      }

      // 2. Group by manager_email
      const managersToEmail = new Set<string>();
      pendingEmployeesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.manager_email) {
          managersToEmail.add(data.manager_email);
        }
      });

      // 3. "Send" emails (logging to console for this demo)
      const emailedManagers = Array.from(managersToEmail);
      console.log('--- BATCH EMAIL REMINDERS ---');
      emailedManagers.forEach(email => {
        console.log(`Sending reminder to: ${email}`);
      });
      console.log('-----------------------------');

      res.json({ 
        message: `Success! Reminders sent to ${emailedManagers.length} managers.`,
        emailedTo: emailedManagers
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
