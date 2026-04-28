import { Employee, EmployeeAuditEntry } from '../types';

export const DEMO_ADMIN_EMAILS = ['sumit.yadav@freshworks.com'];

export const DEMO_USER = {
  uid: 'demo-admin-uid',
  email: 'sumit.yadav@freshworks.com',
  displayName: 'Sumit Yadav',
  photoURL: null,
  emailVerified: true,
};

export const DEMO_PERSPECTIVES = {
  admin: { email: 'sumit.yadav@freshworks.com', name: 'Sumit Yadav', isAdmin: true, label: 'Admin (TM Space)' },
  manager: { email: 'anita.desai@freshworks.com', name: 'Anita Desai', isAdmin: false, label: 'Manager' },
  hrbp: { email: 'priya.sharma@freshworks.com', name: 'Priya Sharma', isAdmin: false, label: 'HRBP' },
  employee: { email: 'harini.balasubramanian@freshworks.com', name: 'Harini Balasubramanian', isAdmin: false, label: 'Employee' },
};

export type DemoPerspective = keyof typeof DEMO_PERSPECTIVES;

// Helper to generate IDs
const gid = () => Math.random().toString(36).substring(2, 9);

export const DEMO_EMPLOYEES: Employee[] = [
  // Anita Desai's Team (The Manager we switch to)
  {
    id: gid(),
    employee_id: 'FW101',
    employee_name: 'Harini Balasubramanian',
    employee_email: 'harini.balasubramanian@freshworks.com',
    manager_name: 'Anita Desai',
    manager_email: 'anita.desai@freshworks.com',
    hrbp_name: 'Priya Sharma',
    hrbp_email: 'priya.sharma@freshworks.com',
    job_title: 'Software Engineer II',
    grade: 'IC 3',
    status: 'Submitted',
    rating_2024: 'Exceeds Results',
    rating_2025: 'Delivers Full Results',
    mid_year_checkin: {
      doing_well: 'Harini has been instrumental in the UI revamp of the customer portal. She took full ownership of the mobile responsiveness aspect and delivered it ahead of schedule.',
      focus_to_grow: 'Start taking more active role in technical design discussions for complex features.',
      performance_trending_rating: 'Exceeds Results',
      additional_notes: '',
      submitted_at: '2026-04-20T10:30:00Z',
      great_reflections: [
        { question_id: 'ic_1_3__growth_mindset__0', pillar: 'Growth Mindset', question_text: 'Describe a time this person sought feedback...', response: 'Sought feedback early on the navigation component, leading to better accessibility.', not_applicable: false },
        { question_id: 'ic_1_3__vision_and_strategy__1', pillar: 'Vision & Strategy', question_text: 'Give an example of this person connecting...', response: 'Understands how her UI work directly impacts customer retention targets.', not_applicable: false },
        { pillar: 'Champion the Customer', question_id: 'ic_1_3__champion_the_customer__2', question_text: 'Describe a time...', response: 'Proposed a simpler filter UI based on internal user pain points.', not_applicable: false },
        { pillar: 'Invest in People', question_id: 'ic_1_3__invest_in_people__3', question_text: 'Give an example...', response: 'Helped a new joiner on the team get up to speed with our Tailwind setup.', not_applicable: false },
        { pillar: 'Execute with Excellence', question_id: 'ic_1_3__execute_with_excellence__4', question_text: 'Describe how...', response: 'Delivered the portal revamp 2 days early with zero high-priority bugs.', not_applicable: false }
      ]
    },
    acknowledged_at: '2026-04-22T14:15:00Z'
  },
  {
    id: gid(),
    employee_id: 'FW102',
    employee_name: 'Rohan Pillai',
    employee_email: 'rohan.pillai@freshworks.com',
    manager_name: 'Anita Desai',
    manager_email: 'anita.desai@freshworks.com',
    hrbp_name: 'Priya Sharma',
    hrbp_email: 'priya.sharma@freshworks.com',
    job_title: 'Senior Product Designer',
    grade: 'IC 4',
    status: 'Draft',
    rating_2024: 'Delivers Full Results',
    mid_year_checkin: {
      doing_well: 'Rohan has created some very clean and modern design patterns for the new dashboard.',
      focus_to_grow: 'Needs to focus on documenting edge cases in design handoffs.',
      performance_trending_rating: 'Delivers Full Results',
      additional_notes: '',
      great_reflections: []
    }
  },
  {
    id: gid(),
    employee_id: 'FW103',
    employee_name: 'Ananya Gupta',
    employee_email: 'ananya.gupta@freshworks.com',
    manager_name: 'Anita Desai',
    manager_email: 'anita.desai@freshworks.com',
    hrbp_name: 'Priya Sharma',
    hrbp_email: 'priya.sharma@freshworks.com',
    job_title: 'Product Manager',
    grade: 'PM 4',
    status: 'Pending',
    rating_2024: 'Exceptional Results',
    rating_2025: 'Exceeds Results'
  },
  
  // Other Manager's teams to fill the admin view
  {
    id: gid(),
    employee_id: 'FW104',
    employee_name: 'Vikram Singh',
    employee_email: 'vikram.singh@freshworks.com',
    manager_name: 'Rajesh Kumar',
    manager_email: 'rajesh.kumar@freshworks.com',
    hrbp_name: 'Priya Sharma',
    hrbp_email: 'priya.sharma@freshworks.com',
    job_title: 'Customer Success Lead',
    grade: 'PM 5',
    status: 'Submitted',
    mid_year_checkin: {
      doing_well: 'Vikram has maintained 100% renewal rate for his marquee accounts.',
      focus_to_grow: 'Expanding influence across the broader CS org.',
      performance_trending_rating: 'Exceptional Results',
      additional_notes: ''
    }
  },
  {
    id: gid(),
    employee_id: 'FW105',
    employee_name: 'Siddharth Varma',
    employee_email: 'siddharth.varma@freshworks.com',
    manager_name: 'Rajesh Kumar',
    manager_email: 'rajesh.kumar@freshworks.com',
    hrbp_name: 'Priya Sharma',
    hrbp_email: 'priya.sharma@freshworks.com',
    job_title: 'Director of Engineering',
    grade: 'PM 7',
    status: 'Pending',
    rating_2024: 'Delivers Full Results'
  },
  {
     id: gid(),
     employee_id: 'FW106',
     employee_name: 'Sneha Reddy',
     employee_email: 'sneha.reddy@freshworks.com',
     manager_name: 'Anita Desai',
     manager_email: 'anita.desai@freshworks.com',
     hrbp_name: 'Priya Sharma',
     hrbp_email: 'priya.sharma@freshworks.com',
     job_title: 'QA Engineer',
     grade: 'IC 2',
     status: 'Submitted',
     mid_year_checkin: {
       doing_well: 'Sneha has automated 40% of the regression suite.',
       focus_to_grow: 'Getting more comfortable with the performance testing tools.',
       performance_trending_rating: 'Delivers Full Results',
       additional_notes: ''
     }
  }
];

