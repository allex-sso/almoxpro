
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend
} from 'recharts';
import { 
  ClipboardList, Clock, Wrench, Building, Users, Timer, Zap, CalendarDays, AlertCircle, TrendingDown, X, MessageCircle, BarChart3, Printer, BrainCircuit, Loader2, Filter, ChevronDown, Check
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { ServiceOrder, InventoryItem } from '../types';
import { GoogleGenAI } from "@google/genai";

interface ServiceOrdersProps {
  osData: ServiceOrder[];
  inventoryData: InventoryItem[];
  isLoading?: boolean;
}

const formatDetailedTime = (decimalHours: number | string): string => {
  const hoursNum = typeof decimalHours === 'string' ? parseFloat(decimalHours) : decimalHours;
  if (isNaN(hoursNum) || hoursNum <= 0) return "0m";
  const h = Math.floor(hoursNum);
  const m = Math.round((hoursNum - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

// Tooltip para o gráfico de Equipamentos (Barras)
const CustomEquipmentTooltip = ({ active, payload, total }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : "0";
    return (
      <div className="bg-[#1e293b] border border-slate-700 p-4 rounded-xl shadow-2xl text-white min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
        <p className="font-black text-lg mb-3 tracking-tight">{data.name}</p>
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quantidade:</span>
            <span className="font-black text-blue-400">{data.value}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Porcentagem:</span>
            <span className="font-black text-emerald-400">{percent}%</span>
          </div>
        </div>
        <div className="pt-3 border-t border-slate-700/50">
           <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.15em] text-center">
             Clique para ver peças
           </p>
        </div>
      </div>
    );
  }
  return null;
};

// Tooltip para o gráfico de Peças (Modal)
const CustomPieceTooltip = ({ active, payload, total }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : "0";
    return (
      <div className="bg-[#1e293b] border border-slate-700 p-5 rounded-2xl shadow-2xl text-white min-w-[240px] animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-4">
          <p className="font-black text-xl tracking-tight leading-tight">{data.name}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{data.name}</p>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-blue-500">Ocorrências:</span>
            <span className="text-sm font-black text-white">{data.value}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white">Frequência:</span>
            <span className="text-sm font-black text-white">{percent}%</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-700/50">
           <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] text-center">
             Clique para ver motivos
           </p>
        </div>
      </div>
    );
  }
  return null;
};

// Tooltip para o gráfico de Setores (Rosca)
const CustomSectorTooltip = ({ active, payload, total }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : "0";
    return (
      <div className="bg-[#1e293b] border border-slate-700 p-4 rounded-xl shadow-2xl text-white min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
        <p className="font-black text-lg mb-3 tracking-tight">{data.name}</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quantidade:</span>
            <span className="font-black text-blue-400">{data.value}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Porcentagem:</span>
            <span className="font-black text-emerald-400">{percent}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Tooltip para o gráfico de Tempo Parado
const CustomDowntimeTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#1e293b] border border-slate-700 p-4 rounded-xl shadow-2xl text-white min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
        <p className="font-black text-sm mb-2 tracking-tight">{data.name}</p>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Tempo Total Parado:</span>
          <span className="font-black text-rose-500 text-lg">{formatDetailedTime(data.value)}</span>
        </div>
      </div>
    );
  }
  return null;
};

