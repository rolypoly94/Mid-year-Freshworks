import type { Employee, MidYearCheckin } from '../types';

// DM the employee receives when their manager releases the check-in.
// Single button — "Open feedback" — opens the modal via views.open.
export function buildReleaseDM(employee: Employee) {
  const firstName = employee.first_name || employee.employee_name.split(' ')[0] || 'there';
  const managerName = employee.manager_name || 'your manager';

  return {
    text: `Your mid-year check-in from ${managerName} is ready.`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Hi ${firstName} 👋\n\n*${managerName}* has shared your mid-year check-in. Take a moment to read it and acknowledge.`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Open feedback' },
            style: 'primary',
            action_id: 'open_feedback',
            value: employee.employee_email.toLowerCase(),
          },
        ],
      },
    ],
  };
}

// Read-only modal showing the released feedback. If the employee has not
// yet acknowledged, the modal includes a submit button ("Acknowledge") that
// fires a view_submission handled in /api/slack/interact. If already
// acknowledged, the modal is purely informational with only a Close button.
export function buildFeedbackModal(employee: Employee) {
  const c: MidYearCheckin | undefined = employee.mid_year_checkin;
  const managerName = employee.manager_name || 'your manager';
  const isAcknowledged = !!employee.acknowledged_at;

  const section = (label: string, body: string | undefined) => ({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*${label}*\n${body && body.trim() ? body : '_No content_'}`,
    },
  });

  const blocks: any[] = [
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `From *${managerName}* · Mid-year check-in` },
      ],
    },
    { type: 'divider' },
    section('Key contributions', c?.key_contributions),
    section('Development & growth', c?.development_evolution),
  ];

  if (c?.leadership_mastery && c.leadership_mastery.trim()) {
    blocks.push(section('Leadership mastery', c.leadership_mastery));
  }
  if (c?.additional_notes && c.additional_notes.trim()) {
    blocks.push(section('Additional notes', c.additional_notes));
  }

  blocks.push({ type: 'divider' });

  if (isAcknowledged) {
    const when = employee.acknowledged_at
      ? new Date(employee.acknowledged_at).toLocaleString()
      : '';
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `✅ *Already acknowledged*${when ? ` on ${when}` : ''}.`,
        },
      ],
    });
  } else {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: 'Clicking *Acknowledge* records that you have read this feedback.',
        },
      ],
    });
  }

  const modal: any = {
    type: 'modal',
    private_metadata: employee.employee_email.toLowerCase(),
    title: { type: 'plain_text', text: 'Mid-year check-in' },
    close: { type: 'plain_text', text: 'Close' },
    blocks,
  };

  // Only attach the submit handler when an acknowledgement is still pending.
  if (!isAcknowledged) {
    modal.callback_id = 'acknowledge_feedback';
    modal.submit = { type: 'plain_text', text: 'Acknowledge' };
  }

  return modal;
}

// Replacement modal shown after Acknowledge succeeds.
export function buildAckSuccessModal() {
  return {
    type: 'modal',
    title: { type: 'plain_text', text: 'Acknowledged' },
    close: { type: 'plain_text', text: 'Done' },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '✅ Thanks — your acknowledgement has been recorded.',
        },
      },
    ],
  };
}
