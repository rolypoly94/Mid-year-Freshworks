import React, { useMemo } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  BarController,
  type ChartOptions,
  type Plugin
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Employee } from '../../types';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';
import { AlertCircle, Clock, Info } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend
);

const RATING_ORDER = [
  'Does Not Deliver Results',
  'Delivers Some Results',
  'Delivers Full Results',
  'Exceeds Results',
  'Exceptional Results'
];

const RATING_TARGETS = {
  'Does Not Deliver Results': { min: 4, max: 6, label: 'DNDR' },
  'Delivers Some Results':    { min: 4, max: 6, label: 'DSR' },
  'Delivers Full Results':    { min: 60, max: 70, label: 'DFR' },
  'Exceeds Results':          { min: 10, max: 15, label: 'Exceeds' },
  'Exceptional Results':      { min: 5, max: 10, label: 'Exceptional' },
};

type Props = {
  employees: Employee[];
  scopeLabel: string;
  ratingField?: 'performance_trending_rating' | 'final_rating';
};

// Custom Chart.js plugin to draw guideline bands behind bars
const guidelineBandsPlugin: Plugin<'bar'> = {
  id: 'guidelineBands',
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea: { top, bottom, left, right }, scales: { x, y } } = chart;
    ctx.save();

    const data = chart.data.datasets[0].data as number[];
    if (!data) return;

    RATING_ORDER.forEach((rating, index) => {
      const target = RATING_TARGETS[rating as keyof typeof RATING_TARGETS];
      if (!target) return;

      const yMin = y.getPixelForValue(target.min);
      const yMax = y.getPixelForValue(target.max);
      
      const barWidth = (right - left) / RATING_ORDER.length;
      const xStart = left + (index * barWidth) + 10; // Simple padding
      const xEnd = xStart + barWidth - 20;

      // Draw the band background
      ctx.fillStyle = 'rgba(241, 163, 60, 0.05)'; // Very faint amber
      ctx.fillRect(xStart, yMax, xEnd - xStart, yMin - yMax);

      // Draw dashed borders
      ctx.strokeStyle = '#cbd5e1'; // slate-300
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;

      // Top border
      ctx.beginPath();
      ctx.moveTo(xStart, yMax);
      ctx.lineTo(xEnd, yMax);
      ctx.stroke();

      // Bottom border
      ctx.beginPath();
      ctx.moveTo(xStart, yMin);
      ctx.lineTo(xEnd, yMin);
      ctx.stroke();
      
      ctx.setLineDash([]); // Reset
    });

    ctx.restore();
  }
};

// Below this many submitted reviews, we still show the chart but label it
// preliminary — a single rating shifts a small distribution dramatically, so
// readers should know the picture isn't statistically stable yet.
const PRELIMINARY_THRESHOLD = 10;

export const CalibrationChart = ({ employees, scopeLabel, ratingField = 'performance_trending_rating' }: Props) => {
  const stats = useMemo(() => {
    const calibrationStatuses = ['Submitted', 'Shared', 'Acknowledged'];
    const submittedReviews = employees.filter(e => {
      const rating = e.mid_year_checkin?.[ratingField];
      return rating && rating !== '' && calibrationStatuses.includes(e.status);
    });

    const totalSubmitted = submittedReviews.length;
    const totalCount = employees.length;

    // Only fall back to the "nothing yet" card when there is literally zero
    // data to plot. For 1..PRELIMINARY_THRESHOLD-1 submissions we still draw
    // the chart but with an inline caveat banner.
    if (totalSubmitted === 0) {
      return { totalSubmitted, totalCount, isFallback: true, isPreliminary: false };
    }

    const distribution = RATING_ORDER.map(rating => {
      const count = submittedReviews.filter(e => e.mid_year_checkin?.[ratingField] === rating).length;
      const percentage = Math.round((count / totalSubmitted) * 100);
      const target = RATING_TARGETS[rating as keyof typeof RATING_TARGETS];
      const inRange = percentage >= target.min && percentage <= target.max;

      return {
        rating,
        label: target.label,
        count,
        percentage,
        target,
        inRange
      };
    });

    return {
      totalSubmitted,
      totalCount,
      distribution,
      isFallback: false,
      isPreliminary: totalSubmitted < PRELIMINARY_THRESHOLD,
    };
  }, [employees, ratingField]);

  if (stats.isFallback) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4 border-dashed border-2">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
          <Clock className="w-8 h-8 text-slate-300" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 leading-tight">Awaiting Submissions</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
            Calibration view appears once at least one review has been submitted in this scope.
            Currently <span className="font-bold text-blue-600">0</span> of <span className="font-bold">{stats.totalCount}</span> submitted.
          </p>
        </div>
      </Card>
    );
  }

  const data = {
    labels: stats.distribution?.map(d => d.label),
    datasets: [
      {
        data: stats.distribution?.map(d => d.percentage),
        backgroundColor: stats.distribution?.map(d => d.inRange ? '#1D9E75' : '#BA7517'),
        borderRadius: 4,
        barThickness: 50,
      }
    ]
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        displayColors: false,
        callbacks: {
          label: (context) => {
            const d = stats.distribution?.[context.dataIndex];
            if (!d) return '';
            return `${d.percentage}% · target ${d.target.min}–${d.target.max}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 80,
        ticks: {
          padding: 8,
          callback: (value) => `${value}%`,
          font: { size: 11, weight: 600 },
          color: '#64748b'
        },
        grid: {
          color: '#f1f5f9'
        }
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 11, weight: 'bold' },
          color: '#475569'
        }
      }
    }
  };

  return (
    <Card className="p-8" data-testid="calibration-chart">
      {stats.isPreliminary && (
        <div className="flex items-start gap-3 mb-6 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-100">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs font-medium text-amber-800 leading-relaxed">
            <span className="font-bold">Preliminary.</span> Based on {stats.totalSubmitted} submitted review{stats.totalSubmitted === 1 ? '' : 's'}. A single rating can shift each band by {Math.round(100 / stats.totalSubmitted)}% at this sample size — the distribution becomes more reliable as more reviews come in.
          </p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">{scopeLabel}</h3>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            Distribution from <span className="text-blue-600 font-bold">{stats.totalSubmitted}</span> of {stats.totalCount} reviews submitted.
          </p>
        </div>

        {/* Custom Legend */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#1D9E75] rounded-sm" />
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">In range</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#BA7517] rounded-sm" />
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Outside range</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 border-t border-dashed border-slate-300" />
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Guideline band</span>
          </div>
        </div>
      </div>

      <div className="h-[350px] w-full mb-10">
        <Bar data={data} options={options} plugins={[guidelineBandsPlugin]} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.distribution?.map((item) => (
          <div key={item.rating} className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 transition-all hover:bg-white hover:shadow-md hover:-translate-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-2xl font-black",
                item.inRange ? "text-[#1D9E75]" : "text-[#BA7517]"
              )}>
                {item.percentage}%
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                {item.count} qty
              </span>
            </div>
            <p className={cn(
              "text-[11px] font-bold mt-2 pt-2 border-t border-slate-200/50",
              item.inRange ? "text-emerald-700" : "text-amber-700"
            )}>
              Target {item.target.min}–{item.target.max}%
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
};
