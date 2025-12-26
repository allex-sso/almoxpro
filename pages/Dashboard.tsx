
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, TrendingUp, Activity, AlertTriangle, Calendar, TrendingDown, Filter, X } from 'lucide-react';
import StatCard from '../components/StatCard';
import { DashboardStats, InventoryItem, Movement } from '../types';

interface DashboardProps {
  data: InventoryItem[];
  stats: DashboardStats;
  movements?: Movement[];
  isLoading?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ data, movements = [], isLoading = false }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  const hasFinancialData = useMemo(() => {
    return data.some(i => i.valorUnitario > 0);
  }, [data]);

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

  const { flowData, totals } = useMemo(() => {
    const now = new Date();
    // Limite de segurança: 24 horas no futuro para tolerar fusos horários, mas ignorar 2034.
    const futureLimit = now.getTime() + (24 * 60 * 60 * 1000);

    const filteredMovements = movements.filter(m => {
      if (!m.data) return false;
      const moveTime = m.data.getTime();
      
      // FILTRO CRÍTICO: Ignorar erros de digitação (Datas muito no futuro)
      if (moveTime > futureLimit) return false;

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

    const priceMap = new Map<string, number>();
    data.forEach(i => {
      priceMap.set(i.codigo, i.valorUnitario || 0);
    });

    let countIn = 0;
    let countOut = 0;
    
    const grouped: Record<string, { dateIso: string, displayDate: string, entrada: number, saida: number }> = {};

    filteredMovements.forEach(m => {
      if (m.tipo === 'entrada') countIn += 1; 
      if (m.tipo === 'saida') countOut += 1;

      const qty = Number(m.quantidade) || 0;
      let flowValue = 0;
      
      const dateIso = m.data.toISOString().split('T')[0];
      const displayDate = m.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      
      if (!grouped[dateIso]) {
        grouped[dateIso] = { dateIso, displayDate, entrada: 0, saida: 0 };
      }

      if (m.tipo === 'entrada') {
          if (m.valorTotal && m.valorTotal > 0) {
            flowValue = m.valorTotal;
          } else {
             const unitPrice = m.valorUnitario || 0;
             flowValue = qty * unitPrice;
          }
          grouped[dateIso].entrada += flowValue;
      } else {
          const currentUnitDetails = priceMap.get(m.codigo) || 0;
          flowValue = qty * currentUnitDetails;
          grouped[dateIso].saida += flowValue;
      }
    });

    const sortedFlow = Object.values(grouped).sort((a, b) => a.dateIso.localeCompare(b.dateIso));
    const stockTotalFinancial = data.reduce((acc, i) => acc + (i.valorTotal || 0), 0);
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

  }, [movements, data, startDate, endDate, healthData]);

  const formatMetric = (val: number, isFinancial: boolean) => 
    isFinancial 
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val)
      : val.toLocaleString('pt-BR');

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Visão Geral</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Monitoramento de fluxos ocorridos e saúde do estoque.
          </p>
        </div>
        
        <div className="bg-white dark:bg-dark-card p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center gap-3">
           <div className="flex items-center gap-2 px-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Filtrar Histórico:</span>
           </div>
           <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-1.5 border border-gray-200 dark:border-gray-700">
             <input 
               type="date" 
               className="bg-transparent text-sm text-slate-700 dark:text-white focus:outline-none" 
               value={tempStart} 
               onChange={e => setTempStart(e.target.value)} 
               onKeyDown={handleKeyDown}
             />
             <span className="text-slate-300">-</span>
             <input 
               type="date" 
               className="bg-transparent text-sm text-slate-700 dark:text-white focus:outline-none" 
               value={tempEnd} 
               onChange={e => setTempEnd(e.target.value)} 
               onKeyDown={handleKeyDown}
             />
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
        <StatCard title="Valor em Estoque" value={formatMetric(totals.stock, true)} icon={DollarSign} color="blue" />
        <StatCard title="Entradas (Qtd)" value={totals.in.toLocaleString()} icon={TrendingUp} color="green" />
        <StatCard title="Saídas (Qtd)" value={totals.out.toLocaleString()} icon={TrendingDown} color="purple" />
        <StatCard title="Itens Críticos" value={totals.critical} icon={AlertTriangle} color="red" trend="Repor" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                 <Activity className="w-5 h-5 mr-2 text-primary" />
                 Fluxo Financeiro (Apenas Movimentações Reais)
              </h3>
           </div>
           <div className="h-80">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flowData}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-gray-700" vertical={false} />
                   <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={10} tick={{ dy: 10 }} tickFormatter={(val) => val.split('/20')[0]} />
                   <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} />
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none' }}
                      formatter={(value: number) => formatMetric(value, true)}
                   />
                   <Legend verticalAlign="top" height={36}/>
                   <Bar dataKey="entrada" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                   <Bar dataKey="saida" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Saúde do Estoque</h3>
          <p className="text-xs text-slate-500 mb-6">Proporção de itens em relação ao mínimo</p>
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
