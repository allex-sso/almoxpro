import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend
} from 'recharts';
import { 
  ClipboardList, Clock, Wrench, Building, Users, Calendar, Timer, Zap, CalendarDays, AlertCircle, TrendingDown, Filter, X, Package, MessageCircle, ChevronRight, Percent, BarChart3
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { ServiceOrder, InventoryItem } from '../types';

interface ServiceOrdersProps {
  osData: ServiceOrder[];
  inventoryData: InventoryItem[];
  isLoading?: boolean;
}

const ServiceOrdersPage: React.FC<ServiceOrdersProps> = ({ osData: data, inventoryData, isLoading }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');
  const [selectedSector, setSelectedSector] = useState<string>('Todos');
  const [selectedEquipmentForModal, setSelectedEquipmentForModal] = useState<string | null>(null);
  const [selectedPartForReasons, setSelectedPartForReasons] = useState<{ displayName: string, reasons: string[] } | null>(null);

  const formatDetailedTime = (decimalHours: number | string): string => {
    const hoursNum = typeof decimalHours === 'string' ? parseFloat(decimalHours) : decimalHours;
    if (isNaN(hoursNum) || hoursNum <= 0) return "0m";
    if (hoursNum > 8760) return "Erro Data";

    const h = Math.floor(hoursNum);
    const m = Math.round((hoursNum - h) * 60);
    
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

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
    const totalHours = filteredData.reduce((acc, os) => acc + (os.horas || 0), 0);
    
    let responseSum = 0;
    let responseCount = 0;
    let executionSum = 0;
    let executionCount = 0;

    filteredData.forEach(os => {
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

    return { total, totalHours, avgResponseTime, avgExecutionTime };
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

      names.forEach(name => {
          if (!map[name]) map[name] = { count: 0, hours: 0, responseSum: 0, responseCount: 0 };
          const valH = (os.horas || 0) > 1000 ? 0 : (os.horas || 0);
          map[name].count += 1;
          map[name].hours += valH;
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
        hours: stats.hours.toFixed(1),
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
              value: stats.count, // Usamos 'value' para compatibilidade com o BarChart
              percentage: totalOsForEq > 0 ? ((stats.count / totalOsForEq) * 100).toFixed(1) : "0",
              reasons: stats.reasons
          };
      })
      .sort((a, b) => b.value - a.value);
  }, [selectedEquipmentForModal, filteredData, inventoryData]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

  const CustomSectorTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const total = osBySector.reduce((acc, item) => acc + item.value, 0);
      const value = payload[0].value;
      const percentage = ((value / total) * 100).toFixed(1);
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xl">
          <p className="font-bold text-slate-800 dark:text-white mb-1">{payload[0].name}</p>
          <div className="flex flex-col text-sm">
            <span className="text-blue-600 dark:text-blue-400 font-bold">Quantidade: {value}</span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Porcentagem: {percentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomEquipmentTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const total = filteredData.length;
      const value = payload[0].value;
      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
      
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xl">
          <p className="font-bold text-slate-800 dark:text-white mb-1">{d.name}</p>
          <div className="flex flex-col text-sm">
            <span className="text-blue-600 dark:text-blue-400 font-bold">Quantidade OS: {value}</span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Porcentagem: {percentage}%</span>
            <span className="mt-2 text-[10px] text-primary font-bold uppercase animate-pulse">Clique para ver peças</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xl">
          <p className="font-bold text-slate-800 dark:text-white mb-1">{d.displayName}</p>
          <p className="text-[10px] font-mono text-slate-400 mb-2">{d.codigo}</p>
          <div className="flex flex-col text-sm">
            <span className="text-blue-600 dark:text-blue-400 font-bold">Ocorrências: {d.value}</span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Frequência: {d.percentage}%</span>
            <span className="mt-2 text-[10px] text-emerald-500 font-bold uppercase animate-pulse">Clique para ver motivos</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomDowntimeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xl">
          <p className="font-bold text-slate-800 dark:text-white mb-1">{d.name}</p>
          <div className="flex flex-col text-sm">
            <span className="text-red-600 dark:text-red-400 font-bold">Tempo Total Parado: {d.formatted}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleEquipmentClick = (data: any) => {
    if (data && data.name) {
      setSelectedEquipmentForModal(data.name);
    }
  };

  const handlePartClickInModal = (data: any) => {
    if (data && data.displayName) {
      setSelectedPartForReasons({ displayName: data.displayName, reasons: data.reasons });
    }
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse">Carregando Dashboard de OS...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER E FILTRO GLOBAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard de Manutenção (OS)</h1>
          <p className="text-sm text-slate-500 font-medium">Controle de produtividade e tempos de resposta Alumasa.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-white dark:bg-dark-card p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm gap-2">
                <div className="flex items-center px-2 border-r border-gray-100 dark:border-gray-700">
                    <CalendarDays className="w-4 h-4 text-blue-500 mr-2" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mês</span>
                </div>
                <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none text-slate-700 dark:text-white font-bold outline-none cursor-pointer"
                >
                {monthOptions.map(opt => <option key={opt} value={opt} className="bg-white dark:bg-slate-800">{opt}</option>)}
                </select>
            </div>

            <div className="flex items-center bg-white dark:bg-dark-card p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm gap-2">
                <div className="flex items-center px-2 border-r border-gray-100 dark:border-gray-700">
                    <Building className="w-4 h-4 text-emerald-500 mr-2" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Setor</span>
                </div>
                <select 
                value={selectedSector} 
                onChange={(e) => setSelectedSector(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none text-slate-700 dark:text-white font-bold outline-none cursor-pointer"
                >
                {sectorOptions.map(opt => <option key={opt} value={opt} className="bg-white dark:bg-slate-800">{opt}</option>)}
                </select>
            </div>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total de OS" value={stats.total} icon={ClipboardList} color="blue" />
        <StatCard title="Tempo Médio Execução" value={formatDetailedTime(stats.avgExecutionTime)} icon={Zap} color="green" trend="Início p/ Fim" />
        <StatCard title="Tempo Médio Resposta" value={formatDetailedTime(stats.avgResponseTime)} icon={Timer} color="purple" trend="Abertura p/ Início" />
        <StatCard title="Total de Horas" value={`${stats.totalHours.toFixed(0)}h`} icon={Clock} color="blue" />
      </div>

      {/* GRÁFICOS LADO A LADO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                <Tooltip content={<CustomEquipmentTooltip />} cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} />
                <Bar 
                  dataKey="value" 
                  name="Quantidade" 
                  fill="#3b82f6" 
                  radius={[0, 4, 4, 0]} 
                  barSize={25} 
                  onClick={handleEquipmentClick}
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
                <Tooltip content={<CustomSectorTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TABELA DE PROFISSIONAIS */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-slate-400" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Detalhamento por Profissional</h3>
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
               Ordenado por Média de Resposta
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-[10px] uppercase bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold">
                    <tr>
                        <th className="px-6 py-4">Profissional</th>
                        <th className="px-6 py-4 text-center">OS</th>
                        <th className="px-6 py-4 text-center">Total Horas</th>
                        <th className="px-6 py-4 text-center">Média Resposta</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {professionalStats.map((prof, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{prof.name}</td>
                            <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-300">{prof.count}</td>
                            <td className="px-6 py-4 text-center font-mono text-blue-600 dark:text-blue-400 font-bold">{prof.hours}h</td>
                            <td className="px-6 py-4 text-center">
                                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    {formatDetailedTime(prof.avgResponseDecimal)}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* GRÁFICOS: TEMPO TOTAL PARADO */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6">
            <TrendingDown className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="font-bold text-slate-800 dark:text-white">Tempo Total Parado por Equipamento</h3>
          </div>
          <div className="h-72">
            {downtimeByEquipment.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={downtimeByEquipment} margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{fontSize: 10}} />
                        <YAxis tickFormatter={(val) => `${val.toFixed(0)}h`} />
                        <Tooltip content={<CustomDowntimeTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
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

      {/* MODAL PRINCIPAL: PEÇAS POR EQUIPAMENTO (AGORA COM GRÁFICO) */}
      {selectedEquipmentForModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
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
                        <YAxis 
                            dataKey="displayName" 
                            type="category" 
                            width={160} 
                            tick={{fontSize: 10, fill: '#64748b'}} 
                        />
                        <Tooltip content={<CustomPartTooltip />} cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} />
                        <Bar 
                          dataKey="value" 
                          name="Ocorrências" 
                          fill="#3b82f6" 
                          radius={[0, 4, 4, 0]} 
                          barSize={25} 
                          onClick={handlePartClickInModal}
                          style={{ cursor: 'pointer' }}
                        >
                             {equipmentParts.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 py-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 animate-pulse">
                        <MessageCircle className="w-3 h-3 mr-2" />
                        Clique em uma barra para ver os motivos de troca
                    </div>
                  </div>
                ) : (
                  <div className="py-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30 dark:bg-slate-900/10 rounded-xl">
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

      {/* MODAL SECUNDÁRIO: DETALHAMENTO DE MOTIVOS */}
      {selectedPartForReasons && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-dark-card w-full max-w-md rounded-2xl shadow-3xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
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
                    <div key={ridx} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border-l-4 border-blue-500 animate-in slide-in-from-left-2 duration-200" style={{ animationDelay: `${ridx * 50}ms` }}>
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