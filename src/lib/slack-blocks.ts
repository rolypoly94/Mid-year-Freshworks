import type { Employee, MidYearCheckin, ManagerPrivateData } from '../types';

export const RATING_OPTIONS = [
  'Exceptional Results',
  'Exceeds Results',
  'Delivers Full Results',
  'Delivers Some Results',
  'Does Not Deliver Results',
] as const;

// DM the employee receives when their manager releases the check-in.
// Single button — "Open feedback" — opens the modal via views.open.
export function buildReleaseDM(employee: Employee) {
  const firstName = employee.first_name || (employee.employee_name || '').split(' ')[0] || 'there';
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

// ─── Manager-side: list of direct reports the manager can draft a check-in for. ───
// Each row has a "Draft" or "View" button depending on the current status.
export function buildPendingReportsModal(reports: Employee[]) {
  const blocks: any[] = [];

  if (reports.length === 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          "You don't have any direct reports in the portal yet. " +
          'If that looks wrong, contact HR — your team list comes from the import.',
      },
    });
  } else {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Your direct reports* (${reports.length})\nPick someone to draft or update their mid-year check-in.`,
      },
    });
    blocks.push({ type: 'divider' });

    reports.forEach((emp) => {
      const status = emp.status || 'Pending';
      const badge =
        status === 'Acknowledged'
          ? ':white_check_mark: Acknowledged'
          : status === 'Shared'
            ? ':eyes: Shared with employee'
            : status === 'Submitted'
              ? ':pencil2: Submitted (not yet shared)'
              : status === 'Draft'
                ? ':memo: Draft'
                : ':hourglass_flowing_sand: Pending';

      const locked = status === 'Shared' || status === 'Acknowledged';
      const buttonText = locked ? 'View' : (status === 'Draft' || status === 'Submitted' ? 'Continue' : 'Draft');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${emp.employee_name}*${emp.job_title ? ` · ${emp.job_title}` : ''}\n${badge}`,
        },
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: buttonText },
          action_id: locked ? 'view_locked_review' : 'start_draft',
          value: emp.employee_email.toLowerCase(),
        },
      });
    });
  }

  return {
    type: 'modal',
    callback_id: 'pending_reports',
    title: { type: 'plain_text', text: 'Mid-year check-ins' },
    close: { type: 'plain_text', text: 'Close' },
    blocks,
  };
}

