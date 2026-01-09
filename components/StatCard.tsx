
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: 'blue' | 'green' | 'red' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendUp, color = 'blue' }) => {
  
  // Cores vibrantes com gradientes
  const gradientStyles = {
    blue: 'from-blue-500 to-blue-600 shadow-blue-500/30',
    green: 'from-emerald-500 to-emerald-600 shadow-emerald-500/30',
    red: 'from-rose-500 to-rose-600 shadow-rose-500/30',
    purple: 'from-violet-500 to-violet-600 shadow-violet-500/30',
  };

  const iconBgStyles = {
    blue: 'bg-white/20 text-white',
    green: 'bg-white/20 text-white',
    red: 'bg-white/20 text-white',
    purple: 'bg-white/20 text-white',
  };

  const selectedGradient = gradientStyles[color];
  const selectedIconBg = iconBgStyles[color];

  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 shadow-lg bg-gradient-to-br ${selectedGradient} text-white transition-transform hover:-translate-y-1 duration-300`}>
      {/* Decorative circle */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
      
      <div className="flex items-start justify-between mb-4 relative z-10">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/70">{title}</span>
        <div className={`p-2 rounded-xl ${selectedIconBg} backdrop-blur-sm shadow-sm`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      
      <div className="flex items-end justify-between relative z-10 min-h-[40px]">
        <div className="w-full">
            {typeof value === 'string' || typeof value === 'number' ? (
                <h3 className="text-3xl font-bold tracking-tight whitespace-nowrap">{value}</h3>
            ) : (
                value
            )}
        </div>
        {/* Trend label removed to clean UI as requested */}
      </div>
    </div>
  );
};

export default StatCard;
