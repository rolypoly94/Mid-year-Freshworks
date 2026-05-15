import React from 'react';
import { Employee } from '../../types';
import { Modal } from '../ui/Modal';
import { AuditTrailSection } from './AuditTrailSection';
import { 
  X, 
  User, 
  Mail, 
  Briefcase, 
  CheckCircle2, 
  MapPin 
} from 'lucide-react';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

export const AuditTrailModal = ({ isOpen, onClose, employee }: AuditTrailModalProps) => {
  if (!employee) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Content */}
      <div className={`relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-blue-600">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-xl font-bold text-white">
              {employee.employee_name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">{employee.employee_name}</h3>
              <p className="text-xs text-blue-100 mt-0.5">Audit History • {employee.employee_id}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-2xl text-white hover:bg-white/20 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Employee Info Bar */}
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5 text-gray-400" />
            <div>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Job Title</p>
              <p className="text-[10px] font-bold text-gray-700 truncate">{employee.job_title || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <div>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Status</p>
              <p className="text-[10px] font-bold text-emerald-600">{employee.status === 'Submitted' ? 'Feedback Recorded' : employee.status}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-gray-400" />
            <div>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Email</p>
              <p className="text-[10px] font-bold text-gray-700 truncate">{employee.employee_email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <div>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Location</p>
              <p className="text-[10px] font-bold text-gray-700">{employee.work_location || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Audit Body */}
        <div className="p-8 max-h-[60vh] overflow-y-auto">
          <AuditTrailSection employeeId={employee.id} initialExpanded={true} />
        </div>
      </div>
    </div>
  );
};
