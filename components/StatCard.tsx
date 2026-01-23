
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
  
  // Cores vibrantes com gradientes baseadas no padrão Alumasa
  const gradientStyles = {
    blue: 'from-blue-600 to-blue-700 shadow-blue-500/20',
    green: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
    red: 'from-rose-500 to-rose-600 shadow-rose-500/20',
    purple: 'from-indigo-500 to-indigo-600 shadow-indigo-500/20',
    yellow: 'from-amber-400 to-amber-500 shadow-amber-500/20',
  };

  const iconBgStyles = {
    blue: 'bg-white/20 text-white',
    green: 'bg-white/20 text-white',
    red: 'bg-white/20 text-white',
    purple: 'bg-white/20 text-white',
    yellow: 'bg-white/20 text-white',
  };

  const selectedGradient = gradientStyles[color];
  const selectedIconBg = iconBgStyles[color];

  return (
    <div className={`relative overflow-hidden rounded-3xl p-6 shadow-xl bg-gradient-to-br ${selectedGradient} text-white transition-all hover:scale-[1.02] duration-300 border border-white/10`}>
      {/* Decorative ambient lighting effect */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="flex items-start justify-between mb-8 relative z-10">
        <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white/80 antialiased drop-shadow-sm">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl ${selectedIconBg} backdrop-blur-md shadow-inner border border-white/20`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      
      <div className="flex items-end justify-between relative z-10">
        <div className="w-full">
            {typeof value === 'string' || typeof value === 'number' ? (
                <h3 className="text-3xl font-black tracking-tight whitespace-nowrap drop-shadow-md">
                  {value}
                </h3>
            ) : (
                <div className="text-3xl font-black drop-shadow-md">
                  {value}
                </div>
            )}
        </div>
        
        {trend && (
          <div className={`flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm ${trendUp ? 'text-green-300' : 'text-rose-300'}`}>
             {trend}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
