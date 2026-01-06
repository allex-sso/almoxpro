import React, { useState, useMemo, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend
} from 'recharts';
import { 
  ClipboardList, Clock, Wrench, Building, Users, Calendar, Timer, Zap, CalendarDays, AlertCircle, TrendingDown, Filter, X, Package, MessageCircle, ChevronRight, Percent, BarChart3, Printer, Check, Fingerprint, FileStack, ChevronDown
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { ServiceOrder, InventoryItem } from '../types';

interface ServiceOrdersProps {
  osData: ServiceOrder[];
  inventoryData: InventoryItem[];
  isLoading?: boolean;
}

// Formata horas decimais para string amigável "Xh Ym"
const formatDetailedTime = (decimalHours: number | string): string => {
  const hoursNum = typeof decimalHours === 'string' ? parseFloat(decimalHours) : decimalHours;
  if (isNaN(hoursNum) || hoursNum <= 0) return "0m";
  if (hoursNum > 87600) return "Erro Data"; // Aumentado limite para totais anuais

  const h = Math.floor(hoursNum);
  const m = Math.round((hoursNum - h) * 60);
  
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

// Tooltip para o gráfico de Tempo Parado (CONFORME IMAGEM SOLICITADA)
const CustomDowntimeTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1e293b] border border-slate-700 p-4 rounded-xl shadow-2xl text-white min-w-[200px] pointer-events-none animate-in fade-in zoom-in-95 duration-200">
        <h4 className="font-bold text-base mb-1 text-white leading-tight">{label}</h4>
        <div className="flex items-center text-xs gap-1.5 mt-1">
          <span className="text-slate-400">Tempo Total Parado:</span>
          <span className="font-bold text-rose-400">{formatDetailedTime(payload[0].value)}</span>
        </div>
      </div>
    );
  }
  return null;
};

