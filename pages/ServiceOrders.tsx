
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend, AreaChart, Area 
} from 'recharts';
import { 
  ClipboardList, Clock, Wrench, Building, Users, Calendar, Timer, Zap, CalendarDays, BarChart3, Search, Target, FileText, ChevronLeft, ChevronRight
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

  // Helper para formatar horas decimais em "Xh Ym"
  const formatDetailedTime = (decimalHours: number | string): string => {
    const hoursNum = typeof decimalHours === 'string' ? parseFloat(decimalHours) : decimalHours;
    if (isNaN(hoursNum) || hoursNum <= 0) return "0m";
    
    if (hoursNum > 8760) return "+1 ano";

    const h = Math.floor(hoursNum);
    const m = Math.round((hoursNum - h) * 60);
    
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  // Opções de meses disponíveis para o filtro
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    data.forEach(os => {
      const m = os.dataAbertura.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      months.add(m);
    });
    return ['Todos', ...Array.from(months).sort((a, b) => {
        return b.localeCompare(a);
    })];
  }, [data]);

  // 1. MÉTRICAS GERAIS
  const stats = useMemo(() => {
    const total = data.length;
    const completed = data.filter(os => os.dataFim).length;
    const totalHours = data.reduce((acc, os) => acc + (os.horas || 0), 0);
    
    let responseSum = 0;
    let responseCount = 0;
    let executionSum = 0;
    let executionCount = 0;

    data.forEach(os => {
      if (os.dataAbertura && os.dataInicio) {
        const diff = (os.dataInicio.getTime() - os.dataAbertura.getTime()) / (1000 * 60 * 60);
        if (diff >= 0 && diff < 1000) {
          responseSum += diff;
          responseCount++;
        }
      }
      
      // Cálculo de execução mais resiliente para estatísticas gerais
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
  }, [data]);

  // 2. TEMPO DE RESPOSTA INDIVIDUAL POR OS (Filtrável por busca)
  const individualResponseTimeline = useMemo(() => {
    const filtered = data
      .filter(os => os.dataAbertura && os.dataInicio)
      .map(os => {
        const diffMs = os.dataInicio!.getTime() - os.dataAbertura.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        
        return {
          os: String(os.numero),
          profissional: os.profissional,
          tempoMinutos: Math.max(0, parseFloat(diffMinutes.toFixed(2))),
          tempoFormatado: formatDetailedTime(diffMinutes / 60),
          timestamp: os.dataAbertura.getTime()
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    if (osSearchTerm) {
      return filtered.filter(item => item.os.toLowerCase().includes(osSearchTerm.toLowerCase()));
    }

    return filtered.slice(0, 30);
  }, [data, osSearchTerm]);

  // 3. TABELA COMPLETA DE DESEMPENHO (Paginada e Buscável)
  const osPerformanceTableData = useMemo(() => {
    const filtered = data
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
        // T. Resposta: Abertura -> Início
        const responseH = (os.dataAbertura && os.dataInicio) 
          ? (os.dataInicio.getTime() - os.dataAbertura.getTime()) / (1000 * 60 * 60) 
          : null;
        
        // T. Execução: Lógica resiliente
        let executionH: number | null = null;
        if (os.dataFim) {
          // 1. Tenta Início -> Fim
          if (os.dataInicio) {
            executionH = (os.dataFim.getTime() - os.dataInicio.getTime()) / (1000 * 60 * 60);
          } 
          // 2. Fallback: Abertura -> Fim (se início for nulo)
          else {
            executionH = (os.dataFim.getTime() - os.dataAbertura.getTime()) / (1000 * 60 * 60);
          }
        }
        
        // 3. Fallback Final: Se o cálculo der erro ou nulo, tenta usar a coluna 'horas' se for > 0
        if ((executionH === null || executionH <= 0) && os.horas > 0) {
            executionH = os.horas;
        }

        return {
          ...os,
          responseTime: responseH !== null ? formatDetailedTime(responseH) : 'Pendente',
          responseVal: responseH,
          executionTime: executionH !== null ? formatDetailedTime(executionH) : 'Em aberto',
          executionVal: executionH
        };
      })
      .sort((a, b) => b.dataAbertura.getTime() - a.dataAbertura.getTime());

    return filtered;
  }, [data, tableSearchTerm, selectedMonth]);

  const paginatedTable = useMemo(() => {
    return osPerformanceTableData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [osPerformanceTableData, currentPage]);

  const totalPages = Math.ceil(osPerformanceTableData.length / itemsPerPage);

  const osByEquipment = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(os => {
      const eq = os.equipamento || 'Geral';
      map[eq] = (map[eq] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data]);

  const osBySector = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(os => {
      const sector = os.setor || 'Outros';
      map[sector] = (map[sector] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
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
      .filter(p => selectedMonth === 'Todos' || p.count > 0);
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

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

  if (isLoading) return <div className="p-8 text-center animate-pulse">Carregando Dashboard de OS...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard de Manutenção (OS)</h1>
          <p className="text-sm text-slate-500 font-medium">Controle de produtividade e tempos de resposta Alumasa.</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-dark-card p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
           <CalendarDays className="w-4 h-4 text-blue-500" />
           <span className="text-xs font-bold text-slate-400 uppercase">Mês Global:</span>
           <select 
             value={selectedMonth} 
             onChange={(e) => setSelectedMonth(e.target.value)}
             className="bg-transparent text-sm font-bold text-slate-700 dark:text-white outline-none"
           >
             {monthOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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

      {/* GRÁFICO DE TEMPO DE RESPOSTA COM BUSCA */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center">
                <BarChart3 className="w-5 h-5 text-purple-600 mr-2" />
                <h3 className="font-bold">Análise de Resposta Individual</h3>
            </div>
            
            <div className="relative group">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
               <input 
                 type="text" 
                 placeholder="Auditar OS específica..." 
                 className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 outline-none w-full md:w-64"
                 value={osSearchTerm}
                 onChange={(e) => setOsSearchTerm(e.target.value)}
               />
            </div>
          </div>

          <div className="h-72">
            {individualResponseTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={individualResponseTimeline}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="os" tick={{fontSize: 10}} />
                  <YAxis tickFormatter={(val) => `${val}m`} />
                  <Tooltip 
                    cursor={{fill: 'rgba(139, 92, 246, 0.05)'}}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-slate-700">
                            <p className="text-xs font-bold text-blue-400 mb-1">Ordem de Serviço: {d.os}</p>
                            <p className="text-sm font-medium mb-1">{d.profissional}</p>
                            <div className="flex items-center gap-2 mt-2 border-t border-slate-700 pt-2">
                               <Timer className="w-3 h-3 text-purple-400" />
                               <span className="text-lg font-black">{d.tempoFormatado}</span>
                               <span className="text-[10px] text-slate-400">({d.tempoMinutos} min)</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="tempoMinutos" radius={[4, 4, 0, 0]} minPointSize={4}>
                     {individualResponseTimeline.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.tempoMinutos > 60 ? '#ef4444' : '#8b5cf6'} />
                     ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Target className="w-12 h-12 mb-2 opacity-20" />
                  <p className="text-sm font-medium">Nenhuma OS encontrada para "{osSearchTerm}"</p>
              </div>
            )}
          </div>
      </div>

      {/* NOVA SEÇÃO: CONSULTA DE DESEMPENHO POR OS */}
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
                className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none w-full md:w-80"
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
                     <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                        Nenhum registro encontrado para esta pesquisa.
                     </td>
                   </tr>
                 )}
              </tbody>
           </table>
        </div>

        {/* Paginação da Tabela */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
           <span className="text-xs text-slate-500 font-medium">
             Mostrando {paginatedTable.length} de {osPerformanceTableData.length} registros
           </span>
           <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center px-4 text-xs font-bold text-slate-600">
                Página {currentPage} de {totalPages || 1}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6">
            <Wrench className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="font-bold">Abertura por Equipamento</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={osByEquipment} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                <Tooltip 
                  cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} 
                  formatter={(value) => [value, 'Quantidade']}
                />
                <Bar dataKey="value" name="Quantidade" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6">
            <Building className="w-5 h-5 text-emerald-600 mr-2" />
            <h3 className="font-bold">Abertura por Setor</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={osBySector} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" paddingAngle={5}>
                  {osBySector.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="flex items-center mb-6">
            <Calendar className="w-5 h-5 text-blue-500 mr-2" />
            <h3 className="font-bold">Carga Horária Mensal Acumulada</h3>
          </div>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyEvolution}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(val: number) => `${val.toFixed(1)}h`} />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                </AreaChart>
             </ResponsiveContainer>
          </div>
      </div>

      {/* TABELA DE PROFISSIONAIS */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-slate-400" />
                <h3 className="text-lg font-bold">Detalhamento por Profissional</h3>
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
               Ordenado por Total de Horas
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-gray-50 dark:bg-slate-800 text-gray-500">
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
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-800 dark:text-white">{prof.name}</div>
                                {selectedMonth !== 'Todos' && <span className="text-[10px] text-blue-500 font-bold">Filtrado: {selectedMonth}</span>}
                            </td>
                            <td className="px-6 py-4 text-center font-semibold">{prof.count}</td>
                            <td className="px-6 py-4 text-center font-mono text-blue-600 dark:text-blue-400 font-bold">{prof.hours}h</td>
                            <td className="px-6 py-4 text-center">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${prof.avgResponseDecimal > 24 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {formatDetailedTime(prof.avgResponseDecimal)}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default ServiceOrdersPage;
