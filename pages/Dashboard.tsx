
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, TrendingUp, Activity, AlertTriangle, Calendar, TrendingDown, Filter, X, Info, Package } from 'lucide-react';
import StatCard from '../components/StatCard';
import { DashboardStats, InventoryItem, Movement } from '../types';

interface DashboardProps {
  data: InventoryItem[];
  stats: DashboardStats;
  movements?: Movement[];
  isLoading?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ data, stats, movements = [], isLoading = false }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tempStart, setTempStart] = useState('');
  const [tempEnd, setTempEnd] = useState('');
  const [viewType, setViewType] = useState<'financial' | 'quantity'>('quantity');

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

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

  // --- CÁLCULO DO VALOR REAL EM ESTOQUE (FLUXO FINANCEIRO) ---
  // Seguindo a solicitação: (Soma das Entradas) - (Soma das Saídas)
  const stockTotalFinancial = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    
    movements.forEach(m => {
      const val = m.valorTotal || (m.quantidade * (m.valorUnitario || 0));
      if (m.tipo === 'entrada') {
        totalIn += val;
      } else if (m.tipo === 'saida') {
        totalOut += val;
      }
    });
    
    // Retorna a diferença, garantindo que não seja negativa (mínimo 0)
    return Math.max(0, totalIn - totalOut);
  }, [movements]);

  const { flowData, totals } = useMemo(() => {
    const filteredMovements = movements.filter(m => {
      if (!startDate && !endDate) return true;
      if (!m.data || isNaN(m.data.getTime())) return false;
      const moveTime = m.data.getTime();
      if (startDate) {
          const [sy, sm, sd] = startDate.split('-').map(Number);
          const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0).getTime();
          if (moveTime < start) return false;
      }
      if (endDate) {
          const [ey, em, ed] = endDate.split('-').map(Number);
          const end = new Date(ey, em - 1, ed, 23, 59, 59, 999).getTime();
          if (moveTime > end) return false;
      }
      return true;
    });

    let recordsInTotal = 0;
    let recordsOutTotal = 0;
    const grouped: Record<string, { dateIso: string, displayDate: string, entradaFinanceiro: number, saidaFinanceiro: number, entradaQtd: number, saidaQtd: number }> = {};

    filteredMovements.forEach(m => {
      if (m.tipo === 'entrada') recordsInTotal++; 
      if (m.tipo === 'saida') recordsOutTotal++;
      const d = m.data || new Date();
      const dateIso = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!grouped[dateIso]) {
        grouped[dateIso] = { dateIso, displayDate, entradaFinanceiro: 0, saidaFinanceiro: 0, entradaQtd: 0, saidaQtd: 0 };
      }
      const valTotal = m.valorTotal || (m.quantidade * (m.valorUnitario || 0));
      if (m.tipo === 'entrada') {
          grouped[dateIso].entradaFinanceiro += valTotal;
          grouped[dateIso].entradaQtd += 1;
      } else {
          grouped[dateIso].saidaFinanceiro += valTotal;
          grouped[dateIso].saidaQtd += 1;
      }
    });

    const sortedFlow = Object.values(grouped).sort((a, b) => a.dateIso.localeCompare(b.dateIso));
    const criticalCount = healthData.find(d => d.name.includes('Crítico'))?.value || 0;

    return {
        flowData: sortedFlow,
        totals: {
            in: recordsInTotal,
            out: recordsOutTotal,
            critical: criticalCount
        }
    };
  }, [movements, startDate, endDate, healthData]);

  const formatValue = (val: number, isFinancial: boolean) => 
    isFinancial 
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val)
      : val.toLocaleString('pt-BR');

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="h-20 w-full bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse"></div>
        <div className="grid grid-cols-4 gap-6">
           {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Visão Geral</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Monitoramento de fluxos e saúde do estoque.</p>
        </div>
        
        <div className="bg-white dark:bg-dark-card p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center gap-3 no-print">
           <div className="flex items-center gap-2 px-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Filtrar Histórico:</span>
           </div>
           <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-1.5 border border-gray-200 dark:border-gray-700">
             <input type="date" className="bg-transparent text-sm text-slate-700 dark:text-white focus:outline-none" value={tempStart} onChange={e => setTempStart(e.target.value)} onKeyDown={handleKeyDown}/>
             <span className="text-slate-300">-</span>
             <input type="date" className="bg-transparent text-sm text-slate-700 dark:text-white focus:outline-none" value={tempEnd} onChange={e => setTempEnd(e.target.value)} onKeyDown={handleKeyDown}/>
           </div>
           <div className="flex gap-2">
             <button onClick={applyFilters} className="flex items-center px-3 py-1.5 bg-primary hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
               <Filter className="w-3 h-3 mr-1" /> Aplicar
             </button>
             {(startDate || endDate) && (
               <button onClick={clearFilters} className="flex items-center px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg transition-colors">
                 <X className="w-3 h-3 mr-1" /> Limpar
               </button>
             )}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Valor em Estoque" value={formatValue(stockTotalFinancial, true)} icon={DollarSign} color="blue" />
        <StatCard title="Entradas (Lançamentos)" value={formatValue(totals.in, false)} icon={TrendingUp} color="green" />
        <StatCard title="Saídas (Lançamentos)" value={formatValue(totals.out, false)} icon={TrendingDown} color="purple" />
        <StatCard title="Itens Críticos" value={totals.critical} icon={AlertTriangle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                 <Activity className="w-5 h-5 mr-2 text-primary" />
                 Fluxo de Movimentações
              </h3>
              
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button onClick={() => setViewType('quantity')} className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewType === 'quantity' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Package className="w-3.5 h-3.5 mr-1.5" /> Registros
                </button>
                <button onClick={() => setViewType('financial')} className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewType === 'financial' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Financeiro
                </button>
              </div>
           </div>

           <div className="h-80">
             {flowData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={flowData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-gray-700" vertical={false} />
                    <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={10} tick={{ dy: 10 }} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none' }} formatter={(value: number) => viewType === 'financial' ? formatValue(value, true) : `${value} Reg.`}/>
                    <Legend verticalAlign="top" height={36}/>
                    <Bar dataKey={viewType === 'financial' ? 'entradaFinanceiro' : 'entradaQtd'} name={viewType === 'financial' ? 'Entradas (R$)' : 'Entradas (Registros)'} fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey={viewType === 'financial' ? 'saidaFinanceiro' : 'saidaQtd'} name={viewType === 'financial' ? 'Saídas (R$)' : 'Saídas (Registros)'} fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Info className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-sm font-medium">Nenhuma movimentação histórica encontrada.</p>
                </div>
             )}
           </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Saúde do Estoque</h3>
          <p className="text-xs text-slate-500 mb-6">Itens em relação ao estoque mínimo</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={healthData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {healthData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-[-10px]">
             <span className="text-3xl font-bold text-slate-800 dark:text-white">{data.length}</span>
             <p className="text-xs text-slate-500">Total de Itens Ativos</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
