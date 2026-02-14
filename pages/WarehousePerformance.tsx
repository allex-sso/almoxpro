
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend, LineChart, Line, LabelList
} from 'recharts';
import { 
  TrendingUp, BarChart3, Layers, PieChart as PieIcon, Package, Activity, 
  ArrowUpRight, ArrowDownRight, RefreshCw, ShoppingBag, ShoppingCart, Filter
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { InventoryItem, Movement } from '../types';

interface WarehousePerformanceProps {
  data: InventoryItem[];
  movements: Movement[];
  isLoading: boolean;
}

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const COLORS_MAP: Record<string, string> = {
  'MUDAR ENDERECO': '#3b82f6',
  'MOVER P/ PICKING': '#10b981',
};

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0].payload;
    const description = dataItem.desc || label;
    const code = dataItem.name || label;

    return (
      <div className="bg-[#1e293b]/95 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
        <p className="text-white text-[11px] font-black mb-1 uppercase tracking-tight leading-tight">
          {description}
        </p>
        {description !== code && (
           <p className="text-slate-500 text-[9px] font-bold mb-3 uppercase tracking-widest">
             CÓDIGO: {code}
           </p>
        )}
        <div className="space-y-1 border-t border-slate-700/50 pt-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
                <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">{entry.name}:</span>
              </div>
              <span className="text-white text-xs font-black">
                {typeof entry.value === 'number' ? entry.value.toLocaleString('pt-BR') : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const WarehousePerformance: React.FC<WarehousePerformanceProps> = ({ data, movements, isLoading }) => {
  const [selectedYear, setSelectedYear] = useState<string>('Todos');
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');

  const years = useMemo(() => {
    const y = new Set<string>();
    movements.forEach(m => y.add(m.data.getFullYear().toString()));
    return ['Todos', ...Array.from(y).sort().reverse()];
  }, [movements]);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const yearMatch = selectedYear === 'Todos' || m.data.getFullYear().toString() === selectedYear;
      const monthMatch = selectedMonth === 'Todos' || months[m.data.getMonth()] === selectedMonth;
      return yearMatch && monthMatch;
    });
  }, [movements, selectedYear, selectedMonth]);

  const performanceMetrics = useMemo(() => {
    const monthlyOuts: Record<string, number> = {};
    filteredMovements.filter(m => m.tipo === 'saida').forEach(m => {
        const key = m.data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        monthlyOuts[key] = (monthlyOuts[key] || 0) + m.quantidade;
    });

    const totalStockQty = data.reduce((acc, item) => acc + item.quantidadeAtual, 0);
    
    const turnoverHistory = Object.entries(monthlyOuts).map(([date, outQty]) => ({
        date,
        turnover: totalStockQty > 0 ? Number((outQty / totalStockQty).toFixed(2)) : 0
    })).slice(-12);

    const sectorMap: Record<string, number> = {};
    data.forEach(item => {
        const sector = (item.setor || 'N/D').toUpperCase();
        sectorMap[sector] = (sectorMap[sector] || 0) + item.quantidadeAtual;
    });
    const stockBySector = Object.entries(sectorMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const topStockItems = [...data]
        .sort((a, b) => b.quantidadeAtual - a.quantidadeAtual)
        .slice(0, 10)
        .map(item => ({
            name: item.codigo,
            desc: item.descricao,
            value: item.quantidadeAtual
        }));

    const skuConsumptionMap: Record<string, number> = {};
    filteredMovements.filter(m => m.tipo === 'saida').forEach(m => {
        skuConsumptionMap[m.codigo] = (skuConsumptionMap[m.codigo] || 0) + m.quantidade;
    });
    const consumptionBySku = Object.entries(skuConsumptionMap)
        .map(([code, value]) => {
            const item = data.find(i => i.codigo === code);
            return { 
                name: code, 
                desc: item?.descricao || 'Descrição não disponível',
                value 
            };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 15);

    const moveTypeMap: Record<string, number> = {};
    filteredMovements.filter(m => m.tipo === 'transferencia').forEach(m => {
        let typeRaw = (m.movimentoTipo || 'MUDAR ENDERECO').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let type = typeRaw.includes("PICKING") ? "MOVER P/ PICKING" : "MUDAR ENDERECO";
        moveTypeMap[type] = (moveTypeMap[type] || 0) + m.quantidade;
    });
    const movesByType = Object.entries(moveTypeMap)
        .map(([name, value]) => ({ 
            name, 
            value,
            color: COLORS_MAP[name] || DEFAULT_COLORS[0] 
        }))
        .sort((a, b) => b.value - a.value);

    return {
      currentTurnover: turnoverHistory.length > 0 ? turnoverHistory[turnoverHistory.length - 1].turnover : 0,
      turnoverHistory,
      stockBySector,
      topStockItems,
      consumptionBySku,
      movesByType
    };
  }, [data, filteredMovements]);

  if (isLoading) return <div className="p-10 text-center animate-pulse font-black text-slate-500 uppercase tracking-widest">Calculando Indicadores de Performance...</div>;

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Performance</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Análise volumétrica e eficiência de giro do almoxarifado.</p>
        </div>

        <div className="bg-[#1e293b] p-1.5 rounded-xl flex items-center gap-6 border border-slate-700 shadow-xl">
          <Filter className="w-3.5 h-3.5 text-blue-500 ml-2" />
          
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ano:</span>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer">
              {years.map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-700 pl-6">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Mês:</span>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer">
              <option value="Todos" className="bg-slate-900">Todos</option>
              {months.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1">
           <StatCard 
             title="GIRO DE ESTOQUE (ÍNDICE)" 
             value={performanceMetrics.currentTurnover} 
             icon={RefreshCw} 
             color="blue"
             trend={`${(performanceMetrics.currentTurnover * 100).toFixed(0)}% Efic.`}
             trendUp={performanceMetrics.currentTurnover > 0.5}
           />
        </div>
        <div className="lg:col-span-3 bg-[#1e293b] rounded-[1.8rem] p-6 border border-slate-800 shadow-2xl flex flex-col h-full">
           <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Evolução Histórica do Giro</h3>
           </div>
           <div className="flex-1 h-[140px]">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={performanceMetrics.turnoverHistory}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                 <XAxis dataKey="date" tick={{fontSize: 8, fontWeight: 'bold', fill: '#64748b'}} axisLine={false} tickLine={false} />
                 <YAxis hide domain={[0, 'auto']} />
                 <Tooltip content={<CustomTooltip />} />
                 <Line type="monotone" dataKey="turnover" name="Índice de Giro" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1e293b] rounded-[2rem] p-8 border border-slate-800 shadow-2xl">
           <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-emerald-500/10 rounded-2xl"><Layers className="w-6 h-6 text-emerald-500" /></div>
              <div>
                 <h3 className="text-sm font-black text-white uppercase tracking-tight">Concentração de Estoque por Setor</h3>
                 <p className="text-[9px] font-bold text-slate-500 uppercase">Volume total de peças armazenadas por destinação.</p>
              </div>
           </div>
           <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={performanceMetrics.stockBySector} margin={{ bottom: 30 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                 <XAxis dataKey="name" tick={{fontSize: 8, fontWeight: 'black', fill: '#94a3b8'}} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={60} />
                 <YAxis hide />
                 <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} content={<CustomTooltip />} />
                 <Bar dataKey="value" name="Volume Peças" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40}>
                    <LabelList dataKey="value" position="top" formatter={(v: number) => v.toLocaleString('pt-BR')} style={{ fill: '#10b981', fontSize: 10, fontWeight: 'black' }} />
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-[#1e293b] rounded-[2rem] p-8 border border-slate-800 shadow-2xl">
           <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-amber-500/10 rounded-2xl"><Package className="w-6 h-6 text-amber-500" /></div>
              <div>
                 <h3 className="text-sm font-black text-white uppercase tracking-tight">Top 10 SKUs (Maior Saldo)</h3>
                 <p className="text-[9px] font-bold text-slate-500 uppercase">Itens com maior profundidade de estoque no pulmão/reserva.</p>
              </div>
           </div>
           <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={performanceMetrics.topStockItems} layout="vertical" margin={{ left: 40, right: 80 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.1} />
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 9, fontWeight: 'bold', fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                 <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} content={<CustomTooltip />} />
                 <Bar dataKey="value" name="Saldo Atual" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={18}>
                    <LabelList dataKey="value" position="right" formatter={(v: number) => v.toLocaleString('pt-BR')} style={{ fill: '#f59e0b', fontSize: 10, fontWeight: 'black' }} offset={10} />
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1e293b] rounded-[2rem] p-8 border border-slate-800 shadow-2xl">
           <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-blue-500/10 rounded-2xl"><ShoppingCart className="w-6 h-6 text-blue-500" /></div>
              <div>
                 <h3 className="text-sm font-black text-white uppercase tracking-tight">Consumo Analítico por SKU (Saídas)</h3>
                 <p className="text-[9px] font-bold text-slate-500 uppercase">Ranking de itens com maior volume de requisição no período.</p>
              </div>
           </div>
           <div className="h-[350px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={performanceMetrics.consumptionBySku}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                 <XAxis dataKey="name" tick={{fontSize: 8, fontWeight: 'black', fill: '#94a3b8'}} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={60} />
                 <YAxis hide />
                 <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} content={<CustomTooltip />} />
                 <Bar dataKey="value" name="Qtd Saída" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25}>
                    <LabelList dataKey="value" position="top" formatter={(v: number) => v.toLocaleString('pt-BR')} style={{ fill: '#3b82f6', fontSize: 10, fontWeight: 'black' }} />
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-[#1e293b] rounded-[2rem] p-8 border border-slate-800 shadow-2xl flex flex-col">
           <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-purple-500/10 rounded-2xl"><RefreshCw className="w-6 h-6 text-purple-500" /></div>
              <div>
                 <h3 className="text-sm font-black text-white uppercase tracking-tight">Mix de Atividade WMS</h3>
                 <p className="text-[9px] font-bold text-slate-500 uppercase">Volume de peças por tipo de movimentação interna.</p>
              </div>
           </div>
           <div className="flex-1 min-h-[250px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie 
                      data={performanceMetrics.movesByType} 
                      innerRadius={70} 
                      outerRadius={100} 
                      paddingAngle={8} 
                      dataKey="value" 
                      stroke="none"
                      cornerRadius={6}
                    >
                       {performanceMetrics.movesByType.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.color} />
                       ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center" 
                      iconType="circle" 
                      wrapperStyle={{ fontSize: '9px', fontWeight: 'black', textTransform: 'uppercase', paddingTop: '20px' }} 
                    />
                 </PieChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
};

export default WarehousePerformance;
