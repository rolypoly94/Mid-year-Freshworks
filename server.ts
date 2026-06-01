import express from 'express';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import { GoogleGenAI } from "@google/genai";
import {
  buildReleaseDM,
  buildFeedbackModal,
  buildAckSuccessModal,
  buildPendingReportsModal,
  buildDraftReviewModal,
  buildDraftSavedModal,
  buildLockedReviewModal,
  buildSharedModal,
  buildLoadingModal,
  buildErrorModal,
  RATING_OPTIONS,
} from './src/lib/slack-blocks';
import {
  lookupByEmail as slackLookupByEmail,
  getUserEmail as slackGetUserEmail,
  postDirectMessage as slackPostDM,
  openView as slackOpenView,
  updateView as slackUpdateView,
  verifySlackSignature,
  reportOpsAlert,
} from './src/lib/slack';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Simple request logger
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
  });

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
      reportOpsAlert('Firestore failed to initialize — data features are down', error);
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
  
  function getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  app.post('/api/gemini/refine-feedback', requireAuth, async (req: any, res: any) => {
    const { feedback, context } = req.body;
    if (!feedback) return res.status(400).json({ error: 'Feedback text is required' });

    const ai = getGenAI();
    if (!ai) {
      return res.status(503).json({ error: 'AI service is temporarily unavailable (check API key configuration).' });
    }

    try {
      const prompt = `
        You are an expert HR coach specializing in performance feedback.
        Your task is to refine performance feedback to be professional, constructive, and actionable.

        FIELD CONTEXT: "${context || 'General performance feedback'}"
        FEEDBACK TO REVIEW: "${feedback.trim()}"

        CRITICAL VALIDATION STEP:
        Is the feedback provided too brief, generic, meaningless, or completely unrelated to "${context || 'General performance feedback'}"?
        For example:
        - Single expressions or isolated words with no substance (e.g., "Good", "Great", "Excellent", "N/A", "Nice", "Yes", "None").
        - Highly generic text devoid of concrete accomplishments or specific behaviors (e.g., "all good", "he did everything fine", "doing ok").
        - Words/phrases that don't make sense or represent low-effort/placeholder keys.

        If the feedback is too generic, brief, or lacks real relevant detail related to "${context || 'General performance feedback'}", you MUST start your response with "[REJECT]" followed by a helpful sentence explaining why and guiding the developer or manager on what specific behaviors or contributions they should mention.

        Otherwise, if the feedback is a valid sentence/draft that is contextual, refine it according to these guidelines:
        1. Keep the original intent and key accomplishments.
        2. Use professional corporate language typical of premium tech companies.
        3. Make it constructive (growth-focused) and specific.
        4. Organize with bullet points if multiple details are raised.
        5. DO NOT invent completely new achievements or facts that were not in the draft.

        Format your final response:
        - If rejected: "[REJECT] Your feedback is too brief/generic. Please provide some specific examples of [mention specific examples context] to refine successfully."
        - If refined: Show ONLY the refined text. No preamble, no wrapper, no intro ("Here is...").
      `;

      const result = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
      });

      const refinedText = result.text;
      if (!refinedText) {
        throw new Error('Gemini returned empty response');
      }

      const trimmedResult = refinedText.trim();
      if (trimmedResult.startsWith('[REJECT]')) {
        const reason = trimmedResult.replace('[REJECT]', '').trim();
        return res.status(400).json({ error: reason });
      }

      res.json({ refinedText: trimmedResult });
    } catch (error: any) {
      console.error('Gemini Error:', error);
      const errorMessage = error?.message || '';
      
      if (
        errorMessage.includes('PERMISSION_DENIED') || 
        errorMessage.includes('API_KEY_INVALID') ||
        errorMessage.includes('reported as leaked') ||
        errorMessage.includes('API_KEY_HTTP_REFERRER_BLOCKED') ||
        errorMessage.includes('blocked')
      ) {
        let msg = 'Gemini API key is invalid or has been reported as leaked.';
        if (errorMessage.includes('API_KEY_HTTP_REFERRER_BLOCKED') || errorMessage.includes('blocked')) {
          msg = 'Gemini API key is restricted by HTTP Referrer. This usually happens if your API key has domain restrictions that block the AI Studio preview environment.';
        }
        return res.status(403).json({ 
          error: msg + ' Please provide an unrestricted API key in the AI Studio Settings > Secrets panel, or update your key restrictions in the Google Cloud Console.' 
        });
      }
      
      res.status(500).json({ error: 'Failed to refine feedback using AI: ' + errorMessage });
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

  // --- Slack API Routes ---

  // Caller (web app) hits this after a manager flips status to 'Shared'.
  // We re-verify on the server that the caller is actually the manager
  // (or an admin) before DM'ing the employee on Slack.
  app.post('/api/slack/notify', requireAuth, async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database service not available' });
    if (!process.env.SLACK_BOT_TOKEN) {
      return res.status(503).json({ error: 'Slack integration not configured' });
    }

    const employeeEmail = String(req.body?.employee_email || '').toLowerCase().trim();
    if (!employeeEmail) return res.status(400).json({ error: 'employee_email is required' });

    try {
      const docSnap = await db.collection('employees').doc(employeeEmail).get();
      if (!docSnap.exists) return res.status(404).json({ error: 'Employee not found' });
      const employee = { id: docSnap.id, ...docSnap.data() };

      // Authorise: caller must be the manager, the HRBP, or an admin.
      const caller = (req as any).userEmail;
      const isCallerAdmin = (await db.collection('admins').doc(caller).get()).exists;
      const isCallerManager = employee.manager_email?.toLowerCase() === caller;
      const isCallerHRBP = employee.hrbp_email?.toLowerCase() === caller;
      if (!isCallerAdmin && !isCallerManager && !isCallerHRBP) {
        return res.status(403).json({ error: 'Not authorised to notify this employee' });
      }

      if (employee.status !== 'Shared') {
        return res.status(409).json({ error: `Feedback is not in Shared state (status=${employee.status})` });
      }

      const slackUser = await slackLookupByEmail(employeeEmail);
      if (!slackUser) {
        return res.status(404).json({ error: 'Employee not found in Slack' });
      }

      const dm = buildReleaseDM(employee as any);
      await slackPostDM(slackUser.id, dm.text, dm.blocks);
      res.json({ ok: true, notified: slackUser.id });
    } catch (err: any) {
      console.error('Slack notify failed:', err);
      reportOpsAlert(`Slack DM to ${employeeEmail} failed after a review was shared`, err);
      res.status(500).json({ error: err?.message || 'Slack notify failed' });
    }
  });

  // Slack interactivity (button clicks, modal submissions). Signature-verified
  // against SLACK_SIGNING_SECRET. We use a raw body parser here because the
  // HMAC must run over the exact bytes Slack sent.
  app.post(
    '/api/slack/interact',
    express.raw({ type: '*/*', limit: '1mb' }),
    async (req, res) => {
      const rawBody = (req.body as Buffer)?.toString('utf8') || '';
      const timestamp = req.header('x-slack-request-timestamp') || undefined;
      const signature = req.header('x-slack-signature') || undefined;

      if (!verifySlackSignature(rawBody, timestamp, signature)) {
        return res.status(401).send('Invalid signature');
      }

      const params = new URLSearchParams(rawBody);
      const payloadStr = params.get('payload');
      if (!payloadStr) return res.status(400).send('Missing payload');

      let payload: any;
      try {
        payload = JSON.parse(payloadStr);
      } catch {
        return res.status(400).send('Invalid payload JSON');
      }

      try {
        if (payload.type === 'block_actions') {
          return await handleBlockActions(payload, res);
        }
        if (payload.type === 'view_submission') {
          return await handleViewSubmission(payload, res);
        }
        // Unhandled interaction type — ack so Slack doesn't retry.
        return res.status(200).send('');
      } catch (err: any) {
        console.error('Slack interact failed:', err);
        reportOpsAlert(`Slack interaction failed (${payload?.type || 'unknown'})`, err);
        return res.status(500).send('Internal error');
      }
    },
  );

  async function handleBlockActions(payload: any, res: any) {
    const action = payload.actions?.[0];
    if (!action) return res.status(200).send('');

    switch (action.action_id) {
      case 'open_feedback':
        return handleOpenFeedback(payload, action, res);
      case 'start_draft':
        return handleStartDraft(payload, action, res);
      case 'view_locked_review':
        return handleViewLocked(payload, action, res);
      case 'share_now':
        return handleShareNow(payload, action, res);
      default:
        return res.status(200).send('');
    }
  }

  // Employee clicks "Open feedback" in the release DM.
  async function handleOpenFeedback(payload: any, action: any, res: any) {
    if (!db) return res.status(503).send('');

    const triggerId = payload.trigger_id;
    if (!triggerId) return res.status(400).send('No trigger ID');

    // To prevent expired_trigger_id, immediately reply 200 OK and open a loading modal
    res.status(200).send('');

    let viewId: string;
    try {
      const openResult = await slackOpenView(
        triggerId,
        buildLoadingModal('Mid-year check-in', 'Loading your feedback...'),
      );
      viewId = (openResult as any)?.view?.id;
      if (!viewId) throw new Error('views.open returned no view id');
    } catch (err) {
      console.error('views.open failed during open_feedback opening:', err);
      return;
    }

    try {
      const employeeEmail = String(action.value || '').toLowerCase();
      const slackUserId = payload.user?.id;
      if (!employeeEmail || !slackUserId) {
        await slackUpdateView(viewId, buildErrorModal('Bad payload', 'Missing email or Slack user ID.'));
        return;
      }

      const callerEmail = await slackGetUserEmail(slackUserId);
      if (!callerEmail || callerEmail !== employeeEmail) {
        await slackUpdateView(viewId, buildErrorModal('Not authorized', 'You are not authorized to view this feedback. Only the owner can view it.'));
        return;
      }

      const docSnap = await db.collection('employees').doc(employeeEmail).get();
      if (!docSnap.exists) {
        await slackUpdateView(viewId, buildErrorModal('Employee not found', 'Your employee record was not found in the database.'));
        return;
      }
      const employee = { id: docSnap.id, ...docSnap.data() } as any;

      if (employee.status !== 'Shared' && employee.status !== 'Acknowledged') {
        await slackUpdateView(viewId, buildErrorModal('Not available', 'Your feedback is not yet ready or shared with you.'));
        return;
      }

      // Update loading modal with the real feedback modal
      await slackUpdateView(viewId, buildFeedbackModal(employee));
    } catch (err: any) {
      console.error('Failed to prepare feedback:', err);
      await slackUpdateView(viewId, buildErrorModal('Error', `Could not load feedback: ${err.message}`));
    }
  }

  // Manager picks a report from the /midyear list to start (or continue) a draft.
  // We update the existing pending-reports modal in-place with the draft form.
  async function handleStartDraft(payload: any, action: any, res: any) {
    if (!db) return res.status(503).send('');

    const employeeEmail = String(action.value || '').toLowerCase();
    const slackUserId = payload.user?.id;
    const viewId = payload.view?.id;
    if (!employeeEmail || !slackUserId || !viewId) return res.status(400).send('Bad payload');

    const callerEmail = await slackGetUserEmail(slackUserId);
    if (!callerEmail) return res.status(403).send('No email');

    const docSnap = await db.collection('employees').doc(employeeEmail).get();
    if (!docSnap.exists) return res.status(404).send('Employee not found');
    const employee = { id: docSnap.id, ...docSnap.data() } as any;

    if (employee.manager_email?.toLowerCase() !== callerEmail) {
      return res.status(403).send('Not the manager');
    }

    // Once shared, edits must happen in the web portal (audit reasons).
    if (employee.status === 'Shared' || employee.status === 'Acknowledged') {
      res.status(200).send('');
      try {
        await slackUpdateView(viewId, buildLockedReviewModal(employee));
      } catch (err) {
        console.error('views.update (locked) failed:', err);
      }
      return;
    }

    // Pull current private data (rating) so we can pre-populate.
    let privateData: any = null;
    try {
      const priv = await db
        .collection('employees').doc(employeeEmail)
        .collection('manager_private').doc('current').get();
      if (priv.exists) privateData = priv.data();
    } catch (err) {
      console.warn('Failed to fetch manager_private (continuing):', err);
    }

    res.status(200).send('');
    try {
      await slackUpdateView(
        viewId,
        buildDraftReviewModal(employee, employee.mid_year_checkin, privateData),
      );
    } catch (err) {
      console.error('views.update (draft form) failed:', err);
    }
  }

  // Manager clicks "View" on an already-shared report — read-only modal.
  async function handleViewLocked(payload: any, action: any, res: any) {
    if (!db) return res.status(503).send('');

    const employeeEmail = String(action.value || '').toLowerCase();
    const slackUserId = payload.user?.id;
    const viewId = payload.view?.id;
    if (!employeeEmail || !slackUserId || !viewId) return res.status(400).send('Bad payload');

    const callerEmail = await slackGetUserEmail(slackUserId);
    if (!callerEmail) return res.status(403).send('No email');

    const docSnap = await db.collection('employees').doc(employeeEmail).get();
    if (!docSnap.exists) return res.status(404).send('Employee not found');
    const employee = { id: docSnap.id, ...docSnap.data() } as any;

    if (employee.manager_email?.toLowerCase() !== callerEmail) {
      return res.status(403).send('Not the manager');
    }

    res.status(200).send('');
    try {
      await slackUpdateView(viewId, buildLockedReviewModal(employee));
    } catch (err) {
      console.error('views.update (locked) failed:', err);
    }
  }

  // Manager clicks "Share with employee now" inside the Saved/Submitted modal.
  async function handleShareNow(payload: any, action: any, res: any) {
    if (!db) return res.status(503).send('');
    if (!process.env.SLACK_BOT_TOKEN) return res.status(503).send('Slack not configured');

    const employeeEmail = String(action.value || '').toLowerCase();
    const slackUserId = payload.user?.id;
    const viewId = payload.view?.id;
    if (!employeeEmail || !slackUserId || !viewId) return res.status(400).send('Bad payload');

    const callerEmail = await slackGetUserEmail(slackUserId);
    if (!callerEmail) return res.status(403).send('No email');

    const docRef = db.collection('employees').doc(employeeEmail);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).send('Employee not found');
    const employee = { id: docSnap.id, ...docSnap.data() } as any;

    if (employee.manager_email?.toLowerCase() !== callerEmail) {
      return res.status(403).send('Not the manager');
    }

    // Only Submitted reviews can be shared.
    if (employee.status !== 'Submitted') {
      res.status(200).send('');
      try {
        await slackUpdateView(viewId, buildSharedModal(employee));
      } catch (err) {
        console.error('views.update (already shared) failed:', err);
      }
      return;
    }

    const timestamp = new Date().toISOString();
    await docRef.update({
      status: 'Shared',
      'mid_year_checkin.shared_at': timestamp,
      'mid_year_checkin.shared_by': callerEmail,
    });

    await db.collection('employee_audit').add({
      employee_id: employeeEmail,
      actor_email: callerEmail,
      actor_name: payload.user?.username || null,
      event_type: 'shared',
      timestamp,
      notes: 'Shared via Slack',
    });

    // Fire the existing release DM (best-effort).
    try {
      const slackUser = await slackLookupByEmail(employeeEmail);
      if (slackUser) {
        const dm = buildReleaseDM({ ...employee, status: 'Shared' });
        await slackPostDM(slackUser.id, dm.text, dm.blocks);
      }
    } catch (err) {
      console.warn('Release DM failed (share itself succeeded):', err);
    }

    res.status(200).send('');
    try {
      await slackUpdateView(viewId, buildSharedModal(employee));
    } catch (err) {
      console.error('views.update (shared) failed:', err);
    }
  }

  async function handleViewSubmission(payload: any, res: any) {
    const cbId = payload.view?.callback_id;
    if (cbId === 'submit_draft_review') {
      return handleSubmitDraftReview(payload, res);
    }
    if (cbId !== 'acknowledge_feedback') {
      return res.status(200).send('');
    }
    if (!db) return res.status(503).send('');

    const employeeEmail = String(payload.view.private_metadata || '').toLowerCase();
    const slackUserId = payload.user?.id;
    if (!employeeEmail || !slackUserId) {
      return res.status(200).json({
        response_action: 'errors',
        errors: { _: 'Bad request' },
      });
    }

    const callerEmail = await slackGetUserEmail(slackUserId);
    if (!callerEmail || callerEmail !== employeeEmail) {
      return res.status(200).json({
        response_action: 'errors',
        errors: { _: 'You are not the owner of this feedback' },
      });
    }

    const docRef = db.collection('employees').doc(employeeEmail);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(200).json({
        response_action: 'errors',
        errors: { _: 'Feedback not found' },
      });
    }
    const employee = docSnap.data();
    if (employee.status !== 'Shared') {
      // Already acknowledged or not yet shared — just show success/close.
      return res.status(200).json({
        response_action: 'update',
        view: buildAckSuccessModal(),
      });
    }

    const acknowledgedAt = new Date().toISOString();
    await docRef.update({ status: 'Acknowledged', acknowledged_at: acknowledgedAt });

    await db.collection('employee_audit').add({
      employee_id: employeeEmail,
      actor_email: employeeEmail,
      actor_name: employee.employee_name,
      event_type: 'acknowledge',
      timestamp: acknowledgedAt,
      notes: 'Acknowledged via Slack',
    });

    return res.status(200).json({
      response_action: 'update',
      view: buildAckSuccessModal(),
    });
  }

  // Manager submits the draft form modal.
  async function handleSubmitDraftReview(payload: any, res: any) {
    if (!db) return res.status(503).send('');

    const employeeEmail = String(payload.view?.private_metadata || '').toLowerCase();
    const slackUserId = payload.user?.id;
    if (!employeeEmail || !slackUserId) {
      return res.status(200).json({
        response_action: 'errors',
        errors: { key_contributions_block: 'Missing context — close and try again' },
      });
    }

    const callerEmail = await slackGetUserEmail(slackUserId);
    if (!callerEmail) {
      return res.status(200).json({
        response_action: 'errors',
        errors: { key_contributions_block: 'Could not verify your Slack identity' },
      });
    }

    const docRef = db.collection('employees').doc(employeeEmail);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(200).json({
        response_action: 'errors',
        errors: { key_contributions_block: 'Employee not found in the system' },
      });
    }
    const employee = { id: docSnap.id, ...docSnap.data() } as any;

    if (employee.manager_email?.toLowerCase() !== callerEmail) {
      return res.status(200).json({
        response_action: 'errors',
        errors: { key_contributions_block: 'You are not this employee’s manager' },
      });
    }

    if (employee.status === 'Shared' || employee.status === 'Acknowledged') {
      return res.status(200).json({
        response_action: 'update',
        view: buildLockedReviewModal(employee),
      });
    }

    // Pull form values from the submitted view state.
    const values = payload.view?.state?.values || {};
    const keyContributions = String(
      values?.key_contributions_block?.key_contributions?.value || '',
    ).trim();
    const development = String(
      values?.development_evolution_block?.development_evolution?.value || '',
    ).trim();
    const leadershipMastery = String(
      values?.leadership_mastery_block?.leadership_mastery?.value || '',
    ).trim();
    const ratingValue = String(
      values?.rating_block?.rating?.selected_option?.value || '',
    );
    const promotionValue = String(
      values?.promotion_readiness_block?.promotion_readiness?.selected_option?.value || '',
    );
    const saveMode = String(
      values?.save_mode_block?.save_mode?.selected_option?.value || 'Draft',
    );

    const isFinal = saveMode === 'Submitted';

    // Validate when submitting (not when drafting). Mirrors the web form's
    // isFormValid: Wins + Growth + Leadership Mastery + Rating are required.
    if (isFinal) {
      const errors: Record<string, string> = {};
      if (!keyContributions) errors.key_contributions_block = 'Required to submit';
      if (!development) errors.development_evolution_block = 'Required to submit';
      if (!leadershipMastery) errors.leadership_mastery_block = 'Required to submit';
      if (!ratingValue) errors.rating_block = 'Pick a rating to submit';
      if (Object.keys(errors).length > 0) {
        return res.status(200).json({ response_action: 'errors', errors });
      }
    }

    if (ratingValue && !(RATING_OPTIONS as readonly string[]).includes(ratingValue)) {
      return res.status(200).json({
        response_action: 'errors',
        errors: { rating_block: 'Invalid rating value' },
      });
    }

    const ALLOWED_PROMOTION = ['ready_next_year_end', 'ready_next_mid_year', 'reassess_next_year'];
    if (promotionValue && !ALLOWED_PROMOTION.includes(promotionValue)) {
      return res.status(200).json({
        response_action: 'errors',
        errors: { promotion_readiness_block: 'Invalid promotion readiness value' },
      });
    }

    const timestamp = new Date().toISOString();
    const existing = (employee.mid_year_checkin || {}) as any;

    // Mirror the saveFeedback logic in usePerformanceActions.ts:
    //  - public doc stores text + status
    //  - subcollection holds the trending rating (manager-private)
    const publicUpdate: any = {
      mid_year_checkin: {
        ...existing,
        key_contributions: keyContributions,
        development_evolution: development,
        leadership_mastery: leadershipMastery,
        submitted_at: isFinal
          ? timestamp
          : existing.submitted_at || null,
      },
      status: saveMode,
      updated_at: timestamp,
    };
    await docRef.update(publicUpdate);

    const privateRef = docRef.collection('manager_private').doc('current');
    await privateRef.set(
      {
        performance_trending_rating: ratingValue || '',
        promotion_readiness: promotionValue || null,
        additional_notes: '',
        updated_at: timestamp,
        manager_email: callerEmail,
        hrbp_email: (employee.hrbp_email || '').toLowerCase(),
      },
      { merge: true },
    );

    if (isFinal) {
      await db.collection('employee_audit').add({
        employee_id: employeeEmail,
        actor_email: callerEmail,
        actor_name: payload.user?.username || null,
        event_type: 'submit',
        timestamp,
        notes: 'Submitted via Slack',
      });
    }

    return res.status(200).json({
      response_action: 'update',
      view: buildDraftSavedModal(
        { ...employee, status: saveMode } as any,
        isFinal ? 'Submitted' : 'Draft',
      ),
    });
  }

  // --- Slack slash command: /midyear ---
  // Opens a modal listing the manager's direct reports with "Draft" buttons.
  app.post(
    '/api/slack/commands',
    express.raw({ type: '*/*', limit: '1mb' }),
    async (req, res) => {
      const rawBody = (req.body as Buffer)?.toString('utf8') || '';
      const timestamp = req.header('x-slack-request-timestamp') || undefined;
      const signature = req.header('x-slack-signature') || undefined;

      if (!verifySlackSignature(rawBody, timestamp, signature)) {
        return res.status(401).send('Invalid signature');
      }

      const params = new URLSearchParams(rawBody);
      const command = params.get('command');
      const userId = params.get('user_id');
      const triggerId = params.get('trigger_id');

      if (command !== '/midyear') return res.status(200).send('');
      if (!userId || !triggerId) return res.status(400).send('Bad payload');

      // Ack the slash command HTTP request immediately.
      res.status(200).send('');

      // CRITICAL: trigger_id expires after 3 seconds. We MUST call views.open
      // before that — even with a placeholder. The real work (users.info,
      // Firestore query) is too slow on a Cloud Run cold start. Pattern:
      //   1. views.open(loading) — uses trigger_id, must be fast
      //   2. do slow work
      //   3. views.update(real content) — uses the view_id, no time limit
      let viewId: string;
      try {
        const openResult = await slackOpenView(
          triggerId,
          buildLoadingModal('Mid-year check-ins', 'Loading your team...'),
        );
        viewId = (openResult as any)?.view?.id;
        if (!viewId) throw new Error('views.open returned no view id');
      } catch (err) {
        console.error('/midyear loading modal failed:', err);
        reportOpsAlert('/midyear could not open the loading modal (manager saw nothing — likely cold start or Slack token)', err);
        return;
      }

      try {
        const managerEmail = await slackGetUserEmail(userId);
        if (!managerEmail || !managerEmail.endsWith('@freshworks.com')) {
          await slackUpdateView(
            viewId,
            buildErrorModal('Not allowed', 'Only @freshworks.com users can use this command.'),
          );
          return;
        }
        if (!db) {
          await slackUpdateView(
            viewId,
            buildErrorModal('Service unavailable', 'Database is not available right now.'),
          );
          return;
        }

        const snap = await db
          .collection('employees')
          .where('manager_email', '==', managerEmail)
          .get();

        const reports = snap.docs.map((d: any) => ({
          id: d.id,
          ...d.data(),
        }));

        await slackUpdateView(viewId, buildPendingReportsModal(reports as any));
      } catch (err) {
        console.error('/midyear command failed:', err);
        reportOpsAlert('/midyear failed while loading a team list', err);
        try {
          await slackUpdateView(
            viewId,
            buildErrorModal('Something went wrong', 'Please try `/midyear` again.'),
          );
        } catch {}
      }
    },
  );

  // --- Vite Middleware ---

  // Handle 404s for API routes specifically
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

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
