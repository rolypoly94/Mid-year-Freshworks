import crypto from 'crypto';

const SLACK_API = 'https://slack.com/api';

export interface SlackUser {
  id: string;
  email: string;
  real_name?: string;
}

const token = () => {
  const t = process.env.SLACK_BOT_TOKEN;
  if (!t) throw new Error('SLACK_BOT_TOKEN is not set');
  return t;
};

async function slackPost<T = any>(method: string, body: any): Promise<T> {
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token()}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json() as any;
  if (!json.ok) {
    throw new Error(`Slack ${method} failed: ${json.error || 'unknown'}`);
  }
  return json as T;
}

async function slackGet<T = any>(method: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${SLACK_API}/${method}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token()}` },
  });
  const json = await res.json() as any;
  if (!json.ok) {
    throw new Error(`Slack ${method} failed: ${json.error || 'unknown'}`);
  }
  return json as T;
}

export async function lookupByEmail(email: string): Promise<SlackUser | null> {
  try {
    const res = await slackGet<{ user: any }>('users.lookupByEmail', { email });
    return {
      id: res.user.id,
      email: res.user.profile?.email || email,
      real_name: res.user.real_name,
    };
  } catch (err: any) {
    if (String(err.message).includes('users_not_found')) return null;
    throw err;
  }
}

export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const res = await slackGet<{ user: any }>('users.info', { user: userId });
    return res.user?.profile?.email?.toLowerCase() || null;
  } catch (err: any) {
    if (String(err.message).includes('users_not_found')) return null;
    throw err;
  }
}

export async function postDirectMessage(channel: string, text: string, blocks: any[]) {
  return slackPost('chat.postMessage', { channel, text, blocks });
}

export async function openView(triggerId: string, view: any) {
  return slackPost('views.open', { trigger_id: triggerId, view });
}

export async function updateView(viewId: string, view: any) {
  return slackPost('views.update', { view_id: viewId, view });
}

export async function pushView(triggerId: string, view: any) {
  return slackPost('views.push', { trigger_id: triggerId, view });
}

// HMAC verification per https://api.slack.com/authentication/verifying-requests-from-slack
// Caller must pass the *raw* request body (string) — Express's JSON parser strips it.
export function verifySlackSignature(
  rawBody: string,
  timestamp: string | undefined,
  signature: string | undefined,
): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret || !timestamp || !signature) return false;

  // Reject replays older than 5 minutes
  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum)) return false;
  if (Math.abs(Date.now() / 1000 - tsNum) > 60 * 5) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${crypto.createHmac('sha256', secret).update(base).digest('hex')}`;

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// "Smoke alarm" — posts a one-line alert to a Slack Incoming Webhook so
// operators see failures live instead of digging through server logs.
// No-ops if SLACK_ALERT_WEBHOOK_URL isn't set, and never throws — the alarm
// must never be able to break the thing it's monitoring.
export async function reportOpsAlert(title: string, detail: unknown): Promise<void> {
  const url = process.env.SLACK_ALERT_WEBHOOK_URL;
  if (!url) return;
  try {
    const detailStr = detail instanceof Error ? detail.message : String(detail);
    const env = process.env.NODE_ENV || 'unknown';
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `:rotating_light: *Fresh Impact* — ${title}\n\`\`\`${detailStr.slice(0, 800)}\`\`\`\n_${new Date().toISOString()} · env: ${env}_`,
      }),
    });
  } catch {
    // The alarm must never break the app.
  }
}
