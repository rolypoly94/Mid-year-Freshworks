import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { EmployeeAuditEntry } from '../../types';
import { Card } from '../ui/Card';
import { 
  CheckCircle2, 
  Check, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  History,
  Clock
} from 'lucide-react';
import { cn, formatDate } from '../../lib/utils';

interface AuditTrailSectionProps {
  employeeId: string;
  initialExpanded?: boolean;
  hideConfidentialFields?: boolean;
}

export const AuditTrailSection = ({ employeeId, initialExpanded = false, hideConfidentialFields = false }: AuditTrailSectionProps) => {
  const [entries, setEntries] = useState<EmployeeAuditEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const q = query(
      collection(db, 'employee_audit'),
      where('employee_id', '==', employeeId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const auditEntries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as EmployeeAuditEntry[];
        setEntries(auditEntries);
      },
      (error) => {
        console.error('Audit trail subscription failed:', error);
        setEntries([]);
      }
    );

    return () => unsubscribe();
  }, [employeeId]);

  const toggleEntryDetail = (id: string) => {
    setExpandedEntries(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (entries.length === 0) {
    return (
      <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100/50 text-center">
        <p className="text-sm text-gray-400 font-medium italic">No audit history available for this review.</p>
      </div>
    );
  }

  const getEventConfig = (type: string) => {
    switch (type) {
      case 'submit':
        return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Submitted' };
      case 'acknowledge':
        return { icon: Check, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Acknowledged' };
      case 'admin_override':
        return { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Corrected (Admin)' };
      default:
        return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Action' };
    }
  };

  return (
    <div className="space-y-4">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-blue-600 transition-colors group"
      >
        <History className="w-3.5 h-3.5" />
        View History
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isExpanded && (
        <div className="space-y-4 pt-2">
          {entries.map((entry, idx) => {
            const config = getEventConfig(entry.event_type);
            const Icon = config.icon;
            const isEntryExpanded = expandedEntries[entry.id!] || false;

            return (
              <div key={entry.id} className="relative pl-8 pb-4 last:pb-0">
                {/* Timeline Line */}
                {idx !== entries.length - 1 && (
                  <div className="absolute left-[11px] top-[24px] bottom-0 w-0.5 bg-gray-100" />
                )}
                
                {/* Timeline Dot/Icon */}
                <div className={cn(
                  "absolute left-0 top-0 w-6 h-6 rounded-lg flex items-center justify-center shadow-sm z-10",
                  config.bg, config.color
                )}>
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-50 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {config.label} by {entry.actor_name || entry.actor_email}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                        {formatDate(entry.timestamp)}
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => toggleEntryDetail(entry.id!)}
                      className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md transition-all self-start sm:self-center"
                    >
                      {isEntryExpanded ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>

                  {entry.event_type === 'admin_override' && entry.notes && (
                    <div className="bg-amber-50/50 border border-amber-100/50 rounded-xl p-3 mb-2">
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">Reason for correction</p>
                      <p className="text-xs text-amber-800 italic leading-relaxed">{entry.notes}</p>
                    </div>
                  )}

                  {isEntryExpanded && entry.snapshot && (
                    <div className="mt-4 pt-4 border-t border-gray-50 space-y-4">
                      {entry.event_type === 'admin_override' && entry.previous_snapshot ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3 opacity-60">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Before Override</p>
                            <SnapshotDetail data={entry.previous_snapshot} hideConfidentialFields={hideConfidentialFields} />
                          </div>
                          <div className="space-y-3">
                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">After Override</p>
                            <SnapshotDetail data={entry.snapshot} hideConfidentialFields={hideConfidentialFields} />
                          </div>
                        </div>
                      ) : (
                        <SnapshotDetail data={entry.snapshot} hideConfidentialFields={hideConfidentialFields} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SnapshotDetail = ({ data, hideConfidentialFields }: { data: any, hideConfidentialFields?: boolean }) => (
  <div className="space-y-3">
    {!hideConfidentialFields && (
      <>
        <div className="p-3 bg-gray-50 rounded-xl">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Trending Rating</p>
          <p className="text-xs font-bold text-gray-900">{data.performance_trending_rating || 'N/A'}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-xl">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Promotion Readiness</p>
          <p className="text-xs font-bold text-gray-900">{data.promotion_readiness || 'N/A'}</p>
        </div>
      </>
    )}

    {/* GREAT Reflections */}
    {data.great_reflections && data.great_reflections.length > 0 && (
      <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 space-y-4">
        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Leadership Reflections</p>
        <div className="space-y-4">
          {data.great_reflections.map((r: any, i: number) => (
            <div key={r.question_id || i} className="space-y-1.5 pb-3 last:pb-0 border-b last:border-0 border-indigo-100/50">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter",
                  r.pillar === 'Growth Mindset' ? "bg-cyan-50 text-cyan-700" :
                  r.pillar === 'Vision & Strategy' ? "bg-blue-50 text-blue-700" :
                  r.pillar === 'Champion the Customer' ? "bg-teal-50 text-teal-700" :
                  r.pillar === 'Invest in People' ? "bg-amber-50 text-amber-700" :
                  "bg-orange-50 text-orange-700"
                )}>
                  {r.pillar}
                </div>
              </div>
              <p className="text-[11px] font-bold text-gray-500 italic leading-tight">{r.question_text}</p>
              {r.not_applicable ? (
                <p className="text-xs text-amber-700 italic font-medium">
                  Marked as not applicable {r.not_applicable_reason ? `(${r.not_applicable_reason})` : ''}
                </p>
              ) : (
                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{r.response || 'N/A'}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    )}

    <div className="p-3 bg-gray-50 rounded-xl">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Key Contributions</p>
      <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{data.key_contributions || data.doing_well || 'N/A'}</p>
    </div>
    <div className="p-3 bg-gray-50 rounded-xl">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Development & Evolution</p>
      <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{data.development_evolution || data.focus_to_grow || 'N/A'}</p>
    </div>

    {!hideConfidentialFields && data.additional_notes && (
      <div className="p-3 bg-rose-50/30 rounded-xl border border-rose-100/50">
        <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">Calibration Notes</p>
        <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{data.additional_notes}</p>
      </div>
    )}
  </div>
);
