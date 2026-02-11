
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend, LabelList, LineChart, Line, AreaChart, Area, Label
} from 'recharts';
import { 
  ShieldCheck, Clock, Timer, Activity, Wrench, Settings, User, Building, 
  AlertCircle, Printer, Filter, X, Check, ChevronDown, Calendar, Search, 
  ChevronLeft, ChevronRight, Info, TrendingUp, MessageSquare, ClipboardList
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { PreventiveEntry } from '../types';

interface PreventivePageProps {
  data: PreventiveEntry[];
  isLoading: boolean;
}

const formatDetailedTime = (decimalHours: number): string => {
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const PreventivePage: React.FC<PreventivePageProps> = ({ data, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSetor, setSelectedSetor] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedEquipForDetails, setSelectedEquipForDetails] = useState<string | null>(null);
  
  const itemsPerPage = 15;

  const filters = useMemo(() => {
    const setores = new Set<string>();
    const status = new Set<string>();
    data.forEach(p => {
      if (p.setor) setores.add(p.setor);
      if (p.status) status.add(p.status);
    });
    return {
      setores: ['Todos', ...Array.from(setores).sort()],
      status: ['Todos', ...Array.from(status).sort()]
    };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(p => {
      const matchesSearch = !searchTerm || 
        p.equipamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.atividade.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.profissional.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSetor = selectedSetor === 'Todos' || p.setor === selectedSetor;
      const matchesStatus = selectedStatus === 'Todos' || p.status === selectedStatus;
      return matchesSearch && matchesSetor && matchesStatus;
    });
  }, [data, searchTerm, selectedSetor, selectedStatus]);

  const metrics = useMemo(() => {
    let totalTime = 0;
    const statusMap: Record<string, number> = {};
    const profMap: Record<string, { count: number, time: number }> = {};
    const equipMap: Record<string, number> = {};
    const dayMap: Record<string, { date: string, count: number, raw: Date }> = {};
    
    let preventiveCount = 0;

    filteredData.forEach(p => {
      totalTime += p.tempo;
      
      const st = (p.status || 'Pendente').toUpperCase();
      statusMap[st] = (statusMap[st] || 0) + 1;

      if ((p.natureza || '').toLowerCase() === 'preventiva') {
        preventiveCount++;
      }

      const prof = p.profissional || 'N/D';
      if (!profMap[prof]) profMap[prof] = { count: 0, time: 0 };
      profMap[prof].count++;
      profMap[prof].time += p.tempo;

      const eq = p.equipamento;
      equipMap[eq] = (equipMap[eq] || 0) + 1;

      if (p.dataExecucao) {
        const dStr = p.dataExecucao.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (!dayMap[dStr]) dayMap[dStr] = { date: dStr, count: 0, raw: p.dataExecucao };
        dayMap[dStr].count++;
      }
    });

    const sortedStatus = Object.entries(statusMap).map(([name, value]) => ({ 
      name, 
      value
    })).sort((a,b) => b.value - a.value);

    return {
      total: filteredData.length,
      totalTime,
      preventiveEff: filteredData.length > 0 ? (preventiveCount / filteredData.length) * 100 : 0,
      avgTime: filteredData.length > 0 ? totalTime / filteredData.length : 0,
      statusChart: sortedStatus,
      profChart: Object.entries(profMap).map(([name, s]) => ({ 
        name, 
        count: s.count, 
        time: Number(s.time.toFixed(1)) 
      })).sort((a,b) => b.time - a.time),
      equipChart: Object.entries(equipMap).map(([name, value]) => ({ 
        name, 
        value 
      })).sort((a,b) => b.value - a.value).slice(0, 8),
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
    document.title = "relatorio_manutencao_preventiva_alumasa";
    setTimeout(() => {
        window.print();
        document.title = originalTitle;
    }, 250);
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse font-black text-slate-500 uppercase tracking-widest">Processando Atividades de Manutenção...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER TELA */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
              Manutenção Preventiva
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Controle de Intervenções e Confiabilidade</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar equipamento ou técnico..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary shadow-sm"
            />
          </div>

          <div className="bg-white dark:bg-dark-card p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Filter className="w-3 h-3 text-primary ml-1" />
            <select value={selectedSetor} onChange={(e) => setSelectedSetor(e.target.value)} className="bg-transparent text-[10px] font-black text-slate-800 dark:text-white outline-none cursor-pointer">
              {filters.setores.map(s => <option key={s} value={s} className="dark:bg-slate-800">{s}</option>)}
            </select>
          </div>

          <button onClick={() => setShowPrintPreview(true)} className="bg-white dark:bg-dark-card border border-gray-700 p-2.5 rounded-xl flex items-center gap-2 font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 shadow-sm">
            <Printer className="w-4 h-4 text-rose-500" /> Relatório
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <StatCard title="TOTAL INTERVENÇÕES" value={metrics.total} icon={Activity} color="blue" />
        <StatCard title="TEMPO EM MANUTENÇÃO" value={formatDetailedTime(metrics.totalTime)} icon={Clock} color="purple" />
        <StatCard title="MÉDIA POR CHAMADO" value={formatDetailedTime(metrics.avgTime)} icon={Timer} color="green" />
        <StatCard title="EFICIÊNCIA PREVENTIVA" value={`${metrics.preventiveEff.toFixed(1)}%`} icon={ShieldCheck} color="blue" />
      </div>

      {/* CHARTS ROW (EQUIPMENT AND DAILY ACTIVITY) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-800">
          <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-6 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" /> Atendimento por Equipamento (Top 8)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={metrics.equipChart} 
                layout="vertical" 
                margin={{ left: 20, right: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 9, fontWeight: '900', fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <Bar 
                  dataKey="value" 
                  fill="#3b82f6" 
                  radius={[0, 4, 4, 0]} 
                  barSize={20} 
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={(data) => {
                    if (data && data.name) {
                      setSelectedEquipForDetails(data.name);
                    }
                  }}
                >
                  <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 'black', fill: '#3b82f6' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center mt-2 italic flex items-center justify-center gap-1">
             <Info className="w-2.5 h-2.5" /> Clique nas barras para ver detalhes das atividades
          </p>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-800">
          <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" /> Atividades Realizadas Diariamente
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.evolutionChart}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="date" tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="count" name="Quantidade" stroke="#10b981" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TABLE TELA */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden no-print">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Histórico de Atividades</h3>
            <span className="text-[10px] font-bold text-slate-400">Total: {filteredData.length} registros</span>
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
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${p.natureza.toLowerCase() === 'corretiva' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
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

      {/* MODAL DETALHAMENTO EQUIPAMENTO */}
      {selectedEquipForDetails && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300 no-print">
            <div className="bg-[#1e293b] w-full max-w-2xl rounded-[2rem] shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[85vh] transform animate-in zoom-in-95">
                <div className="p-8 border-b border-slate-700 flex justify-between items-start bg-slate-800/30">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                            <ClipboardList className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight uppercase">Atividades Recentes</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedEquipForDetails}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setSelectedEquipForDetails(null)} 
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 flex-1 overflow-y-auto space-y-6">
                    {equipDetailEntries.length > 0 ? (
                        equipDetailEntries.map((item, idx) => (
                            <div key={idx} className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        <span className="text-xs font-black text-slate-200 uppercase tracking-tight">{item.atividade || 'Atividade não especificada'}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${item.status.toLowerCase().includes('concl') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                        {item.status}
                                    </span>
                                </div>
                                
                                {item.descricaoTrabalho && (
                                    <div className="mb-4 flex gap-2">
                                        <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-slate-400 italic leading-relaxed">"{item.descricaoTrabalho}"</p>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-3 border-t border-slate-700/50">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3 h-3 text-slate-500" />
                                        <span className="text-[10px] font-bold text-slate-500 font-mono">{item.dataExecucao?.toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <User className="w-3 h-3 text-slate-500" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.profissional}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-bold uppercase tracking-widest text-xs">Nenhum detalhamento registrado</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-900/50 border-t border-slate-700 flex justify-end">
                    <button 
                        onClick={() => setSelectedEquipForDetails(null)} 
                        className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg border border-slate-700"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* PRINT PREVIEW - Otimizado para múltiplas páginas */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-dark-card overflow-auto flex flex-col print-mode-wrapper animate-in fade-in duration-300 print:static print:block print:h-auto print:overflow-visible print:bg-white">
          {/* Header UI (Visível apenas na tela) */}
          <div className="sticky top-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-md z-50 no-print preview-header">
            <div className="flex items-center">
              <Printer className="mr-2 w-5 h-5" />
              <span className="font-bold text-sm uppercase tracking-widest">Relatório de Manutenção Preventiva</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPrintPreview(false)} className="px-6 py-2 bg-slate-600 hover:bg-slate-700 rounded-xl font-black text-[10px] uppercase flex items-center transition-all active:scale-95"><X className="w-4 h-4 mr-2" /> Voltar</button>
              <button onClick={handleConfirmPrint} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase flex items-center shadow-lg transition-all active:scale-95"><Check className="w-4 h-4 mr-2" /> Imprimir</button>
            </div>
          </div>

          {/* Área Real do Relatório (Aparece no Print) */}
          <div className="flex-1 p-4 md:p-12 print:p-0 print:block print:static print:overflow-visible">
            <div className="printable-area bg-white text-black p-10 max-w-[210mm] mx-auto border border-gray-100 shadow-xl print:shadow-none print:border-none print:max-w-none print:p-0 print:block print:static print:overflow-visible">
              {/* CABEÇALHO INSTITUCIONAL */}
              <div className="mb-8 text-center border-b-[3px] border-black pb-4">
                <h1 className="text-6xl font-black mb-1 text-black tracking-tighter">ALUMASA</h1>
                <p className="text-xl font-bold mb-4 uppercase text-black">Alumínio & Plástico</p>
                <div className="py-2 border-t border-black">
                  <h2 className="text-2xl font-black uppercase tracking-wider text-black">RELATÓRIO DE MANUTENÇÃO PREVENTIVA</h2>
                  <p className="text-xs font-bold text-black uppercase">Consolidado Técnico de Intervenções Industriais</p>
                </div>
              </div>

              <section className="mb-8 w-full">
                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">1. INDICADORES EXECUTIVOS</h3>
                <table className="w-full text-sm border-collapse border border-black text-black">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 uppercase text-[10px] text-black">Total de Intervenções</td>
                      <td className="p-3 font-black text-black">{metrics.total}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 uppercase text-[10px] text-black">Tempo Total de Intervenção</td>
                      <td className="p-3 font-black text-black">{formatDetailedTime(metrics.totalTime)}</td>
                    </tr>
                    <tr>
                      <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 uppercase text-[10px] text-black">Média de Tempo por Atividade</td>
                      <td className="p-3 font-black text-black">{formatDetailedTime(metrics.avgTime)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="mb-8 w-full">
                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">2. CARGA DE TRABALHO POR TÉCNICO</h3>
                <table className="w-full text-[10px] border-collapse border border-black text-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 text-left font-black uppercase text-black">Profissional</th>
                      <th className="border border-black p-2 text-center font-black uppercase text-black">Qtd. Atividades</th>
                      <th className="border border-black p-2 text-right font-black uppercase text-black">Tempo Total (H)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.profChart.map((item, idx) => (
                      <tr key={idx} className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold uppercase text-black">{item.name}</td>
                        <td className="border-r border-black p-2 text-center font-black text-black">{item.count}</td>
                        <td className="p-2 text-right font-black text-black">{formatDetailedTime(item.time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="mb-8 w-full">
                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">3. DETALHAMENTO ANALÍTICO DE INTERVENÇÕES</h3>
                <table className="w-full text-[8px] border-collapse border border-black text-black">
                  <thead style={{ display: 'table-header-group' }}>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 text-left font-black uppercase text-black">Data</th>
                      <th className="border border-black p-2 text-left font-black uppercase text-black">Equipamento</th>
                      <th className="border border-black p-2 text-left font-black uppercase text-black">Natureza</th>
                      <th className="border border-black p-2 text-right font-black uppercase text-black">Tempo</th>
                      <th className="border border-black p-2 text-left font-black uppercase text-black">Técnico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, idx) => (
                      <tr key={idx} className="border-b border-black text-black" style={{ pageBreakInside: 'avoid' }}>
                        <td className="border-r border-black p-1.5 font-bold font-mono text-black">{item.dataExecucao?.toLocaleDateString('pt-BR')}</td>
                        <td className="border-r border-black p-1.5 uppercase font-black text-black">{item.equipamento}</td>
                        <td className="border-r border-black p-1.5 uppercase font-bold text-black">{item.natureza}</td>
                        <td className="border-r border-black p-1.5 text-right font-black text-black">{formatDetailedTime(item.tempo)}</td>
                        <td className="p-1.5 uppercase font-bold text-black">{item.profissional}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <footer className="mt-12 pt-10 flex justify-between gap-24 text-black">
                  <div className="text-center flex-1">
                    <div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">PCM / Planejamento de Manutenção</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Gerência Industrial</div>
                  </div>
                </footer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreventivePage;
