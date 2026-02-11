
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'yellow';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendUp, color = 'blue' }) => {
  
  const colorStyles = {
    blue: 'bg-[#2563eb] shadow-blue-600/30 border-blue-400/20',
    green: 'bg-[#10b981] shadow-emerald-600/30 border-emerald-400/20',
    red: 'bg-[#ef4444] shadow-rose-600/30 border-rose-400/20',
    purple: 'bg-[#8b5cf6] shadow-purple-600/30 border-purple-400/20',
    yellow: 'bg-[#f59e0b] shadow-amber-600/30 border-amber-400/20',
  };

  const iconBgStyles = {
    blue: 'bg-white/15 text-white border-white/20',
    green: 'bg-white/20 text-white border-white/20',
    red: 'bg-white/20 text-white border-white/20',
    purple: 'bg-white/20 text-white border-white/20',
    yellow: 'bg-white/20 text-white border-white/20',
  };

  const selectedBg = colorStyles[color];
  const selectedIconBg = iconBgStyles[color];

  return (
    <div className={`relative overflow-hidden rounded-[1.8rem] p-5 shadow-xl ${selectedBg} text-white transition-all hover:scale-[1.02] duration-300 border`}>
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
      
      <div className="flex items-start justify-between mb-4 relative z-10">
        <span className="text-[11px] font-black uppercase tracking-widest text-white/95 antialiased drop-shadow-sm">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl ${selectedIconBg} backdrop-blur-md shadow-inner border flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      <div className="flex items-end justify-between relative z-10">
        <div className="w-full">
            {typeof value === 'string' || typeof value === 'number' ? (
                <h3 className="text-2xl font-black tracking-tighter whitespace-nowrap drop-shadow-md">
                  {value}
                </h3>
            ) : (
                <div className="text-2xl font-black drop-shadow-md">
                  {value}
                </div>
            )}
        </div>
        
        {trend && (
          <div className={`flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm ${trendUp ? 'text-green-300' : 'text-rose-200'}`}>
             {trend}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