// Add 20 more dummy employees to make the charts look good
const commonNames = [
  'Arjun', 'Isha', 'Kabir', 'Maya', 'Nikhil', 'Pooja', 'Rahul', 'Sana', 'Varun', 'Zara',
  'Aditya', 'Bhavna', 'Chetan', 'Deepa', 'Eshwar', 'Farhan', 'Gauri', 'Hemant', 'Indu', 'Jatin'
];
const commonSurnames = [
  'Kapoor', 'Sharma', 'Iyer', 'Menon', 'Patel', 'Das', 'Roy', 'Prasad', 'Jain', 'Shah'
];

for (let i = 0; i < 20; i++) {
  const name = `${commonNames[i % commonNames.length]} ${commonSurnames[i % commonSurnames.length]}`;
  const email = `${name.toLowerCase().replace(' ', '.')}@freshworks.com`;
  const rating = ['Exceptional Results', 'Exceeds Results', 'Delivers Full Results', 'Delivers Some Results'][Math.floor(Math.random() * 4)];
  const status = Math.random() > 0.4 ? 'Submitted' : Math.random() > 0.5 ? 'Draft' : 'Pending';

  DEMO_EMPLOYEES.push({
    id: gid(),
    employee_id: `FW${200 + i}`,
    employee_name: name,
    employee_email: email,
    manager_name: i < 10 ? 'Rajesh Kumar' : 'Sunita Williams',
    manager_email: i < 10 ? 'rajesh.kumar@freshworks.com' : 'sunita.williams@freshworks.com',
    hrbp_name: Math.random() > 0.5 ? 'Priya Sharma' : 'Amitabh Bachchan',
    hrbp_email: Math.random() > 0.5 ? 'priya.sharma@freshworks.com' : 'amitabh.bachchan@freshworks.com',
    job_title: 'Consultant',
    grade: 'IC 3',
    status: status,
    mid_year_checkin: status !== 'Pending' ? {
      doing_well: 'Good progress on projects.',
      focus_to_grow: 'Stakeholder management.',
      performance_trending_rating: rating,
      additional_notes: '',
      submitted_at: status === 'Submitted' ? new Date().toISOString() : undefined
    } : undefined
  });
}

export const DEMO_AUDIT_ENTRIES: Record<string, EmployeeAuditEntry[]> = {};
DEMO_EMPLOYEES.forEach(emp => {
  if (emp.status === 'Submitted') {
    DEMO_AUDIT_ENTRIES[emp.id] = [
      {
        id: gid(),
        employee_id: emp.id,
        event_type: 'submit',
        actor_name: emp.manager_name,
        actor_email: emp.manager_email,
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        snapshot: {
          doing_well: emp.mid_year_checkin?.doing_well || '',
          focus_to_grow: emp.mid_year_checkin?.focus_to_grow || '',
          performance_trending_rating: emp.mid_year_checkin?.performance_trending_rating || '',
          additional_notes: emp.mid_year_checkin?.additional_notes || '',
          great_reflections: emp.mid_year_checkin?.great_reflections || []
        } as any
      }
    ];
    
    if (emp.acknowledged_at) {
      DEMO_AUDIT_ENTRIES[emp.id].push({
        id: gid(),
        employee_id: emp.id,
        event_type: 'acknowledge',
        actor_name: emp.employee_name,
        actor_email: emp.employee_email,
        timestamp: emp.acknowledged_at,
        snapshot: {
          doing_well: emp.mid_year_checkin?.doing_well || '',
          focus_to_grow: emp.mid_year_checkin?.focus_to_grow || '',
          performance_trending_rating: emp.mid_year_checkin?.performance_trending_rating || '',
          additional_notes: emp.mid_year_checkin?.additional_notes || '',
          great_reflections: emp.mid_year_checkin?.great_reflections || []
        } as any
      });
    }
  }
});
