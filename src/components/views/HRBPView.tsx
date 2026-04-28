import React, { useMemo } from 'react';
import { Employee } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BellCurveChart } from '../charts/BellCurveChart';
import { cn } from '../../lib/utils';
import { 
  Download, 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  AlertCircle 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface HRBPViewProps {
  employees: Employee[];
  onDownload: () => void;
}

export const HRBPView = ({ employees, onDownload }: HRBPViewProps) => {
  const stats = useMemo(() => ({
    total: employees.length,
    completed: employees.filter(e => e.status === 'Submitted').length,
    pending: employees.filter(e => e.status === 'Pending').length,
  }), [employees]);

  const managerCompletionStats = useMemo(() => {
    const statsMap: Record<string, { 
      name: string, 
      email: string, 
      total: number, 
      completed: number, 
      draft: number, 
      pending: number 
    }> = {};

    employees.forEach(e => {
      const email = e.manager_email;
      if (!statsMap[email]) {
        statsMap[email] = { name: e.manager_name || 'N/A', email, total: 0, completed: 0, draft: 0, pending: 0 };
      }
      statsMap[email].total++;
      if (e.status === 'Submitted') statsMap[email].completed++;
      else if (e.status === 'Draft') statsMap[email].draft++;
      else statsMap[email].pending++;
    });

    return Object.values(statsMap)
      .map(m => ({
        ...m,
        completionRate: m.completed / m.total
      }))
      .sort((a, b) => a.completionRate - b.completionRate);
  }, [employees]);

  const ratingDistributionByManager = useMemo(() => {
    const managersWithRatings: Record<string, any> = {};
    const submittedEmployees = employees.filter(e => e.status === 'Submitted');

    submittedEmployees.forEach(e => {
      const email = e.manager_email;
      const rating = e.mid_year_checkin?.performance_trending_rating;
      if (!rating) return;

      if (!managersWithRatings[email]) {
        managersWithRatings[email] = {
          managerName: e.manager_name || 'N/A',
          'Exceptional Results': 0,
          'Exceeds Results': 0,
          'Delivers Full Results': 0,
          'Delivers Some Results': 0,
          'Does Not Deliver Results': 0,
          total: 0
        };
      }

      if (managersWithRatings[email][rating] !== undefined) {
        managersWithRatings[email][rating]++;
        managersWithRatings[email].total++;
      }
    });

    return Object.values(managersWithRatings).sort((a, b) => a.managerName.localeCompare(b.managerName));
  }, [employees]);

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-6">
          <Users className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Employees Found</h3>
        <p className="text-gray-500 max-w-md">There are currently no employees assigned to your scope.</p>
      </div>
    );
  }

  const hasSubmittedReviews = ratingDistributionByManager.length > 0;

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HRBP Org View</h1>
          <p className="text-gray-500">Performance Calibration & Completion Dashboard</p>
        </div>
        <Button onClick={onDownload} variant="secondary" className="gap-2">
          <Download className="w-4 h-4" />
          Download Report
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-blue-600 text-white border-none shadow-lg shadow-blue-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-100">Across Scope</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-emerald-600 text-white border-none shadow-lg shadow-emerald-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-100">Completed</p>
              <p className="text-3xl font-bold">{stats.completed}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-amber-600 text-white border-none shadow-lg shadow-amber-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-100">Pending Actions</p>
              <p className="text-3xl font-bold">{stats.pending}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Bell Curve Chart */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Org-wide Rating Shape (HRBP Scope)</h2>
        <BellCurveChart employees={employees} />
      </div>

      {/* Completion by Manager Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Completion by Manager</h2>
          <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" /> Completed
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" /> Draft
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" /> Pending
            </div>
          </div>
        </div>
        
        <Card className="overflow-hidden border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                  <th className="px-6 py-4">Manager</th>
                  <th className="px-6 py-4">Reports</th>
                  <th className="px-6 py-4">Status Breakdown</th>
                  <th className="px-6 py-4 text-right">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {managerCompletionStats.map((manager) => {
                  const rate = Math.round(manager.completionRate * 100);
                  const total = manager.total;
                  const compWidth = (manager.completed / total) * 100;
                  const draftWidth = (manager.draft / total) * 100;
                  const pendWidth = (manager.pending / total) * 100;

                  return (
                    <tr key={manager.email} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-gray-900 leading-none mb-1">{manager.name}</p>
                          <p className="text-xs text-gray-400 font-medium">{manager.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-700">{total}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden min-w-[120px] flex">
                            <div className="h-full bg-emerald-500 shadow-sm" style={{ width: `${compWidth}%` }} />
                            <div className="h-full bg-blue-500 shadow-sm" style={{ width: `${draftWidth}%` }} />
                            <div className="h-full bg-amber-500 shadow-sm" style={{ width: `${pendWidth}%` }} />
                          </div>
                          <div className="flex gap-2">
                             {manager.completed > 0 && <span className="text-[10px] font-black text-emerald-600">{manager.completed}</span>}
                             {manager.draft > 0 && <span className="text-[10px] font-black text-blue-600">{manager.draft}</span>}
                             {manager.pending > 0 && <span className="text-[10px] font-black text-amber-600">{manager.pending}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-black tracking-wider",
                          rate === 100 ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                        )}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Rating Distribution Chart */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-gray-900">Rating Distribution by Manager</h2>
        <Card className="p-8">
          {hasSubmittedReviews ? (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ratingDistributionByManager}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  barSize={20}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="managerName" 
                    type="category" 
                    width={100} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', cursor: 'default' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ fontSize: '10px', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 'black', marginBottom: '8px' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    content={(props) => {
                      const { payload } = props;
                      return (
                        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8">
                          {payload?.map((entry: any, index: number) => (
                            <div key={`item-${index}`} className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="Does Not Deliver Results" stackId="rating" fill="#E11D48" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Delivers Some Results" stackId="rating" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Delivers Full Results" stackId="rating" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Exceeds Results" stackId="rating" fill="#10B981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Exceptional Results" stackId="rating" fill="#1E40AF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <TrendingUp className="w-12 h-12 text-gray-200 mb-4" />
              <p className="text-sm font-bold text-gray-400 max-w-xs">
                Rating distribution will appear once managers begin submitting reviews.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
