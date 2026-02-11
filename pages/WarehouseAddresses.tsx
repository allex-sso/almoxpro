
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MapPin, Search, Printer, Check, X, Tag, Package, Box, Info, Map as MapIcon, ChevronLeft, ChevronRight, Filter, Layers, ChevronDown, Maximize2, QrCode, Barcode as BarcodeIcon } from 'lucide-react';
import { AddressItem } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';

interface WarehouseAddressesProps {
  addresses: AddressItem[];
  isLoading: boolean;
}

type OccupationLevel = 'Todos' | 'Vazio' | 'Baixa' | 'Média' | 'Alta';

const LABEL_SIZES = [
  { id: '100x50', label: 'Grande (100x50mm)', width: '100mm', height: '50mm', qrSize: 90, fontSize: '3xl', barHeight: 45 },
  { id: '80x40', label: 'Padrão (80x40mm)', width: '80mm', height: '40mm', qrSize: 64, fontSize: '2xl', barHeight: 35 },
  { id: '60x30', label: 'Médio (60x30mm)', width: '60mm', height: '30mm', qrSize: 48, fontSize: 'xl', barHeight: 28 },
  { id: '40x25', label: 'Pequeno (40x25mm)', width: '40mm', height: '25mm', qrSize: 28, fontSize: 'sm', barHeight: 18 },
];

const BarcodeComponent: React.FC<{ value: string, format: string, height: number, width: number }> = ({ value, format, height, width }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current) {
      try {
        let finalValue = value;
        if (format === 'EAN13') {
           finalValue = value.replace(/\D/g, '').padEnd(13, '0').slice(0, 13);
        }

        JsBarcode(svgRef.current, finalValue, {
          format: format,
          width: width === 40 ? 1 : 1.5,
          height: height,
          displayValue: false,
          margin: 0,
          background: 'transparent'
        });
      } catch (e) {
        console.error("Erro ao gerar código de barras:", e);
      }
    }
  }, [value, format, height, width]);

  return <svg ref={svgRef} className="max-w-full"></svg>;
};

