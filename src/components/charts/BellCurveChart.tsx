import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Bar, 
  Line, 
  Cell 
} from 'recharts';
import { Employee } from '../../types';
import { Card } from '../ui/Card';

const RATING_CATEGORIES = [
  { id: 'Exceptional Results', label: 'Exceptional', color: '#10b981' },
  { id: 'Exceeds Results', label: 'Exceeds', color: '#3b82f6' },
  { id: 'Delivers Full Results', label: 'Full', color: '#6366f1' },
  { id: 'Delivers Some Results', label: 'Some', color: '#f59e0b' },
  { id: 'Does Not Deliver Results', label: 'Below', color: '#ef4444' }
];

export const BellCurveChart = ({ employees }: { employees: Employee[] }) => {
  const distributionData = useMemo(() => {
    const totalSubmitted = employees.filter(e => e.status === 'Submitted' && e.mid_year_checkin?.performance_trending_rating).length;
    
    return RATING_CATEGORIES.map(cat => {
      const count = employees.filter(e => 
        e.status === 'Submitted' && 
        e.mid_year_checkin?.performance_trending_rating === cat.id
      ).length;
      
      const percentage = totalSubmitted > 0 ? (count / totalSubmitted) * 100 : 0;
      
      return {
        name: cat.label,
        fullName: cat.id,
        count,
        percentage: Math.round(percentage),
        color: cat.color
      };
    });
  }, [employees]);

  if (employees.length === 0) return null;

  return (
    <Card className="p-8">
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false}
              tick={{ fontSize: 11, fontWeight: 700, fill: '#6b7280' }}
            />
            <YAxis hide />
            <Tooltip 
              cursor={{ fill: '#f9fafb' }}
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' 
              }}
              formatter={(value, name) => [
                name === 'percentage' ? `${value}%` : value, 
                name === 'percentage' ? 'Distribution' : 'Raw Count'
              ]}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
              {distributionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.15} stroke={entry.color} strokeWidth={2} />
              ))}
            </Bar>
            <Line 
              type="monotone" 
              dataKey="percentage" 
              stroke="#6366f1" 
              strokeWidth={3} 
              dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 8, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-8 grid grid-cols-5 gap-4">
        {distributionData.map((item) => (
          <div key={item.name} className="text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{item.name}</p>
            <p className="text-xl font-extrabold text-gray-900">{item.percentage}%</p>
            <p className="text-xs text-gray-500 font-medium">({item.count} employees)</p>
          </div>
        ))}
      </div>
    </Card>
  );
};
