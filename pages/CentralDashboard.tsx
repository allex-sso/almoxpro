
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
      
      const solicitante = (m.responsavel || 'N/D').trim().toUpperCase();
      if (solicitante && solicitante !== 'N/D' && solicitante !== '0' && solicitante !== '-') {
        solicitantesAtivosSet.add(solicitante);
      }

      const turno = String(m.turno || '').toUpperCase();
      if (turno.includes('1')) t1Barras += m.quantidade;
      else t2Barras += m.quantidade;

      const setor = (m.setor || 'OUTROS').toUpperCase();
      setorMap[setor] = (setorMap[setor] || 0) + m.quantidade;

      const motivo = (m.motivo || 'GERAL').toUpperCase();
      motivoMap[motivo] = (motivoMap[motivo] || 0) + m.quantidade;

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
    const originalTitle = document.title;
    document.title = "relatorio_consumo_perfil_alumasa";
    setTimeout(() => {
        window.print();
        document.title = originalTitle;
    }, 200);
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse font-black text-slate-500 uppercase tracking-widest">Sincronizando Painel de Perfil...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Indicadores de Perfil</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Consolidado de todas as fontes de dados cadastradas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#1e293b] p-2 rounded-xl flex items-center gap-3 border border-slate-800 shadow-xl">
            <div className="flex items-center gap-2 px-2 border-r border-slate-700">
               <Filter className="w-3.5 h-3.5 text-blue-500" />
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Filtros:</span>
            </div>
            <div className="flex items-center gap-1">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-1">Ano:</span>
               <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer">
                  {years.map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
               </select>
            </div>
            <div className="flex items-center gap-1 ml-4 pl-4 border-l border-slate-700">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-1">Mês:</span>
               <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer">
                  <option value="Todos" className="bg-slate-900">Todos</option>
                  {months.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
               </select>
            </div>
          </div>
          <button onClick={() => setShowPrintPreview(true)} className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-5 py-2.5 rounded-xl flex items-center gap-2 font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 text-rose-500">
            <Printer className="w-4 h-4" /> Relatório
          </button>
        </div>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
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
                 <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={18} className="cursor-pointer transition-opacity hover:opacity-80" onClick={(data) => { if(data && data.name) setSelectedSectorForModal(data.name); }}>
                    <LabelList dataKey="percent" position="right" formatter={(v: string) => `${v}%`} style={{ fill: '#3b82f6', fontSize: 10, fontWeight: '900' }} offset={10} />
                    <LabelList dataKey="value" position="right" formatter={(v: number) => v.toLocaleString('pt-BR')} style={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} offset={45} />
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
        <div className="bg-[#1e293b] rounded-3xl p-6 border border-slate-800 shadow-xl">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
             <TrendingUp className="w-4 h-4 text-emerald-500" /> CONSUMO POR MOTIVO
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
                 <Line yAxisId="right" type="monotone" dataKey="percentual" name="Percentual (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                 <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black', paddingTop: '20px' }} />
               </ComposedChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

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
                      <th className="px-8 py-5 text-center">TOTAL DE ITENS</th>
                      <th className="px-8 py-5 text-center">QTD. REQUISIÇÕES</th>
                      <th className="px-8 py-5 text-right">MÉDIA POR SAÍDA</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                   {paginatedRanking.map((sol, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors group">
                         <td className="px-8 py-5 font-black text-slate-300 group-hover:text-white uppercase">{sol.name}</td>
                         <td className="px-8 py-5 text-center">
                            <button onClick={() => setSelectedRequesterForModal(sol.name)} className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 text-blue-400 rounded-full font-black border border-blue-500/20 hover:bg-blue-500/20 transition-all active:scale-95">
                               {sol.total.toLocaleString('pt-BR')} <PieIcon className="w-3 h-3" />
                            </button>
                         </td>
                         <td className="px-8 py-5 text-center">
                            <span className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg font-black border border-amber-500/20">{sol.count}</span>
                         </td>
                         <td className="px-8 py-5 text-right font-black text-slate-400">{sol.media}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
          <div className="p-6 bg-slate-900/30 flex justify-between items-center">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Página {currentPage} de {totalPages}</span>
             <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-30 transition-all shadow-lg"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-30 transition-all shadow-lg"><ChevronRight className="w-4 h-4" /></button>
             </div>
          </div>
      </div>

      {selectedSectorForModal && sectorModalData && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-[#1e293b] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-black text-white uppercase">{sectorModalData.name} - Motivos</h2>
              <button onClick={() => setSelectedSectorForModal(null)} className="p-2 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {sectorModalData.reasons.map((r, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <span className="text-sm font-bold text-white uppercase">{r.name}</span>
                  <div className="text-right">
                    <p className="text-lg font-black text-blue-400">{r.total.toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] font-bold text-slate-500">{r.percent}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedRequesterForModal && requesterModalData && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-[#1e293b] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-black text-white uppercase">{requesterModalData.name} - Detalhes</h2>
              <button onClick={() => setSelectedRequesterForModal(null)} className="p-2 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {requesterModalData.reasons.map((r, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <span className="text-sm font-bold text-white uppercase">{r.name}</span>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-400">{r.total.toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] font-bold text-slate-500">{r.percent}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showPrintPreview && (
        <div className="fixed inset-0 z-[300] bg-white dark:bg-dark-card overflow-auto flex flex-col print-mode-wrapper animate-in fade-in duration-300 print:static print:block print:h-auto print:overflow-visible print:bg-white">
          <div className="sticky top-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-md z-50 no-print preview-header">
            <div className="flex items-center">
              <Printer className="mr-2 w-5 h-5" />
              <span className="font-bold text-sm uppercase tracking-widest">Painel Analítico de Consumo de Perfil</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPrintPreview(false)} className="px-6 py-2 bg-slate-600 hover:bg-slate-700 rounded-xl font-black text-[10px] uppercase flex items-center transition-all active:scale-95"><X className="w-4 h-4 mr-2" /> Voltar</button>
              <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase flex items-center shadow-lg transition-all active:scale-95"><Check className="w-4 h-4 mr-2" /> Imprimir</button>
            </div>
          </div>

          <div className="flex-1 p-4 md:p-12 print:p-0 print:block print:static print:overflow-visible">
            <div className="printable-area bg-white text-black p-10 max-w-[210mm] mx-auto border border-gray-100 shadow-xl print:shadow-none print:border-none print:max-w-none print:p-0 print:block print:static print:overflow-visible">
              <div className="mb-8 text-center border-b-[3px] border-black pb-4">
                <h1 className="text-6xl font-black mb-1 text-black tracking-tighter">ALUMASA</h1>
                <p className="text-xl font-bold mb-4 uppercase text-black">Alumínio & Plástico</p>
                <div className="py-2 border-t border-black">
                  <h2 className="text-2xl font-black uppercase tracking-wider text-black">RELATÓRIO TÉCNICO DE CONSUMO DE PERFIL</h2>
                  <p className="text-xs font-bold text-black uppercase">Consolidado de Movimentações e Fluxo de Saída</p>
                </div>
              </div>

              <section className="mb-8 no-break-inside w-full">
                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">1. INDICADORES EXECUTIVOS (KPIS)</h3>
                <table className="w-full text-sm border-collapse border border-black text-black">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-3 font-black w-[50%] bg-gray-50 uppercase text-[10px] text-black">Volume Total Saída de Barras</td>
                      <td className="p-3 font-black text-black text-lg">{metrics.totalBarras.toLocaleString('pt-BR')}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-3 font-black bg-gray-50 uppercase text-[10px] text-black">Média de Itens por Requisição</td>
                      <td className="p-3 font-black text-black">{metrics.mediaPorSaida} pçs</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-3 font-black bg-gray-50 uppercase text-[10px] text-black">Total de Solicitantes Ativos</td>
                      <td className="p-3 font-black text-black">{metrics.solicitantesAtivos} profissionais</td>
                    </tr>
                    <tr>
                      <td className="border-r border-black p-3 font-black bg-gray-50 uppercase text-[10px] text-black">Distribuição 1º Turno vs Demais</td>
                      <td className="p-3 font-black text-emerald-600 text-lg">{metrics.t1Barras.toLocaleString('pt-BR')} / {metrics.t2Barras.toLocaleString('pt-BR')}</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="mb-8 w-full no-break-inside">
                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">2. CONSUMO POR SETOR / DESTINO</h3>
                <table className="w-full text-[10px] border-collapse border border-black text-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 text-left font-black uppercase text-black w-2/3">Setor Industrial / Destino</th>
                      <th className="border border-black p-2 text-center font-black uppercase text-black">Volume Total</th>
                      <th className="border border-black p-2 text-center font-black uppercase text-black">Representatividade (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.chartSectors.map((s, i) => (
                      <tr key={i} className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold uppercase text-black">{s.name}</td>
                        <td className="border-r border-black p-2 text-center font-black text-black">{s.value.toLocaleString('pt-BR')}</td>
                        <td className="p-2 text-center font-black text-black">{s.percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="mb-8 w-full no-break-inside">
                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">3. RANKING DE SOLICITANTES (TOP PERFORMANCE)</h3>
                <table className="w-full text-[10px] border-collapse border border-black text-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 text-left font-black uppercase text-black">Colaborador / Operador</th>
                      <th className="border border-black p-2 text-center font-black uppercase text-black">Qtd. Requisições</th>
                      <th className="border border-black p-2 text-center font-black uppercase text-black">Total Barras</th>
                      <th className="border border-black p-2 text-center font-black uppercase text-black">Média p/ Saída</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.rankingData.slice(0, 15).map((sol, i) => (
                      <tr key={i} className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold uppercase text-black">{sol.name}</td>
                        <td className="border-r border-black p-2 text-center font-black text-black">{sol.count}</td>
                        <td className="border-r border-black p-2 text-center font-black text-black">{sol.total.toLocaleString('pt-BR')}</td>
                        <td className="p-2 text-center font-black text-black">{sol.media}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="mb-8 w-full">
                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">4. LOG ANALÍTICO DE MOVIMENTAÇÕES</h3>
                <table className="w-full text-[8px] border-collapse border border-black text-black">
                  <thead style={{ display: 'table-header-group' }}>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 text-left font-black uppercase text-black">Data/Hora</th>
                      <th className="border border-black p-2 text-left font-black uppercase text-black">Perfil / Modelo</th>
                      <th className="border border-black p-2 text-left font-black uppercase text-black">Setor</th>
                      <th className="border border-black p-2 text-center font-black uppercase text-black">Qtd.</th>
                      <th className="border border-black p-2 text-left font-black uppercase text-black">Solicitante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, idx) => (
                      <tr key={idx} className="border-b border-black text-black" style={{ pageBreakInside: 'avoid' }}>
                        <td className="border-r border-black p-1.5 font-bold font-mono text-black">{item.data.toLocaleString('pt-BR')}</td>
                        <td className="border-r border-black p-1.5 uppercase font-black text-black">{item.perfil}</td>
                        <td className="border-r border-black p-1.5 uppercase text-black">{item.setor}</td>
                        <td className="border-r border-black p-1.5 text-center font-black text-black">{item.quantidade}</td>
                        <td className="p-1.5 uppercase font-bold text-black">{item.responsavel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <footer className="mt-12 pt-10 flex justify-between gap-24 no-break-inside">
                  <div className="text-center flex-1">
                    <div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Responsável Almoxarifado</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Gerência Industrial</div>
                  </div>
              </footer>
              <div className="mt-6 text-center text-[7px] font-black uppercase text-slate-500 tracking-widest no-break-inside">
                Documento de Auditoria Técnica Alumasa Industrial - Emitido em {new Date().toLocaleString('pt-BR')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CentralDashboard;