const WarehouseAddresses: React.FC<WarehouseAddressesProps> = ({ addresses, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [occupationFilter, setOccupationFilter] = useState<OccupationLevel>('Todos');
  const [selectedAddresses, setSelectedAddresses] = useState<Set<string>>(new Set());
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedLabelSize, setSelectedLabelSize] = useState(LABEL_SIZES[2]); // Default 60x30
  const [printCodeType, setPrintCodeType] = useState<'qrcode' | 'barcode'>('qrcode');
  const [barcodeFormat, setBarcodeFormat] = useState('CODE128');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 32;

  const getOccupationStatus = (qty: number): OccupationLevel => {
    if (qty <= 0) return 'Vazio';
    if (qty <= 500) return 'Baixa';
    if (qty <= 2000) return 'Média';
    return 'Alta';
  };

  const getStatusColor = (status: OccupationLevel) => {
    switch (status) {
      case 'Vazio': return 'bg-slate-400';
      case 'Baixa': return 'bg-blue-500';
      case 'Média': return 'bg-amber-500';
      case 'Alta': return 'bg-rose-500';
      default: return 'bg-slate-400';
    }
  };

  const filteredAddresses = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return addresses.filter(a => {
      const matchesSearch = !term || 
        a.endereco.toLowerCase().includes(term) ||
        a.rua.toLowerCase().includes(term) ||
        a.predio.toLowerCase().includes(term);
      
      const status = getOccupationStatus(a.quantidadeAtual);
      const matchesOccupation = occupationFilter === 'Todos' || status === occupationFilter;
      
      return matchesSearch && matchesOccupation;
    });
  }, [addresses, searchTerm, occupationFilter]);

  const totalPages = Math.ceil(filteredAddresses.length / itemsPerPage);
  const paginatedData = filteredAddresses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const allFilteredSelected = useMemo(() => {
    return filteredAddresses.length > 0 && filteredAddresses.every(a => selectedAddresses.has(a.id));
  }, [filteredAddresses, selectedAddresses]);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedAddresses);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAddresses(next);
  };

  const selectAll = () => {
    if (allFilteredSelected) setSelectedAddresses(new Set());
    else setSelectedAddresses(new Set(filteredAddresses.map(a => a.id)));
  };

  const handlePrintIndividual = (id: string) => {
    setSelectedAddresses(new Set([id]));
    setShowPrintPreview(true);
  };

  const handlePrint = () => window.print();

  if (isLoading) return <div className="p-10 text-center animate-pulse text-slate-500 font-black uppercase tracking-widest">Carregando Mapa Logístico...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="no-print">
        <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Mapa de Endereços</h1>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estrutura de Armazenamento e Endereçamento.</p>
      </div>

      <div className="bg-white dark:bg-dark-card p-4 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center no-print">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Buscar por Endereço, Rua ou Prédio..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 relative group">
          <Layers className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Ocupação:</span>
          <div className="relative flex items-center">
            <select 
              value={occupationFilter} 
              onChange={(e) => setOccupationFilter(e.target.value as OccupationLevel)}
              className="bg-transparent text-xs font-black text-slate-800 dark:text-white outline-none cursor-pointer pr-6 appearance-none relative z-10"
            >
              <option value="Todos" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Todos</option>
              <option value="Vazio" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Vazio</option>
              <option value="Baixa" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Baixa (Até 500)</option>
              <option value="Média" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Média (501 - 2k)</option>
              <option value="Alta" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Alta (+ 2k)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-0 pointer-events-none" />
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
           <button onClick={selectAll} className="flex-1 md:flex-none px-4 py-3 bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-colors dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {allFilteredSelected ? 'Limpar Tudo' : 'Selecionar Tudo'}
           </button>
           <button 
             onClick={() => setShowPrintPreview(true)}
             disabled={selectedAddresses.size === 0}
             className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap"
           >
             <Tag className="w-4 h-4" /> Etiquetas ({selectedAddresses.size})
           </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 no-print bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-400"></div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Vazio (0 pçs)</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Baixa (Até 500)</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Média (501 - 2k)</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Alta (+ 2k)</span>
         </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4 no-print">
        {paginatedData.map(a => {
          const status = getOccupationStatus(a.quantidadeAtual);
          const colorClass = getStatusColor(status);
          return (
            <div 
              key={a.id}
              className={`relative p-5 rounded-3xl border-2 transition-all group flex flex-col items-center justify-center gap-3 cursor-pointer ${selectedAddresses.has(a.id) ? 'bg-primary/10 border-primary shadow-xl shadow-primary/10' : 'bg-white dark:bg-dark-card border-slate-100 dark:border-slate-800 hover:border-slate-300 shadow-sm'}`}
              onClick={() => toggleSelection(a.id)}
            >
               <button 
                  onClick={(e) => { e.stopPropagation(); handlePrintIndividual(a.id); }}
                  className="absolute top-3 right-3 p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-slate-200 dark:border-slate-700"
               >
                  <Printer className="w-3.5 h-3.5" />
               </button>
               <div className="relative">
                 <div className={`p-3 rounded-2xl ${selectedAddresses.has(a.id) ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <MapPin className="w-5 h-5" />
                 </div>
                 <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-dark-card ${colorClass} shadow-sm animate-pulse`} title={`Ocupação: ${status}`}></div>
               </div>
               <div className="flex flex-col items-center">
                 <span className="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-tighter text-center line-clamp-1">{a.endereco}</span>
                 <div className="text-[9px] font-black text-slate-400 uppercase flex flex-col items-center mt-1">
                    <span>RUA {a.rua}</span>
                    <span className="opacity-60">PRÉDIO {a.predio}</span>
                 </div>
                 <div className="mt-2 text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {a.quantidadeAtual.toLocaleString('pt-BR')} <span className="text-[8px] opacity-60">PÇS</span>
                 </div>
               </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white dark:bg-dark-card p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 no-print">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Página {currentPage} de {totalPages}</span>
           <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-all shadow-sm"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-all shadow-sm"><ChevronRight className="w-5 h-5" /></button>
           </div>
        </div>
      )}

      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 overflow-auto flex flex-col print-mode-wrapper animate-in fade-in duration-300">
           <div className="sticky top-0 bg-slate-900 text-white p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-2xl z-50 no-print border-b border-slate-800">
             <div className="flex items-center gap-4">
               <div className="p-2 bg-blue-600/20 rounded-xl"><MapIcon className="w-5 h-5 text-blue-400" /></div>
               <div>
                  <span className="font-black text-xs uppercase tracking-widest block">Impressão de Endereçamento</span>
                  <p className="text-[9px] font-bold text-slate-500 uppercase italic">Configure o tamanho para etiquetas térmicas de rolo</p>
               </div>
             </div>

             <div className="flex flex-wrap items-center gap-4">
                <div className="bg-slate-800 p-1.5 rounded-xl flex items-center gap-3 border border-slate-700">
                   <div className="flex items-center gap-2 px-3 border-r border-slate-700">
                      <Maximize2 className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Formato:</span>
                   </div>
                   <select 
                      value={selectedLabelSize.id} 
                      onChange={(e) => setSelectedLabelSize(LABEL_SIZES.find(s => s.id === e.target.value) || LABEL_SIZES[2])}
                      className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer pr-4"
                   >
                      {LABEL_SIZES.map(size => <option key={size.id} value={size.id} className="bg-slate-900">{size.label}</option>)}
                   </select>
                </div>

                <div className="bg-slate-800 p-1.5 rounded-xl flex items-center gap-3 border border-slate-700">
                   <div className="flex items-center gap-2 px-3 border-r border-slate-700">
                      <QrCode className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo Código:</span>
                   </div>
                   <select 
                      value={printCodeType} 
                      onChange={(e) => setPrintCodeType(e.target.value as any)}
                      className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer pr-4"
                   >
                      <option value="qrcode" className="bg-slate-900">QR CODE</option>
                      <option value="barcode" className="bg-slate-900">CÓD. BARRAS</option>
                   </select>
                   
                   {printCodeType === 'barcode' && (
                     <div className="flex items-center gap-3 border-l border-slate-700 pl-3">
                        <select 
                            value={barcodeFormat} 
                            onChange={(e) => setBarcodeFormat(e.target.value)}
                            className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer pr-4"
                        >
                            <option value="CODE128" className="bg-slate-900">CODE128</option>
                            <option value="CODE39" className="bg-slate-900">CODE39</option>
                            <option value="EAN13" className="bg-slate-900">EAN-13</option>
                        </select>
                     </div>
                   )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setShowPrintPreview(false)} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-black text-[10px] uppercase flex items-center transition-all border border-slate-700"><X className="w-4 h-4 mr-2" /> Voltar</button>
                  <button onClick={handlePrint} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase flex items-center shadow-lg active:scale-95 transition-all"><Check className="w-4 h-4 mr-2" /> Imprimir</button>
                </div>
             </div>
          </div>

          <div className="printable-area flex flex-wrap gap-2 bg-white p-6 flex-1 justify-start">
            {addresses.filter(a => selectedAddresses.has(a.id)).map(a => {
              const isMini = selectedLabelSize.id === '40x25';
              const isMedium = selectedLabelSize.id === '60x30';
              return (
                <div 
                  key={a.id} 
                  style={{ width: selectedLabelSize.width, height: selectedLabelSize.height }}
                  className={`border-2 border-black flex flex-col items-center justify-center bg-white no-break overflow-hidden ${isMini ? 'p-1' : 'p-3'}`}
                >
                   {/* Layout normal para QR Code ou Barcode compacto em mini labels */}
                   <span className={`font-black text-black leading-none tracking-tighter text-center uppercase ${isMini ? 'text-[9px] mb-0.5' : (printCodeType === 'barcode' ? 'text-lg mb-1' : `text-${selectedLabelSize.fontSize} mb-1`)}`}>
                     {a.endereco}
                   </span>
                   
                   <div className={`flex items-center w-full px-2 ${isMini ? 'gap-1.5' : 'gap-3 mt-1'}`}>
                      {printCodeType === 'qrcode' ? (
                        <QRCodeSVG value={a.endereco} size={selectedLabelSize.qrSize} level="M" />
                      ) : (
                        <div className="w-full flex justify-center h-full">
                           <BarcodeComponent 
                              value={a.endereco} 
                              format={barcodeFormat} 
                              height={selectedLabelSize.barHeight} 
                              width={parseInt(selectedLabelSize.width)} 
                           />
                        </div>
                      )}

                      {/* Info lateral se for QR Code ou label pequena com barcode */}
                      {(printCodeType === 'qrcode' || (isMini || isMedium)) && (
                        <div className={`flex flex-col font-black text-black uppercase leading-tight ${isMini ? 'text-[5px]' : 'text-[8px]'}`}>
                            <span>RUA: {a.rua}</span>
                            <span>PRÉDIO: {a.predio}</span>
                            <span className="opacity-70">SALA: {a.sala}</span>
                        </div>
                      )}
                   </div>

                   <div className={`w-full mt-auto border-t border-black/30 font-black uppercase text-center text-black ${isMini ? 'text-[5px] pt-0.5' : 'text-[7px] pt-1'}`}>
                      ALUMASA INDUSTRIAL • LOGÍSTICA
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseAddresses;
