
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend, LabelList, AreaChart, Area
} from 'recharts';
import { 
  ShieldCheck, Clock, Timer, Activity, Wrench, Building, 
  Printer, Filter, X, Check, ChevronDown, Calendar, 
  ChevronLeft, ChevronRight, Info, Layers, CalendarDays
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { PreventiveEntry } from '../types';

interface PreventivePageProps {
  data: PreventiveEntry[];
  isLoading: boolean;
}

const monthsList = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const formatDetailedTime = (decimalHours: number): string => {
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const PreventivePage: React.FC<PreventivePageProps> = ({ data, isLoading }) => {
  const [selectedSetor, setSelectedSetor] = useState('Todos');
  const [selectedYear, setSelectedYear] = useState('Todos');
  const [selectedMonth, setSelectedMonth] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedEquipForDetails, setSelectedEquipForDetails] = useState<string | null>(null);
  
  const itemsPerPage = 12;

  const filters = useMemo(() => {
    const setores = new Set<string>();
    const years = new Set<string>();
    data.forEach(p => {
      if (p.setor) setores.add(p.setor);
      if (p.dataExecucao) years.add(p.dataExecucao.getFullYear().toString());
    });
    return {
      setores: ['Todos', ...Array.from(setores).sort()],
      years: ['Todos', ...Array.from(years).sort().reverse()]
    };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(p => {
      const matchesSetor = selectedSetor === 'Todos' || p.setor === selectedSetor;
      const execDate = p.dataExecucao;
      const matchesYear = selectedYear === 'Todos' || (execDate && execDate.getFullYear().toString() === selectedYear);
      const matchesMonth = selectedMonth === 'Todos' || (execDate && monthsList[execDate.getMonth()] === selectedMonth);
      return matchesSetor && matchesYear && matchesMonth;
    });
  }, [data, selectedSetor, selectedYear, selectedMonth]);

  const metrics = useMemo(() => {
    let totalTime = 0;
    const natureMap: Record<string, number> = { 'PREVENTIVA': 0, 'CORRETIVA': 0 };
    const equipMap: Record<string, number> = {};
    const dayMap: Record<string, { date: string, count: number, raw: Date }> = {};
    
    let prevCount = 0;

    filteredData.forEach(p => {
      totalTime += p.tempo;
      
      const nat = (p.natureza || 'PREVENTIVA').toUpperCase();
      if (nat.includes('PREVENTIVA')) {
          natureMap['PREVENTIVA']++;
          prevCount++;
      } else {
          natureMap['CORRETIVA']++;
      }

      const eq = p.equipamento;
      equipMap[eq] = (eq in equipMap) ? equipMap[eq] + 1 : 1;

      if (p.dataExecucao) {
        const dStr = p.dataExecucao.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (!dayMap[dStr]) dayMap[dStr] = { date: dStr, count: 0, raw: p.dataExecucao };
        dayMap[dStr].count++;
      }
    });

    return {
      total: filteredData.length,
      totalTime,
      preventiveEff: filteredData.length > 0 ? (prevCount / filteredData.length) * 100 : 0,
      avgTime: filteredData.length > 0 ? totalTime / filteredData.length : 0,
      natureChart: [
        { name: 'Preventiva', value: natureMap['PREVENTIVA'], color: '#10b981' },
        { name: 'Corretiva', value: natureMap['CORRETIVA'], color: '#ef4444' }
      ].filter(d => d.value > 0),
      equipChart: Object.entries(equipMap).map(([name, value]) => ({ 
        name, value 
      })).sort((a,b) => b.value - a.value).slice(0, 10),
      evolutionChart: Object.values(dayMap).sort((a,b) => a.raw.getTime() - b.raw.getTime()).slice(-15)
    };
  }, [filteredData]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const equipDetailEntries = useMemo(() => {
    if (!selectedEquipForDetails) return [];
    return data.filter(p => p.equipamento === selectedEquipForDetails).sort((a, b) => {
        const dateA = a.dataExecucao?.getTime() || 0;
        const dateB = b.dataExecucao?.getTime() || 0;
        return dateB - dateA;
    });
  }, [selectedEquipForDetails, data]);

  const handleConfirmPrint = () => {
    const originalTitle = document.title;
    document.title = "relatorio_preventivas_alumasa";
    setTimeout(() => { window.print(); document.title = originalTitle; }, 200);
  };

  const chartTooltipStyle = {
    contentStyle: { 
      backgroundColor: '#1e293b', 
      border: '1px solid #334155', 
      borderRadius: '12px',
      padding: '10px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
    },
    itemStyle: { 
      color: '#ffffff', 
      fontSize: '12px', 
      fontWeight: 'bold',
      textTransform: 'uppercase' as const
    },
    labelStyle: { 
      color: '#94a3b8', 
      fontSize: '10px', 
      marginBottom: '5px',
      fontWeight: '900',
      textTransform: 'uppercase' as const
    }
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse font-black text-slate-500 uppercase tracking-widest">Processando Atividades de Manutenção...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Manutenção Preventiva</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gestão de Ativos Alumasa</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white dark:bg-dark-card p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <div className="flex items-center gap-2 px-2 border-r border-gray-100 dark:border-gray-800">
                <Filter className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtros:</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Setor:</span>
               <div className="relative flex items-center bg-gray-50 dark:bg-slate-800 rounded-lg px-2 py-1.5 border border-gray-200 dark:border-gray-700 min-w-[110px]">
                  <Building className="w-3 h-3 text-slate-400 mr-2" />
                  <select 
                    value={selectedSetor} 
                    onChange={(e) => setSelectedSetor(e.target.value)} 
                    className="bg-transparent text-xs font-black text-slate-800 dark:text-white outline-none cursor-pointer appearance-none pr-4 w-full"
                  >
                    {filters.setores.map(s => <option key={s} value={s} className="dark:bg-slate-800">{s}</option>)}
                  </select>
                  <ChevronDown className="absolute right-1 w-3 h-3 text-slate-400 pointer-events-none" />
               </div>
            </div>
            <div className="flex items-center gap-2 border-l border-gray-100 dark:border-gray-800 pl-2">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ano:</span>
               <div className="relative flex items-center bg-gray-50 dark:bg-slate-800 rounded-lg px-2 py-1.5 border border-gray-200 dark:border-gray-700 min-w-[90px]">
                  <Calendar className="w-3 h-3 text-slate-400 mr-2" />
                  <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(e.target.value)} 
                    className="bg-transparent text-xs font-black text-slate-800 dark:text-white outline-none cursor-pointer appearance-none pr-4 w-full"
                  >
                    {filters.years.map(y => <option key={y} value={y} className="dark:bg-slate-800">{y}</option>)}
                  </select>
                  <ChevronDown className="absolute right-1 w-3 h-3 text-slate-400 pointer-events-none" />
               </div>
            </div>
            <div className="flex items-center gap-2 border-l border-gray-100 dark:border-gray-800 pl-2">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mês:</span>
               <div className="relative flex items-center bg-gray-50 dark:bg-slate-800 rounded-lg px-2 py-1.5 border border-gray-200 dark:border-gray-700 min-w-[110px]">
                  <CalendarDays className="w-3 h-3 text-slate-400 mr-2" />
                  <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)} 
                    className="bg-transparent text-xs font-black text-slate-800 dark:text-white outline-none cursor-pointer appearance-none pr-4 w-full"
                  >
                    <option value="Todos" className="dark:bg-slate-800">Todos</option>
                    {monthsList.map(m => <option key={m} value={m} className="dark:bg-slate-800">{m}</option>)}
                  </select>
                  <ChevronDown className="absolute right-1 w-3 h-3 text-slate-400 pointer-events-none" />
               </div>
            </div>
          </div>
          <button onClick={() => setShowPrintPreview(true)} className="bg-white dark:bg-dark-card border border-gray-700 p-2.5 rounded-xl flex items-center gap-2 font-black transition-all hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 shadow-sm">
            <Printer className="w-4 h-4 text-rose-500" /> Relatório
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <StatCard title="TOTAL INTERVENÇÕES" value={metrics.total} icon={Activity} color="blue" />
        <StatCard title="TEMPO EM MANUTENÇÃO" value={formatDetailedTime(metrics.totalTime)} icon={Clock} color="purple" />
        <StatCard title="MÉDIA POR CHAMADO" value={formatDetailedTime(metrics.avgTime)} icon={Timer} color="green" />
        <StatCard title="EFICIÊNCIA PREVENTIVA" value={`${metrics.preventiveEff.toFixed(1)}%`} icon={ShieldCheck} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <div className="lg:col-span-1 bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-800">
          <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-6 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" /> Atendimento por Equipamento
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.equipChart} layout="vertical" margin={{ left: 10, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={90} tick={{fontSize: 9, fontWeight: '900', fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar 
                  dataKey="value" 
                  name="Volume"
                  fill="#3b82f6" 
                  radius={[0, 4, 4, 0]} 
                  barSize={18} 
                  className="cursor-pointer"
                  onClick={(d) => { if (d && d.name) setSelectedEquipForDetails(d.name); }}
                >
                  <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 'black', fill: '#3b82f6' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col">
          <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-6 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" /> Distribuição por Natureza
          </h3>
          <div className="flex-1 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={metrics.natureChart} 
                  innerRadius={60} 
                  outerRadius={85} 
                  paddingAngle={5} 
                  dataKey="value" 
                  stroke="none"
                  cornerRadius={6}
                >
                  {metrics.natureChart.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  <LabelList dataKey="name" position="outside" style={{ fill: '#94a3b8', fontSize: '9px', fontWeight: 'bold' }} />
                </Pie>
                <Tooltip 
                  contentStyle={chartTooltipStyle.contentStyle}
                  itemStyle={chartTooltipStyle.itemStyle}
                />
                <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-800">
          <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Evolução de Atividades
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.evolutionChart}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="date" tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip {...chartTooltipStyle} />
                <Area type="monotone" dataKey="count" name="Quantidade" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden no-print">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Histórico Analítico de Preventivas</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total: {filteredData.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase font-black text-slate-500 tracking-widest">
              <tr>
                <th className="px-6 py-4">Data Execução</th>
                <th className="px-6 py-4">Equipamento</th>
                <th className="px-6 py-4">Atividade</th>
                <th className="px-6 py-4 text-center">Natureza</th>
                <th className="px-6 py-4 text-center">Tempo</th>
                <th className="px-6 py-4">Técnico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginatedData.map((p, i) => (
                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-white font-mono text-xs">
                    {p.dataExecucao?.toLocaleDateString('pt-BR') || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-black text-slate-800 dark:text-white uppercase text-xs">{p.equipamento}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.setor}</div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 italic max-w-xs">{p.atividade}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${p.natureza.toUpperCase().includes('CORRETIVA') ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                      {p.natureza}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-black text-blue-500">{formatDetailedTime(p.tempo)}</td>
                  <td className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px]">{p.profissional}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredData.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-slate-800">
            <span className="text-xs text-slate-400">Página {currentPage} de {totalPages}</span>
            <div className="inline-flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
        )}
      </div>

      {selectedEquipForDetails && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 no-print animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-4xl rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-2xl"><Activity className="w-6 h-6 text-indigo-500" /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase leading-none">Histórico Técnico</h2>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">{selectedEquipForDetails}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEquipForDetails(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-slate-400"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-4">
              {equipDetailEntries.map((e, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center group hover:border-indigo-500/30 transition-all">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{e.dataExecucao?.toLocaleDateString('pt-BR')}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white uppercase">{e.atividade}</p>
                    <p className="text-[11px] text-slate-500 italic uppercase">{e.profissional}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-indigo-500">{formatDetailedTime(e.tempo)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button onClick={() => setSelectedEquipForDetails(null)} className="px-8 py-3 bg-slate-800 dark:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Relatório de Impressão Refatorado e Auditável */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-white overflow-auto flex flex-col print-mode-wrapper animate-in fade-in duration-300 print:bg-white">
            <div className="sticky top-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-md z-50 no-print preview-header">
                <div className="flex items-center">
                    <Printer className="mr-2 w-5 h-5" />
                    <span className="font-bold text-sm uppercase tracking-widest">Painel de Manutenção Preventiva - Relatório</span>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowPrintPreview(false)} className="px-6 py-2 bg-slate-600 hover:bg-slate-700 rounded-xl font-black text-[10px] uppercase flex items-center transition-all active:scale-95"><X className="w-4 h-4 mr-2" /> Voltar</button>
                    <button onClick={handleConfirmPrint} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-black text-[10px] uppercase flex items-center shadow-lg active:scale-95"><Check className="w-4 h-4 mr-2" /> Imprimir</button>
                </div>
            </div>
            <div className="flex-1 p-12 bg-gray-100 print:p-0 print:bg-white">
                <div className="printable-area bg-white text-black p-10 max-w-[210mm] mx-auto border border-gray-200 h-auto overflow-visible block print:border-none print:p-0 print:static print:max-w-none print:shadow-none !text-black">
                    
                    <header className="mb-8 text-center border-b-[3px] border-black pb-4 !text-black">
                        <h1 className="text-4xl font-black mb-1 !text-black">ALUMASA</h1>
                        <p className="text-lg font-bold mb-2 uppercase !text-black">Alumínio & Plástico</p>
                        <div className="bg-black text-white py-2 mb-2">
                           <h2 className="text-xl font-black uppercase tracking-wider">RELATÓRIO DE MANUTENÇÃO PREVENTIVA</h2>
                        </div>
                        <p className="text-[10px] font-bold uppercase !text-black">Auditória Industrial • Filtros: {selectedYear} / {selectedMonth} • Setor: {selectedSetor}</p>
                    </header>
                    
                    {/* Seção 1: KPIs Principais */}
                    <section className="mb-6 !text-black">
                       <h3 className="text-[10px] font-black uppercase mb-1 bg-gray-100 text-black p-2 border border-black">1. INDICADORES EXECUTIVOS (KPIS)</h3>
                       <table className="w-full text-[11px] border-collapse border border-black !text-black">
                          <tbody>
                             <tr className="border-b border-black">
                                <td className="p-2 border-r border-black font-black w-1/3 bg-gray-50">Total Intervenções</td>
                                <td className="p-2 font-black !text-black">{metrics.total} atendimentos</td>
                                <td className="p-2 border-l border-black font-black w-1/4 bg-gray-50">Eficiência Prev.</td>
                                <td className="p-2 font-black !text-black">{metrics.preventiveEff.toFixed(1)}%</td>
                             </tr>
                             <tr className="border-b border-black">
                                <td className="p-2 border-r border-black font-black bg-gray-50">Tempo Total em Serviço</td>
                                <td className="p-2 font-black !text-black">{formatDetailedTime(metrics.totalTime)}</td>
                                <td className="p-2 border-l border-black font-black bg-gray-50">Média Atendimento</td>
                                <td className="p-2 font-black !text-black">{formatDetailedTime(metrics.avgTime)}</td>
                             </tr>
                          </tbody>
                       </table>
                    </section>

                    {/* Seção 2: Distribuição por Natureza */}
                    <section className="mb-6 !text-black no-break-inside">
                        <h3 className="text-[10px] font-black uppercase mb-1 bg-gray-100 text-black p-2 border border-black">2. DISTRIBUIÇÃO POR NATUREZA DE SERVIÇO</h3>
                        <table className="w-full text-[11px] border-collapse border border-black !text-black">
                           <thead>
                              <tr className="bg-gray-50">
                                 <th className="border border-black p-2 text-left font-black">NATUREZA</th>
                                 <th className="border border-black p-2 text-center font-black">VOLUME</th>
                                 <th className="border border-black p-2 text-center font-black">PARTICIPAÇÃO (%)</th>
                              </tr>
                           </thead>
                           <tbody>
                              {metrics.natureChart.map((n, i) => (
                                <tr key={i} className="border-b border-black">
                                   <td className="border-r border-black p-2 font-bold uppercase">{n.name}</td>
                                   <td className="border-r border-black p-2 text-center font-black">{n.value}</td>
                                   <td className="p-2 text-center font-black">{((n.value / metrics.total) * 100).toFixed(1)}%</td>
                                </tr>
                              ))}
                           </tbody>
                        </table>
                    </section>

                    {/* Seção 3: Ranking Equipamentos */}
                    <section className="mb-6 !text-black no-break-inside">
                        <h3 className="text-[10px] font-black uppercase mb-1 bg-gray-100 text-black p-2 border border-black">3. RANKING DE ATENDIMENTO POR EQUIPAMENTO (TOP 10)</h3>
                        <table className="w-full text-[11px] border-collapse border border-black !text-black">
                           <thead>
                              <tr className="bg-gray-50">
                                 <th className="border border-black p-2 text-left font-black">EQUIPAMENTO</th>
                                 <th className="border border-black p-2 text-center font-black">INTERVENÇÕES</th>
                                 <th className="border border-black p-2 text-center font-black">DEMANDA (%)</th>
                              </tr>
                           </thead>
                           <tbody>
                              {metrics.equipChart.map((e, i) => (
                                <tr key={i} className="border-b border-black">
                                   <td className="border-r border-black p-2 font-bold uppercase">{e.name}</td>
                                   <td className="border-r border-black p-2 text-center font-black">{e.value}</td>
                                   <td className="p-2 text-center font-black">{((e.value / metrics.total) * 100).toFixed(1)}%</td>
                                </tr>
                              ))}
                           </tbody>
                        </table>
                    </section>

                    {/* Seção 4: Log de Atividades */}
                    <section className="mb-10 !text-black">
                        <h3 className="text-[10px] font-black uppercase mb-1 bg-black text-white p-2 border border-black">4. DETALHAMENTO ANALÍTICO DAS ATIVIDADES</h3>
                        <table className="w-full text-[9px] border-collapse border border-black !text-black">
                           <thead>
                              <tr className="bg-gray-50">
                                 <th className="border border-black p-2 text-left font-black">DATA</th>
                                 <th className="border border-black p-2 text-left font-black">EQUIPAMENTO</th>
                                 <th className="border border-black p-2 text-left font-black">ATIVIDADE</th>
                                 <th className="border border-black p-2 text-center font-black">TEMPO</th>
                                 <th className="border border-black p-2 text-left font-black">TÉCNICO</th>
                              </tr>
                           </thead>
                           <tbody>
                              {filteredData.map((p, i) => (
                                <tr key={i} className="border-b border-black" style={{ pageBreakInside: 'avoid' }}>
                                   <td className="border-r border-black p-1.5 font-bold font-mono">{p.dataExecucao?.toLocaleDateString('pt-BR')}</td>
                                   <td className="border-r border-black p-1.5 uppercase font-bold">{p.equipamento}</td>
                                   <td className="border-r border-black p-1.5 italic line-clamp-2">{p.atividade}</td>
                                   <td className="border-r border-black p-1.5 text-center font-black">{formatDetailedTime(p.tempo)}</td>
                                   <td className="p-1.5 uppercase font-bold">{p.profissional}</td>
                                </tr>
                              ))}
                           </tbody>
                        </table>
                    </section>

                    <footer className="mt-20 pt-10 flex justify-between gap-24 no-break-inside !text-black">
                        <div className="text-center flex-1"><div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase">Responsável PCM / Manutenção</div></div>
                        <div className="text-center flex-1"><div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase">Gerência Industrial</div></div>
                    </footer>
                    
                    <div className="mt-6 text-center text-[7px] font-bold text-gray-500 uppercase tracking-widest no-break-inside">
                        Relatório Gerencial Emitido em {new Date().toLocaleString('pt-BR')} • Sistema Alumasa Industrial
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default PreventivePage;