const ServiceOrdersPage: React.FC<ServiceOrdersProps> = ({ osData: data, inventoryData, isLoading }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');
  const [selectedSector, setSelectedSector] = useState<string>('Todos');
  const [selectedEquipmentForModal, setSelectedEquipmentForModal] = useState<string | null>(null);
  const [selectedPartForReasons, setSelectedPartForReasons] = useState<string | null>(null);
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printType, setPrintType] = useState<'report' | 'ai' | null>(null);

  const SECTOR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  const availableSectors = useMemo(() => {
    const sSet = new Set<string>();
    data.forEach(os => { if (os.setor) sSet.add(os.setor); });
    return ['Todos', ...Array.from(sSet).sort()];
  }, [data]);

  const availableMonths = useMemo(() => {
    const mMap = new Map<string, Date>();
    data.forEach(os => {
      const label = os.dataAbertura.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      if (!mMap.has(label)) {
        mMap.set(label, new Date(os.dataAbertura.getFullYear(), os.dataAbertura.getMonth(), 1));
      }
    });
    const sortedLabels = Array.from(mMap.entries())
      .sort((a, b) => b[1].getTime() - a[1].getTime())
      .map(e => e[0]);
    return ['Todos', ...sortedLabels];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(os => {
      const osMonth = os.dataAbertura.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const matchesMonth = selectedMonth === 'Todos' || osMonth === selectedMonth;
      const matchesSector = selectedSector === 'Todos' || os.setor === selectedSector;
      return matchesMonth && matchesSector;
    });
  }, [data, selectedMonth, selectedSector]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    let totalHours = 0;
    let executionSum = 0, executionCount = 0;
    const profResponseMap: Record<string, { sum: number, count: number }> = {};

    filteredData.forEach(os => {
      let dHours = 0;
      if (os.dataInicio && os.dataFim) {
        const diff = (os.dataFim.getTime() - os.dataInicio.getTime()) / 3600000;
        if (diff > 0 && diff < 48) dHours = diff;
      }
      if (dHours === 0 && os.horas > 0) dHours = os.horas >= 100 ? (Math.floor(os.horas / 100) + (os.horas % 100 / 60)) : os.horas;
      totalHours += dHours;

      if (os.dataAbertura && os.dataInicio) {
        const diff = (os.dataInicio.getTime() - os.dataAbertura.getTime()) / 3600000;
        if (diff >= 0 && diff < 1000) {
          const names = os.professional ? os.professional.split('/').map(n => n.trim()) : ['N/A'];
          names.forEach(name => {
            if (!profResponseMap[name]) profResponseMap[name] = { sum: 0, count: 0 };
            profResponseMap[name].sum += diff;
            profResponseMap[name].count++;
          });
        }
      }

      const startExec = os.dataInicio || os.dataAbertura;
      if (startExec && os.dataFim) {
        const diff = (os.dataFim.getTime() - startExec.getTime()) / 3600000;
        if (diff >= 0 && diff < 1000) { executionSum += diff; executionCount++; }
      }
    });

    const sumOfProfAverages = Object.values(profResponseMap).reduce((acc, curr) => acc + (curr.count > 0 ? curr.sum / curr.count : 0), 0);
    const avgResponseTime = total > 0 ? (sumOfProfAverages / total) : 0;

    return { total, totalHours, avgResponseTime, avgExecutionTime: executionCount > 0 ? executionSum / executionCount : 0 };
  }, [filteredData]);

  const professionalStats = useMemo(() => {
    const map: Record<string, { count: number, hours: number, respSum: number, respCount: number }> = {};
    filteredData.forEach(os => {
      const names = os.professional ? os.professional.split('/').map(n => n.trim()) : ['N/A'];
      let dHours = 0;
      if (os.dataInicio && os.dataFim) {
        const diff = (os.dataFim.getTime() - os.dataInicio.getTime()) / 3600000;
        if (diff > 0 && diff < 48) dHours = diff;
      }
      if (dHours === 0 && os.horas > 0) dHours = os.horas >= 100 ? (Math.floor(os.horas / 100) + (os.horas % 100 / 60)) : os.horas;

      names.forEach(n => {
        if (!map[n]) map[n] = { count: 0, hours: 0, respSum: 0, respCount: 0 };
        map[n].count++;
        map[n].hours += dHours;
        if (os.dataAbertura && os.dataInicio) {
          const diff = (os.dataInicio.getTime() - os.dataAbertura.getTime()) / 3600000;
          if (diff >= 0 && diff < 1000) { map[n].respSum += diff; map[n].respCount++; }
        }
      });
    });
    return Object.entries(map).map(([name, s]) => ({
      name, count: s.count, hours: s.hours, avgResp: s.respCount > 0 ? s.respSum / s.respCount : 0
    })).sort((a, b) => a.avgResp - b.avgResp);
  }, [filteredData]);

  const assetsDemand = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(os => {
      const eq = os.equipamento || 'Geral';
      map[eq] = (map[eq] || 0) + 1;
    });
    return Object.entries(map).sort((a,b) => b[1] - a[1]).slice(0, 10);
  }, [filteredData]);

  const sectorDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(os => {
      const sector = os.setor || 'Outros';
      map[sector] = (map[sector] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const totalSectorOS = useMemo(() => 
    sectorDistribution.reduce((acc, curr) => acc + curr.value, 0)
  , [sectorDistribution]);

  const downtimeByEquipment = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(os => {
      if (os.parada === 'Sim' && os.dataFim && os.dataAbertura) {
        const eq = os.equipamento || 'Geral';
        const diff = (os.dataFim.getTime() - os.dataAbertura.getTime()) / 3600000;
        if (diff > 0 && diff < 8760) map[eq] = (map[eq] || 0) + diff;
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const equipmentPartsData = useMemo(() => {
    if (!selectedEquipmentForModal) return [];
    const map: Record<string, number> = {};
    filteredData.forEach(os => {
      if (os.equipamento === selectedEquipmentForModal && os.peca) {
        const parts = os.peca.split(/[,/]/).map(p => p.trim()).filter(Boolean);
        parts.forEach(p => {
          map[p] = (map[p] || 0) + 1;
        });
      }
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [selectedEquipmentForModal, filteredData]);

  const totalPieceOccurrences = useMemo(() => 
    equipmentPartsData.reduce((acc, curr) => acc + curr.value, 0)
  , [equipmentPartsData]);

  const partReasons = useMemo(() => {
    if (!selectedPartForReasons || !selectedEquipmentForModal) return [];
    return filteredData
      .filter(os => 
        os.equipamento === selectedEquipmentForModal && 
        os.peca?.includes(selectedPartForReasons)
      )
      .map(os => ({
        date: os.dataAbertura.toLocaleDateString('pt-BR'),
        reason: os.motivo || 'Manutenção preventiva/corretiva'
      }));
  }, [selectedPartForReasons, selectedEquipmentForModal, filteredData]);

  const handleGenerateAiInsights = async () => {
    setIsAiLoading(true);
    setShowAiPanel(true);
    setAiInsights(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = filteredData.slice(0, 50).map(os => 
        `OS: ${os.numero} | Ativo: ${os.equipamento} | Técnico: ${os.professional} | Motivo: ${os.motivo} | Horas: ${os.horas}`
      ).join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analise o seguinte histórico de manutenção e identifique gargalos operacionais: \n${context}`,
        config: {
          systemInstruction: "Você é um Engenheiro de Manutenção Sênior (PCM) da Alumasa. Sua tarefa é analisar o histórico de ordens de serviço, identificar padrões de falhas recorrentes e sugerir melhorias estratégicas de manutenção preventiva.",
        }
      });

      if (response && response.text) {
        setAiInsights(response.text);
      } else {
        throw new Error("Não foi possível obter uma resposta válida da IA.");
      }
    } catch (error: any) {
      console.error("Erro crítico na API Gemini:", error);
      setAiInsights(`Erro ao processar diagnóstico inteligente. Certifique-se de que a API_KEY foi configurada corretamente no painel do Vercel.`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleOpenReport = (type: 'report' | 'ai') => {
    setPrintType(type);
    setShowPrintPreview(true);
  };

  const handleConfirmPrint = () => {
    const originalTitle = document.title;
    document.title = printType === 'ai' ? "diagnostico_inteligente_pcm" : "relatorio_gerencial_alumasa";
    setTimeout(() => {
        window.print();
        document.title = originalTitle;
    }, 100);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">PCM - Gestão de Ativos</h1>
          <p className="text-sm text-slate-500">Relatórios auditáveis Alumasa Industrial.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white dark:bg-dark-card p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <div className="flex items-center gap-2 px-2 border-r border-gray-100 dark:border-gray-800 mr-1">
                <Filter className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtros:</span>
            </div>

            <div className="relative flex items-center bg-gray-50 dark:bg-slate-800 rounded-lg px-2 py-1.5 border border-gray-200 dark:border-gray-700 min-w-[120px]">
               <Building className="w-3 h-3 text-slate-400 mr-2" />
               <select 
                 value={selectedSector}
                 onChange={(e) => setSelectedSector(e.target.value)}
                 className="bg-transparent text-xs font-black text-slate-800 dark:text-white outline-none cursor-pointer appearance-none pr-4 z-10 w-full"
               >
                 {availableSectors.map(s => (
                   <option key={s} value={s} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{s}</option>
                 ))}
               </select>
               <ChevronDown className="absolute right-1 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative flex items-center bg-gray-50 dark:bg-slate-800 rounded-lg px-2 py-1.5 border border-gray-200 dark:border-gray-700 min-w-[140px]">
               <CalendarDays className="w-3 h-3 text-slate-400 mr-2" />
               <select 
                 value={selectedMonth}
                 onChange={(e) => setSelectedMonth(e.target.value)}
                 className="bg-transparent text-xs font-black text-slate-800 dark:text-white outline-none cursor-pointer appearance-none pr-4 z-10 w-full capitalize"
               >
                 {availableMonths.map(m => (
                   <option key={m} value={m} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white capitalize">{m}</option>
                 ))}
               </select>
               <ChevronDown className="absolute right-1 w-3 h-3 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <button onClick={handleGenerateAiInsights} className="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg flex items-center gap-2 font-bold transition-all hover:bg-blue-700 active:scale-95"><BrainCircuit className="w-4 h-4" /> IA PCM</button>
          <button onClick={() => handleOpenReport('report')} className="bg-white dark:bg-dark-card border border-gray-700 p-2.5 rounded-xl flex items-center gap-2 font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95"><Printer className="w-4 h-4 text-rose-500" /> Relatório Gerencial</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
        <StatCard title="Total OS" value={stats.total} icon={ClipboardList} color="blue" />
        <StatCard title="Méd. Execução" value={formatDetailedTime(stats.avgExecutionTime)} icon={Zap} color="green" />
        <StatCard title="Méd. Resposta" value={formatDetailedTime(stats.avgResponseTime)} icon={Timer} color="purple" />
        <StatCard title="Horas Totais" value={formatDetailedTime(stats.totalHours)} icon={Clock} color="blue" />
      </div>

      {showAiPanel && (
        <div className="fixed bottom-6 right-6 z-[100] w-full max-w-lg no-print ai-panel animate-in slide-in-from-bottom-10">
          <div className="backdrop-blur-xl bg-slate-900/60 border border-white/20 shadow-2xl rounded-[2rem] overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-500/20 to-purple-500/20">
              <div className="flex items-center gap-3"><div className="p-2 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/40"><BrainCircuit className="w-5 h-5 text-white animate-pulse" /></div><h3 className="text-sm font-black text-white uppercase tracking-widest">Diagnóstico inteligente PCM</h3></div>
              <div className="flex items-center gap-2">
                {!isAiLoading && aiInsights && (
                  <button onClick={() => handleOpenReport('ai')} title="Imprimir Diagnóstico" className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"><Printer className="w-5 h-5" /></button>
                )}
                <button onClick={() => setShowAiPanel(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5 text-white/70" /></button>
              </div>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-thin text-white text-sm leading-relaxed font-medium">
              {isAiLoading ? <div className="flex flex-col items-center justify-center py-12 gap-4"><Loader2 className="w-8 h-8 text-blue-400 animate-spin" /><p className="text-[10px] font-black uppercase text-blue-200 animate-pulse">Cruzando dados Alumasa...</p></div> : <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">{aiInsights}</div>}
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY DE PRÉ-VISUALIZAÇÃO (PADRÃO ALUMASA) */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-dark-card overflow-auto flex flex-col print-mode-wrapper animate-in fade-in duration-300">
            {/* Header de Controle */}
            <div className="sticky top-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-md z-50 no-print preview-header">
                <div className="flex items-center">
                    <Printer className="mr-2 w-5 h-5" />
                    <span className="font-bold text-sm uppercase tracking-widest">Pré-visualização do Relatório Gerencial</span>
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
                    {printType === 'ai' && aiInsights && (
                        <div className="w-full">
                            <header className="mb-8 border-b-2 border-black pb-4 flex justify-between items-end">
                                <div>
                                    <h1 className="text-2xl font-black text-black">ALUMASA INDUSTRIAL</h1>
                                    <h2 className="text-lg font-bold text-black uppercase tracking-wider">DIAGNÓSTICO INTELIGENTE PCM</h2>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-black">DATA DE GERAÇÃO: {new Date().toLocaleString('pt-BR')}</p>
                                    <p className="text-[10px] font-bold text-black">MÓDULO IA / ANALYTICS</p>
                                </div>
                            </header>
                            
                            <div className="text-black text-sm whitespace-pre-wrap leading-relaxed break-words" style={{ pageBreakInside: 'auto' }}>
                                {aiInsights}
                            </div>

                            <footer className="mt-20 pt-16 flex justify-between gap-24">
                                <div className="text-center flex-1"><div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Assinatura Coordenador PCM</div></div>
                                <div className="text-center flex-1"><div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Assinatura Gerente Industrial</div></div>
                            </footer>
                            
                            <div className="mt-8 pt-4 border-t border-gray-300 text-[8px] font-bold text-black uppercase flex justify-between">
                                <span>Relatório de análise automatizada Alumasa PCM. As sugestões devem ser validadas pela engenharia.</span>
                                <span>Emitido em: {new Date().toLocaleString('pt-BR')}</span>
                            </div>
                        </div>
                    )}

                    {printType === 'report' && (
                        <div className="w-full">
                            <header className="mb-8 text-center border-b-[3px] border-black pb-4">
                                <h1 className="text-4xl font-black mb-1 text-black">ALUMASA</h1>
                                <p className="text-lg font-bold mb-4 uppercase text-black">Alumínio & Plástico</p>
                                <div className="py-2">
                                    <h2 className="text-2xl font-black uppercase tracking-wider text-black">RELATÓRIO GERENCIAL DE MANUTENÇÃO</h2>
                                    <p className="text-xs font-bold text-black">Módulo PCM / Auditoria de Ativos</p>
                                </div>
                            </header>

                            <section className="mb-8">
                                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">DADOS DA EMISSÃO</h3>
                                <table className="w-full text-[10px] border-collapse border border-black">
                                    <tbody>
                                        <tr className="border-b border-black"><td className="border-r border-black p-2 font-black w-1/3 bg-gray-100 text-black">Data e Hora</td><td className="p-2 font-black text-black">{new Date().toLocaleString('pt-BR')}</td></tr>
                                        <tr className="border-b border-black"><td className="border-r border-black p-2 font-black bg-gray-100 text-black">Responsável</td><td className="p-2 font-black text-black">Administrador PCM</td></tr>
                                        <tr><td className="border-r border-black p-2 font-black bg-gray-100 text-black">Tipo de Documento</td><td className="p-2 font-black text-black">Gerencial / Auditoria Industrial</td></tr>
                                    </tbody>
                                </table>
                            </section>

                            <section className="mb-8">
                                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">RESUMO EXECUTIVO DE DESEMPENHO</h3>
                                <table className="w-full text-[10px] border-collapse border border-black">
                                    <tbody>
                                        <tr className="border-b border-black"><td className="border-r border-black p-2 font-black w-1/3 bg-gray-100 text-black">Total de OS no Período</td><td className="p-2 font-black text-black">{stats.total}</td></tr>
                                        <tr className="border-b border-black"><td className="border-r border-black p-2 font-black bg-gray-100 text-black">Tempo Médio de Execução</td><td className="p-2 font-black text-black">{formatDetailedTime(stats.avgExecutionTime)}</td></tr>
                                        <tr className="border-b border-black"><td className="border-r border-black p-2 font-black bg-gray-100 text-black">Tempo Médio de Resposta</td><td className="p-2 font-black text-black">{formatDetailedTime(stats.avgResponseTime)}</td></tr>
                                        <tr><td className="border-r border-black p-2 font-black bg-gray-100 text-black">Total de Horas Trabalhadas</td><td className="p-2 font-black text-black">{formatDetailedTime(stats.totalHours)}</td></tr>
                                    </tbody>
                                </table>
                            </section>

                            <section className="mb-8">
                                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">PERFORMANCE INDIVIDUAL DA EQUIPE</h3>
                                <table className="w-full text-[10px] border-collapse border border-black">
                                    <thead><tr className="bg-gray-200"><th className="border border-black p-2 text-left font-black text-black">Técnico Responsável</th><th className="border border-black p-2 text-center font-black text-black">Qtd. OS</th><th className="border border-black p-2 text-center font-black text-black">Horas Totais</th><th className="border border-black p-2 text-center font-black text-black">Média Resposta</th></tr></thead>
                                    <tbody>
                                        {professionalStats.map((p, i) => (
                                        <tr key={i} className="border-b border-black"><td className="border-r border-black p-2 font-black text-black">{p.name}</td><td className="border-r border-black p-2 text-center font-black text-black">{p.count}</td><td className="border-r border-black p-2 text-center font-black text-black">{formatDetailedTime(p.hours)}</td><td className="p-2 text-center font-black text-black">{formatDetailedTime(p.avgResp)}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <section>
                                    <h3 className="text-[10px] font-black uppercase mb-1 bg-black text-white p-2 border border-black">ATIVOS COM MAIOR DEMANDA</h3>
                                    <table className="w-full text-[9px] border-collapse border border-black">
                                        <tbody>{assetsDemand.map((d, i) => (<tr key={i} className="border-b border-black"><td className="border-r border-black p-2 font-black bg-gray-100 text-black">{d[0]}</td><td className="p-2 text-center font-black text-black">{d[1]} OS</td></tr>))}</tbody>
                                    </table>
                                </section>
                                <section>
                                    <h3 className="text-[10px] font-black uppercase mb-1 bg-black text-white p-2 border border-black">INDISPONIBILIDADE (DOWNTIME)</h3>
                                    <table className="w-full text-[9px] border-collapse border border-black">
                                        <tbody>{downtimeByEquipment.slice(0, 5).map((d, i) => (<tr key={i} className="border-b border-black"><td className="border-r border-black p-2 font-black bg-gray-100 text-black">{d.name}</td><td className="p-2 text-right font-black text-red-700">{formatDetailedTime(d.value)}</td></tr>))}</tbody>
                                    </table>
                                </section>
                            </div>

                            <div className="mb-12" style={{ pageBreakInside: 'auto' }}>
                                <h3 className="text-xs font-black uppercase mb-1 bg-black text-white p-2 border border-black">AUDITORIA DETALHADA DE OPERAÇÕES (PCM)</h3>
                                <table className="w-full text-[9px] border-collapse border border-black">
                                    <thead><tr className="bg-gray-200">
                                        <th className="border border-black p-2 font-black text-black">Nº OS</th><th className="border border-black p-2 font-black text-left text-black">Ativo / Equipamento</th><th className="border border-black p-2 text-center font-black text-black">Parada</th><th className="border border-black p-2 text-center font-black text-black">T. Parado</th><th className="border border-black p-2 font-black text-left text-black">Técnico</th><th className="border border-black p-2 text-center font-black text-black">T. Execução</th>
                                    </tr></thead>
                                    <tbody style={{ pageBreakInside: 'auto' }}>
                                        {filteredData.map((os, i) => {
                                        let downtime = 0; if (os.parada === 'Sim' && os.dataFim && os.dataAbertura) downtime = (os.dataFim.getTime() - os.dataAbertura.getTime()) / 3600000;
                                        let execTime = 0; if (os.dataFim && (os.dataInicio || os.dataAbertura)) execTime = (os.dataFim.getTime() - (os.dataInicio || os.dataAbertura)!.getTime()) / 3600000;
                                        return (
                                            <tr key={i} className="border-b border-black" style={{ pageBreakInside: 'avoid' }}>
                                                <td className="border-r border-black p-1.5 font-black text-black">{os.numero}</td>
                                                <td className="border-r border-black p-1.5 text-black">{os.equipamento}</td>
                                                <td className="border-r border-black p-1.5 text-center font-black text-black">{os.parada === 'Sim' ? 'SIM' : 'NÃO'}</td>
                                                <td className="border-r border-black p-1.5 text-center font-black text-red-600">{downtime > 0 ? formatDetailedTime(downtime) : '-'}</td>
                                                <td className="border-r border-black p-1.5 font-black text-black">{os.professional}</td>
                                                <td className="p-1.5 text-center font-black text-black">{formatDetailedTime(execTime)}</td>
                                            </tr>
                                        );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <footer className="mt-8 pt-16 flex justify-between gap-24">
                                <div className="text-center flex-1"><div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Assinatura Coordenador PCM</div></div>
                                <div className="text-center flex-1"><div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Assinatura Gerente Industrial</div></div>
                            </footer>
                            <div className="mt-8 pt-4 border-t border-black flex justify-between text-[7px] font-black uppercase text-black"><div>Documento Auditável Alumasa Industrial - Gestão de Ativos</div><div>Emitido em: {new Date().toLocaleString('pt-BR')}</div></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* DASHBOARD EM TELA (no-print) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 no-print">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6"><Wrench className="w-5 h-5 text-blue-600 mr-2" /><h3 className="font-bold text-slate-800 dark:text-white">Abertura por Equipamento (Top 5)</h3></div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={assetsDemand.slice(0, 5).map(d => ({name: d[0], value: d[1]}))} 
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 10}} />
                <Tooltip 
                   content={<CustomEquipmentTooltip total={stats.total} />}
                   cursor={{fill: 'rgba(59, 130, 246, 0.05)'}}
                />
                <Bar 
                  dataKey="value" 
                  name="Quantidade" 
                  fill="#3b82f6" 
                  radius={[0, 4, 4, 0]} 
                  barSize={25}
                  className="cursor-pointer"
                  onClick={(data) => {
                    if (data && data.name) {
                      setSelectedEquipmentForModal(data.name);
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6"><Building className="w-5 h-5 text-primary mr-2" /><h3 className="font-bold text-slate-800 dark:text-white">Abertura por Setor</h3></div>
          <div className="h-72">
            {sectorDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sectorDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={<CustomSectorTooltip total={totalSectorOS} />}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                Sem dados para exibir
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8 no-print">
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="font-bold text-slate-800 dark:text-white">Detalhamento por Profissional</h3>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ordenado por Média de Resposta</span>
          </div>
          <div className="overflow-x-auto max-h-[350px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0">
                <tr>
                  <th className="px-6 py-4">Profissional</th>
                  <th className="px-6 py-4 text-center">OS</th>
                  <th className="px-6 py-4 text-center">Total Tempo Serviço</th>
                  <th className="px-6 py-4 text-right">Média Resposta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {professionalStats.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{p.name}</td>
                    <td className="px-6 py-4 text-center font-black text-blue-600">{p.count}</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-600 dark:text-slate-400">{formatDetailedTime(p.hours)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-[11px] font-black">
                        {formatDetailedTime(p.avgResp)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6">
            <TrendingDown className="w-5 h-5 text-rose-500 mr-2" />
            <h3 className="font-bold text-slate-800 dark:text-white">Tempo Total Parado por Equipamento</h3>
          </div>
          <div className="h-80">
            {downtimeByEquipment.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={downtimeByEquipment.slice(0, 10)} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tick={{ dy: 5 }} 
                    interval={0} 
                    angle={-15} 
                    textAnchor="end"
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickFormatter={(val) => `${val}h`} 
                  />
                  <Tooltip content={<CustomDowntimeTooltip />} cursor={{fill: 'rgba(239, 68, 68, 0.05)'}} />
                  <Bar dataKey="value" name="Tempo Parado (h)" radius={[4, 4, 0, 0]} barSize={35}>
                    {downtimeByEquipment.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                Nenhum tempo de parada registrado
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedEquipmentForModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#1e293b] w-full max-w-4xl rounded-[2rem] shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-700 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <BarChart3 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight uppercase">Peças Citadas em OS</h2>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{selectedEquipmentForModal}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEquipmentForModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-8 flex-1 overflow-y-auto">
              <div className="h-96">
                {equipmentPartsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={equipmentPartsData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={180} tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 'bold'}} />
                      <Tooltip content={<CustomPieceTooltip total={totalPieceOccurrences} />} cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} />
                      <Bar dataKey="value" name="Quantidade" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={25} className="cursor-pointer" onClick={(data) => { if (data && data.name) setSelectedPartForReasons(data.name); }} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                    <AlertCircle className="w-12 h-12 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-xs">Nenhuma peça registrada para este equipamento</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 bg-slate-900/50 border-t border-slate-700 flex justify-end"><button onClick={() => setSelectedEquipmentForModal(null)} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95">Fechar</button></div>
          </div>
        </div>
      )}

      {selectedPartForReasons && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#1e293b] w-full max-w-lg rounded-[2rem] shadow-2xl border border-slate-700 overflow-hidden">
            <div className="p-8 border-b border-slate-700 flex justify-between items-start">
              <div className="flex items-center gap-4"><div className="p-3 bg-blue-500/10 rounded-2xl"><MessageCircle className="w-6 h-6 text-blue-400" /></div><div><h2 className="text-xl font-black text-white tracking-tight uppercase">Motivos de Troca</h2><p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{selectedPartForReasons}</p></div></div>
              <button onClick={() => setSelectedPartForReasons(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 space-y-6 max-h-[50vh] overflow-y-auto">
              {partReasons.length > 0 ? (
                partReasons.map((item, idx) => (
                  <div key={idx} className="flex gap-4 group"><div className="relative mt-1"><div className="w-1.5 h-10 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div><div className="absolute top-0 left-[-4px] w-3.5 h-3.5 bg-blue-500 rounded-full blur-[2px] opacity-40"></div></div><div className="flex-1"><p className="text-white text-sm font-bold italic"><span className="text-blue-400 not-italic mr-2">{item.date}:</span>{item.reason}</p></div></div>
                ))
              ) : (
                <p className="text-slate-500 text-center italic text-sm">Nenhum motivo detalhado encontrado.</p>
              )}
            </div>
            <div className="p-6 bg-slate-900/50 border-t border-slate-700"><button onClick={() => setSelectedPartForReasons(null)} className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg border border-slate-600">Fechar Detalhes</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrdersPage;
