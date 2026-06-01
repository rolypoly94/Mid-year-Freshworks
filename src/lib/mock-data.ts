import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Employee } from '../types';

export const seedMockData = async (userEmail: string) => {
  const mockEmployees: Partial<Employee>[] = [
    {
      id: 'amuthaveni.subramaniyam@freshworks.com',
      employee_id: '1000044',
      employee_name: 'Amuthaveni Subramaniyam',
      employee_email: 'amuthaveni.subramaniyam@freshworks.com',
      manager_email: userEmail.toLowerCase(),
      manager_name: 'My Manager',
      job_title: 'Manager - QA',
      grade: 'PM 4',
      goals: [
        "Architect and implement the modern automated end-to-end regression testing pipeline for the primary Freshworks products.",
        "Establish shift-left quality protocols across two major feature pods to reduce release-blocker QA escapes by 40%.",
        "Empower QA engineers by designing an interactive training program centered around next-generation performance profiling tools."
      ],
      status: 'Pending',
      updated_at: new Date().toISOString()
    },
    {
      id: 'john.doe@freshworks.com',
      employee_id: '1000045',
      employee_email: 'john.doe@freshworks.com',
      employee_name: 'John Doe',
      manager_email: userEmail.toLowerCase(),
      manager_name: 'My Manager',
      job_title: 'Senior Software Engineer',
      grade: 'IC 4',
      goals: [
        "Drive the design and decoupling of legacy high-latency notification systems into streamlined, asynchronous worker microservices.",
        "Profile and optimize database query architectures to achieve an ambitious p95 server response target under 300ms.",
        "Dedicate time to peer mentoring, leading fortnightly architecture sessions and code alignment workshops for junior engineers."
      ],
      status: 'Pending',
      updated_at: new Date().toISOString()
    }
  ];

  const batch = writeBatch(db);
  mockEmployees.forEach((emp) => {
    batch.set(doc(db, 'employees', emp.id!), emp, { merge: true });
  });
  await batch.commit();
};
