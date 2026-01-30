
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend, LabelList, LineChart, Line, ComposedChart, Area
} from 'recharts';
import { 
  Factory, Package, Zap, Activity, Clock, Target, Calendar, ChevronDown, Printer, X, Check, Filter, Layers, Layout, TrendingUp, Gauge, MessageCircle, User, Users, AlertCircle, Info
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { ProductionEntry } from '../types';

interface ProductionTypologyProps {
  data: ProductionEntry[];
  isLoading: boolean;
}

const formatHoursMinutes = (decimalHours: number): string => {
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const ProductionTypology: React.FC<ProductionTypologyProps> = ({ data, isLoading }) => {
  const [selectedWeek, setSelectedWeek] = useState<string>('Todos');
  const [selectedMesa, setSelectedMesa] = useState<string>('Todos');
  const [selectedMesaForModal, setSelectedMesaForModal] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Filtrar dados apenas da fonte de Tipologias/Engenharia
  const typoData = useMemo(() => {
    return data.filter(d => d.setor === 'Engenharia de Processos' || (!d.semana && d.mesa !== 'N/D'));
  }, [data]);

  const mesas = useMemo(() => {
    const mSet = new Set<string>();
    typoData.forEach(d => { if (d.mesa && d.mesa !== 'N/D') mSet.add(d.mesa); });
    return ['Todos', ...Array.from(mSet).sort()];
  }, [typoData]);

  const filteredData = useMemo(() => {
    return typoData.filter(d => {
      const mesaMatch = selectedMesa === 'Todos' || d.mesa === selectedMesa;
      return mesaMatch;
    });
  }, [typoData, selectedMesa]);

  const metrics = useMemo(() => {
    let totalProduced = 0;
    let totalHours = 0;
    let totalGoal = 0;
    const modelMap: Record<string, number> = {};
    const tableMap: Record<string, number> = {};
    const dayMap: Record<string, { date: string, produced: number, goal: number }> = {};
    
    const efficiencyMap: Record<string, { sum: number, count: number }> = {};

    filteredData.forEach(d => {
      totalProduced += d.produzido;
      totalHours += d.horasTrabalhadas;
      totalGoal += d.metaDia;

      const model = d.tipologia.toUpperCase();
      modelMap[model] = (modelMap[model] || 0) + d.produzido;

      if (!efficiencyMap[model]) efficiencyMap[model] = { sum: 0, count: 0 };
      efficiencyMap[model].sum += d.percentual;
      efficiencyMap[model].count += 1;

      const mesa = d.mesa.toUpperCase();
      tableMap[mesa] = (tableMap[mesa] || 0) + d.produzido;

      const dateStr = d.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!dayMap[dateStr]) dayMap[dateStr] = { date: dateStr, produced: 0, goal: 0 };
      dayMap[dateStr].produced += d.produzido;
      dayMap[dateStr].goal += d.metaDia;
    });

    const efficiency = totalGoal > 0 ? (totalProduced / totalGoal) * 100 : 0;
    const avgPcsHr = totalHours > 0 ? totalProduced / totalHours : 0;

    return {
      totalProduced,
      avgPcsHr,
      efficiency,
      totalHours,
      chartModels: Object.entries(modelMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
      chartEfficiency: Object.entries(efficiencyMap).map(([name, s]) => ({ 
        name, 
        value: Number((s.sum / s.count).toFixed(1)) 
      })).sort((a, b) => b.value - a.value).slice(0, 8),
      chartTables: Object.entries(tableMap).map(([name, value]) => ({ name, value })),
      chartDays: Object.values(dayMap).sort((a, b) => {
        const [da, ma] = a.date.split('/').map(Number);
        const [db, mb] = b.date.split('/').map(Number);
        return (ma * 100 + da) - (mb * 100 + db);
      })
    };
  }, [filteredData]);

  // Lógica de detalhamento da mesa selecionada no gráfico (Turnos exclusivamente)
  const mesaDetailsData = useMemo(() => {
    if (!selectedMesaForModal) return { shifts: [], total: 0 };
    
    const mesaEntries = typoData.filter(d => d.mesa.toUpperCase() === selectedMesaForModal.toUpperCase());
    const shiftMap: Record<string, number> = { '1º Turno': 0, '2º Turno': 0 };
    let total = 0;

    mesaEntries.forEach(d => {
        const shiftRaw = String(d.turno || '').toUpperCase();
        let shiftKey = '1º Turno';
        
        if (shiftRaw.includes('2') || shiftRaw.includes('SEGUNDO')) {
            shiftKey = '2º Turno';
        } else {
            shiftKey = '1º Turno';
        }
        
        shiftMap[shiftKey] += d.produzido;
        total += d.produzido;
    });

    const shifts = Object.entries(shiftMap).map(([name, value]) => ({
        name,
        value,
        percent: total > 0 ? ((value / total) * 100).toFixed(1) : "0"
    }));

    return { shifts, total };
  }, [selectedMesaForModal, typoData]);

  const handleConfirmPrint = () => {
    const originalTitle = document.title;
    document.title = "analise_tipologias_alumasa";
    setTimeout(() => { window.print(); document.title = originalTitle; }, 100);
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <Activity className="w-12 h-12 text-primary animate-spin" />
      <p className="font-black text-slate-500 uppercase tracking-widest">Processando Metas de Engenharia...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
            Engenharia: Análise de Tipologias
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Performance Técnica por Modelo e Mesa</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white dark:bg-dark-card p-1.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Layout className="w-4 h-4 text-blue-500 ml-2" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mesa:</span>
            <select 
              value={selectedMesa} 
              onChange={(e) => setSelectedMesa(e.target.value)} 
              className="bg-transparent text-xs font-black text-slate-800 dark:text-white outline-none cursor-pointer appearance-none px-2 min-w-[80px]"
            >
              {mesas.map(m => <option key={m} value={m} className="bg-white dark:bg-slate-800">{m}</option>)}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 mr-2" />
          </div>

          <button onClick={() => setShowPrintPreview(true)} className="bg-white dark:bg-dark-card border border-gray-700 p-2.5 rounded-xl flex items-center gap-2 font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 shadow-sm">
            <Printer className="w-4 h-4 text-rose-500" /> Relatório
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <StatCard title="TOTAL PRODUZIDO" value={metrics.totalProduced.toLocaleString('pt-BR')} icon={Package} color="blue" />
        <StatCard title="EFICIÊNCIA GLOBAL" value={`${metrics.efficiency.toFixed(1)}%`} icon={Target} color="green" />
        <StatCard title="MÉDIA PEÇAS/HORA" value={Math.round(metrics.avgPcsHr)} icon={Zap} color="purple" />
        <StatCard title="TEMPO EM OPERAÇÃO" value={formatHoursMinutes(metrics.totalHours)} icon={Clock} color="yellow" trend="7.5h/dia" />
      </div>

      {/* CHARTS ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-800">
          <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-6 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-500" /> Eficiência Média por Tipologia
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.chartEfficiency} layout="vertical" margin={{ right: 40, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.1} />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 9, fontWeight: '900', fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                  {metrics.chartEfficiency.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value >= 90 ? '#10b981' : entry.value >= 70 ? '#f59e0b' : '#ef4444'} />
                  ))}
                  <LabelList dataKey="value" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 10, fontWeight: 'black', fill: '#64748b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-800">
          <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Evolução Diária vs Metas
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={metrics.chartDays}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                <XAxis dataKey="date" tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                    padding: '12px'
                  }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  // Formatter ajustado para não mostrar duplicados se dataKey for o mesmo
                  formatter={(value: any, name: string) => [value, name]}
                />
                <Area type="monotone" dataKey="goal" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.1} name="Meta Diária" />
                <Bar dataKey="produced" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} name="Produzido" />
                <Line 
                  type="monotone" 
                  dataKey="produced" 
                  stroke="#059669" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#059669' }} 
                  tooltipType="none"
                  legendType="none"
                  name="Produzido" // Adicionado para evitar que o Recharts use a chave original 'produced'
                />
                <Legend iconType="circle" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CHARTS ROW 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-800">
          <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-6 flex items-center gap-2">
            <Layout className="w-4 h-4 text-purple-500" /> Distribuição de Carga por Mesa
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.chartTables} layout="vertical" margin={{ left: 20, right: 60 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12, fontWeight: '900', fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <Bar 
                    dataKey="value" 
                    fill="#8b5cf6" 
                    radius={[0, 4, 4, 0]} 
                    barSize={30}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    onClick={(data) => { if(data && data.name) setSelectedMesaForModal(data.name); }}
                >
                  <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 'black', fill: '#8b5cf6' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-6 flex items-center gap-2">
            <Factory className="w-4 h-4 text-orange-500" /> Volume por Tipologia (Top Modelos)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.chartModels.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 'bold', fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40}>
                  <LabelList dataKey="value" position="top" style={{ fontSize: 10, fontWeight: 'black', fill: '#f59e0b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* MODAL DE DETALHAMENTO DA MESA (APENAS POR TURNO) */}
      {selectedMesaForModal && (
        <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 no-print">
            <div className="bg-[#1e293b] w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-700 overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-700 flex justify-between items-start">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                            <Layout className="w-7 h-7 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none mb-2">Detalhamento da Mesa</h2>
                            <p className="text-xs font-black text-purple-400 uppercase tracking-[0.2em]">{selectedMesaForModal}</p>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Total Produzido: {mesaDetailsData.total.toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setSelectedMesaForModal(null)} 
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-8 max-h-[50vh] overflow-y-auto custom-scrollbar">
                    {/* Detalhamento por Turno */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                           <Clock className="w-3 h-3" /> Produção por Turno
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {mesaDetailsData.shifts.map((s, i) => (
                                <div key={i} className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50 flex flex-col justify-between group hover:border-purple-500/30 transition-all">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{s.name}</p>
                                    <div className="flex justify-between items-end">
                                        <span className="text-3xl font-black text-white group-hover:text-purple-400 transition-colors">
                                            {s.value.toLocaleString('pt-BR')}
                                        </span>
                                        <span className="text-[11px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                            {s.percent}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex gap-3">
                        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-slate-400 leading-relaxed italic">
                            Os dados acima representam a produção consolidada desta mesa baseada nos lançamentos oficiais por turno registrados no sistema Alumasa.
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-slate-900/50 border-t border-slate-700">
                    <button 
                        onClick={() => setSelectedMesaForModal(null)} 
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg border border-slate-700"
                    >
                        Fechar Detalhes
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* PRINT PREVIEW */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-dark-card overflow-auto flex flex-col print-mode-wrapper animate-in fade-in duration-300 print:block print:static print:h-auto print:overflow-visible print:bg-white">
          <div className="sticky top-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-md z-50 no-print preview-header">
            <div className="flex items-center">
              <Printer className="mr-2 w-5 h-5" />
              <span className="font-bold text-sm uppercase tracking-widest">Relatório Técnico de Tipologias Industriais</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPrintPreview(false)} className="px-6 py-2 bg-slate-600 hover:bg-slate-700 rounded-xl font-black text-[10px] uppercase flex items-center transition-all active:scale-95"><X className="w-4 h-4 mr-2" /> Voltar</button>
              <button onClick={handleConfirmPrint} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase flex items-center transition-all shadow-lg active:scale-95"><Check className="w-4 h-4 mr-2" /> Confirmar Impressão</button>
            </div>
          </div>

          <div className="print-container flex-1 p-4 md:p-12 print:p-0 print:block print:static print:h-auto print:overflow-visible">
            <div className="printable-area bg-white text-black p-10 max-w-[210mm] mx-auto border border-gray-100 shadow-xl h-auto overflow-visible block print:border-none print:p-0 print:static print:max-w-none">
              <div className="w-full print:static">
                <header className="mb-8 text-center border-b-[3px] border-black pb-4 no-break-inside text-black">
                  <h1 className="text-5xl font-black mb-1 text-black">ALUMASA</h1>
                  <p className="text-xl font-bold mb-4 uppercase text-black">Alumínio & Plástico</p>
                  <div className="py-2">
                    <h2 className="text-2xl font-black uppercase tracking-wider text-black">RELATÓRIO TÉCNICO DE ENGENHARIA DE PROCESSOS</h2>
                    <p className="text-xs font-bold text-black uppercase">Consolidado de Tipologias - Escadas e Plástico</p>
                  </div>
                </header>

                <section className="mb-8 w-full no-break-inside">
                  <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">INDICADORES EXECUTIVOS (KPIS)</h3>
                  <table className="w-full text-sm border-collapse border border-black text-black">
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black uppercase text-[10px]">Volume Produzido Geral</td>
                        <td className="p-3 font-black text-black text-xl">{metrics.totalProduced.toLocaleString('pt-BR')} unidades</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black uppercase text-[10px]">Eficiência Operacional vs Meta</td>
                        <td className="p-3 font-black text-black">{metrics.efficiency.toFixed(1)}%</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black uppercase text-[10px]">Produtividade Horária Média</td>
                        <td className="p-3 font-black text-black">{metrics.avgPcsHr.toFixed(2)} pçs/h</td>
                      </tr>
                      <tr>
                        <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black uppercase text-[10px]">Total de Horas Trabalhadas</td>
                        <td className="p-3 font-black text-black">{metrics.totalHours.toFixed(1)} horas</td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                <section className="mb-8 w-full no-break-inside">
                  <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">CARGA DE PRODUÇÃO POR MESA</h3>
                  <table className="w-full text-[10px] border-collapse border border-black text-black">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-2 text-left font-black uppercase text-black">Mesa / Posto</th>
                        <th className="border border-black p-2 text-right font-black uppercase text-black">Quantidade Produzida</th>
                        <th className="border border-black p-2 text-center font-black uppercase text-black">Participação (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.chartTables.map((item, idx) => (
                        <tr key={idx} className="border-b border-black text-black">
                          <td className="border-r border-black p-2 font-bold text-black uppercase">{item.name}</td>
                          <td className="border-r border-black p-2 text-right font-black text-black">{item.value.toLocaleString('pt-BR')}</td>
                          <td className="p-2 text-center font-black text-black">{((item.value / metrics.totalProduced) * 100 || 0).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                <section className="mb-10 w-full overflow-visible">
                  <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">MIX DE TIPOLOGIAS (TOP MODELOS)</h3>
                  <table className="w-full text-[9px] border-collapse border border-black text-black">
                    <thead style={{ display: 'table-header-group' }}>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-2 text-left font-black uppercase text-black">Modelo / Tipologia</th>
                        <th className="border border-black p-2 text-right font-black uppercase text-black">Total Produzido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.chartModels.map((item, idx) => (
                        <tr key={idx} className="border-b border-black text-black" style={{ pageBreakInside: 'avoid' }}>
                          <td className="border-r border-black p-2 font-bold text-black uppercase">{item.name}</td>
                          <td className="p-2 text-right font-black text-black">{item.value.toLocaleString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                <footer className="mt-8 pt-10 flex justify-between gap-24 no-break-inside text-black">
                  <div className="text-center flex-1">
                    <div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Coordenador de Engenharia</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Gerência Industrial</div>
                  </div>
                </footer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionTypology;
