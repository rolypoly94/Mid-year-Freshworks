import { GreatQuestionSet, GreatPillar } from '../types';

export const GREAT_QUESTIONS: Record<string, GreatQuestionSet> = {
  ic_1_3: {
    level_key: 'ic_1_3',
    level_label: 'Individual Contributor (Levels 1-3)',
    questions: [
      { pillar: 'Growth Mindset', text: 'Describe a time this person sought feedback, challenged an assumption, or tried a new approach this cycle. What happened and what did they learn?' },
      { pillar: 'Vision & Strategy', text: 'Give an example of this person connecting their daily tasks to the team\'s or function\'s broader goals. How did they show they understood the bigger picture?' },
      { pillar: 'Champion the Customer', text: 'Describe a time this person showed awareness of the customer — internal or external — in how they approached their work. What did they do differently because of it?' },
      { pillar: 'Invest in People', text: 'Give an example of this person contributing to a teammate\'s work — offering help, listening actively, or responding constructively to feedback. What happened?' },
      { pillar: 'Execute with Excellence', text: 'Describe how this person handled a deliverable or deadline this cycle. Did they meet commitments, and how did they manage time, quality, or obstacles?' }
    ]
  },
  ic_4_5: {
    level_key: 'ic_4_5',
    level_label: 'Individual Contributor (Levels 4-5)',
    questions: [
      { pillar: 'Growth Mindset', text: 'Describe a time this person challenged a team assumption, advocated for a new tool or approach, or took a calculated risk this cycle. What was the outcome?' },
      { pillar: 'Vision & Strategy', text: 'Give an example of this person connecting their work to broader company goals this cycle. How did they help peers or stakeholders see that connection?' },
      { pillar: 'Champion the Customer', text: 'Describe a time this person proactively sought customer feedback or insight and used it to improve a product, service, or process. What changed as a result?' },
      { pillar: 'Invest in People', text: 'Give an example of this person mentoring a peer, modeling high-performance behavior, or resolving a team-dynamic issue this cycle. What impact did it have?' },
      { pillar: 'Execute with Excellence', text: 'Describe a complex task or initiative this person owned end-to-end this cycle. How did they manage scope, deadlines, and quality with minimal oversight?' }
    ]
  },
  manager: {
    level_key: 'manager',
    level_label: 'Manager',
    questions: [
      { pillar: 'Growth Mindset', text: 'Describe a time this manager encouraged their team to try a new approach, experiment, or learn from a setback. What happened?' },
      { pillar: 'Vision & Strategy', text: 'Describe how this manager connected their team\'s work to broader functional or company goals this cycle. Give a specific example of what they communicated and how the team responded.' },
      { pillar: 'Champion the Customer', text: 'Give an example of this manager integrating customer feedback — internal or external — into their team\'s priorities or decisions this cycle.' },
      { pillar: 'Invest in People', text: 'Name one direct report this manager has developed this cycle. What specifically did they do — coaching, feedback, stretch assignment — and what changed for the team member?' },
      { pillar: 'Execute with Excellence', text: 'Describe a time this manager anticipated a risk and escalated it early, or missed one that caused an issue. What happened, and what did they do next?' }
    ]
  },
  senior_manager: {
    level_key: 'senior_manager',
    level_label: 'Senior Manager',
    questions: [
      { pillar: 'Growth Mindset', text: 'Give an example of this senior manager fostering a culture of openness and experimentation on their team this cycle. What specific practice or behavior did they model?' },
      { pillar: 'Vision & Strategy', text: 'Describe a time this senior manager made a strategic decision that required trading off short-term work for longer-term impact. How did they explain it to their team?' },
      { pillar: 'Champion the Customer', text: 'Describe how this senior manager used customer data or feedback to drive a change in their team\'s direction or priorities this cycle. What was the impact?' },
      { pillar: 'Invest in People', text: 'Describe how this senior manager has built their team\'s capacity this cycle. Who did they develop as an emerging leader, and what opportunities did they create?' },
      { pillar: 'Execute with Excellence', text: 'Give an example of this senior manager driving alignment between their team\'s goals and broader departmental priorities. What did they do when a trade-off came up?' }
    ]
  },
  director_pm: {
    level_key: 'director_pm',
    level_label: 'Director (People Manager)',
    questions: [
      { pillar: 'Growth Mindset', text: 'Describe a time this director created space for their organization to experiment, challenge the status quo, or learn from failure this cycle. What was the practice, and what was the outcome?' },
      { pillar: 'Vision & Strategy', text: 'Describe how this director translated the function\'s strategy into a clear roadmap for their team this cycle. Give a specific example of how they prioritized or de-prioritized work to focus on what matters.' },
      { pillar: 'Champion the Customer', text: 'Give an example of this director defining or tracking a customer experience metric for their org, and using it to drive an improvement. What changed as a result?' },
      { pillar: 'Invest in People', text: 'Name an emerging leader this director has sponsored or developed this cycle. What specific opportunity did they create, and what has been the outcome?' },
      { pillar: 'Execute with Excellence', text: 'Describe a time this director worked cross-functionally to resolve a systemic issue — one that went beyond their own team. What did they do and what changed?' }
    ]
  },
  director_ic: {
    level_key: 'director_ic',
    level_label: 'Director (Senior Individual Contributor)',
    questions: [
      { pillar: 'Growth Mindset', text: 'Describe how this senior IC has modeled a growth mindset this cycle — challenging assumptions, adapting to change, or learning from a setback at scale. Give a specific example.' },
      { pillar: 'Vision & Strategy', text: 'Describe a strategic contribution this senior IC made this cycle — identifying a trend, shaping direction, or influencing a cross-functional decision. What happened as a result?' },
      { pillar: 'Champion the Customer', text: 'Describe how this senior IC used customer insight or data to drive a decision or improvement this cycle. What was the impact?' },
      { pillar: 'Invest in People', text: 'Give an example of this senior IC mentoring peers, modeling leadership behavior, or elevating team performance without positional authority this cycle.' },
      { pillar: 'Execute with Excellence', text: 'Give an example of this senior IC owning a high-impact initiative this cycle. How did they navigate cross-functional dependencies and drive alignment without positional authority?' }
    ]
  },
  senior_director_pm: {
    level_key: 'senior_director_pm',
    level_label: 'Senior Director (People Manager)',
    questions: [
      { pillar: 'Growth Mindset', text: 'Give an example of this senior director embedding growth-mindset practices into their organization this cycle — through storytelling, culture-building, or structural change. What did they do, and what shifted?' },
      { pillar: 'Vision & Strategy', text: 'Describe a time this senior director shaped strategy for their function this cycle — not just executed it. What did they propose, and how did they influence leadership or peers?' },
      { pillar: 'Champion the Customer', text: 'Describe how this senior director drove cross-functional customer-experience improvements this cycle. What was the initiative, and what was the measurable impact?' },
      { pillar: 'Invest in People', text: 'Describe how this senior director is building bench strength across multiple teams. Name specific individuals they have sponsored for stretch opportunities and what has changed.' },
      { pillar: 'Execute with Excellence', text: 'Give an example of this senior director leading a large cross-functional initiative this cycle. How did they manage competing priorities and ensure delivery across teams they don\'t directly own?' }
    ]
  },
  senior_director_ic: {
    level_key: 'senior_director_ic',
    level_label: 'Senior Director (Senior Individual Contributor)',
    questions: [
      { pillar: 'Growth Mindset', text: 'Give an example of this senior IC shaping a culture of learning or innovation this cycle — through thought leadership, modeling behaviors, or influencing how others approach problems.' },
      { pillar: 'Vision & Strategy', text: 'Describe how this senior IC influenced strategic direction at the function or company level this cycle. Give a specific example where their input changed a decision or priority.' },
      { pillar: 'Champion the Customer', text: 'Give an example of this senior IC synthesizing customer insights into enterprise-level recommendations this cycle. What happened as a result?' },
      { pillar: 'Invest in People', text: 'Describe how this senior IC has elevated peer performance or built organizational capability without being a people manager this cycle. Give a specific example.' },
      { pillar: 'Execute with Excellence', text: 'Describe a complex, cross-functional initiative this senior IC led this cycle without positional authority. How did they drive alignment and deliver results?' }
    ]
  },
  vp_pm: {
    level_key: 'vp_pm',
    level_label: 'Vice President (People Manager)',
    questions: [
      { pillar: 'Growth Mindset', text: 'Describe how this VP has driven innovation or adaptation across their organization this cycle. Give a specific example of a change they championed and how they communicated the case for it.' },
      { pillar: 'Vision & Strategy', text: 'Describe how this VP positioned their function as a strategic lever for company success this cycle. What was the vision they articulated, and how did they get buy-in?' },
      { pillar: 'Champion the Customer', text: 'Describe how this VP established or evolved a customer-experience program across their function this cycle. What was the business outcome?' },
      { pillar: 'Invest in People', text: 'Describe this VP\'s investment in the leadership bench of their organization this cycle. Who have they developed, and how are they building management depth for business continuity?' },
      { pillar: 'Execute with Excellence', text: 'Give an example of this VP prioritizing initiatives and budgets this cycle to maximize business results. What trade-off did they make, and what was the outcome?' }
    ]
  },
  vp_ic: {
    level_key: 'vp_ic',
    level_label: 'Vice President (Distinguished Individual Contributor)',
    questions: [
      { pillar: 'Growth Mindset', text: 'Give an example of this distinguished IC challenging organizational assumptions or driving innovation this cycle. What was the change, and what was the impact?' },
      { pillar: 'Vision & Strategy', text: 'Describe how this distinguished IC shaped long-term direction for the function or company this cycle. Give a specific example of their strategic impact.' },
      { pillar: 'Champion the Customer', text: 'Give an example of this distinguished IC representing the company\'s commitment to customers this cycle — with external stakeholders, through product direction, or through advocacy internally.' },
      { pillar: 'Invest in People', text: 'Describe how this distinguished IC has elevated organizational capability this cycle — through mentorship, technical leadership, or shaping how the broader org works. Give a specific example.' },
      { pillar: 'Execute with Excellence', text: 'Describe how this distinguished IC drove breakthrough results through a complex initiative this cycle. How did they navigate organizational complexity to deliver?' }
    ]
  },
  svp: {
    level_key: 'svp',
    level_label: 'Senior Vice President',
    questions: [
      { pillar: 'Growth Mindset', text: 'Describe how this SVP has shaped a culture of curiosity, experimentation, and learning across their organization this cycle. What specific actions or communications made the difference?' },
      { pillar: 'Vision & Strategy', text: 'Describe how this SVP set strategic direction for their organization this cycle. How did they balance short-term performance with long-term positioning, and what trade-offs did they make?' },
      { pillar: 'Champion the Customer', text: 'Describe how this SVP drove enterprise-level customer centricity this cycle. What decisions, investments, or cultural changes did they champion?' },
      { pillar: 'Invest in People', text: 'Describe this SVP\'s investment in developing the next generation of senior leaders across their organization. Name individuals they have sponsored and the opportunities created.' },
      { pillar: 'Execute with Excellence', text: 'Give an example of this SVP driving breakthrough results or operational leverage across their organization this cycle. What systems, processes, or decisions made the difference?' }
    ]
  }
};

