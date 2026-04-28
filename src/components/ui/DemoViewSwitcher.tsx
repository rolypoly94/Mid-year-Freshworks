import React from 'react';
import { useDemo } from '../../context/DemoContext';
import { DemoPerspective, DEMO_PERSPECTIVES } from '../../lib/demo-data';
import { Eye, Beaker, Shield, Users, Briefcase, User as UserIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { IS_DEMO_MODE } from '../../lib/demo-mode';

export const DemoViewSwitcher = () => {
  const { perspective, setPerspective } = useDemo();

  if (!IS_DEMO_MODE) return null;

  const perspectives: { id: DemoPerspective; label: string; icon: any }[] = [
    { id: 'admin', label: 'Admin', icon: Shield },
    { id: 'manager', label: 'Manager', icon: Users },
    { id: 'hrbp', label: 'HRBP', icon: Briefcase },
    { id: 'employee', label: 'Employee', icon: UserIcon },
  ];

  return (
    <div className="bg-amber-50 border-b border-amber-200 sticky top-0 z-[100] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center shrink-0">
            <Beaker className="w-4 h-4 text-amber-700" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-none mb-1">Demo Mode</p>
            <p className="text-xs text-amber-700 font-medium truncate">No data is saved. Simulation active.</p>
          </div>
        </div>

        <div className="flex items-center bg-amber-100/50 p-1 rounded-xl border border-amber-200/50">
          {perspectives.map((p) => {
            const Icon = p.icon;
            const isActive = perspective === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPerspective(p.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200",
                  isActive 
                    ? "bg-white text-amber-900 shadow-sm ring-1 ring-amber-200/50" 
                    : "text-amber-600 hover:text-amber-800 hover:bg-amber-200/30"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-amber-600" : "text-amber-400")} />
                <span className="hidden sm:inline">{p.label}</span>
              </button>
            );
          })}
        </div>
        
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-amber-200/30 rounded-lg border border-amber-200/50">
          <Eye className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-[10px] font-black text-amber-800 uppercase tracking-tighter">
            Browsing as: {DEMO_PERSPECTIVES[perspective].name}
          </span>
        </div>
      </div>
    </div>
  );
};