// Tooltip para os gráficos principais do Dashboard (Equipamento e Setor)
const CustomOSTooltip = ({ active, payload, label, total, hideFooter }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const name = label || data.name;
    const value = payload[0].value;
    const percent = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
    
    return (
      <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl text-white min-w-[180px] pointer-events-none animate-in fade-in zoom-in-95 duration-200">
        <h4 className="font-black text-lg mb-2 text-white leading-tight">{name}</h4>
        <div className="space-y-1">
          <div className="flex items-center text-sm gap-2">
            <span className="text-slate-300 font-bold">Quantidade:</span>
            <span className="font-black text-blue-400">{value}</span>
          </div>
          <div className="flex items-center text-sm gap-2">
            <span className="text-slate-300 font-bold">Porcentagem:</span>
            <span className="font-black text-blue-400">{percent}%</span>
          </div>
        </div>
        {!hideFooter && (
          <div className="mt-4 pt-3 border-t border-slate-800 text-center">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] animate-pulse">
              Clique para ver peças
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// Tooltip específico para o Modal de Peças
const CustomPartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 p-5 rounded-2xl shadow-3xl text-white min-w-[240px] pointer-events-none animate-in fade-in zoom-in-95 duration-200">
        <h4 className="font-black text-lg text-white leading-tight">{data.displayName}</h4>
        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 mb-5 tracking-wide">{data.codigo}</p>
        
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <span className="text-[#3b82f6] font-black mr-2">Ocorrências:</span>
            <span className="font-black text-white">{data.value}</span>
          </div>
          <div className="flex items-center text-sm">
            <span className="text-slate-400 font-bold mr-2">Frequência:</span>
            <span className="font-black text-white">{data.percentage}%</span>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-800">
          <p className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.15em] animate-pulse">
            Clique para ver motivos
          </p>
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
  const [selectedPartForReasons, setSelectedPartForReasons] = useState<{ displayName: string, reasons: string[] } | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const monthOptions = useMemo(() => {
    const monthsMap = new Map<string, number>();
    const now = new Date();
    const currentLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    monthsMap.set(currentLabel, new Date(now.getFullYear(), now.getMonth(), 1).getTime());

    data.forEach(os => {
      const label = os.dataAbertura.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const timestamp = new Date(os.dataAbertura.getFullYear(), os.dataAbertura.getMonth(), 1).getTime();
      if (!monthsMap.has(label)) {
        monthsMap.set(label, timestamp);
      }
    });

    const sortedLabels = Array.from(monthsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    return ['Todos', ...sortedLabels];
  }, [data]);

  const sectorOptions = useMemo(() => {
    const sectors = Array.from(new Set(data.map(os => os.setor).filter(Boolean)));
    return ['Todos', ...sectors.sort()];
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
    let totalHoursCalculated = 0;
    
    let responseSum = 0;
    let responseCount = 0;
    let executionSum = 0;
    let executionCount = 0;

    filteredData.forEach(os => {
      // Cálculo de duração da OS seguindo a lógica do ProfessionalStats
      let durationHours = 0;
      if (os.dataInicio && os.dataFim) {
        const diff = (os.dataFim.getTime() - os.dataInicio.getTime()) / (1000 * 60 * 60);
        if (diff > 0 && diff < 48) {
          durationHours = diff;
        }
      }
      
      if (durationHours === 0 && os.horas > 0) {
        const val = os.horas;
        if (val >= 100) {
          const hh = Math.floor(val / 100);
          const mm = val % 100;
          if (mm < 60) {
            durationHours = hh + (mm / 60);
          } else {
            durationHours = val / 100;
          }
        } else {
          durationHours = val;
        }
      }
      
      totalHoursCalculated += durationHours;

      // KPIs de tempo
      if (os.dataAbertura && os.dataInicio) {
        const diff = (os.dataInicio.getTime() - os.dataAbertura.getTime()) / (1000 * 60 * 60);
        if (diff >= 0 && diff < 1000) {
          responseSum += diff;
          responseCount++;
        }
      }
      
      const startForExec = os.dataInicio || os.dataAbertura;
      if (startForExec && os.dataFim) {
        const diff = (os.dataFim.getTime() - startForExec.getTime()) / (1000 * 60 * 60);
        if (diff >= 0 && diff < 1000) {
          executionSum += diff;
          executionCount++;
        }
      }
    });
    
    const avgResponseTime = responseCount > 0 ? (responseSum / responseCount) : 0;
    const avgExecutionTime = executionCount > 0 ? (executionSum / executionCount) : 0;

    return { total, totalHours: totalHoursCalculated, avgResponseTime, avgExecutionTime };
  }, [filteredData]);

  const downtimeByEquipment = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(os => {
        if (os.parada === 'Sim' && os.dataFim && os.dataAbertura) {
            const eq = os.equipamento || 'Geral';
            const diff = (os.dataFim.getTime() - os.dataAbertura.getTime()) / (1000 * 60 * 60);
            if (diff > 0 && diff < 8760) {
                map[eq] = (map[eq] || 0) + diff;
            }
        }
    });
    return Object.entries(map)
        .map(([name, value]) => ({ name, value, formatted: formatDetailedTime(value) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
  }, [filteredData]);

  const osByEquipment = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(os => {
        const eq = os.equipamento || 'Geral';
        map[eq] = (map[eq] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); 
  }, [filteredData]);

  const osBySector = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(os => {
        const sector = os.setor || 'Outros';
        map[sector] = (map[sector] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const professionalStats = useMemo(() => {
    const map: Record<string, { count: number, hours: number, responseSum: number, responseCount: number }> = {};
    filteredData.forEach(os => {
      const names = os.professional ? os.professional.split('/').map(n => n.trim()) : ['Não Atribuído'];

      // Cálculo de duração inteligente
      let durationHours = 0;
      
      // Tenta usar diferença de datas primeiro (limite de 48h para evitar erros de ano/mês)
      if (os.dataInicio && os.dataFim) {
        const diff = (os.dataFim.getTime() - os.dataInicio.getTime()) / (1000 * 60 * 60);
        if (diff > 0 && diff < 48) {
          durationHours = diff;
        }
      }
      
      // Se não houver data ou a data estiver errada (outlier), usa a coluna manual 'horas'
      // Tratando o formato HHMM (ex: 1020 -> 10h 20m)
      if (durationHours === 0 && os.horas > 0) {
        const val = os.horas;
        if (val >= 100) {
          const hh = Math.floor(val / 100);
          const mm = val % 100;
          if (mm < 60) {
            // Formato HHMM válido (ex: 1020 = 10h 20m = 10.33h)
            durationHours = hh + (mm / 60);
          } else {
            // Se mm >= 60, não é HHMM, assume-se que é um valor decimal escalado por 100 (ex: 500 = 5.00)
            durationHours = val / 100;
          }
        } else {
          durationHours = val;
        }
      }

      names.forEach(name => {
          if (!map[name]) map[name] = { count: 0, hours: 0, responseSum: 0, responseCount: 0 };
          map[name].count += 1;
          map[name].hours += durationHours;
          if (os.dataAbertura && os.dataInicio) {
            const diff = (os.dataInicio.getTime() - os.dataAbertura.getTime()) / (1000 * 60 * 60);
            if (diff >= 0 && diff < 1000) {
              map[name].responseSum += diff;
              map[name].responseCount++;
            }
          }
      });
    });

    return Object.entries(map)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        totalHoursDecimal: stats.hours,
        avgResponseDecimal: stats.responseCount > 0 ? (stats.responseSum / stats.responseCount) : 0,
      }))
      .sort((a, b) => a.avgResponseDecimal - b.avgResponseDecimal)
      .filter(p => p.count > 0);
  }, [filteredData]);

  const equipmentParts = useMemo(() => {
    if (!selectedEquipmentForModal) return [];

    const inventoryMap = new Map<string, InventoryItem>();
    inventoryData.forEach(item => inventoryMap.set(item.codigo.toLowerCase(), item));

    const totalOsForEq = filteredData.filter(os => os.equipamento === selectedEquipmentForModal).length;
    const grouped: Record<string, { count: number, reasons: string[] }> = {};
    
    filteredData
      .filter(os => os.equipamento === selectedEquipmentForModal && os.peca)
      .forEach(os => {
        const items = os.peca!.split(/[,;]/).map(s => s.trim()).filter(Boolean);
        items.forEach(itemStr => {
           if (!grouped[itemStr]) {
             grouped[itemStr] = { count: 0, reasons: [] };
           }
           grouped[itemStr].count += 1;
           if (os.motivo) {
             grouped[itemStr].reasons.push(`${os.dataAbertura.toLocaleDateString()}: ${os.motivo}`);
           } else {
             grouped[itemStr].reasons.push(`${os.dataAbertura.toLocaleDateString()}: Sem motivo especificado`);
           }
        });
      });

    return Object.entries(grouped)
      .map(([pecaStr, stats]) => {
          const inv = inventoryMap.get(pecaStr.toLowerCase());
          return {
              codigo: pecaStr,
              displayName: inv ? inv.descricao : pecaStr,
              value: stats.count, 
              percentage: totalOsForEq > 0 ? ((stats.count / totalOsForEq) * 100).toFixed(1) : "0",
              reasons: stats.reasons
          };
      })
      .sort((a, b) => b.value - a.value);
  }, [selectedEquipmentForModal, filteredData, inventoryData]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

  if (isLoading) return <div className="p-8 text-center animate-pulse">Carregando Dashboard de OS...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER DE TELA (no-print) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">PCM - Gestão de Ativos</h1>
          <p className="text-sm text-slate-500 font-medium">Controle industrial e auditoria de ativos Alumasa.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setShowPrintPreview(true)}
              className="flex items-center bg-white dark:bg-dark-card p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm gap-2 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all active:scale-95 group"
            >
                <Printer className="w-4 h-4 text-rose-500 ml-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold text-slate-700 dark:text-white px-2">Gerar Relatório</span>
            </button>

            <div className="flex items-center bg-white dark:bg-dark-card p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm gap-2">
                <CalendarDays className="w-4 h-4 text-blue-500 ml-2" />
                <div className="relative flex items-center">
                    <select 
                      value={selectedMonth} 
                      onChange={(e) => setSelectedMonth(e.target.value)} 
                      className="bg-transparent text-sm focus:outline-none text-slate-700 dark:text-white font-bold outline-none cursor-pointer pl-2 pr-6 py-1 appearance-none z-10"
                    >
                       {monthOptions.map(opt => (
                         <option key={opt} value={opt} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                           {opt}
                         </option>
                       ))}
                    </select>
                    <ChevronDown className="absolute right-0 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                
                <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
                
                <Building className="w-4 h-4 text-emerald-500" />
                <div className="relative flex items-center">
                    <select 
                      value={selectedSector} 
                      onChange={(e) => setSelectedSector(e.target.value)} 
                      className="bg-transparent text-sm focus:outline-none text-slate-700 dark:text-white font-bold outline-none cursor-pointer pl-2 pr-6 py-1 appearance-none z-10"
                    >
                       {sectorOptions.map(opt => (
                         <option key={opt} value={opt} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                           {opt}
                         </option>
                       ))}
                    </select>
                    <ChevronDown className="absolute right-0 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>
        </div>
      </div>

      {/* DASHBOARD EM TELA (no-print) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
        <StatCard title="Total OS" value={stats.total} icon={ClipboardList} color="blue" />
        <StatCard title="Méd. Execução" value={formatDetailedTime(stats.avgExecutionTime)} icon={Zap} color="green" />
        <StatCard title="Méd. Resposta" value={formatDetailedTime(stats.avgResponseTime)} icon={Timer} color="purple" />
        <StatCard title="Horas Totais" value={formatDetailedTime(stats.totalHours)} icon={Clock} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 no-print">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6">
            <Wrench className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="font-bold text-slate-800 dark:text-white">Abertura por Equipamento (Top 5)</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={osByEquipment} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 10}} />
                <Tooltip 
                  cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} 
                  content={<CustomOSTooltip total={filteredData.length} />}
                />
                <Bar 
                  dataKey="value" 
                  name="Quantidade" 
                  fill="#3b82f6" 
                  radius={[0, 4, 4, 0]} 
                  barSize={25} 
                  onClick={(data) => setSelectedEquipmentForModal(data.name)}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6">
            <Building className="w-5 h-5 text-emerald-600 mr-2" />
            <h3 className="font-bold text-slate-800 dark:text-white">Abertura por Setor</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={osBySector} cx="50%" cy="50%" innerRadius={60} outerRadius={85} dataKey="value" paddingAngle={5}>
                  {osBySector.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip 
                  content={<CustomOSTooltip total={filteredData.length} hideFooter />}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SEÇÃO DE PROFISSIONAIS NA TELA (no-print) */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden no-print">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-slate-400" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Detalhamento por Profissional</h3>
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Ordenado por Média de Resposta
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-[10px] uppercase bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold">
                    <tr>
                        <th className="px-6 py-4">Profissional</th>
                        <th className="px-6 py-4 text-center">OS</th>
                        <th className="px-6 py-4 text-center">Total Tempo Serviço</th>
                        <th className="px-6 py-4 text-center">Média Resposta</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {professionalStats.map((prof, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors">
                            <td className="px-6 py-5 font-bold text-slate-800 dark:text-white">{prof.name}</td>
                            <td className="px-6 py-5 text-center font-bold text-slate-700 dark:text-slate-300">{prof.count}</td>
                            <td className="px-6 py-5 text-center font-bold text-blue-500 dark:text-blue-400">
                                {formatDetailedTime(prof.totalHoursDecimal)}
                            </td>
                            <td className="px-6 py-5 text-center">
                                <span className="px-4 py-1.5 rounded-full text-[11px] font-bold bg-[#10b981]/10 text-[#10b981] dark:bg-[#10b981]/20 border border-[#10b981]/20">
                                    {formatDetailedTime(prof.avgResponseDecimal)}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* GRÁFICOS: TEMPO TOTAL PARADO (no-print) */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800 no-print">
          <div className="flex items-center mb-6">
            <TrendingDown className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="font-bold text-slate-800 dark:text-white">Tempo Total Parado por Equipamento</h3>
          </div>
          <div className="h-72">
            {downtimeByEquipment.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={downtimeByEquipment} margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-gray-700" />
                        <XAxis dataKey="name" tick={{fontSize: 10}} stroke="#94a3b8" />
                        <YAxis tickFormatter={(val) => `${val.toFixed(0)}h`} stroke="#94a3b8" />
                        <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} content={<CustomDowntimeTooltip />} />
                        <Bar dataKey="value" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={40}>
                            {downtimeByEquipment.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.8} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <AlertCircle className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm font-medium">Nenhum equipamento parado registrado para este período.</p>
                </div>
            )}
          </div>
      </div>

      {/* --- PREVIEW E RELATÓRIO PROFISSIONAL --- */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex flex-col print-mode-wrapper overflow-y-auto animate-in fade-in duration-300">
          <div className="sticky top-0 bg-slate-900 text-white p-4 flex justify-between items-center z-[110] no-print shadow-2xl">
             <div className="flex items-center gap-4">
                <FileStack className="w-5 h-5 text-rose-500" />
                <div>
                   <h3 className="text-sm font-black uppercase tracking-widest leading-none">Visualização do Relatório</h3>
                   <p className="text-[10px] text-slate-400 mt-1 uppercase">Padrão Corporativo Alumasa</p>
                </div>
             </div>
             <div className="flex gap-3">
               <button onClick={() => setShowPrintPreview(false)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-black uppercase tracking-widest rounded-xl border border-slate-700">Fechar</button>
               <button onClick={handlePrint} className="px-8 py-2.5 bg-rose-600 hover:bg-rose-700 text-xs font-black uppercase tracking-widest rounded-xl flex items-center shadow-lg active:scale-95 transition-all font-bold">
                 <Printer className="w-4 h-4 mr-2" /> Imprimir / PDF
               </button>
             </div>
          </div>

          <div className="printable-area w-[210mm] mx-auto bg-white text-slate-900 my-8 print:my-0 shadow-2xl p-10 min-h-[297mm] font-sans flex flex-col overflow-visible">
             <div className="flex justify-between items-start mb-2">
                <div>
                   <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">RELATÓRIO DE GESTÃO DE MANUTENÇÃO</h1>
                   <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">CONTROLE DE ORDENS DE SERVIÇO - ALUMASA</p>
                </div>
                <div className="text-right">
                   <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString('pt-BR')}</p>
                   <p className="text-[10px] text-slate-400">Gerado pelo sistema de almoxarifado</p>
                </div>
             </div>

             <div className="h-1 bg-slate-900 w-full mb-8"></div>

             <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">FILTROS APLICADOS</h4>
                   <p className="text-sm font-bold text-slate-700">
                     Mês: <span className="text-blue-600">{selectedMonth}</span> &nbsp;&nbsp; 
                     Setor: <span className="text-emerald-600">{selectedSector}</span>
                   </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">ABRANGÊNCIA</h4>
                   <p className="text-sm font-bold text-slate-700">Baseado em {filteredData.length} Ordens de Serviço</p>
                </div>
             </div>

             <div className="grid grid-cols-4 gap-4 mb-10">
                <div className="bg-slate-50 p-4 rounded-lg border-l-4 border-blue-500 shadow-sm">
                   <p className="text-[9px] font-black uppercase text-slate-400 mb-1">TOTAL OS</p>
                   <p className="text-2xl font-black text-slate-900">{stats.total}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border-l-4 border-emerald-500 shadow-sm">
                   <p className="text-[9px] font-black uppercase text-slate-400 mb-1">TEMPO MÉDIO EXECUÇÃO</p>
                   <p className="text-2xl font-black text-slate-900">{formatDetailedTime(stats.avgExecutionTime)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border-l-4 border-purple-500 shadow-sm">
                   <p className="text-[9px] font-black uppercase text-slate-400 mb-1">TEMPO MÉDIO RESPOSTA</p>
                   <p className="text-2xl font-black text-slate-900">{formatDetailedTime(stats.avgResponseTime)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border-l-4 border-slate-400 shadow-sm">
                   <p className="text-[9px] font-black uppercase text-slate-400 mb-1">TOTAL DE HORAS</p>
                   <p className="text-2xl font-black text-slate-900">{formatDetailedTime(stats.totalHours)}</p>
                </div>
             </div>

             <section className="mb-10">
                <div className="flex items-center mb-4">
                   <Users className="w-5 h-5 mr-2 text-blue-600" />
                   <h3 className="text-sm font-black uppercase text-slate-900 tracking-widest">DETALHAMENTO POR PROFISSIONAL</h3>
                </div>
                <table className="w-full text-xs border-collapse">
                   <thead>
                      <tr className="bg-[#0f172a] text-white font-black uppercase text-[10px] tracking-wider">
                         <th className="px-4 py-3 text-left">PROFISSIONAL</th>
                         <th className="px-4 py-3 text-center">QUANTIDADE OS</th>
                         <th className="px-4 py-3 text-center">TOTAL TEMPO SERVIÇO</th>
                         <th className="px-4 py-3 text-center">MÉDIA DE RESPOSTA</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {professionalStats.map((p, i) => (
                         <tr key={i} className="text-slate-700">
                            <td className="px-4 py-3 font-bold border-b border-slate-50">{p.name}</td>
                            <td className="px-4 py-3 text-center font-bold border-b border-slate-50">{p.count}</td>
                            <td className="px-4 py-3 text-center font-bold text-blue-600 border-b border-slate-50">
                                {formatDetailedTime(p.totalHoursDecimal)}
                            </td>
                            <td className="px-4 py-3 text-center font-medium text-slate-500 border-b border-slate-50">{formatDetailedTime(p.avgResponseDecimal)}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </section>

             <div className="mt-auto pt-10 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                   <Fingerprint className="w-3 h-3" />
                   <span>ALUMASA INDUSTRIAL • PCM GESTÃO DE ATIVOS</span>
                </div>
                <div>{new Date().toLocaleTimeString('pt-BR')}</div>
             </div>
          </div>
        </div>
      )}

      {/* MODAL PEÇAS (DASHBOARD) */}
      {selectedEquipmentForModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
          <div className="bg-white dark:bg-dark-card w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                  <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white leading-tight">Peças Citadas em OS</h3>
                  <p className="text-xs text-slate-500 font-medium">{selectedEquipmentForModal}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEquipmentForModal(null)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-hidden">
                {equipmentParts.length > 0 ? (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={equipmentParts} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="displayName" type="category" width={160} tick={{fontSize: 10, fill: '#64748b'}} />
                        <Tooltip 
                          cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} 
                          content={<CustomPartTooltip />}
                        />
                        <Bar 
                          dataKey="value" 
                          name="Ocorrências" 
                          fill="#3b82f6" 
                          radius={[0, 4, 4, 0]} 
                          barSize={25} 
                          // FIX: Use any type and payload to access custom properties in Bar onClick
                          onClick={(data: any) => {
                            if (data && data.payload) {
                              setSelectedPartForReasons({ 
                                displayName: data.payload.displayName, 
                                reasons: data.payload.reasons 
                              });
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                             {equipmentParts.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                    <AlertCircle className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Nenhuma peça citada nas Ordens de Serviço deste equipamento.</p>
                  </div>
                )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setSelectedEquipmentForModal(null)}
                className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOTIVOS (DASHBOARD) */}
      {selectedPartForReasons && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200 no-print">
          <div className="bg-white dark:bg-dark-card w-full max-w-md rounded-2xl shadow-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg mr-3">
                  <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white leading-tight">Motivos de Troca</h4>
                  <p className="text-xs text-slate-500 font-medium">{selectedPartForReasons.displayName}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPartForReasons(null)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[50vh] overflow-y-auto scrollbar-thin">
              <div className="space-y-3">
                {selectedPartForReasons.reasons.length > 0 ? (
                  selectedPartForReasons.reasons.map((reason, ridx) => (
                    <div key={ridx} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border-l-4 border-blue-500">
                       <p className="text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed italic">
                         {reason}
                       </p>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400">
                    <p className="text-xs">Nenhum detalhamento registrado.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-center">
              <button 
                onClick={() => setSelectedPartForReasons(null)}
                className="w-full py-2.5 bg-slate-800 dark:bg-slate-700 text-white font-bold text-xs rounded-xl hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors shadow-sm"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrdersPage;