import React, { useMemo, useState, useEffect } from 'react';
import { Search, Palette, Box, Download, Filter, Info, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Movement } from '../types';

interface CentralProfilesProps {
  movements: Movement[];
  isLoading: boolean;
}

const CentralProfiles: React.FC<CentralProfilesProps> = ({ movements, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [colorFilter, setColorFilter] = useState('Todas');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Agregação dos dados por Perfil e Cor
  const aggregatedData = useMemo(() => {
    const map = new Map<string, { perfil: string, cor: string, quantidade: number }>();

    movements.forEach(m => {
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
  }, [movements]);

  // Lista de cores únicas para o filtro
  const uniqueColors = useMemo(() => {
    const colors = new Set<string>();
    aggregatedData.forEach(d => colors.add(d.cor));
    return ['Todas', ...Array.from(colors).sort()];
  }, [aggregatedData]);

  // Filtragem final
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return aggregatedData.filter(d => {
      const matchesSearch = !term || 
        d.perfil.toLowerCase().includes(term) || 
        d.cor.toLowerCase().includes(term);
      const matchesColor = colorFilter === 'Todas' || d.cor === colorFilter;
      return matchesSearch && matchesColor;
    });
  }, [aggregatedData, searchTerm, colorFilter]);

  // Resetar página ao filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, colorFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const handleExport = () => {
    const headers = ["Perfil", "Cor", "Quantidade Total"];
    const csvContent = [
      headers.join(";"),
      ...filteredData.map(d => [d.perfil, d.cor, d.quantidade].join(";"))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `consolidado_perfis_alumasa_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse font-black text-slate-500 uppercase tracking-widest">Processando Perfis...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white font-sans tracking-tight">Consolidado de Perfis</h1>
          <p className="text-sm text-slate-500 font-medium">Quantitativo agrupado por modelo de perfil e cor disponível.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white dark:bg-dark-card p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar Perfil ou Cor..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-primary w-64"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>

            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              <select 
                value={colorFilter}
                onChange={(e) => setColorFilter(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-800 dark:text-white outline-none cursor-pointer"
              >
                {uniqueColors.map(c => <option key={c} value={c} className="bg-white dark:bg-slate-800">{c}</option>)}
              </select>
            </div>
          </div>

          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" /> Exportar Consolidado
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><Box className="w-5 h-5 text-primary" /></div>
                <h3 className="font-black uppercase tracking-widest text-xs text-slate-800 dark:text-white">Resumo de Estoque por Especificação</h3>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Info className="w-3 h-3" />
                {filteredData.length} Combinações Encontradas
            </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold">
              <tr>
                <th className="px-6 py-4">Modelo do Perfil</th>
                <th className="px-6 py-4">Especificação de Cor</th>
                <th className="px-6 py-4 text-right">Quantidade Total Consolidada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginatedData.map((d, i) => (
                <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-800 dark:text-white">{d.perfil}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse"></div>
                      <span className="font-bold text-slate-600 dark:text-slate-400">{d.cor}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="px-4 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl font-black text-sm">
                      {d.quantidade.toLocaleString('pt-BR')}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400 italic">
                        <Box className="w-8 h-8 opacity-20" />
                        <p>Nenhum dado encontrado para os filtros atuais.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de Paginação */}
        {filteredData.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length}
            </span>
            <div className="inline-flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CentralProfiles;