export function getLevelForGrade(grade: string | undefined | null): keyof typeof GREAT_QUESTIONS | null {
  if (!grade) return null;

  const normalized = grade.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/^grade/, '')
    .replace(/^level/, '');
  
  if (['ic1', 'ic2', 'ic3', 'g1', 'g2', 'g3', '1', '2', '3'].includes(normalized)) return 'ic_1_3';
  if (['ic4', 'ic5', 'g4', 'g5', '4', '5'].includes(normalized)) return 'ic_4_5';
  if (['ic6', 'g6', '6'].includes(normalized)) return 'director_ic';
  if (['ic7', 'g7', '7'].includes(normalized)) return 'senior_director_ic';
  if (['ic8', 'g8', '8'].includes(normalized)) return 'vp_ic';
  if (['pm4', 'm4'].includes(normalized)) return 'manager';
  if (['pm5', 'm5'].includes(normalized)) return 'senior_manager';
  if (['pm6', 'm6'].includes(normalized)) return 'director_pm';
  if (['pm7', 'm7'].includes(normalized)) return 'senior_director_pm';
  if (['pm8', 'm8'].includes(normalized)) return 'vp_pm';
  if (normalized === 'pm9' || normalized === 'm9' || normalized === '9') return 'svp';

  return null;
}

export const getPillarSlug = (pillar: GreatPillar) => {
  return pillar.toLowerCase()
    .replace('&', 'and')
    .replace(/\s+/g, '_');
};