// ─── Manager-side: draft / submit form for one employee. ───
// Inputs are marked optional so the form can be saved as a partial draft.
// Server-side validation enforces non-empty Wins + Growth when submitting.
export function buildDraftReviewModal(
  employee: Employee,
  publicData?: MidYearCheckin,
  privateData?: ManagerPrivateData | null,
) {
  const c = publicData || employee.mid_year_checkin;
  const initialRating =
    privateData?.performance_trending_rating ||
    c?.performance_trending_rating ||
    '';

  const ratingOption = (r: string) => ({
    text: { type: 'plain_text', text: r },
    value: r,
  });

  const ratingBlock: any = {
    type: 'input',
    block_id: 'rating_block',
    optional: true,
    label: { type: 'plain_text', text: 'Performance trending rating' },
    element: {
      type: 'static_select',
      action_id: 'rating',
      placeholder: { type: 'plain_text', text: 'Select a rating' },
      options: RATING_OPTIONS.map(ratingOption),
    },
  };
  if (initialRating && RATING_OPTIONS.includes(initialRating as any)) {
    ratingBlock.element.initial_option = ratingOption(initialRating);
  }

  const contextLine = [
    employee.job_title,
    employee.grade,
    employee.work_location,
  ]
    .filter(Boolean)
    .join(' · ');

  const blocks: any[] = [
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*${employee.employee_name}*${contextLine ? `  ·  ${contextLine}` : ''}`,
        },
      ],
    },
    { type: 'divider' },
    {
      type: 'input',
      block_id: 'key_contributions_block',
      optional: true,
      label: { type: 'plain_text', text: 'Key contributions' },
      hint: { type: 'plain_text', text: 'What is going well? Be specific.' },
      element: {
        type: 'plain_text_input',
        action_id: 'key_contributions',
        multiline: true,
        max_length: 2900,
        initial_value: c?.key_contributions || '',
      },
    },
    {
      type: 'input',
      block_id: 'development_evolution_block',
      optional: true,
      label: { type: 'plain_text', text: 'Development & growth' },
      hint: { type: 'plain_text', text: 'Where should they focus to grow?' },
      element: {
        type: 'plain_text_input',
        action_id: 'development_evolution',
        multiline: true,
        max_length: 2900,
        initial_value: c?.development_evolution || '',
      },
    },
    ratingBlock,
    {
      type: 'input',
      block_id: 'save_mode_block',
      label: { type: 'plain_text', text: 'Save as' },
      element: {
        type: 'radio_buttons',
        action_id: 'save_mode',
        initial_option: {
          text: { type: 'plain_text', text: 'Draft — keep working on it later' },
          value: 'Draft',
        },
        options: [
          {
            text: { type: 'plain_text', text: 'Draft — keep working on it later' },
            value: 'Draft',
          },
          {
            text: { type: 'plain_text', text: 'Submit — ready to share with employee' },
            value: 'Submitted',
          },
        ],
      },
    },
  ];

  return {
    type: 'modal',
    callback_id: 'submit_draft_review',
    private_metadata: employee.employee_email.toLowerCase(),
    title: { type: 'plain_text', text: 'Draft check-in' },
    submit: { type: 'plain_text', text: 'Save' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks,
  };
}

// ─── Manager-side: shown after Save succeeds. ───
// If submitted (not just drafted), offers a one-click "Share with employee".
export function buildDraftSavedModal(
  employee: Employee,
  status: 'Draft' | 'Submitted',
) {
  const blocks: any[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          status === 'Draft'
            ? `✅ Draft saved for *${employee.employee_name}*. You can return any time to keep editing.`
            : `✅ Submitted for *${employee.employee_name}*.\n_It is not yet visible to the employee — click below when you're ready to share._`,
      },
    },
  ];

  if (status === 'Submitted') {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Share with employee now' },
          style: 'primary',
          action_id: 'share_now',
          value: employee.employee_email.toLowerCase(),
        },
      ],
    });
  }

  return {
    type: 'modal',
    title: {
      type: 'plain_text',
      text: status === 'Draft' ? 'Draft saved' : 'Submitted',
    },
    close: { type: 'plain_text', text: 'Close' },
    blocks,
  };
}

// ─── Manager-side: read-only view of an already-shared/acknowledged review. ───
export function buildLockedReviewModal(employee: Employee) {
  const c = employee.mid_year_checkin;
  const blocks: any[] = [
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*${employee.employee_name}* — locked (${employee.status})`,
        },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Key contributions*\n${c?.key_contributions || '_empty_'}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Development & growth*\n${c?.development_evolution || '_empty_'}`,
      },
    },
    { type: 'divider' },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: 'Once shared, edits must happen in the web portal.',
        },
      ],
    },
  ];

  return {
    type: 'modal',
    title: { type: 'plain_text', text: 'Already shared' },
    close: { type: 'plain_text', text: 'Close' },
    blocks,
  };
}

// ─── Manager-side: shown after "Share now" succeeds. ───
export function buildSharedModal(employee: Employee) {
  return {
    type: 'modal',
    title: { type: 'plain_text', text: 'Shared' },
    close: { type: 'plain_text', text: 'Done' },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ Shared with *${employee.employee_name}*. They will get a Slack DM to acknowledge.`,
        },
      },
    ],
  };
}

// Placeholder modal opened immediately on slash command, while the server
// fetches data in the background. Replaced via views.update once ready.
// Critical: must be open()'d within 3s of trigger_id issuance.
export function buildLoadingModal(title: string, message: string) {
  return {
    type: 'modal',
    title: { type: 'plain_text', text: title },
    close: { type: 'plain_text', text: 'Close' },
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `:hourglass_flowing_sand: ${message}` },
      },
    ],
  };
}

export function buildErrorModal(title: string, message: string) {
  return {
    type: 'modal',
    title: { type: 'plain_text', text: title },
    close: { type: 'plain_text', text: 'Close' },
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `:warning: ${message}` },
      },
    ],
  };
}
