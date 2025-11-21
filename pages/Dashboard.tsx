import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  PieChart, Pie, Cell, BarChart, Bar, ComposedChart, Line 
} from 'recharts';
import { Package, DollarSign, TrendingUp, Activity, AlertTriangle, Calendar, Filter, TrendingDown } from 'lucide-react';
import StatCard from '../components/StatCard';
import { DashboardStats, InventoryItem, Movement } from '../types';

interface DashboardProps {
  data: InventoryItem[];
  stats: DashboardStats;
  movements?: Movement[];
}

const Dashboard: React.FC<DashboardProps> = ({ data, movements = [] }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- STOCK HEALTH METRICS (DONUT CHART) ---
  const healthData = useMemo(() => {
    let critical = 0; // Abaixo do mínimo
    let warning = 0;  // Próximo do mínimo (até 20% acima)
    let healthy = 0;  // Acima

    data.forEach(item => {
      const min = item.quantidadeMinima || 0;
      if (min > 0) {
        if (item.quantidadeAtual <= min) critical++;
        else if (item.quantidadeAtual <= min * 1.2) warning++;
        else healthy++;
      } else {
        healthy++; // Sem mínimo definido, considera saudável se tem estoque
      }
    });

    return [
      { name: 'Crítico (Repor)', value: critical, color: '#ef4444' },
      { name: 'Atenção', value: warning, color: '#f59e0b' },
      { name: 'Saudável', value: healthy, color: '#10b981' },
    ].filter(d => d.value > 0);
  }, [data]);

  // --- FINANCIAL FLOW (AREA CHART) ---
  const financialFlowData = useMemo(() => {
    if (!movements.length) return [];

    // Map item values
    const priceMap = new Map(data.map(i => [i.codigo, i.valorUnitario || 0] as [string, number]));

    // Group by date
    const grouped: Record<string, { date: string, entradaVal: number, saidaVal: number }> = {};

    movements.forEach(m => {
      // Filter by date range if set
      const moveTime = new Date(m.data).getTime();
      if (startDate && moveTime < new Date(startDate).getTime()) return;
      if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59);
          if (moveTime > end.getTime()) return;
      }

      const dateKey = m.data.toLocaleDateString('pt-BR');
      const unitVal = Number(priceMap.get(m.codigo) || 0);
      const value = unitVal * Number(m.quantidade);

      if (!grouped[dateKey]) grouped[dateKey] = { date: dateKey, entradaVal: 0, saidaVal: 0 };
      
      if (m.tipo === 'entrada') grouped[dateKey].entradaVal += value;
      if (m.tipo === 'saida') grouped[dateKey].saidaVal += value;
    });

    // Sort by date
    return Object.values(grouped).sort((a, b) => {
      const partsA = a.date.split('/').map(Number);
      const partsB = b.date.split('/').map(Number);

      // Ensure we have values for date components to avoid arithmetic on undefined
      const da = partsA[0] || 0;
      const ma = partsA[1] || 0;
      const ya = partsA[2] || 0;

      const db = partsB[0] || 0;
      const mb = partsB[1] || 0;
      const yb = partsB[2] || 0;

      return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
    });
  }, [movements, data, startDate, endDate]);

  // --- ABC ANALYSIS (PARETO) ---
  const abcData = useMemo(() => {
    // Sort items by Total Value desc
    const sorted = [...data].sort((a, b) => b.valorTotal - a.valorTotal);
    const totalStockValue = sorted.reduce((acc, i) => acc + i.valorTotal, 0);
    
    let accumValue = 0;
    let countA = 0, valA = 0;
    let countB = 0, valB = 0;
    let countC = 0, valC = 0;

    sorted.forEach(item => {
      accumValue += item.valorTotal;
      const percentage = accumValue / totalStockValue;
      
      if (percentage <= 0.8) {
        countA++; valA += item.valorTotal;
      } else if (percentage <= 0.95) {
        countB++; valB += item.valorTotal;
      } else {
        countC++; valC += item.valorTotal;
      }
    });

    return [
      { name: 'Classe A (80% Valor)', itens: countA, valor: valA, color: '#3b82f6' },
      { name: 'Classe B (15% Valor)', itens: countB, valor: valB, color: '#6366f1' },
      { name: 'Classe C (5% Valor)', itens: countC, valor: valC, color: '#94a3b8' },
    ];
  }, [data]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  // Calculate Filtered Totals for Cards
  const totals = useMemo(() => {
    let inVal = 0, outVal = 0;
    if (financialFlowData.length > 0) {
        inVal = financialFlowData.reduce((acc, d) => acc + d.entradaVal, 0);
        outVal = financialFlowData.reduce((acc, d) => acc + d.saidaVal, 0);
    } else {
        // Fallback to static data
        inVal = data.reduce((acc, i) => acc + (i.entradas * i.valorUnitario), 0);
        outVal = data.reduce((acc, i) => acc + (i.saidas * i.valorUnitario), 0);
    }
    
    const criticalCount = healthData.find(d => d.name.includes('Crítico'))?.value || 0;

    return {
      stockValue: data.reduce((acc, i) => acc + i.valorTotal, 0),
      inValue: inVal,
      outValue: outVal,
      criticalItems: criticalCount
    };
  }, [data, financialFlowData, healthData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Painel Executivo</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Análise financeira e operacional do estoque.
          </p>
        </div>

        <div className="bg-white dark:bg-dark-card p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-2">
           <Calendar className="w-4 h-4 text-slate-400 ml-2" />
           <input 
             type="date" 
             className="bg-transparent text-sm text-slate-700 dark:text-white focus:outline-none"
             value={startDate}
             onChange={e => setStartDate(e.target.value)}
           />
           <span className="text-slate-300">-</span>
           <input 
             type="date" 
             className="bg-transparent text-sm text-slate-700 dark:text-white focus:outline-none"
             value={endDate}
             onChange={e => setEndDate(e.target.value)}
           />
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Valor Total em Estoque" 
            value={formatCurrency(totals.stockValue)} 
            icon={DollarSign} 
            color="blue" 
        />
        <StatCard 
            title="Fluxo de Entradas (R$)" 
            value={formatCurrency(totals.inValue)} 
            icon={TrendingUp} 
            color="green" 
            trendUp={true}
        />
        <StatCard 
            title="Fluxo de Saídas (R$)" 
            value={formatCurrency(totals.outValue)} 
            icon={TrendingDown} 
            color="purple" 
            trendUp={false}
        />
        <StatCard 
            title="Itens Críticos" 
            value={totals.criticalItems} 
            icon={AlertTriangle} 
            color="red" 
            trend="Repor Imediatamente"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Financial Flow Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                 <Activity className="w-5 h-5 mr-2 text-primary" />
                 Fluxo Financeiro (Entradas vs Saídas)
              </h3>
           </div>
           <div className="h-80">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialFlowData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                   <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none' }}
                      formatter={(value: number) => formatCurrency(value)}
                   />
                   <Legend />
                   <Area type="monotone" dataKey="entradaVal" name="Entradas (R$)" stroke="#10b981" fillOpacity={1} fill="url(#colorIn)" strokeWidth={2} />
                   <Area type="monotone" dataKey="saidaVal" name="Saídas (R$)" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorOut)" strokeWidth={2} />
                </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Stock Health Donut */}
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Saúde do Estoque</h3>
          <p className="text-xs text-slate-500 mb-6">Baseado na Qtd Mínima definida.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {healthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none' }} 
                    itemStyle={{ color: '#333' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-[-10px]">
             <span className="text-3xl font-bold text-slate-800 dark:text-white">{data.length}</span>
             <p className="text-xs text-slate-500">Total de Itens</p>
          </div>
        </div>

        {/* ABC Analysis */}
        <div className="lg:col-span-3 bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
           <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Curva ABC (Pareto)</h3>
           <p className="text-sm text-slate-500 mb-6">Classificação de itens por valor total investido. Classe A representa 80% do capital.</p>
           
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={abcData} margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-gray-700" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `R$${val/1000}k`} />
                  <YAxis dataKey="name" type="category" width={140} stroke="#94a3b8" fontSize={12} />
                  <Tooltip 
                      cursor={{fill: 'transparent'}} 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none' }}
                      formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="valor" name="Valor Investido" radius={[0, 4, 4, 0]} barSize={30}>
                    {abcData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
           </div>
           <div className="grid grid-cols-3 gap-4 mt-4 text-center">
              {abcData.map((c, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-gray-500">{c.name.split(' ')[0]} {c.name.split(' ')[1]}</p>
                      <p className="font-bold text-lg text-slate-800 dark:text-white">{c.itens} itens</p>
                      <p className="text-xs font-medium" style={{ color: c.color }}>{formatCurrency(c.valor)}</p>
                  </div>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;