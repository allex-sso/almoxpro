
import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { DollarSign, TrendingUp, Activity, AlertTriangle, Calendar, TrendingDown, Filter, X } from 'lucide-react';
import StatCard from '../components/StatCard';
import { DashboardStats, InventoryItem, Movement } from '../types';

interface DashboardProps {
  data: InventoryItem[];
  stats: DashboardStats;
  movements?: Movement[];
  isLoading?: boolean; // Nova prop para controlar o estado visual
}

const Dashboard: React.FC<DashboardProps> = ({ data, movements = [], isLoading = false }) => {
  // Estados para o filtro "Real" (Aplicado)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Estados temporários para inputs (enquanto digita/escolhe)
  const [tempStart, setTempStart] = useState('');
  const [tempEnd, setTempEnd] = useState('');

  const applyFilters = () => {
    setStartDate(tempStart);
    setEndDate(tempEnd);
  };

  const clearFilters = () => {
    setTempStart('');
    setTempEnd('');
    setStartDate('');
    setEndDate('');
  };

  // Verifica se temos dados financeiros (se algum item tem preço > 0)
  const hasFinancialData = useMemo(() => {
    return data.some(i => i.valorUnitario > 0);
  }, [data]);

  // --- STOCK HEALTH METRICS ---
  const healthData = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let healthy = 0;

    data.forEach(item => {
      const min = item.quantidadeMinima || 0;
      if (min > 0) {
        if (item.quantidadeAtual <= min) critical++;
        else if (item.quantidadeAtual <= min * 1.2) warning++;
        else healthy++;
      } else {
        healthy++;
      }
    });

    return [
      { name: 'Crítico (Repor)', value: critical, color: '#ef4444' },
      { name: 'Atenção', value: warning, color: '#f59e0b' },
      { name: 'Saudável', value: healthy, color: '#10b981' },
    ].filter(d => d.value > 0);
  }, [data]);

  // --- CÁLCULO DE TOTAIS E FLUXO ---
  const { flowData, totals } = useMemo(() => {
    const filteredMovements = movements.filter(m => {
      const moveTime = m.data.getTime();
      if (startDate && moveTime < new Date(startDate).getTime()) return false;
      if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59);
          if (moveTime > end.getTime()) return false;
      }
      return true;
    });

    const priceMap = new Map<string, number>();
    data.forEach(i => {
      priceMap.set(i.codigo, i.valorUnitario || 0);
    });

    let countIn = 0;
    let countOut = 0;
    
    const grouped: Record<string, { date: string, entrada: number, saida: number }> = {};

    filteredMovements.forEach(m => {
      if (m.tipo === 'entrada') countIn += 1;
      if (m.tipo === 'saida') countOut += 1;

      let unitVal = 0;
      if (hasFinancialData) {
          if (m.tipo === 'entrada') {
              const mvVal = m.valorUnitario;
              unitVal = (mvVal && mvVal > 0) ? mvVal : (priceMap.get(m.codigo) || 0);
          } else {
              unitVal = priceMap.get(m.codigo) || 0;
          }
      } else {
          unitVal = 1; 
      }

      const qty = Number(m.quantidade) || 0;
      const totalValue = unitVal * qty;

      const dateKey = m.data.toLocaleDateString('pt-BR');
      if (!grouped[dateKey]) grouped[dateKey] = { date: dateKey, entrada: 0, saida: 0 };
      
      if (m.tipo === 'entrada') grouped[dateKey].entrada += totalValue;
      if (m.tipo === 'saida') grouped[dateKey].saida += totalValue;
    });

    const sortedFlow = Object.values(grouped).sort((a, b) => {
      const partsA = a.date.split('/').map(Number);
      const partsB = b.date.split('/').map(Number);
      const da = partsA[0] || 0, ma = partsA[1] || 0, ya = partsA[2] || 0;
      const db = partsB[0] || 0, mb = partsB[1] || 0, yb = partsB[2] || 0;
      return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
    });

    const stockTotalFinancial = data.reduce((acc, i) => acc + i.valorTotal, 0);
    const criticalCount = healthData.find(d => d.name.includes('Crítico'))?.value || 0;

    return {
        flowData: sortedFlow,
        totals: {
            stock: stockTotalFinancial,
            in: countIn,
            out: countOut,
            critical: criticalCount
        }
    };

  }, [movements, data, startDate, endDate, hasFinancialData, healthData]);

  // --- ABC ANALYSIS ---
  const abcData = useMemo(() => {
    const sorted = hasFinancialData 
        ? [...data].sort((a, b) => b.valorTotal - a.valorTotal)
        : [...data].sort((a, b) => (b.entradas + b.saidas) - (a.entradas + a.saidas));
    
    const totalMetric = sorted.reduce((acc, i) => acc + (hasFinancialData ? i.valorTotal : (i.entradas + i.saidas)), 0);
    
    let accum = 0;
    let countA = 0, valA = 0;
    let countB = 0, valB = 0;
    let countC = 0, valC = 0;

    sorted.forEach(item => {
      const metric = hasFinancialData ? item.valorTotal : (item.entradas + item.saidas);
      accum += metric;
      const percentage = totalMetric > 0 ? accum / totalMetric : 0;
      
      if (percentage <= 0.8) { countA++; valA += metric; }
      else if (percentage <= 0.95) { countB++; valB += metric; }
      else { countC++; valC += metric; }
    });

    return [
      { name: 'Classe A (80%)', itens: countA, valor: valA, color: '#3b82f6' },
      { name: 'Classe B (15%)', itens: countB, valor: valB, color: '#6366f1' },
      { name: 'Classe C (5%)', itens: countC, valor: valC, color: '#94a3b8' },
    ];
  }, [data, hasFinancialData]);

  const formatMetric = (val: number, isFinancial: boolean) => 
    isFinancial 
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val)
      : val.toLocaleString('pt-BR');

  // --- SKELETON LOADING COMPONENT ---
  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-80 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
          <div className="lg:col-span-3 h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Painel Executivo</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {hasFinancialData ? 'Análise financeira e operacional.' : 'Análise operacional e volumétrica (Sem valores cadastrados).'}
          </p>
        </div>
        
        {/* Painel de Filtros de Data */}
        <div className="bg-white dark:bg-dark-card p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center gap-3">
           <div className="flex items-center gap-2 px-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Período:</span>
           </div>
           
           <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-1.5 border border-gray-200 dark:border-gray-700">
             <input 
               type="date" 
               className="bg-transparent text-sm text-slate-700 dark:text-white focus:outline-none" 
               value={tempStart} 
               onChange={e => setTempStart(e.target.value)} 
             />
             <span className="text-slate-300">-</span>
             <input 
               type="date" 
               className="bg-transparent text-sm text-slate-700 dark:text-white focus:outline-none" 
               value={tempEnd} 
               onChange={e => setTempEnd(e.target.value)} 
             />
           </div>

           <div className="flex gap-2">
             <button 
               onClick={applyFilters}
               className="flex items-center px-3 py-1.5 bg-primary hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
             >
               <Filter className="w-3 h-3 mr-1" />
               Aplicar
             </button>
             {(startDate || endDate) && (
               <button 
                 onClick={clearFilters}
                 className="flex items-center px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg transition-colors"
               >
                 <X className="w-3 h-3 mr-1" />
                 Limpar
               </button>
             )}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Valor em Estoque" 
            value={formatMetric(totals.stock, true)} 
            icon={DollarSign} 
            color="blue" 
        />
        <StatCard 
            title="Itens com Entrada" 
            value={formatMetric(totals.in, false)} 
            icon={TrendingUp} 
            color="green" 
            trendUp={true}
        />
        <StatCard 
            title="Itens com Saída" 
            value={formatMetric(totals.out, false)} 
            icon={TrendingDown} 
            color="purple" 
            trendUp={false}
        />
        <StatCard 
            title="Itens Críticos" 
            value={formatMetric(totals.critical, false)} 
            icon={AlertTriangle} 
            color="red" 
            trend="Repor"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                 <Activity className="w-5 h-5 mr-2 text-primary" />
                 {hasFinancialData ? 'Fluxo Financeiro (R$)' : 'Fluxo de Movimentação (Qtd)'}
              </h3>
           </div>
           <div className="h-80">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={flowData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                   <defs>
                     <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                       <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                     </linearGradient>
                     <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                       <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-gray-700" />
                   <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                   <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : `${val}`} />
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: number) => formatMetric(value, hasFinancialData)}
                   />
                   <Legend />
                   <Area type="monotone" dataKey="entrada" name="Entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorIn)" strokeWidth={2} />
                   <Area type="monotone" dataKey="saida" name="Saídas" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorOut)" strokeWidth={2} />
                </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Saúde do Estoque</h3>
          <p className="text-xs text-slate-500 mb-6">Itens vs Mínimo</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={healthData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {healthData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#fff' }} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-[-10px]">
             <span className="text-3xl font-bold text-slate-800 dark:text-white">{data.length}</span>
             <p className="text-xs text-slate-500">Itens Totais</p>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
           <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Curva ABC ({hasFinancialData ? 'Valor' : 'Movimentação'})</h3>
           <p className="text-sm text-slate-500 mb-6">
             {hasFinancialData ? 'Classificação por valor investido.' : 'Classificação por volume de movimentação (Peças).'}
           </p>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={abcData} margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-gray-700" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : `${val}`} />
                  <YAxis dataKey="name" type="category" width={140} stroke="#94a3b8" fontSize={12} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#fff' }} formatter={(value: number) => formatMetric(value, hasFinancialData)} />
                  <Bar dataKey="valor" name="Volume" radius={[0, 4, 4, 0]} barSize={30}>
                    {abcData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
