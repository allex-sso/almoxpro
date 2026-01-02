import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend, AreaChart, Area 
} from 'recharts';
import { 
  ClipboardList, Clock, Wrench, Building, Users, Calendar, Timer, Zap, CalendarDays, Search, FileText, ChevronLeft, ChevronRight, AlertCircle, TrendingDown, BarChart3
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { ServiceOrder } from '../types';

interface ServiceOrdersProps {
  data: ServiceOrder[];
  isLoading?: boolean;
}

const ServiceOrdersPage: React.FC<ServiceOrdersProps> = ({ data, isLoading }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');
  const [osSearchTerm, setOsSearchTerm] = useState<string>('');
  const [tableSearchTerm, setTableSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const stats = useMemo(() => {
    const filteredByMonth = data.filter(os => {
        if (selectedMonth === 'Todos') return true;
        const osMonth = os.dataAbertura.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return osMonth === selectedMonth;
    });

    const total = filteredByMonth.length;
    const completed = filteredByMonth.filter(os => os.dataFim).length;
    const totalHours = filteredByMonth.reduce((acc, os) => acc + (os.horas || 0), 0);
    
    let responseSum = 0;
    let responseCount = 0;
    let executionSum = 0;
    let executionCount = 0;

    filteredByMonth.forEach(os => {
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

    return { total, completed, totalHours, avgResponseTime, avgExecutionTime };
  }, [data, selectedMonth]);

  // GRÁFICO 1: ANÁLISE DE RESPOSTA INDIVIDUAL
  const individualResponseTimeline = useMemo(() => {
    const filtered = data
      .filter(os => {
          const osMonth = os.dataAbertura.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
          const monthMatch = selectedMonth === 'Todos' || osMonth === selectedMonth;
          return monthMatch && os.dataAbertura && os.dataInicio;
      })
      .map(os => {
        const diffMs = os.dataInicio!.getTime() - os.dataAbertura.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        
        return {
          os: String(os.numero),
          profissional: os.profissional,
          tempoMinutos: Math.max(0, Math.round(diffMinutes)),
          tempoFormatado: formatDetailedTime(diffMinutes / 60),
          timestamp: os.dataAbertura.getTime()
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    if (osSearchTerm) {
      return filtered.filter(item => item.os.toLowerCase().includes(osSearchTerm.toLowerCase()));
    }

    return filtered.slice(0, 15);
  }, [data, osSearchTerm, selectedMonth]);

  // Tooltip customizado conforme imagem
  const CustomIndividualTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700 shadow-2xl min-w-[200px]">
          <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-1">
            Ordem de Serviço: {d.os}
          </p>
          <p className="text-white font-bold text-lg mb-2">
            {d.profissional}
          </p>
          <div className="border-t border-slate-700 my-2 opacity-50"></div>
          <div className="flex items-center gap-2 mt-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <div className="flex items-baseline gap-1">
              <span className="text-white font-black text-xl">{d.tempoFormatado}</span>
              <span className="text-slate-500 text-[10px] font-bold uppercase">({d.tempoMinutos} min)</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const downtimeByEquipment = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(os => {
        const osMonth = os.dataAbertura.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        if ((selectedMonth === 'Todos' || osMonth === selectedMonth) && os.parada === 'Sim' && os.dataFim && os.dataAbertura) {
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
  }, [data, selectedMonth]);

  const osByEquipment = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(os => {
      const osMonth = os.dataAbertura.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      if (selectedMonth === 'Todos' || osMonth === selectedMonth) {
        const eq = os.equipamento || 'Geral';
        map[eq] = (map[eq] || 0) + 1;
      }
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data, selectedMonth]);

  const osBySector = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(os => {
      const osMonth = os.dataAbertura.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      if (selectedMonth === 'Todos' || osMonth === selectedMonth) {
        const sector = os.setor || 'Outros';
        map[sector] = (map[sector] || 0) + 1;
      }
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data, selectedMonth]);

  const monthlyEvolution = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(os => {
      const month = os.dataAbertura.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const valH = (os.horas || 0) > 1000 ? 0 : (os.horas || 0);
      map[month] = (map[month] || 0) + valH;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [data]);

  const professionalStats = useMemo(() => {
    const map: Record<string, { count: number, hours: number, responseSum: number, responseCount: number }> = {};
    data.forEach(os => {
      const osMonth = os.dataAbertura.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const isMonthMatch = selectedMonth === 'Todos' || osMonth === selectedMonth;
      const names = os.profissional ? os.profissional.split('/').map(n => n.trim()) : ['Não Atribuído'];

      names.forEach(name => {
          if (!map[name]) map[name] = { count: 0, hours: 0, responseSum: 0, responseCount: 0 };
          const valH = (os.horas || 0) > 1000 ? 0 : (os.horas || 0);
          if (isMonthMatch) {
              map[name].count += 1;
              map[name].hours += valH;
              if (os.dataAbertura && os.dataInicio) {
                const diff = (os.dataInicio.getTime() - os.dataAbertura.getTime()) / (1000 * 60 * 60);
                if (diff >= 0 && diff < 1000) {
                  map[name].responseSum += diff;
                  map[name].responseCount++;
                }
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
      .sort((a, b) => Number(b.hours) - Number(a.hours))
      .filter(p => p.count > 0);
  }, [data, selectedMonth]);

  const osPerformanceTableData = useMemo(() => {
    return data
      .filter(os => {
        const matchesSearch = tableSearchTerm === '' || 
          os.numero.toLowerCase().includes(tableSearchTerm.toLowerCase()) ||
          os.profissional.toLowerCase().includes(tableSearchTerm.toLowerCase()) ||
          os.equipamento.toLowerCase().includes(tableSearchTerm.toLowerCase());
        
        const osMonth = os.dataAbertura.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const matchesMonth = selectedMonth === 'Todos' || osMonth === selectedMonth;

        return matchesSearch && matchesMonth;
      })
      .map(os => {
        const responseH = (os.dataAbertura && os.dataInicio) 
          ? (os.dataInicio.getTime() - os.dataAbertura.getTime()) / (1000 * 60 * 60) 
          : null;
        
        let executionH: number | null = null;
        if (os.dataFim) {
          const baseTime = os.dataInicio || os.dataAbertura;
          executionH = (os.dataFim.getTime() - baseTime.getTime()) / (1000 * 60 * 60);
        }
        
        if ((executionH === null || executionH <= 0) && (os.horas || 0) > 0) {
            executionH = os.horas;
        }

        let downtimeH: number | null = null;
        if (os.parada === 'Sim' && os.dataFim && os.dataAbertura) {
          const diffMs = os.dataFim.getTime() - os.dataAbertura.getTime();
          downtimeH = Math.max(0, diffMs / (1000 * 60 * 60));
        }

        return {
          ...os,
          responseTime: (responseH !== null && responseH > 0) ? formatDetailedTime(responseH) : 'Pendente',
          responseVal: responseH,
          executionTime: (executionH !== null && executionH > 0) ? formatDetailedTime(executionH) : 'Em aberto',
          executionVal: executionH,
          downtimeTime: downtimeH !== null ? formatDetailedTime(downtimeH) : '-',
          downtimeVal: downtimeH
        };
      })
      .sort((a, b) => b.dataAbertura.getTime() - a.dataAbertura.getTime());
  }, [data, tableSearchTerm, selectedMonth]);

  const paginatedTable = useMemo(() => {
    return osPerformanceTableData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [osPerformanceTableData, currentPage]);

  const totalPages = Math.ceil(osPerformanceTableData.length / itemsPerPage);
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

  if (isLoading) return <div className="p-8 text-center animate-pulse">Carregando Dashboard de OS...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER E FILTRO GLOBAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard de Manutenção (OS)</h1>
          <p className="text-sm text-slate-500 font-medium">Controle de produtividade e tempos de resposta Alumasa.</p>
        </div>
        
        <div className="flex items-center bg-white dark:bg-dark-card p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm gap-2">
            <div className="flex items-center px-2 border-r border-gray-100 dark:border-gray-700">
                <CalendarDays className="w-4 h-4 text-blue-500 mr-2" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mês Global</span>
            </div>
            <select 
              value={selectedMonth} 
              onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none text-slate-700 dark:text-white font-bold outline-none cursor-pointer"
            >
              {monthOptions.map(opt => <option key={opt} value={opt} className="bg-white dark:bg-slate-800">{opt}</option>)}
            </select>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total de OS" value={stats.total} icon={ClipboardList} color="blue" />
        <StatCard title="Tempo Médio Execução" value={formatDetailedTime(stats.avgExecutionTime)} icon={Zap} color="green" trend="Início p/ Fim" />
        <StatCard title="Tempo Médio Resposta" value={formatDetailedTime(stats.avgResponseTime)} icon={Timer} color="purple" trend="Abertura p/ Início" />
        <StatCard title="Total de Horas" value={`${stats.totalHours.toFixed(0)}h`} icon={Clock} color="blue" />
      </div>

      {/* NOVO: GRÁFICO DE RESPOSTA INDIVIDUAL (IMAGEM 1) */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 text-purple-600 mr-2" />
              <h3 className="font-bold text-slate-800 dark:text-white">Análise de Resposta Individual</h3>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Auditar OS específica..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500/20"
                value={osSearchTerm}
                onChange={(e) => setOsSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={individualResponseTimeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="os" tick={{fontSize: 10}} />
                <YAxis tickFormatter={(val) => `${val}m`} />
                <Tooltip 
                  content={<CustomIndividualTooltip />}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                />
                <Bar dataKey="tempoMinutos" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={40}>
                  {individualResponseTimeline.map((item, index) => (
                    <Cell key={`cell-${index}`} fill={item.tempoMinutos > 120 ? '#ef4444' : '#8b5cf6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
      </div>

      {/* GRÁFICOS LADO A LADO (IMAGEM 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6">
            <Wrench className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="font-bold text-slate-800 dark:text-white">Abertura por Equipamento</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={osByEquipment} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 10}} />
                <Tooltip cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} />
                <Bar dataKey="value" name="Quantidade" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={25} />
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
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CARGA HORÁRIA MENSAL (IMAGEM 2 ABAIXO) */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6">
            <Calendar className="w-5 h-5 text-blue-500 mr-2" />
            <h3 className="font-bold text-slate-800 dark:text-white">Carga Horária Mensal Acumulada</h3>
          </div>
          <div className="h-72">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyEvolution}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(val: number) => `${val.toFixed(1)}h`} />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
                </AreaChart>
             </ResponsiveContainer>
          </div>
      </div>

      {/* TABELA DE PROFISSIONAIS (IMAGEM 3) */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-slate-400" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Detalhamento por Profissional</h3>
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
               Ordenado por Total de Horas
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
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {professionalStats.map((prof, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{prof.name}</td>
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

      {/* GRÁFICO EXISTENTE: TEMPO TOTAL PARADO */}
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
                        <Tooltip 
                            formatter={(value: number) => [formatDetailedTime(value), 'Tempo Total Parado']}
                        />
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

      {/* TABELA EXISTENTE: CONSULTA DE DESEMPENHO POR OS */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div className="flex items-center">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg mr-3">
                 <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                 <h3 className="font-bold text-slate-800 dark:text-white">Consulta de Desempenho por OS</h3>
                 <p className="text-xs text-slate-400 font-medium">Histórico detalhado de atendimento e execução.</p>
              </div>
           </div>
           <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por OS, Profissional ou Ativo..." 
                className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none w-full md:w-80 dark:text-white"
                value={tableSearchTerm}
                onChange={(e) => {
                  setTableSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
           </div>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] uppercase font-bold">
                 <tr>
                    <th className="px-6 py-4">OS / Data</th>
                    <th className="px-6 py-4">Profissional / Setor</th>
                    <th className="px-6 py-4">Equipamento</th>
                    <th className="px-6 py-4 text-center">Equip. Parado</th>
                    <th className="px-6 py-4 text-center">T. Resposta</th>
                    <th className="px-6 py-4 text-center">T. Execução</th>
                    <th className="px-6 py-4 text-center">Status</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                 {paginatedTable.map((os, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                       <td className="px-6 py-4">
                          <div className="font-bold text-slate-700 dark:text-white">#{os.numero}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{os.dataAbertura.toLocaleDateString('pt-BR')} às {os.dataAbertura.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</div>
                       </td>
                       <td className="px-6 py-4">
                          <div className="font-semibold text-slate-600 dark:text-slate-300">{os.profissional}</div>
                          <div className="text-[10px] text-slate-400">{os.setor}</div>
                       </td>
                       <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold">
                             {os.equipamento}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-center">
                          {os.parada === 'Sim' ? (
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-black text-red-600 bg-red-100 px-2 py-0.5 rounded mb-1">Sim</span>
                              <span className={`text-[10px] font-mono font-bold ${os.downtimeTime === '0m' ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>{os.downtimeTime}</span>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-slate-300">Não</span>
                          )}
                       </td>
                       <td className="px-6 py-4 text-center">
                          <span className={`text-xs font-bold ${
                            !os.responseVal ? 'text-slate-300' :
                            os.responseVal > 2 ? 'text-red-500' : 
                            os.responseVal > 0.5 ? 'text-amber-500' : 'text-emerald-500'
                          }`}>
                             {os.responseTime}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <span className={`text-xs font-mono font-bold ${os.executionVal ? 'text-slate-600 dark:text-slate-300' : 'text-amber-500'}`}>
                             {os.executionTime}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <span className="text-[10px] px-2 py-1 rounded-lg font-black uppercase bg-emerald-100 text-emerald-700">
                             Finalizado
                          </span>
                       </td>
                    </tr>
                 ))}
                 {paginatedTable.length === 0 && (
                     <tr>
                         <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">Nenhum registro encontrado.</td>
                     </tr>
                 )}
              </tbody>
           </table>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
           <span className="text-xs text-slate-500 font-medium">Mostrando {paginatedTable.length} de {osPerformanceTableData.length} registros</span>
           <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <div className="flex items-center px-4 text-xs font-bold text-slate-600">Página {currentPage} de {totalPages || 1}</div>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceOrdersPage;