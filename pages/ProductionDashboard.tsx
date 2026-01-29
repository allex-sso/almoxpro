import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend, LabelList
} from 'recharts';
import { 
  Clock, Target, Zap, Package, Timer, Factory, ChevronLeft, ChevronRight, 
  Search, TrendingUp, Award, Box, Users, ClipboardList, Calendar, Printer, X, Check, Filter, ChevronDown, Layers, ShoppingBag, AlertTriangle
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { ProductionEntry } from '../types';

interface ProductionDashboardProps {
  data: ProductionEntry[];
  isLoading: boolean;
  initialTab?: 'stats' | 'table';
}

const ProductionDashboard: React.FC<ProductionDashboardProps> = ({ data, isLoading, initialTab = 'stats' }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState<string>('Todos');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  
  const itemsPerPage = 15;
  const isTableMode = initialTab === 'table';
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedWeek]);

  const montadores1T = ['RENATO', 'CHARLES', 'MATEUS', 'TIAGO', 'ANTONIA'];
  const montadores2T = ['JAILSON', 'EMERSON', 'JOEDSON', 'MARCILIO', 'ISRAEL'];
  const allMontadores = [...montadores1T, ...montadores2T];

  const embalagem1T = ['ADRIANA/RANNY'];
  const embalagem2T = ['DANILO/ANGELICA'];
  const allEmbalagem = [...embalagem1T, ...embalagem2T];

  const weekOptions = useMemo(() => {
    const weeks = new Set<string>();
    data.forEach(m => {
      if (m.semana) weeks.add(m.semana);
    });
    const sorted = Array.from(weeks).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const baseWeeks = sorted.length > 0 ? sorted : ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
    return ['Todos', ...baseWeeks];
  }, [data]);

  const periodFilteredData = useMemo(() => {
    if (selectedWeek === 'Todos') return data;
    return data.filter(m => m.semana === selectedWeek);
  }, [data, selectedWeek]);

  const metrics = useMemo(() => {
    let totalMontagem = 0;   
    let totalEmbalagem = 0;  
    let banquetasTotal = 0;  
    let t1Total = 0;
    let t2Total = 0;

    const assemblerStats: Record<string, number> = {};
    const packagingStats: Record<string, number> = {};

    periodFilteredData.forEach(entry => {
      const name = entry.tipologia.toUpperCase();
      const value = entry.produzido;
      
      const isMontagem = allMontadores.some(m => name.includes(m));
      const isEmbalagem = allEmbalagem.some(e => name.includes(e));

      if (isMontagem) {
        totalMontagem += value;
        assemblerStats[name] = (assemblerStats[name] || 0) + value;
        if (name.includes('ANTONIA')) banquetasTotal += value;
        if (montadores1T.some(m => name.includes(m))) t1Total += value;
        else t2Total += value;
      } else if (isEmbalagem) {
        totalEmbalagem += value;
        packagingStats[name] = (packagingStats[name] || 0) + value;
        if (embalagem1T.some(e => name.includes(e))) t1Total += value;
        else t2Total += value;
      }
    });

    return {
      totalMontagem,
      totalEmbalagem,
      banquetasTotal,
      faltaEmbalar: Math.max(0, totalMontagem - totalEmbalagem),
      chartAssemblers: Object.entries(assemblerStats).map(([name, value]) => ({ 
        name, 
        value,
        participation: totalMontagem > 0 ? ((value / totalMontagem) * 100).toFixed(1) : "0"
      })).sort((a, b) => b.value - a.value),
      chartPackaging: Object.entries(packagingStats).map(([name, value]) => ({ 
        name, 
        value, 
        meta: 1000, 
        percent: Math.min((value / 1000) * 100, 100).toFixed(1),
        turno: embalagem1T.some(e => name.includes(e)) ? '1º Turno' : '2º Turno'
      })).sort((a,b) => b.turno.localeCompare(a.turno)),
      shiftDistributionData: [
        { name: '1º Turno (Montagem + Embalagem)', value: t1Total, color: '#10b981' },
        { name: '2º Turno (Montagem + Embalagem)', value: t2Total, color: '#f59e0b' }
      ].filter(d => d.value > 0)
    };
  }, [periodFilteredData]);

  const filteredTableData = useMemo(() => {
    return periodFilteredData
      .filter(entry => entry.semana && entry.semana.trim() !== '')
      .filter(entry => entry.turno !== 'Geral')
      .filter(entry => 
        entry.tipologia.toLowerCase().includes(searchTerm.toLowerCase())
      ).sort((a, b) => b.produzido - a.produzido);
  }, [periodFilteredData, searchTerm]);

  const totalPages = Math.ceil(filteredTableData.length / itemsPerPage);
  const paginatedData = filteredTableData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleConfirmPrint = () => {
    const originalTitle = document.title;
    const weekSlug = selectedWeek.toLowerCase().replace(' ', '_');
    document.title = `relatorio_producao_${weekSlug}_alumasa`;
    setTimeout(() => {
        window.print();
        document.title = originalTitle;
    }, 100);
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <Timer className="w-12 h-12 text-primary animate-spin" />
      <p className="font-black text-slate-500 uppercase tracking-widest">Sincronizando Matriz Industrial...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500 rounded-xl shadow-lg">
            <Factory className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
              {isTableMode ? 'Detalhamento Diário' : 'Painel de Produção'}
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unidade: Escadas e Plástico</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {isTableMode && (
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar equipe..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary shadow-sm"
                />
              </div>
            )}

            <div className="bg-white dark:bg-dark-card p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <div className="flex items-center gap-2 px-2 border-r border-gray-100 dark:border-gray-800 mr-1">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PERÍODO:</span>
                </div>
                <select 
                  value={selectedWeek} 
                  onChange={(e) => setSelectedWeek(e.target.value)} 
                  className="bg-transparent text-xs font-black text-slate-800 dark:text-white outline-none cursor-pointer appearance-none px-2"
                >
                  {weekOptions.map(w => (<option key={w} value={w} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{w}</option>))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 mr-2" />
            </div>
            <button onClick={() => setShowPrintPreview(true)} className="bg-white dark:bg-dark-card border border-gray-700 p-2.5 rounded-xl flex items-center gap-2 font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 shadow-sm">
                <Printer className="w-4 h-4 text-rose-500" /> Relatório
            </button>
        </div>
      </div>

      {!isTableMode ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
            <StatCard title="TOTAL MONTAGEM" value={metrics.totalMontagem.toLocaleString('pt-BR')} icon={Zap} color="blue" />
            <StatCard title="TOTAL EMBALAGEM" value={metrics.totalEmbalagem.toLocaleString('pt-BR')} icon={Package} color="green" />
            <StatCard title="BANQUETAS" value={metrics.banquetasTotal.toLocaleString('pt-BR')} icon={Award} color="purple" />
            <StatCard title="PENDENTE EMBALAR" value={metrics.faltaEmbalar.toLocaleString('pt-BR')} icon={AlertTriangle} color="red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
            <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl p-8 shadow-lg border border-slate-100 dark:border-slate-800">
              <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-8 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Ranking de Montadores ({selectedWeek})
              </h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.chartAssemblers} layout="vertical" margin={{ left: 20, right: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.1} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 9, fontWeight: 'bold', fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                      <LabelList dataKey="value" position="right" formatter={(v: number) => v.toLocaleString('pt-BR')} style={{ fontSize: 10, fontWeight: 'black', fill: '#3b82f6' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-2xl p-8 shadow-lg border border-slate-100 dark:border-slate-800">
              <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-8 flex items-center gap-2">
                <Box className="w-4 h-4 text-orange-500" /> Produção de Embalagem por Equipe
              </h3>
              <div className="space-y-10">
                {metrics.chartPackaging.map((item, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{item.name}</p>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{item.turno}</p>
                      </div>
                      <p className="text-xl font-black text-emerald-500">{item.value.toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                      <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${item.percent}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <span>Eficiência: {item.percent}%</span>
                      <span>Vol. Acumulado</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 bg-white dark:bg-dark-card rounded-2xl p-8 shadow-lg border border-slate-100 dark:border-slate-800">
              <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-8 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" /> Distribuição de Carga Consolidada por Turno
              </h3>
              <div className="h-[400px]">
                {metrics.shiftDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={metrics.shiftDistributionData} 
                        cx="50%" cy="50%" 
                        innerRadius={80} 
                        outerRadius={130} 
                        paddingAngle={5} 
                        dataKey="value" 
                        stroke="none"
                      >
                        {metrics.shiftDistributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: '1px solid #334155', 
                          backgroundColor: '#1e293b', 
                          padding: '10px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                        }} 
                        itemStyle={{
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase'
                        }}
                        formatter={(value: number, name: string) => [value.toLocaleString('pt-BR'), name]}
                        labelStyle={{ display: 'none' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        align="center" 
                        iconType="rect" 
                        wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 italic text-sm">Aguardando dados consolidados...</div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden no-print">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold">
                <tr>
                  <th className="px-6 py-4">Equipe / Tipologia</th>
                  <th className="px-6 py-4 text-center">Período</th>
                  <th className="px-6 py-4 text-right">Produzido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedData.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-white uppercase">{entry.tipologia}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg font-black text-[10px] uppercase">
                        {entry.semana}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg font-black">
                        {entry.produzido.toLocaleString('pt-BR')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTableData.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800">
              <span className="text-sm text-gray-700 dark:text-gray-400">
                Página {currentPage} de {totalPages}
              </span>
              <div className="inline-flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-dark-card overflow-auto flex flex-col print-mode-wrapper animate-in fade-in duration-500 print:relative print:block">
          <div className="sticky top-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-md z-50 no-print preview-header">
            <div className="flex items-center">
              <Printer className="mr-2 w-5 h-5" />
              <span className="font-bold text-sm uppercase tracking-widest">Relatório de Produção Industrial</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPrintPreview(false)} className="px-6 py-2 bg-slate-600 hover:bg-slate-700 rounded-xl font-black text-[10px] uppercase flex items-center transition-all active:scale-95"><X className="w-4 h-4 mr-2" /> Voltar</button>
              <button onClick={handleConfirmPrint} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase flex items-center transition-all shadow-lg active:scale-95"><Check className="w-4 h-4 mr-2" /> Confirmar Impressão</button>
            </div>
          </div>

          <div className="flex-1 p-4 md:p-12 print:p-0">
            <div className="printable-area bg-white text-black p-10 max-w-[210mm] mx-auto border border-gray-100 shadow-xl print:shadow-none print:border-none">
              <header className="mb-8 text-center border-b-[3px] border-black pb-4">
                <h1 className="text-5xl font-black mb-1 text-black">ALUMASA</h1>
                <p className="text-xl font-bold mb-4 uppercase text-black">Alumínio & Plástico</p>
                <div className="py-2">
                  <h2 className="text-2xl font-black uppercase tracking-wider text-black">RELATÓRIO DE PRODUÇÃO SEMANAL</h2>
                  <p className="text-xs font-bold text-black uppercase">Unidade de Escadas e Plástico - {selectedWeek}</p>
                </div>
              </header>

              <section className="mb-8 w-full no-break-inside">
                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">1. INDICADORES GERAIS DE PERFORMANCE</h3>
                <table className="w-full text-sm border-collapse border border-black">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black">Total Montado (Geral)</td>
                      <td className="p-3 font-black text-black">{metrics.totalMontagem.toLocaleString('pt-BR')} unidades</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black">Total Embalado (Geral)</td>
                      <td className="p-3 font-black text-black">{metrics.totalEmbalagem.toLocaleString('pt-BR')} unidades</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black">Total de Banquetas</td>
                      <td className="p-3 font-black text-black">{metrics.banquetasTotal.toLocaleString('pt-BR')} unidades</td>
                    </tr>
                    <tr>
                      <td className="border-r border-black p-3 font-black w-[45%] bg-gray-50 text-black">Diferença Pendente</td>
                      <td className="p-3 font-black text-red-600">{metrics.faltaEmbalar.toLocaleString('pt-BR')} unidades</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="mb-8 w-full no-break-inside">
                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">2. CARGA POR TURNO OPERACIONAL</h3>
                <table className="w-full text-sm border-collapse border border-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 text-left font-black uppercase text-black">Turno</th>
                      <th className="border border-black p-2 text-right font-black uppercase text-black">Volume Total</th>
                      <th className="border border-black p-2 text-right font-black uppercase text-black">Participação (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.shiftDistributionData.map((d, i) => (
                      <tr key={i} className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold uppercase text-black">{d.name.split(' (')[0]}</td>
                        <td className="border-r border-black p-2 text-right font-black text-black">{d.value.toLocaleString('pt-BR')}</td>
                        <td className="p-2 text-right font-black text-black">{((d.value / (metrics.totalMontagem + metrics.totalEmbalagem)) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="mb-8 w-full">
                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">3. RANKING DE PRODUTIVIDADE - MONTADORES</h3>
                <table className="w-full text-[10px] border-collapse border border-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 text-left font-black uppercase text-black">Nome / Equipe</th>
                      <th className="border border-black p-2 text-right font-black uppercase text-black">Qtd. Montada</th>
                      <th className="border border-black p-2 text-right font-black uppercase text-black">Part. Montagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.chartAssemblers.map((item, idx) => (
                      <tr key={idx} className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold uppercase text-black">{item.name}</td>
                        <td className="border-r border-black p-2 text-right font-black text-black">{item.value.toLocaleString('pt-BR')}</td>
                        <td className="p-2 text-right font-black text-black">{item.participation}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="mb-8 w-full no-break-inside">
                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">4. DESEMPENHO SETOR EMBALAGEM</h3>
                <table className="w-full text-[10px] border-collapse border border-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 text-left font-black uppercase text-black">Equipe Responsável</th>
                      <th className="border border-black p-2 text-center font-black uppercase text-black">Turno</th>
                      <th className="border border-black p-2 text-right font-black uppercase text-black">Qtd. Embalada</th>
                      <th className="border border-black p-2 text-right font-black uppercase text-black">Eficiência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.chartPackaging.map((item, idx) => (
                      <tr key={idx} className="border-b border-black">
                        <td className="border-r border-black p-2 font-bold uppercase text-black">{item.name}</td>
                        <td className="border-r border-black p-2 text-center font-bold uppercase text-black">{item.turno}</td>
                        <td className="border-r border-black p-2 text-right font-black text-black">{item.value.toLocaleString('pt-BR')}</td>
                        <td className="p-2 text-right font-black text-black">{item.percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="mb-8 w-full">
                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">5. DETALHAMENTO ANALÍTICO (LISTAGEM DE PRODUÇÃO)</h3>
                <table className="w-full text-[8px] border-collapse border border-black">
                  <thead style={{ display: 'table-header-group' }}>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 text-left font-black uppercase text-black">Equipe / Tipologia</th>
                      <th className="border border-black p-2 text-center font-black uppercase text-black">Semana</th>
                      <th className="border border-black p-2 text-right font-black uppercase text-black">Produção Realizada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTableData.map((item, idx) => (
                      <tr key={idx} className="border-b border-black" style={{ pageBreakInside: 'avoid' }}>
                        <td className="border-r border-black p-1.5 font-bold text-black uppercase">{item.tipologia}</td>
                        <td className="border-r border-black p-1.5 text-center font-black text-black">{item.semana}</td>
                        <td className="p-1.5 text-right font-black text-black">{item.produzido.toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <footer className="mt-12 pt-10 flex justify-between gap-24 no-break-inside">
                <div className="text-center flex-1">
                  <div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Líder de Produção</div>
                </div>
                <div className="text-center flex-1">
                  <div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Gerência Industrial</div>
                </div>
              </footer>
              <div className="mt-4 text-center text-[7px] font-bold text-gray-500 uppercase tracking-widest no-break-inside">
                Relatório Gerencial Alumasa - Emitido em: {new Date().toLocaleString('pt-BR')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionDashboard;