
import React, { useMemo, useState } from 'react';
import { 
  Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, Legend, Line, ComposedChart, Area, LabelList
} from 'recharts';
import { 
  Users, Building, Package, TrendingUp, Activity, ChevronDown, Calendar, 
  ClipboardList, Clock, Printer, Filter, ChevronLeft, ChevronRight, 
  Search, FileText, PieChart as PieIcon, Layers, UserCheck, MessageSquare, X, User, Check
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { Movement } from '../types';

interface CentralDashboardProps {
  data: Movement[];
  isLoading: boolean;
}

const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const CentralDashboard: React.FC<CentralDashboardProps> = ({ data, isLoading }) => {
  const [selectedYear, setSelectedYear] = useState<string>('Todos');
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');
  const [selectedSectorForModal, setSelectedSectorForModal] = useState<string | null>(null);
  const [selectedRequesterForModal, setSelectedRequesterForModal] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const years = useMemo(() => {
    const y = new Set<string>();
    data.forEach(m => y.add(m.data.getFullYear().toString()));
    return ['Todos', ...Array.from(y).sort().reverse()];
  }, [data]);

  const filteredData = useMemo(() => {
    return (data || []).filter(m => {
      const yearMatch = selectedYear === 'Todos' || m.data.getFullYear().toString() === selectedYear;
      const monthMatch = selectedMonth === 'Todos' || months[m.data.getMonth()] === selectedMonth;
      return yearMatch && monthMatch;
    });
  }, [data, selectedYear, selectedMonth]);

  const metrics = useMemo(() => {
    let totalBarras = 0;
    let t1Barras = 0;
    let t2Barras = 0;
    const solicitantesAtivosSet = new Set<string>();
    const setorMap: Record<string, number> = {};
    const motivoMap: Record<string, number> = {};
    const rankingMap: Record<string, { total: number, count: number }> = {};

    filteredData.forEach(m => {
      totalBarras += m.quantidade;
      
      // Conforme última solicitação: Solicitantes Ativos usa a coluna "Solicitante" (m.responsavel)
      const solicitante = (m.responsavel || 'N/D').trim().toUpperCase();
      if (solicitante && solicitante !== 'N/D' && solicitante !== '0' && solicitante !== '-') {
        solicitantesAtivosSet.add(solicitante);
      }

      // Turnos
      const turno = String(m.turno || '').toUpperCase();
      if (turno.includes('1')) t1Barras += m.quantidade;
      else t2Barras += m.quantidade;

      // Setores
      const setor = (m.setor || 'OUTROS').toUpperCase();
      setorMap[setor] = (setorMap[setor] || 0) + m.quantidade;

      // Motivos
      const motivo = (m.motivo || 'GERAL').toUpperCase();
      motivoMap[motivo] = (motivoMap[motivo] || 0) + m.quantidade;

      // Ranking Solicitantes
      const resp = m.responsavel || 'N/D';
      if (!rankingMap[resp]) rankingMap[resp] = { total: 0, count: 0 };
      rankingMap[resp].total += m.quantidade;
      rankingMap[resp].count += 1;
    });

    const totalTransactions = filteredData.length;
    const mediaPorSaida = totalTransactions > 0 ? (totalBarras / totalTransactions).toFixed(1) : "0";

    const chartSectors = Object.entries(setorMap)
      .map(([name, value]) => ({ 
        name, 
        value, 
        percent: totalBarras > 0 ? ((value / totalBarras) * 100).toFixed(1) : "0" 
      }))
      .sort((a, b) => b.value - a.value);

    const chartReasons = Object.entries(motivoMap)
        .map(([name, value]) => ({
            name,
            value,
            percentual: totalBarras > 0 ? Number(((value / totalBarras) * 100).toFixed(1)) : 0
        }))
        .sort((a, b) => b.value - a.value);

    const rankingData = Object.entries(rankingMap)
      .map(([name, s]) => ({
        name,
        total: s.total,
        count: s.count,
        media: (s.total / s.count).toFixed(2)
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalBarras,
      t1Barras,
      t2Barras,
      solicitantesAtivos: solicitantesAtivosSet.size,
      mediaPorSaida,
      chartSectors,
      chartReasons,
      rankingData
    };
  }, [filteredData]);

  // Lógica para os dados do modal de motivos por setor
  const sectorModalData = useMemo(() => {
    if (!selectedSectorForModal) return null;
    
    const sectorMovements = filteredData.filter(m => (m.setor || 'OUTROS').toUpperCase() === selectedSectorForModal);
    const totalBars = sectorMovements.reduce((acc, m) => acc + m.quantidade, 0);
    
    const reasonMap: Record<string, { total: number, count: number }> = {};
    sectorMovements.forEach(m => {
      const reason = (m.motivo || 'GERAL').toUpperCase();
      if (!reasonMap[reason]) reasonMap[reason] = { total: 0, count: 0 };
      reasonMap[reason].total += m.quantidade;
      reasonMap[reason].count += 1;
    });

    const reasons = Object.entries(reasonMap).map(([name, s]) => ({
      name,
      total: s.total,
      count: s.count,
      percent: totalBars > 0 ? ((s.total / totalBars) * 100).toFixed(1) : "0"
    })).sort((a, b) => b.total - a.total);

    return { name: selectedSectorForModal, totalBars, reasons };
  }, [selectedSectorForModal, filteredData]);

  // Lógica para os dados do modal de motivos por solicitante
  const requesterModalData = useMemo(() => {
    if (!selectedRequesterForModal) return null;
    
    const requesterMovements = filteredData.filter(m => (m.responsavel || 'N/D') === selectedRequesterForModal);
    const totalBars = requesterMovements.reduce((acc, m) => acc + m.quantidade, 0);
    
    const reasonMap: Record<string, { total: number, count: number }> = {};
    requesterMovements.forEach(m => {
      const reason = (m.motivo || 'GERAL').toUpperCase();
      if (!reasonMap[reason]) reasonMap[reason] = { total: 0, count: 0 };
      reasonMap[reason].total += m.quantidade;
      reasonMap[reason].count += 1;
    });

    const reasons = Object.entries(reasonMap).map(([name, s]) => ({
      name,
      total: s.total,
      count: s.count,
      percent: totalBars > 0 ? ((s.total / totalBars) * 100).toFixed(1) : "0"
    })).sort((a, b) => b.total - a.total);

    return { name: selectedRequesterForModal, totalBars, reasons };
  }, [selectedRequesterForModal, filteredData]);

  const paginatedRanking = metrics.rankingData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(metrics.rankingData.length / itemsPerPage);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse font-black text-slate-500 uppercase tracking-widest">Sincronizando Painel de Perfil...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* HEADER DA DASHBOARD */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Indicadores de Perfil</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Consolidado de todas as fontes de dados cadastradas.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#1e293b] p-2 rounded-xl flex items-center gap-3 border border-slate-800 shadow-xl">
            <div className="flex items-center gap-2 px-2 border-r border-slate-700">
               <Filter className="w-3.5 h-3.5 text-blue-500" />
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Filtrar Período:</span>
            </div>
            
            <div className="flex items-center gap-1">
               <span className="text-[8px] font-bold text-slate-500 uppercase mr-1">Ano:</span>
               <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer">
                  {years.map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
               </select>
            </div>

            <div className="flex items-center gap-1 ml-2">
               <span className="text-[8px] font-bold text-slate-500 uppercase mr-1">Mês:</span>
               <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer">
                  <option value="Todos" className="bg-slate-900">Todos</option>
                  {months.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
               </select>
            </div>
          </div>

          <button 
            onClick={() => setShowPrintPreview(true)}
            className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-5 py-2.5 rounded-xl flex items-center gap-2 font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 text-rose-500"
          >
            <Printer className="w-4 h-4" /> Relatório
          </button>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <StatCard title="SAÍDA TOTAL DE BARRAS" value={metrics.totalBarras.toLocaleString('pt-BR')} icon={Layers} color="blue" />
        
        <div className="relative overflow-hidden rounded-3xl p-6 shadow-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border border-white/10">
           <div className="flex items-start justify-between mb-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80">CONSUMO POR TURNO</span>
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/20"><Clock className="w-4 h-4" /></div>
           </div>
           <div className="flex justify-between items-end">
              <div className="flex flex-col">
                 <span className="text-[8px] font-black uppercase text-white/60 mb-1">1º TURNO</span>
                 <span className="text-xl font-black">{metrics.t1Barras.toLocaleString('pt-BR')}</span>
              </div>
              <div className="w-px h-8 bg-white/20"></div>
              <div className="flex flex-col text-right">
                 <span className="text-[8px] font-black uppercase text-white/60 mb-1">2º + 3º TURNO</span>
                 <span className="text-xl font-black">{metrics.t2Barras.toLocaleString('pt-BR')}</span>
              </div>
           </div>
        </div>

        <StatCard title="SOLICITANTES ATIVOS" value={metrics.solicitantesAtivos} icon={UserCheck} color="purple" />
        <StatCard title="MÉDIA DE ITENS P/ SAÍDA" value={metrics.mediaPorSaida} icon={Activity} color="blue" />
      </div>

      {/* GRÁFICOS CENTRAIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
        {/* Gráfico de Setores */}
        <div className="bg-[#1e293b] rounded-3xl p-6 border border-slate-800 shadow-xl">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
             <Building className="w-4 h-4 text-blue-500" /> QUANTIDADE POR SETOR
           </h3>
           <div className="h-[320px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={metrics.chartSectors} layout="vertical" margin={{ left: 40, right: 60 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.1} />
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 9, fontWeight: '900', fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                 <Bar 
                    dataKey="value" 
                    fill="#3b82f6" 
                    radius={[0, 4, 4, 0]} 
                    barSize={18}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    onClick={(data) => { if(data && data.name) setSelectedSectorForModal(data.name); }}
                 >
                    <LabelList dataKey="percent" position="right" formatter={(v: string) => `${v}%`} style={{ fill: '#3b82f6', fontSize: 10, fontWeight: '900' }} offset={10} />
                    <LabelList dataKey="value" position="right" formatter={(v: number) => v.toLocaleString('pt-BR')} style={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} offset={45} />
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center mt-2 flex items-center justify-center gap-1 italic">
             <Search className="w-2.5 h-2.5" /> Clique na barra para detalhar motivos
           </p>
        </div>

        {/* Gráfico de Motivos */}
        <div className="bg-[#1e293b] rounded-3xl p-6 border border-slate-800 shadow-xl">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
             <TrendingUp className="w-4 h-4 text-emerald-500" /> CONSUMO POR MOTIVO (VOLUME E PERCENTUAL)
           </h3>
           <div className="h-[320px]">
             <ResponsiveContainer width="100%" height="100%">
               <ComposedChart data={metrics.chartReasons}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                 <XAxis dataKey="name" tick={{fontSize: 8, fontWeight: 'bold', fill: '#64748b'}} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" />
                 <YAxis yAxisId="left" hide />
                 <YAxis yAxisId="right" orientation="right" hide />
                 <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
                 <Bar yAxisId="left" dataKey="value" name="Volume" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25}>
                    <LabelList dataKey="value" position="top" style={{ fontSize: 9, fontWeight: 'black', fill: '#3b82f6' }} formatter={(v: number) => v.toLocaleString('pt-BR')} />
                 </Bar>
                 <Line yAxisId="right" type="monotone" dataKey="percentual" name="Percentual (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }}>
                    <LabelList dataKey="percentual" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 9, fontWeight: 'black', fill: '#10b981' }} offset={10} />
                 </Line>
                 <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black', paddingTop: '20px' }} />
               </ComposedChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* TABELA DE RANKING */}
      <div className="bg-[#1e293b] rounded-[2rem] shadow-2xl border border-slate-800 overflow-hidden no-print">
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
             <UserCheck className="w-5 h-5 text-indigo-500" />
             <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Ranking de Consumo por Solicitante</h3>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-900/50 text-slate-500 font-black uppercase tracking-widest border-b border-slate-800">
                   <tr>
                      <th className="px-8 py-5">NOME</th>
                      <th className="px-8 py-5 text-center">TOTAL DE ITENS (BARRAS)</th>
                      <th className="px-8 py-5 text-center">QTD. REQUISIÇÕES</th>
                      <th className="px-8 py-5 text-right">MÉDIA POR SAÍDA</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                   {paginatedRanking.map((sol, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors group">
                         <td className="px-8 py-5 font-black text-slate-300 group-hover:text-white uppercase">{sol.name}</td>
                         <td className="px-8 py-5 text-center">
                            <button 
                                onClick={() => setSelectedRequesterForModal(sol.name)}
                                className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 text-blue-400 rounded-full font-black border border-blue-500/20 hover:bg-blue-500/20 transition-all active:scale-95"
                            >
                               {sol.total.toLocaleString('pt-BR')} <PieIcon className="w-3 h-3" />
                            </button>
                         </td>
                         <td className="px-8 py-5 text-center">
                            <span className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg font-black border border-amber-500/20">
                               {sol.count}
                            </span>
                         </td>
                         <td className="px-8 py-5 text-right font-black text-slate-400">
                            {sol.media}
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>

          <div className="p-6 bg-slate-900/30 flex justify-between items-center">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Página {currentPage} de {totalPages}</span>
             <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-30 transition-all shadow-lg"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-30 transition-all shadow-lg"><ChevronRight className="w-4 h-4" /></button>
             </div>
          </div>
      </div>

      {/* MODAL DETALHAMENTO DE MOTIVOS POR SETOR */}
      {selectedSectorForModal && sectorModalData && (
        <div className="fixed inset-0 z-[150] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#1e293b] w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-700 overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-700 flex justify-between items-start">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-inner">
                  <Building className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none mb-1">Motivos de Saída</h2>
                  <p className="text-xs font-black text-blue-500 uppercase tracking-[0.2em]">{sectorModalData.name}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Total de Barras: {sectorModalData.totalBars.toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <button onClick={() => setSelectedSectorForModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {sectorModalData.reasons.map((item, idx) => (
                <div key={idx} className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 hover:border-slate-600 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3 items-center">
                       <div className="w-1.5 h-10 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.3)]"></div>
                       <div>
                          <h4 className="text-sm font-black text-white uppercase tracking-tight">{item.name}</h4>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.count} Lançamentos registrados</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className="inline-flex px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black border border-blue-500/20">{item.total.toLocaleString('pt-BR')} Barras</span>
                       <p className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-widest">{item.percent}% do Setor</p>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                    <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000" style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 bg-slate-900/50 border-t border-slate-700">
              <button onClick={() => setSelectedSectorForModal(null)} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg border border-slate-700">Fechar Detalhes</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHAMENTO DE MOTIVOS POR SOLICITANTE */}
      {selectedRequesterForModal && requesterModalData && (
        <div className="fixed inset-0 z-[150] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#1e293b] w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-700 overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-700 flex justify-between items-start">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-inner">
                  <User className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none mb-1">Motivos do Solicitante</h2>
                  <p className="text-xs font-black text-blue-500 uppercase tracking-[0.2em]">{requesterModalData.name}</p>
                  <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">Total de Barras: {requesterModalData.totalBars.toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <button onClick={() => setSelectedRequesterForModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {requesterModalData.reasons.map((item, idx) => (
                <div key={idx} className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 hover:border-slate-600 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3 items-center">
                       <div className="w-1.5 h-10 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.3)]"></div>
                       <div>
                          <h4 className="text-sm font-black text-white uppercase tracking-tight">{item.name}</h4>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.count} Lançamentos registrados</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className="inline-flex px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black border border-blue-500/20">{item.total.toLocaleString('pt-BR')} Barras</span>
                       <p className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-widest">{item.percent}% do Total</p>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                    <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000" style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 bg-slate-900/50 border-t border-slate-700">
              <button onClick={() => setSelectedRequesterForModal(null)} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg border border-slate-700">Fechar Detalhes</button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY DE RELATÓRIO (PRINT PREVIEW) */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 flex flex-col items-center overflow-auto print-mode-wrapper animate-in fade-in duration-300 print:static print:block print:h-auto print:overflow-visible print:bg-white">
           {/* Barra de Ferramentas (Oculta na Impressão) */}
           <div className="w-full sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex justify-between items-center shadow-2xl no-print preview-toolbar">
             <div className="flex items-center gap-2">
               <FileText className="w-5 h-5 text-rose-500" />
               <span className="font-black text-xs uppercase tracking-widest text-white">Relatório Gerencial - Almoxarifado de Perfil</span>
             </div>
             <div className="flex gap-3">
               <button onClick={() => setShowPrintPreview(false)} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl font-black text-[10px] uppercase text-white transition-all">
                 <X className="w-4 h-4 mr-2" /> Cancelar
               </button>
               <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase text-white shadow-lg transition-all active:scale-95">
                 <Check className="w-4 h-4 mr-2" /> Confirmar Impressão
               </button>
             </div>
          </div>

          {/* O DOCUMENTO FORMATADO PARA IMPRESSÃO */}
          <div className="flex-1 w-full flex justify-center py-10 print:py-0 print:block print:bg-white print:static">
             <div className="printable-document bg-white text-black p-12 w-[210mm] shadow-2xl min-h-[297mm] print:shadow-none print:p-0 print:w-full print:block print:static">
                
                {/* CABEÇALHO DO DOCUMENTO */}
                <header className="mb-10 flex justify-between items-start border-b-[3px] border-black pb-6" style={{ pageBreakInside: 'avoid' }}>
                    <div className="flex flex-col">
                        <h1 className="text-5xl font-black text-black leading-none uppercase">ALUMASA</h1>
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] mt-1 text-black">Industrial • Almoxarifado de Perfil</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-black">RELATÓRIO DE CONSUMO</h2>
                        <div className="flex items-center gap-2 text-[10px] font-bold mt-2 bg-gray-100 px-3 py-1 border border-black/10 rounded text-black uppercase">
                           Emissão: {new Date().toLocaleDateString('pt-BR')} • {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </header>

                {/* KPI BOXES PARA IMPRESSÃO */}
                <section className="mb-8 grid grid-cols-4 gap-4" style={{ pageBreakInside: 'avoid' }}>
                    <div className="bg-gray-50 p-4 border border-black/20 text-center">
                        <span className="text-[9px] text-gray-500 font-black uppercase block mb-1">TOTAL DE BARRAS</span>
                        <span className="text-2xl font-black text-black">{metrics.totalBarras.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="bg-gray-50 p-4 border border-black/20 text-center">
                        <span className="text-[9px] text-gray-500 font-black uppercase block mb-1">CONSUMO 1º TURNO</span>
                        <span className="text-2xl font-black text-black">{metrics.t1Barras.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="bg-gray-50 p-4 border border-black/20 text-center">
                        <span className="text-[9px] text-gray-500 font-black uppercase block mb-1">CONSUMO 2º + 3º</span>
                        <span className="text-2xl font-black text-black">{metrics.t2Barras.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="bg-gray-50 p-4 border border-black/20 text-center">
                        <span className="text-[9px] text-gray-500 font-black uppercase block mb-1">MÉDIA P/ SAÍDA</span>
                        <span className="text-2xl font-black text-black">{metrics.mediaPorSaida}</span>
                    </div>
                </section>

                {/* DISTRIBUIÇÃO POR SETOR */}
                <section className="mb-10">
                   <h3 className="text-xs font-black uppercase mb-2 bg-black text-white p-2 border border-black">1. DISTRIBUIÇÃO DE CONSUMO POR SETOR</h3>
                   <table className="w-full border-collapse border border-black">
                      <thead>
                        <tr className="bg-gray-100">
                           <th className="border border-black px-4 py-2 text-left text-[10px] font-black uppercase text-black">SETOR REQUISITANTE</th>
                           <th className="border border-black px-4 py-2 text-right text-[10px] font-black uppercase text-black">VOLUME (BARRAS)</th>
                           <th className="border border-black px-4 py-2 text-center text-[10px] font-black uppercase text-black">PARTICIPAÇÃO (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.chartSectors.map((item, idx) => (
                          <tr key={idx} style={{ pageBreakInside: 'avoid' }}>
                             <td className="border border-black px-4 py-2 font-black text-black text-xs uppercase">{item.name}</td>
                             <td className="border border-black px-4 py-2 text-right font-black text-black text-xs">{item.value.toLocaleString('pt-BR')}</td>
                             <td className="border border-black px-4 py-2 text-center font-bold text-black text-xs">{item.percent}%</td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </section>

                {/* RANKING DE SOLICITANTES */}
                <section className="mb-10">
                   <h3 className="text-xs font-black uppercase mb-2 bg-black text-white p-2 border border-black">2. RANKING DE SOLICITANTES (TOP CONSUMO)</h3>
                   <table className="w-full border-collapse border border-black">
                      <thead>
                        <tr className="bg-gray-100">
                           <th className="border border-black px-4 py-2 text-left text-[10px] font-black uppercase text-black">NOME DO SOLICITANTE</th>
                           <th className="border border-black px-4 py-2 text-center text-[10px] font-black uppercase text-black">REQUISIÇÕES</th>
                           <th className="border border-black px-4 py-2 text-right text-[10px] font-black uppercase text-black">TOTAL DE BARRAS</th>
                           <th className="border border-black px-4 py-2 text-right text-[10px] font-black uppercase text-black">MÉDIA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.rankingData.sort((a,b) => b.count - a.count).slice(0, 20).map((item, idx) => (
                          <tr key={idx} style={{ pageBreakInside: 'avoid' }}>
                             <td className="border border-black px-4 py-2 font-black text-black text-[10px] uppercase">{item.name}</td>
                             <td className="border border-black px-4 py-2 text-center font-bold text-black text-[10px]">{item.count}</td>
                             <td className="border border-black px-4 py-2 text-right font-black text-black text-[10px]">{item.total.toLocaleString('pt-BR')}</td>
                             <td className="border border-black px-4 py-2 text-right font-bold text-gray-600 text-[10px]">{item.media}</td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </section>

                {/* ASSINATURAS */}
                <footer className="mt-20 pt-16 flex justify-between gap-12 text-black signature-area" style={{ pageBreakInside: 'avoid' }}>
                   <div className="flex-1 text-center">
                      <div className="w-full border-t border-black mb-1"></div>
                      <span className="text-[9px] font-black uppercase text-black">RESPONSÁVEL ALMOXARIFADO</span>
                   </div>
                   <div className="flex-1 text-center">
                      <div className="w-full border-t border-black mb-1"></div>
                      <span className="text-[9px] font-black uppercase text-black">COORDENAÇÃO DE PCP</span>
                   </div>
                </footer>

                <div className="mt-12 pt-10 border-t border-black/10 flex justify-between text-[7px] font-black uppercase text-gray-400" style={{ pageBreakInside: 'avoid' }}>
                   <span>SISTEMA DE GESTÃO ALUMASA • AUDITORIA DE PERFIL</span>
                   <span>RELATÓRIO GERADO AUTOMATICAMENTE</span>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CentralDashboard;
