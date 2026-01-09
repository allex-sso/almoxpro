
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';
import { 
  Users, Building, Package, TrendingUp, Activity, ChevronDown, Calendar, 
  ClipboardList, Clock, Printer, X, Check 
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

const CustomCentralTooltip = ({ active, payload, label, total, categoryLabel }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const name = label || data.name;
    const value = payload[0].value;
    const percent = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
    const metricLabel = 'Quantidade (Barras)';
    
    return (
      <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl text-white min-w-[220px] pointer-events-none animate-in fade-in zoom-in-95 duration-200">
        <h4 className="font-black text-[10px] mb-3 text-blue-400 leading-tight uppercase tracking-[0.2em] border-b border-slate-800 pb-2 flex justify-between items-center">
          <span>Detalhes da Análise</span>
          <Activity className="w-3 h-3" />
        </h4>
        <div className="space-y-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-0.5">{categoryLabel || 'Item'}:</span>
            <span className="font-black text-white text-sm">{name}</span>
          </div>
          
          <div className="pt-2 border-t border-slate-800/50 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{metricLabel}:</span>
              <span className="font-black text-white">{value.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Participação:</span>
              <span className="font-black text-emerald-400">{percent}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CentralDashboard: React.FC<CentralDashboardProps> = ({ data, isLoading }) => {
  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
  
  const [selectedYear, setSelectedYear] = useState<string>('Todos');
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');
  const [showPrintPreview, setShowPrintPreview] = useState(false);

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
    let turno2Qty = 0;

    const movementCount = filteredData.length;

    filteredData.forEach(m => {
      totalItems += m.quantidade;
      const sector = m.setor || 'Outros';
      bySector[sector] = (bySector[sector] || 0) + m.quantidade;
      
      const req = m.responsavel || 'N/D';
      if (!byRequester[req]) byRequester[req] = { total: 0, count: 0 };
      byRequester[req].total += m.quantidade;
      byRequester[req].count += 1;
      
      const reason = m.motivo || 'Geral/Não especificado';
      byReason[reason] = (byReason[reason] || 0) + m.quantidade; // Agora soma quantidade real

      const t = String(m.turno || '').toLowerCase();
      if (t.includes('1')) {
        turno1Qty += m.quantidade;
      } else if (t.includes('2') || t.includes('3')) {
        turno2Qty += m.quantidade;
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
                <span className="text-xl font-black font-mono tracking-tighter">{turno2Qty.toLocaleString('pt-BR')}</span>
            </div>
        </div>
    );

    return {
      totalItems,
      movementCount,
      avgPerMovement,
      shiftInfo,
      sectorData: Object.entries(bySector).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10),
      requesterData: Object.entries(byRequester).map(([name, s]) => ({ 
        name, 
        total: s.total, 
        count: s.count,
        avg: (s.total / s.count).toFixed(2) 
      })).sort((a,b) => b.total - a.total).slice(0, 10), // Ordena por volume total
      reasonData: Object.entries(byReason).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 8)
    };
  }, [filteredData]);

  const handleConfirmPrint = () => {
    const originalTitle = document.title;
    document.title = "relatorio_gerencial_central_alumasa";
    setTimeout(() => {
        window.print();
        document.title = originalTitle;
    }, 100);
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse font-black text-slate-500 uppercase tracking-widest">Carregando indicadores central...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white font-sans tracking-tight">Indicadores Central</h1>
          <p className="text-sm text-slate-500 font-medium">Consolidado de todas as fontes de dados cadastradas.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white dark:bg-dark-card p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <div className="flex items-center gap-2 px-2 border-r border-gray-100 dark:border-gray-800 mr-1">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar Período:</span>
                </div>

                <div className="relative flex items-center bg-gray-50 dark:bg-slate-800 rounded-lg px-2 py-1.5 border border-gray-200 dark:border-gray-700 min-w-[100px]">
                   <span className="text-[9px] font-black text-slate-400 mr-2 uppercase">Ano</span>
                   <select 
                     value={selectedYear}
                     onChange={(e) => setSelectedYear(e.target.value)}
                     className="bg-transparent text-xs font-black text-slate-800 dark:text-white outline-none cursor-pointer appearance-none pr-4 z-10 w-full"
                   >
                     {yearOptions.map(y => (
                       <option key={y} value={y} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{y}</option>
                     ))}
                   </select>
                   <ChevronDown className="absolute right-1 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative flex items-center bg-gray-50 dark:bg-slate-800 rounded-lg px-2 py-1.5 border border-gray-200 dark:border-gray-700 min-w-[130px]">
                   <span className="text-[9px] font-black text-slate-400 mr-2 uppercase">Mês</span>
                   <select 
                     value={selectedMonth}
                     onChange={(e) => setSelectedMonth(e.target.value)}
                     className="bg-transparent text-xs font-black text-slate-800 dark:text-white outline-none cursor-pointer appearance-none pr-4 z-10 w-full"
                   >
                     <option value="Todos" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Todos</option>
                     {months.map(m => (
                       <option key={m} value={m} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{m}</option>
                     ))}
                   </select>
                   <ChevronDown className="absolute right-1 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
            </div>

            <button 
                onClick={() => setShowPrintPreview(true)} 
                className="bg-white dark:bg-dark-card border border-gray-700 p-2.5 rounded-xl flex items-center gap-2 font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95"
            >
                <Printer className="w-4 h-4 text-rose-500" /> Relatório Gerencial
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
        <StatCard title="Saída Total de Barras" value={metrics.totalItems.toLocaleString('pt-BR')} icon={Package} color="blue" />
        <StatCard title="Consumo por Turno" value={metrics.shiftInfo} icon={Clock} color="green" />
        <StatCard title="Solicitantes Ativos" value={metrics.requesterData.length} icon={Users} color="purple" />
        <StatCard title="Média de Itens p/ Saída" value={metrics.avgPerMovement} icon={Activity} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 no-print">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-500" /> Quantidade por Setor
          </h3>
          <div className="h-72">
            {metrics.sectorData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.sectorData} layout="vertical" margin={{ right: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                  <Tooltip 
                    content={<CustomCentralTooltip total={metrics.totalItems} categoryLabel="Setor" />} 
                    cursor={{fill: 'rgba(37, 99, 235, 0.05)'}} 
                  />
                  <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={20}>
                    <LabelList 
                      dataKey="value" 
                      position="right" 
                      style={{ fill: '#64748b', fontSize: '14px', fontWeight: 'bold' }} 
                      formatter={(val: number) => val.toLocaleString('pt-BR')}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">Sem dados para exibir</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Volume por Motivo
          </h3>
          <div className="h-72">
            {metrics.reasonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={metrics.reasonData} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                    {metrics.reasonData.map((_, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomCentralTooltip total={metrics.totalItems} categoryLabel="Motivo" />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">Sem dados para exibir</div>
            )}
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
                {metrics.requesterData.map((req, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-bold dark:text-white">{req.name}</td>
                    <td className="px-6 py-4 text-center font-black text-blue-600">{req.total.toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg font-black text-[11px]">
                            {req.count}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500 font-mono font-bold">{req.avg}</td>
                  </tr>
                ))}
                {metrics.requesterData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">Nenhum registro encontrado nas fontes ou período selecionado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>

      {/* OVERLAY DE PRÉ-VISUALIZAÇÃO (PADRÃO ALUMASA) */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-dark-card overflow-auto flex flex-col print-mode-wrapper animate-in fade-in duration-300">
            {/* Header de Controle */}
            <div className="sticky top-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-md z-50 no-print preview-header">
                <div className="flex items-center">
                    <Printer className="mr-2 w-5 h-5" />
                    <span className="font-bold text-sm uppercase tracking-widest">Pré-visualização do Relatório Central</span>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowPrintPreview(false)}
                        className="px-6 py-2 bg-slate-600 hover:bg-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center transition-all active:scale-95"
                    >
                        <X className="w-4 h-4 mr-2" /> Voltar
                    </button>
                    <button 
                        onClick={handleConfirmPrint}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center transition-all shadow-lg active:scale-95"
                    >
                        <Check className="w-4 h-4 mr-2" /> Confirmar Impressão
                    </button>
                </div>
            </div>

            {/* Conteúdo do Relatório */}
            <div className="flex-1 p-4 md:p-12 print-container">
                <div className="printable-area bg-white text-black p-10 max-w-[210mm] mx-auto border border-gray-100 h-auto overflow-visible">
                    <div className="w-full">
                        <header className="mb-8 text-center border-b-[3px] border-black pb-4">
                            <h1 className="text-4xl font-black mb-1 text-black">ALUMASA</h1>
                            <p className="text-lg font-bold mb-4 uppercase text-black">Alumínio & Plástico</p>
                            <div className="py-2">
                                <h2 className="text-2xl font-black uppercase tracking-wider text-black">RELATÓRIO GERENCIAL ALMOXARIFADO CENTRAL</h2>
                                <p className="text-xs font-bold text-black">Consolidado de Consumo de Perfis</p>
                            </div>
                        </header>

                        <section className="mb-8">
                            <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">DADOS DA EMISSÃO</h3>
                            <table className="w-full text-[10px] border-collapse border border-black">
                                <tbody>
                                    <tr className="border-b border-black">
                                        <td className="border-r border-black p-2 font-black w-1/3 bg-gray-100 text-black">Data e Hora</td>
                                        <td className="p-2 font-black text-black">{new Date().toLocaleString('pt-BR')}</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                        <td className="border-r border-black p-2 font-black bg-gray-100 text-black">Período de Referência</td>
                                        <td className="p-2 font-black text-black">{selectedMonth} / {selectedYear}</td>
                                    </tr>
                                    <tr>
                                        <td className="border-r border-black p-2 font-black bg-gray-100 text-black">Tipo de Documento</td>
                                        <td className="p-2 font-black text-black">Gerencial / Auditoria Consolidada</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section className="mb-8">
                            <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">RESUMO EXECUTIVO DE CONSUMO</h3>
                            <table className="w-full text-[10px] border-collapse border border-black">
                                <tbody>
                                    <tr className="border-b border-black">
                                        <td className="border-r border-black p-2 font-black w-1/3 bg-gray-100 text-black">Total de Barras Despachadas</td>
                                        <td className="p-2 font-black text-black">{metrics.totalItems.toLocaleString('pt-BR')}</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                        <td className="border-r border-black p-2 font-black bg-gray-100 text-black">Média de Itens por Requisição</td>
                                        <td className="p-2 font-black text-black">{metrics.avgPerMovement}</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                        <td className="border-r border-black p-2 font-black bg-gray-100 text-black">Total de Registros (Saídas)</td>
                                        <td className="p-2 font-black text-black">{metrics.movementCount}</td>
                                    </tr>
                                    <tr>
                                        <td className="border-r border-black p-2 font-black bg-gray-100 text-black">Nº de Solicitantes Atendidos</td>
                                        <td className="p-2 font-black text-black">{metrics.requesterData.length}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <section>
                                <h3 className="text-[10px] font-black uppercase mb-1 bg-black text-white p-2 border border-black">DISTRIBUIÇÃO POR SETOR</h3>
                                <table className="w-full text-[9px] border-collapse border border-black">
                                    <thead>
                                        <tr className="bg-gray-200">
                                            <th className="border border-black p-2 text-left font-black text-black">Setor</th>
                                            <th className="border border-black p-2 text-center font-black text-black">Barras</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {metrics.sectorData.map((s, i) => (
                                            <tr key={i} className="border-b border-black">
                                                <td className="border-r border-black p-1.5 font-bold text-black">{s.name}</td>
                                                <td className="p-1.5 text-center font-black text-black">{s.value.toLocaleString('pt-BR')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                            <section>
                                <h3 className="text-[10px] font-black uppercase mb-1 bg-black text-white p-2 border border-black">CONSUMO POR MOTIVO</h3>
                                <table className="w-full text-[9px] border-collapse border border-black">
                                    <thead>
                                        <tr className="bg-gray-200">
                                            <th className="border border-black p-2 text-left font-black text-black">Motivo</th>
                                            <th className="border border-black p-2 text-center font-black text-black">Barras</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {metrics.reasonData.map((r, i) => (
                                            <tr key={i} className="border-b border-black">
                                                <td className="border-r border-black p-1.5 font-bold text-black">{r.name}</td>
                                                <td className="p-1.5 text-center font-black text-black">{r.value.toLocaleString('pt-BR')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                        </div>

                        <section className="mb-12">
                            <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">RANKING DE SOLICITANTES (TOP 10 POR VOLUME)</h3>
                            <table className="w-full text-[10px] border-collapse border border-black">
                                <thead>
                                    <tr className="bg-gray-200">
                                        <th className="border border-black p-2 text-left font-black text-black">Profissional</th>
                                        <th className="border border-black p-2 text-center font-black text-black">Barras Totais</th>
                                        <th className="border border-black p-2 text-center font-black text-black">Nº Saídas</th>
                                        <th className="border border-black p-2 text-center font-black text-black">Média</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {metrics.requesterData.map((req, i) => (
                                        <tr key={i} className="border-b border-black">
                                            <td className="border-r border-black p-2 font-black text-black">{req.name}</td>
                                            <td className="border-r border-black p-2 text-center font-black text-black">{req.total.toLocaleString('pt-BR')}</td>
                                            <td className="border-r border-black p-2 text-center font-black text-black">{req.count}</td>
                                            <td className="p-2 text-center font-black text-black">{req.avg}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <div className="mb-12" style={{ pageBreakInside: 'auto' }}>
                            <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">AUDITORIA DE MOVIMENTAÇÕES (CENTRAL)</h3>
                            <table className="w-full text-[9px] border-collapse border border-black">
                                <thead>
                                    <tr className="bg-gray-200">
                                        <th className="border border-black p-2 font-black text-black">Data</th>
                                        <th className="border border-black p-2 font-black text-left text-black">Perfil / Descrição</th>
                                        <th className="border border-black p-2 text-center font-black text-black">Cor</th>
                                        <th className="border border-black p-2 text-center font-black text-black">Qtd</th>
                                        <th className="border border-black p-2 font-black text-left text-black">Solicitante</th>
                                        <th className="border border-black p-2 text-center font-black text-black">Motivo</th>
                                    </tr>
                                </thead>
                                <tbody style={{ pageBreakInside: 'auto' }}>
                                    {filteredData.slice(0, 100).map((m, i) => (
                                        <tr key={i} className="border-b border-black" style={{ pageBreakInside: 'avoid' }}>
                                            <td className="border-r border-black p-1.5 font-bold text-black">{m.data?.toLocaleDateString('pt-BR')}</td>
                                            <td className="border-r border-black p-1.5 text-black">{m.perfil || m.codigo}</td>
                                            <td className="border-r border-black p-1.5 text-center text-black">{m.cor}</td>
                                            <td className="border-r border-black p-1.5 text-center font-black text-black">{m.quantidade}</td>
                                            <td className="border-r border-black p-1.5 font-bold text-black">{m.responsavel}</td>
                                            <td className="p-1.5 text-center text-black italic">{m.motivo || '-'}</td>
                                        </tr>
                                    ))}
                                    {filteredData.length > 100 && (
                                        <tr>
                                            <td colSpan={6} className="p-2 text-center italic text-gray-500 font-bold">
                                                Exibindo os primeiros 100 registros de {filteredData.length}.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <footer className="mt-8 pt-16 flex justify-between gap-24">
                            <div className="text-center flex-1">
                                <div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Assinatura Coordenador Central</div>
                            </div>
                            <div className="text-center flex-1">
                                <div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Assinatura Gerente Industrial</div>
                            </div>
                        </footer>

                        <div className="mt-8 pt-4 border-t border-black flex justify-between text-[7px] font-black uppercase text-black">
                            <div>Documento Auditável Alumasa Industrial - Almoxarifado Central</div>
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
