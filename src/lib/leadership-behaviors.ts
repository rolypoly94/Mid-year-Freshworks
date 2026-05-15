// Leadership behaviors shown in the expandable reference panel below the
// "Leadership Mastery" question on the mid-year form.
//
// One entry per level_key in GREAT_QUESTIONS. Each entry has five behaviors —
// one per GREAT pillar (Growth Mindset, Vision & Strategy, Champion the
// Customer, Invest in People, Execute with Excellence) — written as
// observable, level-appropriate descriptions of what "great" looks like.

import { GreatPillar } from '../types';

export interface LeadershipBehavior {
  pillar: GreatPillar;
  description: string;
}

export const LEADERSHIP_BEHAVIORS: Record<string, LeadershipBehavior[]> = {
  // ============================================================
  // Individual Contributor — Levels 1-3 (Early career ICs)
  // ============================================================
  ic_1_3: [
    {
      pillar: 'Growth Mindset',
      description: 'Seeks feedback actively, treats mistakes as learning, and takes initiative to develop new skills relevant to their role.',
    },
    {
      pillar: 'Vision & Strategy',
      description: 'Understands how their work supports the team\'s goals and asks clarifying questions when priorities are unclear.',
    },
    {
      pillar: 'Champion the Customer',
      description: 'Considers the end user in day-to-day decisions and flags issues that could affect customer experience, internal or external.',
    },
    {
      pillar: 'Invest in People',
      description: 'Collaborates well, shares knowledge with peers, and responds constructively to feedback from teammates.',
    },
    {
      pillar: 'Execute with Excellence',
      description: 'Delivers work on time and to standard, communicates blockers early, and takes ownership of quality on assigned tasks.',
    },
  ],

  // ============================================================
  // Individual Contributor — Levels 4-5 (Senior ICs)
  // ============================================================
  ic_4_5: [
    {
      pillar: 'Growth Mindset',
      description: 'Challenges established approaches with evidence, advocates for better tools or methods, and takes calculated risks to drive improvement.',
    },
    {
      pillar: 'Vision & Strategy',
      description: 'Connects their work to broader company goals and helps peers and stakeholders understand the "why" behind decisions.',
    },
    {
      pillar: 'Champion the Customer',
      description: 'Proactively seeks customer insight, translates it into product or process improvements, and measures the impact.',
    },
    {
      pillar: 'Invest in People',
      description: 'Mentors junior peers, models high-performance behavior, and contributes to team culture beyond their immediate scope.',
    },
    {
      pillar: 'Execute with Excellence',
      description: 'Owns complex initiatives end-to-end with minimal oversight, manages scope and dependencies, and delivers consistently.',
    },
  ],

  // ============================================================
  // Manager (PM4 / M4)
  // ============================================================
  manager: [
    {
      pillar: 'Growth Mindset',
      description: 'Builds a team culture where calculated risks and learning from setbacks are encouraged. Models openness to feedback themselves.',
    },
    {
      pillar: 'Vision & Strategy',
      description: 'Translates functional priorities into clear team goals. Communicates the connection between daily work and broader strategy.',
    },
    {
      pillar: 'Champion the Customer',
      description: 'Integrates customer feedback into team priorities and decisions. Keeps the customer\'s voice present in team discussions.',
    },
    {
      pillar: 'Invest in People',
      description: 'Coaches direct reports through regular 1:1s, structured feedback, and stretch assignments. Tracks development progress over time.',
    },
    {
      pillar: 'Execute with Excellence',
      description: 'Anticipates risks, communicates progress and blockers proactively, and ensures team commitments are met without surprises.',
    },
  ],

  // ============================================================
  // Senior Manager (PM5 / M5)
  // ============================================================
  senior_manager: [
    {
      pillar: 'Growth Mindset',
      description: 'Fosters experimentation across the team, normalises challenging assumptions, and builds psychological safety for honest discussion.',
    },
    {
      pillar: 'Vision & Strategy',
      description: 'Makes strategic trade-offs that prioritise long-term impact over short-term wins. Explains the reasoning clearly to the team.',
    },
    {
      pillar: 'Champion the Customer',
      description: 'Uses customer data and feedback to drive shifts in team direction. Establishes mechanisms for ongoing customer insight.',
    },
    {
      pillar: 'Invest in People',
      description: 'Develops emerging leaders within the team. Identifies high-potential individuals and creates concrete opportunities for them.',
    },
    {
      pillar: 'Execute with Excellence',
      description: 'Drives alignment between team goals and broader departmental priorities. Navigates trade-offs without dropping commitments.',
    },
  ],

  // ============================================================
  // Director — People Manager (PM6 / M6)
  // ============================================================
  director_pm: [
    {
      pillar: 'Growth Mindset',
      description: 'Creates organisational space for experimentation and dissent. Models learning from failure publicly and rewards thoughtful risk-taking.',
    },
    {
      pillar: 'Vision & Strategy',
      description: 'Translates function-level strategy into a clear roadmap for the org. Prioritises and de-prioritises decisively based on what matters most.',
    },
    {
      pillar: 'Champion the Customer',
      description: 'Defines and tracks customer-experience metrics for the org. Drives improvements that span multiple teams.',
    },
    {
      pillar: 'Invest in People',
      description: 'Sponsors emerging leaders with concrete stretch opportunities. Builds bench strength so the org isn\'t dependent on any single person.',
    },
    {
      pillar: 'Execute with Excellence',
      description: 'Resolves systemic issues that span beyond their team. Drives cross-functional execution with rigor and proactive communication.',
    },
  ],

  // ============================================================
  // Director — Senior IC (IC6 / G6)
  // ============================================================
  director_ic: [
    {
      pillar: 'Growth Mindset',
      description: 'Models a growth mindset at scale — challenges org-level assumptions with evidence, adapts to ambiguity, and learns publicly from setbacks.',
    },
    {
      pillar: 'Vision & Strategy',
      description: 'Shapes technical or functional direction by identifying trends, framing problems, and influencing cross-functional decisions.',
    },
    {
      pillar: 'Champion the Customer',
      description: 'Uses customer insight or data to drive significant decisions. Connects customer impact to technical or strategic choices.',
    },
    {
      pillar: 'Invest in People',
      description: 'Mentors junior peers and junior leaders, elevates team performance through influence, and amplifies others\' work without positional authority.',
    },
    {
      pillar: 'Execute with Excellence',
      description: 'Owns high-impact initiatives that cross team boundaries. Drives alignment and delivery without relying on hierarchical authority.',
    },
  ],

  // ============================================================
  // Senior Director — People Manager (PM7 / M7)
  // ============================================================
  senior_director_pm: [
    {
      pillar: 'Growth Mindset',
      description: 'Embeds growth-mindset practices into organisational structure — through rituals, culture, or systems. Shifts how the org learns.',
    },
    {
      pillar: 'Vision & Strategy',
      description: 'Shapes strategy for the function rather than just executing it. Influences leadership and peers with well-reasoned proposals.',
    },
    {
      pillar: 'Champion the Customer',
      description: 'Drives cross-functional customer-experience initiatives. Holds the org accountable to measurable customer outcomes.',
    },
    {
      pillar: 'Invest in People',
      description: 'Builds bench strength across multiple teams. Sponsors stretch opportunities and develops successors at the director level.',
    },
    {
      pillar: 'Execute with Excellence',
      description: 'Leads large cross-functional initiatives. Manages competing priorities and ensures delivery across teams they don\'t directly own.',
    },
  ],

  // ============================================================
  // Senior Director — Senior IC (IC7 / G7)
  // ============================================================
  senior_director_ic: [
    {
      pillar: 'Growth Mindset',
      description: 'Champions a culture of learning across the function. Models intellectual honesty and welcomes challenges to their own thinking.',
    },
    {
      pillar: 'Vision & Strategy',
      description: 'Sets technical or functional vision that influences multiple teams. Builds the case for direction through written artefacts and forums.',
    },
    {
      pillar: 'Champion the Customer',
      description: 'Drives customer-centric improvements at the function level. Connects technical or strategic work to measurable customer outcomes.',
    },
    {
      pillar: 'Invest in People',
      description: 'Mentors senior peers and emerging leaders. Builds technical or functional craft across the org through teaching and review.',
    },
    {
      pillar: 'Execute with Excellence',
      description: 'Leads function-spanning initiatives. Earns alignment through influence, clear writing, and demonstrated impact.',
    },
  ],

  // ============================================================
  // Vice President — People Manager (PM8 / M8)
  // ============================================================
  vp_pm: [
    {
      pillar: 'Growth Mindset',
      description: 'Sets the tone for organisational learning and adaptability. Drives transformation initiatives and models comfort with ambiguity.',
    },
    {
      pillar: 'Vision & Strategy',
      description: 'Defines the multi-year strategy for the function. Aligns organisational structure, investment, and priorities to that strategy.',
    },
    {
      pillar: 'Champion the Customer',
      description: 'Holds the org accountable to top-level customer outcomes. Drives customer-experience priorities at the executive level.',
    },
    {
      pillar: 'Invest in People',
      description: 'Builds the leadership bench for the function. Develops directors and senior directors as future executives.',
    },
    {
      pillar: 'Execute with Excellence',
      description: 'Drives execution of function-wide commitments. Manages cross-functional dependencies at the executive level and removes systemic blockers.',
    },
  ],

  // ============================================================
  // Vice President — Distinguished IC (IC8 / G8)
  // ============================================================
  vp_ic: [
    {
      pillar: 'Growth Mindset',
      description: 'Sets the standard for intellectual leadership in the discipline. Drives the function\'s adoption of new approaches, frameworks, or technologies.',
    },
    {
      pillar: 'Vision & Strategy',
      description: 'Defines technical or functional direction at the company level. Influences executive decisions through writing, presentations, and one-on-one influence.',
    },
    {
      pillar: 'Champion the Customer',
      description: 'Connects deep technical or functional choices to top-line customer outcomes. Holds the discipline accountable to those outcomes.',
    },
    {
      pillar: 'Invest in People',
      description: 'Develops the next generation of distinguished ICs and senior leaders. Shapes the discipline\'s craft across the company.',
    },
    {
      pillar: 'Execute with Excellence',
      description: 'Leads company-spanning technical or functional initiatives. Earns alignment with executives, peers, and engineers through demonstrated impact.',
    },
  ],

  // ============================================================
  // Senior Vice President (PM9 / M9 / 9)
  // ============================================================
  svp: [
    {
      pillar: 'Growth Mindset',
      description: 'Drives organisational transformation. Models comfort with ambiguity and sets the tone for adaptability across multiple functions.',
    },
    {
      pillar: 'Vision & Strategy',
      description: 'Defines multi-year strategy spanning multiple functions. Aligns the broader company on direction, investment, and trade-offs.',
    },
    {
      pillar: 'Champion the Customer',
      description: 'Sets customer-experience priorities at the company level. Holds executive peers accountable to outcomes that matter to customers.',
    },
    {
      pillar: 'Invest in People',
      description: 'Develops VPs and the leadership pipeline across multiple functions. Shapes the executive team\'s composition and effectiveness.',
    },
    {
      pillar: 'Execute with Excellence',
      description: 'Drives execution of company-level commitments. Resolves cross-functional priorities at the executive level and removes systemic constraints.',
    },
  ],
};

// Convenience helper — same lookup pattern as GREAT_QUESTIONS uses.
export function getLeadershipBehaviors(levelKey: string | null): LeadershipBehavior[] | null {
  if (!levelKey) return null;
  return LEADERSHIP_BEHAVIORS[levelKey] ?? null;
}
