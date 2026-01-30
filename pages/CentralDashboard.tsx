
import React, { useMemo, useState, useEffect } from 'react';
import { 
  Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, Legend, LabelList
} from 'recharts';
import { 
  Users, Building, Package, TrendingUp, Activity, ChevronDown, Calendar, 
  ClipboardList, Clock, Printer, X, Check, MessageCircle, AlertCircle, User,
  ChevronLeft, ChevronRight, BarChart3
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
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedSectorForModal, setSelectedSectorForModal] = useState<string | null>(null);
  const [selectedRequesterForModal, setSelectedRequesterForModal] = useState<string | null>(null);

  const [requesterPage, setRequesterPage] = useState(1);
  const requesterItemsPerPage = 10;

  useEffect(() => {
    setRequesterPage(1);
  }, [selectedYear, selectedMonth]);

  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    data.forEach(m => {
      if (m.data) years.add(m.data.getFullYear().toString());
    });
    return ['Todos', ...Array.from(years).sort((a, b) => b.localeCompare(a))];
  }, [data]);

  const filteredData = useMemo(() => {
    return (data || []).filter(m => {
      if (!m.data) return true;
      const yearMatch = selectedYear === 'Todos' || m.data.getFullYear().toString() === selectedYear;
      const monthMatch = selectedMonth === 'Todos' || months[m.data.getMonth()] === selectedMonth;
      return yearMatch && monthMatch;
    });
  }, [data, selectedYear, selectedMonth]);

  const metrics = useMemo(() => {
    const bySector: Record<string, number> = {};
    const byRequester: Record<string, { total: number, count: number }> = {};
    const byReason: Record<string, number> = {};
    let totalItems = 0;
    
    let turno1Qty = 0;
    let turno23Qty = 0;

    const movementCount = filteredData.length;

    filteredData.forEach(m => {
      totalItems += m.quantidade;
      const sector = m.setor || 'Outros';
      bySector[sector] = (bySector[sector] || 0) + m.quantidade;
      
      const req = m.responsavel || 'N/D';
      if (!byRequester[req]) byRequester[req] = { total: 0, count: 0 };
      byRequester[req].total += m.quantidade;
      byRequester[req].count += 1;
      
      const reason = m.motivo || 'Geral';
      byReason[reason] = (byReason[reason] || 0) + m.quantidade;

      const t = String(m.turno || '').toLowerCase();
      if (t.includes('1')) {
        turno1Qty += m.quantidade;
      } else if (t.includes('2') || t.includes('3')) {
        turno23Qty += m.quantidade;
      }
    });

    const avgPerMovement = movementCount > 0 ? (totalItems / movementCount).toFixed(1) : "0";
    
    const shiftInfo = (
        <div className="flex items-center w-full justify-between">
            <div className="flex flex-col">
                <span className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-0.5">1º Turno</span>
                <span className="text-xl font-black font-mono tracking-tighter">{turno1Qty.toLocaleString('pt-BR')}</span>
            </div>
            <div className="h-8 w-px bg-white/20 mx-4"></div>
            <div className="flex flex-col">
                <span className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-0.5">2º + 3º Turno</span>
                <span className="text-xl font-black font-mono tracking-tighter">{turno23Qty.toLocaleString('pt-BR')}</span>
            </div>
        </div>
    );

    const reasonData = Object.entries(byReason)
      .map(([name, value]) => ({ 
        name: name.toUpperCase(), 
        value,
        percent: totalItems > 0 ? Number(((value / totalItems) * 100).toFixed(1)) : 0
      }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 10);

    const sectorData = Object.entries(bySector)
      .map(([name, value]) => ({ name: name.toUpperCase(), value }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 15);

    return {
      totalItems,
      movementCount,
      avgPerMovement,
      shiftInfo,
      turno1Qty,
      turno23Qty,
      sectorData,
      requesterData: Object.entries(byRequester).map(([name, s]) => ({ 
        name, 
        total: s.total, 
        count: s.count,
        avg: (s.total / s.count).toFixed(2) 
      })).sort((a,b) => b.count - a.count), // Ordenação corrigida para quantidade de requisições
      reasonData
    };
  }, [filteredData]);

  // Lógica de motivos por setor selecionado (Modal)
  const sectorReasonsData = useMemo(() => {
    if (!selectedSectorForModal) return { reasons: [], total: 0 };
    
    const sectorMovements = filteredData.filter(m => (m.setor || 'Outros').toUpperCase() === selectedSectorForModal);
    const map: Record<string, { count: number, qty: number }> = {};
    let sectorTotal = 0;

    sectorMovements.forEach(m => {
        const reason = m.motivo || 'Geral';
        if (!map[reason]) map[reason] = { count: 0, qty: 0 };
        map[reason].count += 1;
        map[reason].qty += m.quantidade;
        sectorTotal += m.quantidade;
    });

    const reasons = Object.entries(map).map(([name, stats]) => ({
        name: name.toUpperCase(),
        count: stats.count,
        qty: stats.qty,
        percent: sectorTotal > 0 ? ((stats.qty / sectorTotal) * 100).toFixed(1) : "0"
    })).sort((a, b) => b.qty - a.qty);

    return { reasons, total: sectorTotal };
  }, [selectedSectorForModal, filteredData]);

  // Lógica de motivos por solicitante selecionado (Modal)
  const requesterReasonsData = useMemo(() => {
    if (!selectedRequesterForModal) return { reasons: [], total: 0 };
    
    const requesterMovements = filteredData.filter(m => (m.responsavel || 'N/D').toUpperCase() === selectedRequesterForModal.toUpperCase());
    const map: Record<string, { count: number, qty: number }> = {};
    let requesterTotal = 0;

    requesterMovements.forEach(m => {
        const reason = m.motivo || 'Geral';
        if (!map[reason]) map[reason] = { count: 0, qty: 0 };
        map[reason].count += 1;
        map[reason].qty += m.quantidade;
        requesterTotal += m.quantidade;
    });

    const reasons = Object.entries(map).map(([name, stats]) => ({
        name: name.toUpperCase(),
        count: stats.count,
        qty: stats.qty,
        percent: requesterTotal > 0 ? ((stats.qty / requesterTotal) * 100).toFixed(1) : "0"
    })).sort((a, b) => b.qty - a.qty);

    return { reasons, total: requesterTotal };
  }, [selectedRequesterForModal, filteredData]);

  const profileSummary = useMemo(() => {
    const map = new Map<string, { perfil: string, cor: string, quantidade: number }>();
    filteredData.forEach(m => {
      const perfil = m.perfil || 'Não especificado';
      const cor = m.cor || 'N/D';
      const key = `${perfil}|${cor}`;
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.quantidade += m.quantidade;
      } else {
        map.set(key, { perfil, cor, quantidade: m.quantidade });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.quantidade - a.quantidade);
  }, [filteredData]);

  const totalRequesterPages = Math.ceil(metrics.requesterData.length / requesterItemsPerPage);
  const paginatedRequesterData = useMemo(() => {
    const start = (requesterPage - 1) * requesterItemsPerPage;
    return metrics.requesterData.slice(start, start + requesterItemsPerPage);
  }, [metrics.requesterData, requesterPage]);

  const handleConfirmPrint = () => {
    const originalTitle = document.title;
    document.title = "relatorio_gerencial_perfil_alumasa";
    setTimeout(() => {
        window.print();
        document.title = originalTitle;
    }, 100);
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse font-black text-slate-500 uppercase tracking-widest">Carregando indicadores de perfil...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white font-sans tracking-tight">Indicadores de Perfil</h1>
          <p className="text-sm text-slate-500 font-medium">Consolidado de todas as fontes de dados cadastradas.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white dark:bg-dark-card p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <div className="flex items-center gap-2 px-2 border-r border-gray-100 dark:border-gray-800 mr-1">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FILTRAR PERÍODO:</span>
                </div>
                <div className="relative flex items-center bg-gray-50 dark:bg-slate-800 rounded-lg px-2 py-1.5 border border-gray-200 dark:border-gray-700 min-w-[100px]">
                   <span className="text-[9px] font-black text-slate-400 mr-2 uppercase">ANO</span>
                   <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent text-xs font-black text-slate-800 dark:text-white outline-none cursor-pointer appearance-none pr-4 z-10 w-full">
                     {yearOptions.map(y => (<option key={y} value={y} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{y}</option>))}
                   </select>
                   <ChevronDown className="absolute right-1 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
                <div className="relative flex items-center bg-gray-50 dark:bg-slate-800 rounded-lg px-2 py-1.5 border border-gray-200 dark:border-gray-700 min-w-[130px]">
                   <span className="text-[9px] font-black text-slate-400 mr-2 uppercase">MÊS</span>
                   <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-xs font-black text-slate-800 dark:text-white outline-none cursor-pointer appearance-none pr-4 z-10 w-full">
                     <option value="Todos" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Todos</option>
                     {months.map(m => (<option key={m} value={m} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{m}</option>))}
                   </select>
                   <ChevronDown className="absolute right-1 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
            </div>
            <button onClick={() => setShowPrintPreview(true)} className="bg-white dark:bg-dark-card border border-gray-700 p-2.5 rounded-xl flex items-center gap-2 font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 shadow-sm">
                <Printer className="w-4 h-4 text-rose-500" /> Relatório
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
        <StatCard title="SAÍDA TOTAL DE BARRAS" value={metrics.totalItems.toLocaleString('pt-BR')} icon={Package} color="blue" />
        <StatCard title="CONSUMO POR TURNO" value={metrics.shiftInfo} icon={Clock} color="green" />
        <StatCard title="SOLICITANTES ATIVOS" value={metrics.requesterData.length} icon={Users} color="purple" />
        <StatCard title="MÉDIA DE ITENS P/ SAÍDA" value={metrics.avgPerMovement} icon={Activity} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 no-print">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-tight text-sm"><Building className="w-5 h-5 text-blue-500" /> Quantidade por Setor</h3>
          <div className="h-80">
            {metrics.sectorData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.sectorData} layout="vertical" margin={{ right: 80, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.3} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 9, fontWeight: 'bold', fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                  <Bar 
                    dataKey="value" 
                    fill="#3b82f6" 
                    radius={[0, 4, 4, 0]} 
                    barSize={24}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    onClick={(data) => { if(data && data.name) setSelectedSectorForModal(data.name); }}
                  >
                    <LabelList dataKey="value" position="insideRight" offset={10} formatter={(value: number) => {
                        const percent = metrics.totalItems > 0 ? ((value / metrics.totalItems) * 100).toFixed(1) : "0";
                        return `${percent}%`;
                    }} style={{ fill: '#ffffff', fontSize: '10px', fontWeight: '900' }} />
                    <LabelList dataKey="value" position="right" style={{ fill: '#64748b', fontSize: '11px', fontWeight: 'bold' }} formatter={(val: number) => val.toLocaleString('pt-BR')} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (<div className="h-full flex items-center justify-center text-slate-400 text-sm italic">Sem dados para exibir</div>)}
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-slate-800 dark:text-white mb-8 flex items-center gap-2 uppercase tracking-tight text-sm"><TrendingUp className="w-5 h-5 text-emerald-500" /> Consumo por Motivo (Volume e Percentual)</h3>
          <div className="h-80">
            {metrics.reasonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.reasonData} margin={{ top: 30, right: 10, left: 10, bottom: 40 }} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#475569" opacity={0.4} />
                  <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: '900', fill: '#64748b'}} interval={0} angle={-25} textAnchor="end" axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" hide />
                  <YAxis yAxisId="right" orientation="right" hide />
                  <Bar yAxisId="left" dataKey="value" name="Barras" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24}>
                    <LabelList dataKey="value" position="top" offset={12} style={{ fill: '#3b82f6', fontSize: '11px', fontWeight: '900' }} formatter={(val: number) => val.toLocaleString('pt-BR')} />
                  </Bar>
                  <Bar yAxisId="right" dataKey="percent" name="Percentual (%)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24}>
                    <LabelList dataKey="percent" position="top" offset={12} formatter={(val: number) => `${val}%`} style={{ fill: '#10b981', fontSize: '11px', fontWeight: '900' }} />
                  </Bar>
                  <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '30px' }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (<div className="h-full flex items-center justify-center text-slate-400 text-sm italic">Sem dados para exibir</div>)}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden no-print">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 font-bold text-slate-800 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            Ranking de Consumo por Solicitante
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4 text-center">Total de Itens (Barras)</th>
                  <th className="px-6 py-4 text-center">Qtd. Requisições</th>
                  <th className="px-6 py-4 text-center">Média por Saída</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedRequesterData.map((req, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-white uppercase">{req.name}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setSelectedRequesterForModal(req.name)}
                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl font-black text-sm hover:bg-blue-500/20 transition-all active:scale-95"
                      >
                        {req.total.toLocaleString('pt-BR')}
                        <MessageCircle className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg font-black text-[11px]">
                            {req.count}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500 font-mono font-bold">{req.avg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {metrics.requesterData.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800">
              <span className="text-sm text-gray-700 dark:text-gray-400">Página {requesterPage} de {totalRequesterPages}</span>
              <div className="inline-flex gap-2">
                <button onClick={() => setRequesterPage(p => Math.max(1, p - 1))} disabled={requesterPage === 1} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={() => setRequesterPage(p => Math.min(totalRequesterPages, p + 1))} disabled={requesterPage === totalRequesterPages} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
          )}
      </div>

      {/* MODAL DE DETALHAMENTO DE MOTIVOS POR SETOR */}
      {selectedSectorForModal && (
        <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 no-print">
            <div className="bg-[#1e293b] w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-700 overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-700 flex justify-between items-start">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                            <Building className="w-7 h-7 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none mb-2">Motivos de Saída</h2>
                            <p className="text-xs font-black text-blue-400 uppercase tracking-[0.2em]">{selectedSectorForModal}</p>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Total de Barras: {sectorReasonsData.total.toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setSelectedSectorForModal(null)} 
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {sectorReasonsData.reasons.length > 0 ? (
                        sectorReasonsData.reasons.map((item, idx) => (
                            <div key={idx} className="group relative bg-slate-800/40 p-6 rounded-[1.5rem] border border-slate-700/50 hover:border-blue-500/30 transition-all">
                                <div className="flex gap-5">
                                    <div className="relative mt-1">
                                        <div className="w-1.5 h-12 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)]"></div>
                                        <div className="absolute top-0 left-[-4px] w-3.5 h-3.5 bg-blue-500 rounded-full blur-[3px] opacity-30"></div>
                                    </div>
                                    
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="text-white text-base font-black tracking-tight uppercase group-hover:text-blue-400 transition-colors">{item.name}</h4>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{item.count} lançamentos registrados</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl font-black text-blue-400 text-xs">
                                                    {item.qty} Barras
                                                </div>
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.percent}% do Setor</span>
                                            </div>
                                        </div>

                                        <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                                                style={{ width: `${item.percent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-bold uppercase tracking-widest text-xs">Nenhum motivo detalhado encontrado</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-900/50 border-t border-slate-700">
                    <button 
                        onClick={() => setSelectedSectorForModal(null)} 
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg border border-slate-700"
                    >
                        Fechar Detalhes
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL DE DETALHAMENTO DE MOTIVOS POR SOLICITANTE */}
      {selectedRequesterForModal && (
        <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 no-print">
            <div className="bg-[#1e293b] w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-slate-700 overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-700 flex justify-between items-start">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                            <User className="w-7 h-7 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none mb-2">Motivos do Solicitante</h2>
                            <p className="text-xs font-black text-blue-400 uppercase tracking-[0.2em]">{selectedRequesterForModal}</p>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Total de Barras: {requesterReasonsData.total.toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setSelectedRequesterForModal(null)} 
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {requesterReasonsData.reasons.length > 0 ? (
                        requesterReasonsData.reasons.map((item, idx) => (
                            <div key={idx} className="group relative bg-slate-800/40 p-6 rounded-[1.5rem] border border-slate-700/50 hover:border-blue-500/30 transition-all">
                                <div className="flex gap-5">
                                    <div className="relative mt-1">
                                        <div className="w-1.5 h-12 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)]"></div>
                                        <div className="absolute top-0 left-[-4px] w-3.5 h-3.5 bg-blue-500 rounded-full blur-[3px] opacity-30"></div>
                                    </div>
                                    
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="text-white text-base font-black tracking-tight uppercase group-hover:text-blue-400 transition-colors">{item.name}</h4>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{item.count} lançamentos registrados</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl font-black text-blue-400 text-xs">
                                                    {item.qty} Barras
                                                </div>
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.percent}% do Total</span>
                                            </div>
                                        </div>

                                        <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                                                style={{ width: `${item.percent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-bold uppercase tracking-widest text-xs">Nenhum motivo detalhado encontrado</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-900/50 border-t border-slate-700">
                    <button 
                        onClick={() => setSelectedRequesterForModal(null)} 
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg border border-slate-700"
                    >
                        Fechar Detalhes
                    </button>
                </div>
            </div>
        </div>
      )}

      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-dark-card overflow-auto flex flex-col print-mode-wrapper animate-in fade-in duration-300 print:relative print:block print:h-auto print:overflow-visible print:bg-white">
            <div className="sticky top-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-md z-50 no-print preview-header">
                <div className="flex items-center">
                    <Printer className="mr-2 w-5 h-5" />
                    <span className="font-bold text-sm uppercase tracking-widest">Relatório de Almoxarifado de Perfil</span>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowPrintPreview(false)} className="px-6 py-2 bg-slate-600 hover:bg-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center transition-all active:scale-95"><X className="w-4 h-4 mr-2" /> Voltar</button>
                    <button onClick={handleConfirmPrint} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase flex items-center transition-all shadow-lg active:scale-95"><Check className="w-4 h-4 mr-2" /> Confirmar Impressão</button>
                </div>
            </div>

            <div className="print-container flex-1 p-4 md:p-12 print:p-0 print:block print:h-auto print:static">
                <div className="printable-area bg-white text-black p-10 max-w-[210mm] mx-auto border border-gray-100 shadow-xl h-auto overflow-visible block print:border-none print:p-0 print:static print:max-w-none">
                    <div className="w-full print:static">
                        <header className="mb-8 text-center border-b-[3px] border-black pb-4 no-break-inside text-black">
                            <h1 className="text-5xl font-black mb-1 text-black">ALUMASA</h1>
                            <p className="text-xl font-bold mb-4 uppercase text-black">Alumínio & Plástico</p>
                            <div className="py-2">
                                <h2 className="text-2xl font-black uppercase tracking-wider text-black">RELATÓRIO GERENCIAL ALMOXARIFADO DE PERFIL</h2>
                                <p className="text-xs font-bold text-black uppercase">Consolidado de Consumo de Perfis - Período: {selectedMonth}/{selectedYear}</p>
                            </div>
                        </header>

                        <section className="mb-8 w-full no-break-inside">
                            <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">1. INDICADORES EXECUTIVOS (KPIs)</h3>
                            <table className="w-full text-sm border-collapse border border-black text-black">
                                <tbody>
                                    <tr className="border-b border-black">
                                      <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black uppercase">Total de Barras Movimentadas</td>
                                      <td className="p-3 font-black text-black text-lg">{metrics.totalItems.toLocaleString('pt-BR')} unidades</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                      <td className="border-r border-black p-3 font-black bg-gray-50 text-black uppercase">Média de Itens por Saída</td>
                                      <td className="p-3 font-black text-black text-lg">{metrics.avgPerMovement} barras/requisição</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                      <td className="border-r border-black p-3 font-black bg-gray-50 text-black uppercase">Solicitantes Ativos no Período</td>
                                      <td className="p-3 font-black text-black text-lg">{metrics.requesterData.length} colaboradores</td>
                                    </tr>
                                    <tr>
                                      <td className="border-r border-black p-3 font-black bg-gray-50 text-black uppercase">Lançamentos de Saída</td>
                                      <td className="p-3 font-black text-black text-lg">{metrics.movementCount} registros</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section className="mb-8 w-full no-break-inside">
                            <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">2. CONSUMO POR TURNO E PERÍODO</h3>
                            <table className="w-full text-[10px] border-collapse border border-black text-black">
                                <thead>
                                    <tr className="bg-gray-100">
                                      <th className="border border-black p-2 text-left font-black uppercase text-black">Turno Operacional</th>
                                      <th className="border border-black p-2 text-right font-black uppercase text-black">Volume (Barras)</th>
                                      <th className="border border-black p-2 text-center font-black uppercase text-black">Participação (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-black">
                                        <td className="border-r border-black p-2 font-bold text-black uppercase">1º Turno (Diurno)</td>
                                        <td className="border-r border-black p-2 text-right font-black text-black">{metrics.turno1Qty.toLocaleString('pt-BR')}</td>
                                        <td className="p-2 text-center font-black text-black">{((metrics.turno1Qty / (metrics.totalItems || 1)) * 100).toFixed(1)}%</td>
                                    </tr>
                                    <tr>
                                        <td className="border-r border-black p-2 font-bold text-black uppercase">2º e 3º Turno (Noturno/Tarde)</td>
                                        <td className="border-r border-black p-2 text-right font-black text-black">{metrics.turno23Qty.toLocaleString('pt-BR')}</td>
                                        <td className="p-2 text-center font-black text-black">{((metrics.turno23Qty / (metrics.totalItems || 1)) * 100).toFixed(1)}%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section className="mb-8 w-full overflow-visible">
                            <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">3. RANKING DE CONSUMO POR SETOR (TOP 15)</h3>
                            <table className="w-full text-[10px] border-collapse border border-black text-black">
                                <thead style={{ display: 'table-header-group' }}>
                                    <tr className="bg-gray-100">
                                      <th className="border border-black p-2 text-left font-black uppercase text-black">Setor Industrial</th>
                                      <th className="border border-black p-2 text-right font-black uppercase text-black">Volume de Barras</th>
                                      <th className="border border-black p-2 text-center font-black uppercase text-black">Part. Geral</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {metrics.sectorData.map((item, idx) => (
                                        <tr key={idx} className="border-b border-black text-black" style={{ pageBreakInside: 'avoid' }}>
                                            <td className="border-r border-black p-2 font-bold text-black uppercase">{item.name}</td>
                                            <td className="border-r border-black p-2 text-right font-black text-black">{item.value.toLocaleString('pt-BR')}</td>
                                            <td className="p-2 text-center font-black text-black">{((item.value / (metrics.totalItems || 1)) * 100).toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <section className="mb-8 w-full no-break-inside">
                            <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">4. DISTRIBUIÇÃO POR MOTIVO DE RETIRADA</h3>
                            <table className="w-full text-[10px] border-collapse border border-black text-black">
                                <thead>
                                    <tr className="bg-gray-100">
                                      <th className="border border-black p-2 text-left font-black uppercase text-black">Motivo / Causa</th>
                                      <th className="border border-black p-2 text-right font-black uppercase text-black">Volume (Barras)</th>
                                      <th className="border border-black p-2 text-center font-black uppercase text-black">Percentual (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {metrics.reasonData.map((item, idx) => (
                                        <tr key={idx} className="border-b border-black text-black">
                                            <td className="border-r border-black p-2 font-bold text-black uppercase">{item.name}</td>
                                            <td className="border-r border-black p-2 text-right font-black text-black">{item.value.toLocaleString('pt-BR')}</td>
                                            <td className="p-2 text-center font-black text-black">{item.percent}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <section className="mb-8 w-full overflow-visible">
                            <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">5. INVENTÁRIO CONSOLIDADO DE MODELOS E CORES</h3>
                            <table className="w-full text-[9px] border-collapse border border-black text-black">
                                <thead style={{ display: 'table-header-group' }}>
                                    <tr className="bg-gray-100">
                                      <th className="border border-black p-2 text-left font-black uppercase text-black">Modelo de Perfil</th>
                                      <th className="border border-black p-2 text-left font-black uppercase text-black">Cor / Especificação</th>
                                      <th className="border border-black p-2 text-right font-black uppercase text-black">Total Saída</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profileSummary.map((item, idx) => (
                                        <tr key={idx} className="border-b border-black text-black" style={{ pageBreakInside: 'avoid' }}>
                                            <td className="border-r border-black p-1.5 font-bold text-black uppercase">{item.perfil}</td>
                                            <td className="border-r border-black p-1.5 text-black uppercase">{item.cor}</td>
                                            <td className="p-1.5 text-right font-black text-black">{item.quantidade.toLocaleString('pt-BR')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <footer className="mt-12 pt-10 flex justify-between gap-24 no-break-inside text-black">
                            <div className="text-center flex-1">
                                <div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Responsável Almoxarifado Perfil</div>
                            </div>
                            <div className="text-center flex-1">
                                <div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Gerência Industrial</div>
                            </div>
                        </footer>
                        <div className="mt-8 pt-4 border-t border-black flex justify-between text-[7px] font-black uppercase text-black no-break-inside">
                            <div>Documento Auditável Alumasa Industrial - Gestão de Perfis</div>
                            <div>Emitido em: {new Date().toLocaleString('pt-BR')}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CentralDashboard;
