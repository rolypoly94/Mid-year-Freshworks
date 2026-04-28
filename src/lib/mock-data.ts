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
