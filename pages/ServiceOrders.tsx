// Import React explicitly to support React.FC and other React namespace types
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend, LabelList, LineChart, Line
} from 'recharts';
import { 
  ClipboardList, Clock, Wrench, Building, Users, Timer, Zap, CalendarDays, AlertCircle, TrendingDown, X, MessageCircle, BarChart3, Printer, Filter, ChevronDown, Check, FileText, ArrowUpCircle, Calendar,
  Plus, Trash2, Save, Sparkles
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { ServiceOrder, InventoryItem } from '../types';

// Interface definition for ServiceOrdersPage props
interface ServiceOrdersProps {
  osData: ServiceOrder[];
  inventoryData: InventoryItem[];
  isLoading: boolean;
}

const monthsList = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const formatDetailedTime = (decimalHours: number | string): string => {
  const hoursNum = typeof decimalHours === 'string' ? parseFloat(decimalHours) : decimalHours;
  const isNegative = hoursNum < 0;
  const absHours = Math.abs(hoursNum);
  
  if (isNaN(absHours) || absHours === 0) return "0m";
  
  const h = Math.floor(absHours);
  const m = Math.round((absHours - h) * 60);
  
  let result = "";
  if (h === 0) result = `${m}m`;
  else if (m === 0) result = `${h}h`;
  else result = `${h}h${m}m`;
  
  return isNegative ? `-${result}` : result;
};

const formatDetailedTimeWithSpace = (decimalHours: number | string): string => {
  const hoursNum = typeof decimalHours === 'string' ? parseFloat(decimalHours) : decimalHours;
  const isNegative = hoursNum < 0;
  const absHours = Math.abs(hoursNum);

  if (isNaN(absHours) || absHours === 0) return "0m";
  
  const h = Math.floor(absHours);
  const m = Math.round((absHours - h) * 60);
  
  let result = "";
  if (h === 0) result = `${m}m`;
  else if (m === 0) result = `${h}h`;
  else result = `${h}h ${m}m`;
  
  return isNegative ? `-${result}` : result;
};

const getOSDowntimeInHours = (os: ServiceOrder): number => {
  if (os.parada !== 'Sim' || !os.dataFim) return 0;
  
  let startTime: Date | null = null;
  
  if (os.dataInicio) {
    if (os.dataInicio.getTime() < os.dataFim.getTime()) {
      startTime = os.dataInicio;
    }
  }
  
  if (os.dataAbertura.getTime() < os.dataFim.getTime()) {
    if (!startTime || os.dataAbertura.getTime() < startTime.getTime()) {
      startTime = os.dataAbertura;
    }
  }
  
  if (!startTime) return 0;
  
  const diffInMs = os.dataFim.getTime() - startTime.getTime();
  const diffInHours = diffInMs / 3600000;
  
  if (diffInHours > 0 && diffInHours < 744) {
    return diffInHours;
  }
  return 0;
};

const canonicalizeReason = (reasonStr: string): string => {
  if (!reasonStr) return 'Manutenção preventiva/corretiva';
  
  const normalized = reasonStr
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (
    normalized.includes("matriz") &&
    normalized.includes("estampar") &&
    (normalized.includes("degrau") || normalized.includes("degraus"))
  ) {
    return "Ajuste na matriz de corte de estampar degraus";
  }

  return reasonStr;
};

export interface FiveWhysReport {
  id: string;
  equipamento: string;
  tag: string;
  mesOcorrencia: string;
  problema: string;
  pq1: string;
  pq2: string;
  pq3: string;
  pq4: string;
  pq5: string;
  causaRaiz: string;
  acoes: {
    id: string;
    acao: string;
    responsavel: string;
    prazo: string;
    status: 'Concluído' | 'Pendente' | 'Em Andamento';
  }[];
  responsavelAssinatura: string;
  dataCriacao: string;
}

const MAINTENANCE_KNOWLEDGE_BASE: Record<string, {
  tag: string;
  pq1: string;
  pq2: string;
  pq3: string;
  pq4: string;
  pq5: string;
  causaRaiz: string;
  acoes: Array<{ acao: string; responsavel: string; prazo: string; status: 'Concluído' | 'Pendente' | 'Em Andamento' }>;
}> = {
  'Prensa': {
    tag: 'PR-01',
    pq1: 'Perda de força hidráulica e lentidão no ciclo de prensagem.',
    pq2: 'Queda de pressão no circuito principal por vazamento interno.',
    pq3: 'Fadiga e rachadura no anel de vedação do pistão principal.',
    pq4: 'Atrito excessivo por presença de micropartículas abrasivas no óleo hidráulico.',
    pq5: 'O filtro de óleo estava saturado e houve desvio do fluxo pela válvula bypass sem filtragem.',
    causaRaiz: 'Ausência de um plano de análise periódica do óleo e de substituição preventiva de vedações e filtros.',
    acoes: [
      { acao: 'Substituir vedações e filtros de óleo hidráulico.', responsavel: 'Cláudio', prazo: '2026-07-25', status: 'Pendente' },
      { acao: 'Drenar e purificar o óleo do tanque com unidade de filtragem externa.', responsavel: 'Cláudio', prazo: '2026-07-28', status: 'Pendente' },
      { acao: 'Implementar rotina de inspeção semanal da pressão do circuito hidráulico.', responsavel: 'Cláudio', prazo: '2026-08-05', status: 'Pendente' }
    ]
  },
  'Prensa Sucata': {
    tag: 'PR-SUC',
    pq1: 'Travamento repentino das facas de corte lateral.',
    pq2: 'Folga mecânica excessiva nas guias lineares do cabeçote.',
    pq3: 'Desgaste prematuro dos parafusos de fixação das guias por vibração.',
    pq4: 'Infiltração de cavacos e resíduos metálicos sob a vedação protetora.',
    pq5: 'Acúmulo de sujeira acumulada devido à falta de limpeza sistemática no fim do turno.',
    causaRaiz: 'Inexistência de rotina de lubrificação mecânica e limpeza diária do cabeçote de prensa.',
    acoes: [
      { acao: 'Ajustar folga mecânica e substituir parafusos danificados.', responsavel: 'Cláudio', prazo: '2026-07-24', status: 'Pendente' },
      { acao: 'Criar check-list diário de limpeza preventiva (5S) na prensa de sucata.', responsavel: 'Cláudio', prazo: '2026-07-27', status: 'Pendente' }
    ]
  },
  'Broca': {
    tag: 'BR-04',
    pq1: 'Substituição excessiva de brocas por perda precoce do fio de corte.',
    pq2: 'Elevação térmica severa e desgaste por atrito na furação de perfis.',
    pq3: 'Falta de refrigeração/lubrificação líquida direta na ferramenta.',
    pq4: 'Bocal aspersor de fluido refrigerante obstruído por resíduos metálicos.',
    pq5: 'Falta de limpeza regular do sistema de refrigeração e de filtro de linha.',
    causaRaiz: 'Ausência de rotina para inspeção visual rápida e limpeza do aspersor de refrigeração.',
    acoes: [
      { acao: 'Desobstruir bocal aspersor e reabastecer tanque de fluido refrigerante.', responsavel: 'Cláudio', prazo: '2026-07-22', status: 'Pendente' },
      { acao: 'Fixar placa com instruções de regulagem do fluxo refrigerante na máquina.', responsavel: 'Cláudio', prazo: '2026-07-25', status: 'Pendente' },
      { acao: 'Adicionar check de refrigeração no plano de preventiva semanal.', responsavel: 'Cláudio', prazo: '2026-07-30', status: 'Pendente' }
    ]
  },
  'P20': {
    tag: 'P20-FUR',
    pq1: 'Broca sem furar / furos fora do dimensional tolerado.',
    pq2: 'Desalinhamento mecânico no eixo de rotação do cabeçote de furação.',
    pq3: 'Vibração severa induzida por folga nos rolamentos de sustentação.',
    pq4: 'Desgaste severo por falta de lubrificação sistemática nos rolamentos.',
    pq5: 'Inexistência de canal lubrificador desobstruído e de monitoramento de vibração.',
    causaRaiz: 'Falta de rotina preventiva de engraxe e de aferição mecânica dimensional do eixo.',
    acoes: [
      { acao: 'Substituir rolamentos mecânicos danificados e efetuar alinhamento dimensional.', responsavel: 'Cláudio', prazo: '2026-07-25', status: 'Pendente' },
      { acao: 'Estabelecer cronograma quinzenal de afiação de brocas e troca preventiva.', responsavel: 'Cláudio', prazo: '2026-08-01', status: 'Pendente' }
    ]
  },
  'Extrusora': {
    tag: 'EXT-02',
    pq1: 'Oscilação severa de temperatura na zona de alimentação elétrica.',
    pq2: 'Queima sistemática das resistências de aquecimento cerâmicas.',
    pq3: 'Acúmulo de material termoplástico fundido sobre os cabos elétricos.',
    pq4: 'Refluxo ou vazamento mecânico por folga no flange de acoplamento.',
    pq5: 'Parafusos de fixação do cabeçote folgados por choque térmico cíclico.',
    causaRaiz: 'Falta de rotina de manutenção preventiva para reaperto programado nas fixações elétricas e mecânicas da extrusora.',
    acoes: [
      { acao: 'Limpar fiação e substituir resistência cerâmica danificada.', responsavel: 'Cláudio', prazo: '2026-07-24', status: 'Pendente' },
      { acao: 'Implementar reaperto técnico de resistências no plano mensal.', responsavel: 'Cláudio', prazo: '2026-07-29', status: 'Pendente' }
    ]
  },
  'Forno': {
    tag: 'FN-GE',
    pq1: 'Queimador principal falha ao iniciar a rampa de aquecimento.',
    pq2: 'Inexistência de centelha de ignição eletrônica ou falha no sensor de chama.',
    pq3: 'Eletrodo de ignição severamente carbonizado por queima incompleta.',
    pq4: 'Proporção incorreta de ar e gás por folga na articulação da válvula proporcional.',
    pq5: 'Vibração contínua afrouxou o manípulo mecânico de calibração da válvula.',
    causaRaiz: 'Ausência de plano anual de calibração eletrônica e análise de gases do queimador.',
    acoes: [
      { acao: 'Limpar eletrodos de ignição e calibrar folga mecânica da válvula de gás.', responsavel: 'Cláudio', prazo: '2026-07-23', status: 'Pendente' },
      { acao: 'Programar calibração anual da queima com emissão de laudo técnico.', responsavel: 'Cláudio', prazo: '2026-08-10', status: 'Pendente' }
    ]
  },
  'Serra': {
    tag: 'SR-03',
    pq1: 'Acabamento áspero ou desalinhamento no corte do perfil metálico.',
    pq2: 'Fricção lateral excessiva e empenamento térmico do disco de corte.',
    pq3: 'Desgaste acentuado nos mancais de apoio do eixo de rotação.',
    pq4: 'Falta crônica de graxa lubrificante devido a retentores desgastados.',
    pq5: 'Presença de cavacos de alumínio triturados que perfuraram a vedação de borracha.',
    causaRaiz: 'Ausência de limpeza periódica de cavacos na base do mancal e lubrificação semestral programada.',
    acoes: [
      { acao: 'Efetuar troca dos rolamentos e retentores da serra, adicionando graxa especial.', responsavel: 'Cláudio', prazo: '2026-07-25', status: 'Pendente' },
      { acao: 'Instalar barreira protetora adicional contra cavacos de alumínio no mancal.', responsavel: 'Cláudio', prazo: '2026-07-30', status: 'Pendente' }
    ]
  }
};

const ServiceOrdersPage: React.FC<ServiceOrdersProps> = ({ osData: data, inventoryData, isLoading }) => {
  const [selectedYear, setSelectedYear] = useState<string>('Todos');
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');
  const [selectedSector, setSelectedSector] = useState<string>('Todos');
  const [selectedEquipmentForModal, setSelectedEquipmentForModal] = useState<string | null>(null);
  const [selectedRequesterForModal, setSelectedRequesterForModal] = useState<string | null>(null);
  const [selectedPartForReasons, setSelectedPartForReasons] = useState<string | null>(null);
  const [selectedReasonForActivities, setSelectedReasonForActivities] = useState<string | null>(null);
  const [equipmentChartMode, setEquipmentChartMode] = useState<'quantity' | 'downtime'>('quantity');
  const [downtimeTrendEquipment, setDowntimeTrendEquipment] = useState<string | null>(null);
  
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [resumido, setResumido] = useState(false);

  // Estados para 5 Porquês e Plano de Ação
  const [activeTab, setActiveTab] = useState<'dashboard' | 'fiveWhys'>('dashboard');
  const [showFiveWhysPrintPreview, setShowFiveWhysPrintPreview] = useState(false);
  const [savedReports, setSavedReports] = useState<FiveWhysReport[]>(() => {
    try {
      const saved = localStorage.getItem('alumasa_5whys_reports');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  
  // Dados do formulário ativo de 5 Porquês
  const [formEquipamento, setFormEquipamento] = useState('');
  const [formTag, setFormTag] = useState('');
  const [formMesOcorrencia, setFormMesOcorrencia] = useState('');
  const [formProblema, setFormProblema] = useState('');
  const [formPq1, setFormPq1] = useState('');
  const [formPq2, setFormPq2] = useState('');
  const [formPq3, setFormPq3] = useState('');
  const [formPq4, setFormPq4] = useState('');
  const [formPq5, setFormPq5] = useState('');
  const [formCausaRaiz, setFormCausaRaiz] = useState('');
  const [formAcoes, setFormAcoes] = useState<Array<{
    id: string;
    acao: string;
    responsavel: string;
    prazo: string;
    status: 'Concluído' | 'Pendente' | 'Em Andamento';
  }>>([]);
  const [formResponsavelAssinatura, setFormResponsavelAssinatura] = useState('');
  const [isAllPDCAPrint, setIsAllPDCAPrint] = useState(false);
  const [expandedAssetPDCA, setExpandedAssetPDCA] = useState<string | null>(null);

  // Paleta de cores variadas conforme a imagem
  const VIBRANT_COLORS = [
    '#3b82f6', // Azul
    '#10b981', // Verde
    '#f59e0b', // Laranja
    '#ef4444', // Vermelho
    '#8b5cf6', // Roxo
    '#ec4899', // Rosa
    '#06b6d4', // Ciano
    '#34d399', // Esmeralda
    '#fbbf24', // Âmbar
    '#a855f7'  // Violeta
  ];

  const availableSectors = useMemo(() => {
    const sSet = new Set<string>();
    data.forEach(os => { if (os.setor) sSet.add(os.setor); });
    return ['Todos', ...Array.from(sSet).sort()];
  }, [data]);

  const availableYears = useMemo(() => {
    const ySet = new Set<string>();
    data.forEach(os => {
      ySet.add(os.dataAbertura.getFullYear().toString());
    });
    return ['Todos', ...Array.from(ySet).sort().reverse()];
  }, [data]);

  const filteredData = useMemo(() => {
    const filtered = data.filter(os => {
      const osYear = os.dataAbertura.getFullYear().toString();
      const osMonth = monthsList[os.dataAbertura.getMonth()];
      
      const matchesYear = selectedYear === 'Todos' || osYear === selectedYear;
      const matchesMonth = selectedMonth === 'Todos' || osMonth === selectedMonth;
      const matchesSector = selectedSector === 'Todos' || os.setor === selectedSector;
      
      return matchesYear && matchesMonth && matchesSector;
    });

    // Deduplicate by OS number to avoid counting the same OS multiple times, but merge professionals, hours, and pieces
    const uniqueMap = new Map<string, ServiceOrder>();
    filtered.forEach(os => {
      if (!uniqueMap.has(os.numero)) {
        uniqueMap.set(os.numero, { ...os });
      } else {
        const existing = uniqueMap.get(os.numero)!;
        
        // Merge professionals uniquely
        const getNames = (profStr: string) => {
          return (profStr || '')
            .split('/')
            .map(n => n.trim())
            .filter(n => n.toUpperCase() !== 'N' && n.toUpperCase() !== 'D' && n.toUpperCase() !== 'N/D' && n !== '');
        };
        const existingNames = getNames(existing.professional);
        const newNames = getNames(os.professional);
        const allNames = Array.from(new Set([...existingNames, ...newNames]));
        if (allNames.length > 0) {
          existing.professional = allNames.join(' / ');
        } else if (!existing.professional || existing.professional === 'N/D') {
          existing.professional = os.professional;
        }

        // Sum service hours for the duplicates
        existing.horas = (existing.horas || 0) + (os.horas || 0);

        // Merge components/pieces if different
        if (os.peca && os.peca !== 'N/D' && os.peca !== '') {
          if (!existing.peca || existing.peca === 'N/D' || existing.peca === '') {
            existing.peca = os.peca;
          } else {
            const existingParts = existing.peca.split(',').map(p => p.trim());
            const newParts = os.peca.split(',').map(p => p.trim());
            const allParts = Array.from(new Set([...existingParts, ...newParts]));
            existing.peca = allParts.join(', ');
          }
        }
      }
    });
    return Array.from(uniqueMap.values());
  }, [data, selectedYear, selectedMonth, selectedSector]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    let totalHours = 0;
    
    const profMap: Record<string, { count: number, respSum: number }> = {};

    filteredData.forEach(os => {
      totalHours += (os.horas || 0);

      // Lógica de nomes aprimorada para evitar "N", "D" ou "N/D"
      const names = os.professional 
        ? os.professional.split('/')
            .map(n => n.trim())
            .filter(n => n.toUpperCase() !== 'N' && n.toUpperCase() !== 'D' && n.toUpperCase() !== 'N/D' && n !== '') 
        : [];

      names.forEach(n => {
        if (!profMap[n]) profMap[n] = { count: 0, respSum: 0 };
        profMap[n].count++;
        
        if (os.dataAbertura && os.dataInicio) {
          const diff = (os.dataInicio.getTime() - os.dataAbertura.getTime()) / 3600000;
          if (Math.abs(diff) < 2000) { 
            profMap[n].respSum += diff; 
          }
        }
      });
    });

    const sumOfProfAverages = Object.values(profMap).reduce((acc, curr) => {
        const avg = curr.count > 0 ? curr.respSum / curr.count : 0;
        return acc + avg;
    }, 0);

    const avgResponseTime = total > 0 ? (sumOfProfAverages / (Object.keys(profMap).length || 1)) : 0;
    const avgExecutionTime = total > 0 ? (totalHours / total) : 0;

    return { total, totalHours, avgResponseTime, avgExecutionTime };
  }, [filteredData]);

  const professionalStats = useMemo(() => {
    // Filter the raw data to match current filters
    const filtered = data.filter(os => {
      const osYear = os.dataAbertura.getFullYear().toString();
      const osMonth = monthsList[os.dataAbertura.getMonth()];
      
      const matchesYear = selectedYear === 'Todos' || osYear === selectedYear;
      const matchesMonth = selectedMonth === 'Todos' || osMonth === selectedMonth;
      const matchesSector = selectedSector === 'Todos' || os.setor === selectedSector;
      
      return matchesYear && matchesMonth && matchesSector;
    });

    const map: Record<string, { uniqueOs: Set<string>, hours: number, respSum: number, respCount: number }> = {};
    
    filtered.forEach(os => {
      const names = os.professional 
        ? os.professional.split('/')
            .map(n => n.trim())
            .filter(n => n.toUpperCase() !== 'N' && n.toUpperCase() !== 'D' && n.toUpperCase() !== 'N/D' && n !== '')
        : [];
        
      const dHours = os.horas || 0;

      names.forEach(n => {
        if (!map[n]) map[n] = { uniqueOs: new Set(), hours: 0, respSum: 0, respCount: 0 };
        map[n].uniqueOs.add(os.numero);
        map[n].hours += dHours;
        
        if (os.dataAbertura && os.dataInicio) {
          const diff = (os.dataInicio.getTime() - os.dataAbertura.getTime()) / 3600000;
          if (Math.abs(diff) < 2000) { 
            map[n].respSum += diff; 
            map[n].respCount++;
          }
        }
      });
    });

    return Object.entries(map).map(([name, s]) => ({
      name, 
      count: s.uniqueOs.size, 
      hours: s.hours, 
      avgResp: s.respCount > 0 ? s.respSum / s.respCount : 0
    })).sort((a, b) => a.avgResp - b.avgResp);
  }, [data, selectedYear, selectedMonth, selectedSector]);

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

  const requesterDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(os => {
      const req = os.requester || 'N/D';
      if (req !== 'N/D') {
        map[req] = (map[req] || 0) + 1;
      }
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const requesterModalData = useMemo(() => {
    if (!selectedRequesterForModal) return null;
    
    const requesterOs = filteredData.filter(os => os.requester === selectedRequesterForModal);
    const total = requesterOs.length;
    
    const openedAfterStart = requesterOs.filter(os => {
      if (os.dataAbertura && os.dataInicio) {
        return os.dataAbertura.getTime() > os.dataInicio.getTime();
      }
      return false;
    });

    const detailedOs = openedAfterStart.map(os => {
      const delayMs = os.dataAbertura.getTime() - os.dataInicio!.getTime();
      const delayHours = delayMs / 3600000;
      return {
        numero: os.numero,
        dataAbertura: os.dataAbertura,
        dataInicio: os.dataInicio,
        delayHours,
        equipamento: os.equipamento
      };
    });

    return {
      name: selectedRequesterForModal,
      total,
      afterStartCount: openedAfterStart.length,
      detailedOs
    };
  }, [selectedRequesterForModal, filteredData]);

  const totalSectorOS = useMemo(() => 
    sectorDistribution.reduce((acc, curr) => acc + curr.value, 0)
  , [sectorDistribution]);

  // Lógica de Downtime (Tempo Parado) otimizada para capturar os dados da imagem
  const downtimeByEquipment = useMemo(() => {
    const map: Record<string, number> = {};
    
    // First, filter raw data by year, month, sector (without the arbitrary deduplication that might discard the "Sim" or correct equipment name)
    const filteredRaw = data.filter(os => {
      const osYear = os.dataAbertura.getFullYear().toString();
      const osMonth = monthsList[os.dataAbertura.getMonth()];
      
      const matchesYear = selectedYear === 'Todos' || osYear === selectedYear;
      const matchesMonth = selectedMonth === 'Todos' || osMonth === selectedMonth;
      const matchesSector = selectedSector === 'Todos' || os.setor === selectedSector;
      
      return matchesYear && matchesMonth && matchesSector;
    });

    // We only care about OSs that have parada === 'Sim'
    const stoppedOSs = filteredRaw.filter(os => os.parada === 'Sim');

    // Deduplicate by OS number, but if multiple rows exist, make sure we pick the one with valid equipment if possible, or just deduplicate
    const uniqueMap = new Map<string, ServiceOrder>();
    stoppedOSs.forEach(os => {
      if (!uniqueMap.has(os.numero)) {
        uniqueMap.set(os.numero, os);
      } else {
        // If we already have this OS, but the existing one has 'Geral' or empty equipment, and the new one has a specific machine, prefer the specific machine
        const existing = uniqueMap.get(os.numero)!;
        if ((!existing.equipamento || existing.equipamento === 'Geral') && os.equipamento && os.equipamento !== 'Geral') {
          uniqueMap.set(os.numero, os);
        }
      }
    });

    // We need to keep track of reasons per equipment
    const reasonsMap: Record<string, Record<string, { count: number; hours: number; activities: string[] }>> = {};

    uniqueMap.forEach(os => {
      const eq = os.equipamento || 'Geral';
      const hours = getOSDowntimeInHours(os);
      if (hours > 0) {
        map[eq] = (map[eq] || 0) + hours;

        const reason = canonicalizeReason(os.motivo || 'Manutenção preventiva/corretiva');
        if (!reasonsMap[eq]) {
          reasonsMap[eq] = {};
        }
        if (!reasonsMap[eq][reason]) {
          reasonsMap[eq][reason] = { count: 0, hours: 0, activities: [] };
        }
        reasonsMap[eq][reason].count += 1;
        reasonsMap[eq][reason].hours += hours;
        
        const activity = os.descricao ? os.descricao.trim() : '';
        if (activity && !reasonsMap[eq][reason].activities.includes(activity)) {
          reasonsMap[eq][reason].activities.push(activity);
        }
      }
    });

    return Object.entries(map)
      .map(([name, value]) => {
        const eqReasons = reasonsMap[name] || {};
        const reasons = Object.entries(eqReasons)
          .map(([rName, rData]) => ({
            name: rName,
            count: rData.count,
            hours: rData.hours,
            activities: rData.activities
          }))
          .sort((a, b) => b.hours - a.hours || b.count - a.count);
        return { name, value, reasons };
      })
      .sort((a, b) => b.value - a.value);
  }, [data, selectedYear, selectedMonth, selectedSector]);

  const totalDowntime = useMemo(() => 
    downtimeByEquipment.reduce((acc, curr) => acc + curr.value, 0)
  , [downtimeByEquipment]);

  const downtimeTrendData = useMemo(() => {
    if (!downtimeTrendEquipment) return [];

    // Filter raw data to match the selected equipment and matching sector filter
    const eqData = data.filter(os => {
      const eqName = os.equipamento || 'Geral';
      if (eqName !== downtimeTrendEquipment) return false;
      
      const matchesSector = selectedSector === 'Todos' || os.setor === selectedSector;
      return matchesSector;
    });

    // Deduplicate by O.S. number so duplicate rows (e.g. multiple professionals) don't count downtime multiple times
    const uniqueEqMap = new Map<string, ServiceOrder>();
    eqData.forEach(os => {
      if (!uniqueEqMap.has(os.numero)) {
        uniqueEqMap.set(os.numero, os);
      }
    });
    const uniqueEqData = Array.from(uniqueEqMap.values());

    // If a specific year is selected
    if (selectedYear !== 'Todos') {
      const yearNum = parseInt(selectedYear);
      // Initialize all 12 months with 0 value
      const monthsTrend = monthsList.map((monthName, index) => ({
        name: monthName.substring(0, 3), // e.g. "Jan", "Fev"
        value: 0,
        fullName: monthName
      }));

      uniqueEqData.forEach(os => {
        if (os.dataAbertura.getFullYear() === yearNum && os.parada === 'Sim') {
          const monthIndex = os.dataAbertura.getMonth();
          const hours = getOSDowntimeInHours(os);
          if (hours > 0) {
            monthsTrend[monthIndex].value += hours;
          }
        }
      });

      return monthsTrend;
    } else {
      // If "Todos" years selected, let's group by Year + Month
      const map: Record<string, { year: number, monthIndex: number, value: number }> = {};
      
      uniqueEqData.forEach(os => {
        if (os.parada === 'Sim') {
          const yr = os.dataAbertura.getFullYear();
          const mIdx = os.dataAbertura.getMonth();
          const key = `${yr}-${mIdx}`;

          const hours = getOSDowntimeInHours(os);
          if (hours > 0) {
            if (!map[key]) {
              map[key] = { year: yr, monthIndex: mIdx, value: 0 };
            }
            map[key].value += hours;
          }
        }
      });

      // Sort chronologically
      return Object.values(map)
        .sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.monthIndex - b.monthIndex;
        })
        .map(item => ({
          name: `${monthsList[item.monthIndex].substring(0, 3)}/${item.year.toString().substring(2)}`, // e.g. "Jan/26"
          value: item.value,
          fullName: `${monthsList[item.monthIndex]} de ${item.year}`
        }));
    }
  }, [downtimeTrendEquipment, data, selectedYear, selectedSector]);

  const downtimeTrendStats = useMemo(() => {
    if (downtimeTrendData.length === 0) return { total: 0, average: 0, maxMonth: '', maxValue: 0 };
    let total = 0;
    let maxValue = -1;
    let maxMonth = '';
    downtimeTrendData.forEach(item => {
      total += item.value;
      if (item.value > maxValue) {
        maxValue = item.value;
        maxMonth = item.fullName || item.name;
      }
    });
    const average = total / downtimeTrendData.length;
    return { total, average, maxMonth, maxValue };
  }, [downtimeTrendData]);

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
    const grouped: Record<string, { reason: string, count: number, lastDate: string }> = {};
    
    filteredData
      .filter(os => 
        os.equipamento === selectedEquipmentForModal && 
        os.peca?.includes(selectedPartForReasons)
      )
      .forEach(os => {
        const reasonStr = canonicalizeReason(os.motivo || 'Manutenção preventiva/corretiva');
        if (!grouped[reasonStr]) {
          grouped[reasonStr] = { 
            reason: reasonStr, 
            count: 0, 
            lastDate: os.dataAbertura.toLocaleDateString('pt-BR') 
          };
        }
        grouped[reasonStr].count++;
        
        const currentData = os.dataAbertura.getTime();
        const storedDateParts = grouped[reasonStr].lastDate.split('/');
        const storedDateObj = new Date(parseInt(storedDateParts[2]), parseInt(storedDateParts[1]) - 1, parseInt(storedDateParts[0])).getTime();
        if (currentData > storedDateObj) {
            grouped[reasonStr].lastDate = os.dataAbertura.toLocaleDateString('pt-BR');
        }
      });
      
    return Object.values(grouped).sort((a, b) => b.count - a.count);
  }, [selectedPartForReasons, selectedEquipmentForModal, filteredData]);

  const activitiesForSelectedReason = useMemo(() => {
    if (!selectedReasonForActivities || !selectedPartForReasons || !selectedEquipmentForModal) return [];
    return filteredData.filter(os => 
      os.equipamento === selectedEquipmentForModal && 
      os.peca?.includes(selectedPartForReasons) &&
      canonicalizeReason(os.motivo || 'Manutenção preventiva/corretiva') === selectedReasonForActivities
    ).sort((a, b) => b.dataAbertura.getTime() - a.dataAbertura.getTime());
  }, [selectedReasonForActivities, selectedPartForReasons, selectedEquipmentForModal, filteredData]);

  const totalRequesterOS = useMemo(() => 
    requesterDistribution.reduce((acc, curr) => acc + curr.value, 0)
  , [requesterDistribution]);

  const equipmentReportStats = useMemo(() => {
    const eqMap: Record<string, {
      name: string;
      count: number;
      parts: Record<string, {
        count: number;
        reasons: Record<string, number>;
      }>;
    }> = {};

    filteredData.forEach(os => {
      const eq = os.equipamento || 'Geral/Outros';
      if (!eqMap[eq]) {
        eqMap[eq] = { name: eq, count: 0, parts: {} };
      }
      eqMap[eq].count++;

      if (os.peca) {
        const parts = os.peca.split(/[,/]/).map(p => p.trim()).filter(Boolean);
        const reason = canonicalizeReason(os.motivo ? os.motivo.trim() : 'Não especificado');
        parts.forEach(p => {
          if (!eqMap[eq].parts[p]) {
            eqMap[eq].parts[p] = { count: 0, reasons: {} };
          }
          eqMap[eq].parts[p].count++;
          eqMap[eq].parts[p].reasons[reason] = (eqMap[eq].parts[p].reasons[reason] || 0) + 1;
        });
      } else {
        const reason = canonicalizeReason(os.motivo ? os.motivo.trim() : 'Não especificado');
        if (!eqMap[eq].parts['Nenhuma peça citada']) {
          eqMap[eq].parts['Nenhuma peça citada'] = { count: 0, reasons: {} };
        }
        eqMap[eq].parts['Nenhuma peça citada'].count++;
        eqMap[eq].parts['Nenhuma peça citada'].reasons[reason] = (eqMap[eq].parts['Nenhuma peça citada'].reasons[reason] || 0) + 1;
      }
    });

    return Object.values(eqMap).sort((a, b) => b.count - a.count);
  }, [filteredData]);

  // CÁLCULO DINÂMICO DOS EQUIPAMENTOS TOP 5
  const top5Equipment = useMemo(() => {
    // 1. Tentar pegar por tempo parado (downtimeByEquipment)
    const fromDowntime = downtimeByEquipment.slice(0, 5).map(e => ({
      name: e.name,
      reasons: e.reasons || [],
      type: 'downtime' as const,
      metric: e.value
    }));
    
    if (fromDowntime.length >= 5) return fromDowntime;
    
    // 2. Se houver menos que 5, complementar com os de maior volume de OS (assetsDemand)
    const fromDemand = assetsDemand.slice(0, 5).map(e => {
      const foundInDowntime = downtimeByEquipment.find(d => d.name === e[0]);
      return {
        name: e[0],
        reasons: foundInDowntime ? foundInDowntime.reasons || [] : [],
        type: 'demand' as const,
        metric: e[1]
      };
    });
    
    const merged: { name: string; reasons: any[]; type: 'downtime' | 'demand'; metric: number }[] = [...fromDowntime];
    fromDemand.forEach(item => {
      if (!merged.some(m => m.name === item.name)) {
        merged.push(item);
      }
    });
    return merged.slice(0, 5);
  }, [downtimeByEquipment, assetsDemand]);

  // Lista dos equipamentos Top 5 para seleção individual do PDCA
  const allAvailableEquipments = useMemo(() => {
    return top5Equipment.map(item => {
      const foundInDowntime = downtimeByEquipment.find(d => d.name === item.name);
      const metricStr = item.type === 'downtime' 
        ? formatDetailedTime(item.metric) 
        : `${item.metric} OS`;
      
      return {
        name: item.name,
        metricStr,
        topReason: item.reasons?.[0]?.name || foundInDowntime?.reasons?.[0]?.name
      };
    });
  }, [top5Equipment, downtimeByEquipment]);

  // Helper to generate fully automated, realistic 5 Whys and Action Plan for any given equipment
  const getPDCADataForEquipment = (eqName: string, metricStr: string, reasonName?: string) => {
    const nameLower = eqName.toLowerCase();
    let matchKey = '';
    
    if (nameLower.includes('prensa') && nameLower.includes('sucata')) {
      matchKey = 'Prensa Sucata';
    } else if (nameLower.includes('prensa')) {
      matchKey = 'Prensa';
    } else if (nameLower.includes('p20')) {
      matchKey = 'P20';
    } else if (nameLower.includes('broca')) {
      matchKey = 'Broca';
    } else if (nameLower.includes('extrusora')) {
      matchKey = 'Extrusora';
    } else if (nameLower.includes('forno')) {
      matchKey = 'Forno';
    } else if (nameLower.includes('serra')) {
      matchKey = 'Serra';
    }

    const defaultProblem = reasonName 
      ? `FALHA COM PARADA NÃO PROGRAMADA POR: ${reasonName.toUpperCase()}`
      : `INTERRUPÇÃO OPERACIONAL SEVERA COM IMPACTO DE ${metricStr.toUpperCase()} PARALISADO.`;

    const mesStr = selectedMonth === 'Todos' ? 'JULHO/2026' : `${selectedMonth.toUpperCase()}/${selectedYear === 'Todos' ? '2026' : selectedYear}`;

    if (matchKey && MAINTENANCE_KNOWLEDGE_BASE[matchKey]) {
      const kb = MAINTENANCE_KNOWLEDGE_BASE[matchKey];
      return {
        equipamento: eqName,
        tag: kb.tag,
        mesOcorrencia: mesStr,
        problema: defaultProblem,
        pq1: kb.pq1,
        pq2: kb.pq2,
        pq3: kb.pq3,
        pq4: kb.pq4,
        pq5: kb.pq5,
        causaRaiz: kb.causaRaiz,
        acoes: kb.acoes.map((ac, idx) => ({
          id: `${eqName}-${idx}`,
          acao: ac.acao,
          responsavel: ac.responsavel,
          prazo: ac.prazo,
          status: ac.status
        }))
      };
    } else {
      // Smart Fallback based on top reason or generic mechanical
      const cleanReason = reasonName || 'Desgaste mecânico e fadiga';
      const cleanReasonLower = cleanReason.toLowerCase();
      
      let tagStr = `${eqName.substring(0, 3).toUpperCase() || 'EQ'}-01`;
      let pq1 = `Substituição emergencial de componente ou peça devido a ${cleanReasonLower}.`;
      let pq2 = `Atrito mecânico excessivo ou sobrecarga térmica operando sob fadiga contínua.`;
      let pq3 = `Ausência de lubrificação periódica adequada nos pontos móveis de atrito.`;
      let pq4 = `Infiltração de poeira ou resíduos abrasivos que obstruíram o canal lubrificador do ativo.`;
      let pq5 = `Falta de check-list preventivo sistemático no plano semanal do setor de manutenção.`;
      let causaRaiz = `Ausência de cronograma sistemático de lubrificação, limpeza de resíduos e manutenção preventiva periódica para o ativo ${eqName}.`;
      
      if (cleanReasonLower.includes('eletric') || cleanReasonLower.includes('disjuntor') || cleanReasonLower.includes('sensor') || cleanReasonLower.includes('cabo')) {
        tagStr = `${eqName.substring(0, 3).toUpperCase()}-EL`;
        pq1 = `Queda de energia ou desarmamento de componente elétrico por sobrecorrente de ${cleanReasonLower}.`;
        pq2 = `Sobrecarga térmica e pico de corrente circulando pela fiação do comando.`;
        pq3 = `Mau contato físico ou oxidação severa nos terminais e conexões de potência.`;
        pq4 = `Infiltração de umidade ou fuligem condutiva na caixa protetora de conexões elétricas.`;
        pq5 = `Falta de plano de reaperto preventivo e termografia sistemática nos painéis de força.`;
        causaRaiz = `Inexistência de inspeção termográfica periódica mensal e rotina de reaperto preventivo dos contatores e disjuntores da máquina.`;
      } else if (cleanReasonLower.includes('pneumatic') || cleanReasonLower.includes('valvula') || cleanReasonLower.includes('ar') || cleanReasonLower.includes('pressao')) {
        tagStr = `${eqName.substring(0, 3).toUpperCase()}-PN`;
        pq1 = `Perda de pressão de ar comprimido ou vazamento detectado na linha pneumática.`;
        pq2 = `Rompimento de mangueira pneumática ou fadiga no atuador de acionamento de ${cleanReasonLower}.`;
        pq3 = `Presença excessiva de condensado de água e contaminação de óleo no sistema de ar.`;
        pq4 = `Saturação do elemento filtrante e dreno do purgador de linha inoperante por sujeira.`;
        pq5 = `Falta de purga periódica diária e check-list de pressão no painel de ar de PCM.`;
        causaRaiz = `Falta de drenagem sistemática do compressor de linha e ausência de substituição preventiva de filtros purificadores de ar comprimido.`;
      }

      return {
        equipamento: eqName,
        tag: tagStr,
        mesOcorrencia: mesStr,
        problema: defaultProblem,
        pq1,
        pq2,
        pq3,
        pq4,
        pq5,
        causaRaiz,
        acoes: [
          { 
            id: `${eqName}-1`, 
            acao: `Realizar reparo imediato do componente (${cleanReason.toUpperCase()}), efetuar limpeza profunda do painel e pontos de atrito.`, 
            responsavel: 'Cláudio', 
            prazo: '2026-07-24', 
            status: 'Pendente' as const 
          },
          { 
            id: `${eqName}-2`, 
            acao: `Desenvolver e implantar check-list operacional de preventivas semanais específico para evitar ocorrências de ${cleanReason.toUpperCase()}.`, 
            responsavel: 'Cláudio', 
            prazo: '2026-08-01', 
            status: 'Pendente' as const 
          }
        ]
      };
    }
  };

  const allPDCAData = useMemo(() => {
    return top5Equipment.map((eq) => {
      const topReason = eq.reasons && eq.reasons.length > 0 ? eq.reasons[0].name : '';
      const metricStr = eq.type === 'downtime' ? formatDetailedTime(eq.metric) : `${eq.metric} OS`;
      return getPDCADataForEquipment(eq.name, metricStr, topReason);
    });
  }, [top5Equipment, selectedMonth, selectedYear]);

  // Função para gerar rascunho inteligente baseado em IA/Conhecimento de Manutenção
  const handleGenerateAIDraft = (equipName: string, customProblem?: string) => {
    const nameLower = equipName.toLowerCase();
    let matchKey = '';
    
    if (nameLower.includes('prensa') && nameLower.includes('sucata')) {
      matchKey = 'Prensa Sucata';
    } else if (nameLower.includes('prensa')) {
      matchKey = 'Prensa';
    } else if (nameLower.includes('p20')) {
      matchKey = 'P20';
    } else if (nameLower.includes('broca')) {
      matchKey = 'Broca';
    } else if (nameLower.includes('extrusora')) {
      matchKey = 'Extrusora';
    } else if (nameLower.includes('forno')) {
      matchKey = 'Forno';
    } else if (nameLower.includes('serra')) {
      matchKey = 'Serra';
    }
    
    if (matchKey && MAINTENANCE_KNOWLEDGE_BASE[matchKey]) {
      const kb = MAINTENANCE_KNOWLEDGE_BASE[matchKey];
      setFormTag(kb.tag);
      setFormProblema(customProblem || `Falha funcional no equipamento ${equipName} gerando paradas não programadas`);
      setFormPq1(kb.pq1);
      setFormPq2(kb.pq2);
      setFormPq3(kb.pq3);
      setFormPq4(kb.pq4);
      setFormPq5(kb.pq5);
      setFormCausaRaiz(kb.causaRaiz);
      setFormAcoes(kb.acoes.map((ac, idx) => ({
        id: `${Date.now()}-${idx}`,
        acao: ac.acao,
        responsavel: ac.responsavel,
        prazo: ac.prazo,
        status: ac.status
      })));
    } else {
      // Fallback genérico inteligente
      setFormTag(`${equipName.substring(0, 3).toUpperCase() || 'EQ'}-01`);
      setFormProblema(customProblem || `Interrupção das atividades normais do equipamento ${equipName}`);
      setFormPq1(`Desgaste mecânico acentuado em componente estrutural da máquina.`);
      setFormPq2(`Estresse dinâmico por vibração excessiva operando fora das especificações normais.`);
      setFormPq3(`Falta de lubrificação sistemática ou refrigeração adequada nas partes móveis.`);
      setFormPq4(`Infiltração de poeira ou resíduos abrasivos que obstruíram os dutos de graxa/óleo.`);
      setFormPq5(`Ausência de manutenção preventiva e check-list diário operacional.`);
      setFormCausaRaiz(`Falta de um plano de manutenção preventiva semanal e limpeza para o ativo ${equipName}.`);
      setFormAcoes([
        { id: `${Date.now()}-1`, acao: `Substituir partes depreciadas e limpar os barramentos/guias do equipamento.`, responsavel: 'Cláudio', prazo: '2026-07-25', status: 'Pendente' },
        { id: `${Date.now()}-2`, acao: `Programar rotina periódica de inspeção e lubrificação no cronograma de preventivas.`, responsavel: 'Cláudio', prazo: '2026-08-01', status: 'Pendente' }
      ]);
    }
    
    if (!formResponsavelAssinatura) {
      setFormResponsavelAssinatura('Cláudio');
    }
  };

  // Funções de gerenciamento dos relatórios
  const handleSaveReport = () => {
    if (!formEquipamento || !formProblema) {
      alert('Por favor, preencha pelo menos o Equipamento e o Problema para salvar!');
      return;
    }
    
    const reportData: FiveWhysReport = {
      id: selectedReportId || `5whys-${Date.now()}`,
      equipamento: formEquipamento,
      tag: formTag,
      mesOcorrencia: formMesOcorrencia || selectedMonth || 'Geral',
      problema: formProblema,
      pq1: formPq1,
      pq2: formPq2,
      pq3: formPq3,
      pq4: formPq4,
      pq5: formPq5,
      causaRaiz: formCausaRaiz,
      acoes: formAcoes,
      responsavelAssinatura: formResponsavelAssinatura || 'Cláudio',
      dataCriacao: new Date().toLocaleDateString('pt-BR')
    };
    
    let updated: FiveWhysReport[] = [];
    if (selectedReportId) {
      updated = savedReports.map(r => r.id === selectedReportId ? reportData : r);
    } else {
      updated = [reportData, ...savedReports];
      setSelectedReportId(reportData.id);
    }
    
    setSavedReports(updated);
    localStorage.setItem('alumasa_5whys_reports', JSON.stringify(updated));
  };

  const handleDeleteReport = (id: string) => {
    if (confirm('Tem certeza de que deseja excluir este relatório dos 5 Porquês?')) {
      const updated = savedReports.filter(r => r.id !== id);
      setSavedReports(updated);
      localStorage.setItem('alumasa_5whys_reports', JSON.stringify(updated));
      if (selectedReportId === id) {
        handleCreateNewReport();
      }
    }
  };

  const handleLoadReport = (report: FiveWhysReport) => {
    setSelectedReportId(report.id);
    setFormEquipamento(report.equipamento);
    setFormTag(report.tag);
    setFormMesOcorrencia(report.mesOcorrencia);
    setFormProblema(report.problema);
    setFormPq1(report.pq1);
    setFormPq2(report.pq2);
    setFormPq3(report.pq3);
    setFormPq4(report.pq4);
    setFormPq5(report.pq5);
    setFormCausaRaiz(report.causaRaiz);
    setFormAcoes(report.acoes);
    setFormResponsavelAssinatura(report.responsavelAssinatura);
  };

  const handleCreateNewReport = () => {
    setSelectedReportId(null);
    setFormEquipamento('');
    setFormTag('');
    setFormMesOcorrencia(selectedMonth !== 'Todos' ? selectedMonth : 'Julho');
    setFormProblema('');
    setFormPq1('');
    setFormPq2('');
    setFormPq3('');
    setFormPq4('');
    setFormPq5('');
    setFormCausaRaiz('');
    setFormAcoes([]);
    setFormResponsavelAssinatura('Cláudio');
  };

  const handlePrintSinglePDCA = (eqName: string, metricStr: string, reasonName?: string) => {
    const data = getPDCADataForEquipment(eqName, metricStr, reasonName);
    setFormEquipamento(data.equipamento);
    setFormTag(data.tag);
    setFormMesOcorrencia(data.mesOcorrencia);
    setFormProblema(data.problema);
    setFormPq1(data.pq1);
    setFormPq2(data.pq2);
    setFormPq3(data.pq3);
    setFormPq4(data.pq4);
    setFormPq5(data.pq5);
    setFormCausaRaiz(data.causaRaiz);
    setFormAcoes(data.acoes);
    setFormResponsavelAssinatura('PCM - ALUMASA');
    setIsAllPDCAPrint(false);
    setShowFiveWhysPrintPreview(true);
  };

  const handlePrintAllPDCAs = () => {
    setIsAllPDCAPrint(true);
    setShowFiveWhysPrintPreview(true);
  };

  const handleAddActionRow = () => {
    setFormAcoes(prev => [
      ...prev,
      {
        id: `action-${Date.now()}`,
        acao: '',
        responsavel: 'Cláudio',
        prazo: '',
        status: 'Pendente'
      }
    ]);
  };

  const handleUpdateActionRow = (id: string, field: string, value: any) => {
    setFormAcoes(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, [field]: value };
      }
      return a;
    }));
  };

  const handleRemoveActionRow = (id: string) => {
    setFormAcoes(prev => prev.filter(a => a.id !== id));
  };

  const handleConfirmFiveWhysPrint = () => {
    const originalTitle = document.title;
    document.title = `analise_5_porques_${formEquipamento.replace(/\s+/g, '_').toLowerCase()}`;
    setTimeout(() => {
        window.print();
        document.title = originalTitle;
    }, 100);
  };

  const handleConfirmPrint = () => {
    const originalTitle = document.title;
    document.title = "relatorio_gerencial_alumasa";
    setTimeout(() => {
        window.print();
        document.title = originalTitle;
    }, 100);
  };

  const getBadgeColor = (avgResp: number) => {
    if (avgResp <= 1) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    if (avgResp <= 3) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
  };

  if (isLoading) {
    return <div className="p-10 text-center animate-pulse font-black text-slate-500 uppercase tracking-widest">Carregando dados de ordens de serviço...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-xl shadow-lg">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tighter">PCM - Gestão de Ativos</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Relatórios Industriais Alumasa</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* BARRA DE FILTROS PADRONIZADA (IGUAL PREVENTIVAS) */}
          <div className="bg-[#1e293b] p-2 rounded-xl flex items-center gap-3 border border-slate-800 shadow-xl no-print">
            <div className="flex items-center gap-2 px-2 border-r border-slate-700">
                <Filter className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Filtros:</span>
            </div>

            <div className="flex items-center gap-2">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-1">SETOR:</span>
               <div className="relative flex items-center bg-slate-900/50 rounded-lg px-2 py-1.5 border border-slate-700 min-w-[110px]">
                  <Building className="w-3 h-3 text-slate-400 mr-2" />
                  <select 
                    value={selectedSector} 
                    onChange={(e) => setSelectedSector(e.target.value)} 
                    className="bg-transparent text-xs font-black text-slate-200 outline-none cursor-pointer appearance-none pr-6 w-full"
                  >
                    {availableSectors.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                  </select>
                  <ChevronDown className="absolute right-1 w-3 h-3 text-slate-400 pointer-events-none" />
               </div>
            </div>

            <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-1">ANO:</span>
               <div className="relative flex items-center bg-slate-900/50 rounded-lg px-2 py-1.5 border border-slate-700 min-w-[90px]">
                  <Calendar className="w-3 h-3 text-slate-400 mr-2" />
                  <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(e.target.value)} 
                    className="bg-transparent text-xs font-black text-slate-200 outline-none cursor-pointer appearance-none pr-6 w-full"
                  >
                    {availableYears.map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
                  </select>
                  <ChevronDown className="absolute right-1 w-3 h-3 text-slate-400 pointer-events-none" />
               </div>
            </div>

            <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-1">MÊS:</span>
               <div className="relative flex items-center bg-slate-900/50 rounded-lg px-2 py-1.5 border border-slate-700 min-w-[110px]">
                  <CalendarDays className="w-3 h-3 text-slate-400 mr-2" />
                  <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)} 
                    className="bg-transparent text-xs font-black text-slate-200 outline-none cursor-pointer appearance-none pr-6 w-full"
                  >
                    <option value="Todos" className="bg-slate-900">Todos</option>
                    {monthsList.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
                  </select>
                  <ChevronDown className="absolute right-1 w-3 h-3 text-slate-400 pointer-events-none" />
               </div>
            </div>
          </div>

          <button onClick={() => setShowPrintPreview(true)} className="bg-white dark:bg-dark-card border border-gray-700 p-2.5 rounded-xl flex items-center gap-2 font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 shadow-sm">
            <Printer className="w-4 h-4 text-rose-500" /> Relatório
          </button>

          {/* BOTÃO + SELETOR DE PDCA (TODOS OU INDIVIDUAL) */}
          <div className="flex items-center gap-1.5 bg-blue-600 p-1 rounded-xl shadow-md no-print border border-blue-500">
            <button 
              onClick={handlePrintAllPDCAs} 
              className="hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-black text-xs uppercase tracking-wider transition-all active:scale-95"
              title="Gerar PDCA dos Top 5 Equipamentos"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" /> PDCA (Todos Top 5)
            </button>
            <div className="h-4 w-px bg-blue-400/50 my-auto" />
            <div className="relative flex items-center pr-1">
              <select 
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  if (val === 'ALL') {
                    handlePrintAllPDCAs();
                  } else {
                    const eqItem = allAvailableEquipments.find(item => item.name === val);
                    if (eqItem) {
                      handlePrintSinglePDCA(eqItem.name, eqItem.metricStr, eqItem.topReason);
                    }
                  }
                  e.target.value = '';
                }}
                className="bg-transparent text-xs font-black text-white uppercase tracking-wider outline-none cursor-pointer pr-5 py-1.5 pl-2 appearance-none hover:text-amber-200 transition-colors"
                defaultValue=""
              >
                <option value="" disabled className="bg-slate-900 text-slate-300">PDCA Individual...</option>
                <option value="ALL" className="bg-slate-900 text-amber-300 font-extrabold">📄 Todos os Top 5 Equipamentos</option>
                {allAvailableEquipments.map(eq => (
                  <option key={eq.name} value={eq.name} className="bg-slate-900 text-white font-semibold">
                    🔧 {eq.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-white/80 pointer-events-none absolute right-1" />
            </div>
          </div>
        </div>
      </div>

      {/* SELETOR DE ABAS PCM REMOVIDO PARA SIMPLIFICAÇÃO */}
      <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 no-print">
            <StatCard title="Total OS" value={stats.total} icon={ClipboardList} color="blue" />
            <StatCard title="Méd. Execução" value={formatDetailedTimeWithSpace(stats.avgExecutionTime)} icon={Zap} color="green" />
            <StatCard title="Méd. Resposta" value={formatDetailedTimeWithSpace(stats.avgResponseTime)} icon={Timer} color="purple" />
            <StatCard title="Horas Totais Trabalhadas" value={formatDetailedTimeWithSpace(stats.totalHours)} icon={Clock} color="blue" />
            <StatCard title="Tempo Total Parado" value={formatDetailedTimeWithSpace(totalDowntime)} icon={TrendingDown} color="red" />
          </div>

          {/* GRÁFICO DE DOWNTIME REFINADO - SEM VAZIO E COM ALINHAMENTO PRECISO */}
          <div className="bg-white dark:bg-dark-card rounded-[2rem] p-8 shadow-2xl border border-gray-100 dark:border-gray-800 no-print">
            <div className="flex items-center mb-8">
              <TrendingDown className="w-6 h-6 text-rose-500 mr-3" />
              <h3 className="font-black text-xl text-slate-800 dark:text-white uppercase tracking-tight">Tempo Total Parado por Equipamento (Top 10)</h3>
            </div>
            <div className="h-[480px]">
              {downtimeByEquipment.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={downtimeByEquipment.slice(0, 10)} 
                    margin={{ top: 50, bottom: 160, left: 10, right: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-gray-700 opacity-30" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      fontWeight="900"
                      height={120}
                      tick={{ dy: 15, dx: -5, fill: '#94a3b8' }} 
                      angle={-45}
                      textAnchor="end"
                      interval={0} 
                      axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                      tickLine={false}
                    />
                    <YAxis 
                       stroke="#94a3b8" 
                       fontSize={10} 
                       fontWeight="bold"
                       tickFormatter={(val) => `${val}h`} 
                       axisLine={false}
                       tickLine={false}
                    />
                    <Bar 
                      dataKey="value" 
                      name="Tempo Parado" 
                      radius={[8, 8, 0, 0]} 
                      barSize={55}
                      className="cursor-pointer"
                      onClick={(data) => {
                        if (data && data.name) {
                          setDowntimeTrendEquipment(data.name);
                        }
                      }}
                    >
                      {downtimeByEquipment.slice(0, 10).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={VIBRANT_COLORS[index % VIBRANT_COLORS.length]} />
                      ))}
                      <LabelList 
                        dataKey="value" 
                        position="top" 
                        offset={20} 
                        formatter={(val: any) => formatDetailedTime(val)} 
                        style={{ fill: '#ef4444', fontSize: '13px', fontWeight: '900', textShadow: '0px 0px 2px rgba(0,0,0,0.05)' }} 
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">Nenhum tempo de parada registrado para este período</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 no-print">
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div className="flex items-center">
                  <Wrench className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="font-bold text-slate-800 dark:text-white">
                    {equipmentChartMode === 'quantity' ? "Abertura por Equipamento (Top 5)" : "Tempo Parado por Equipamento (Top 5)"}
                  </h3>
                </div>
                <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start sm:self-auto border border-gray-200 dark:border-slate-700">
                  <button
                    onClick={() => setEquipmentChartMode('quantity')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                      equipmentChartMode === 'quantity'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Qtd. OS
                  </button>
                  <button
                    onClick={() => setEquipmentChartMode('downtime')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                      equipmentChartMode === 'downtime'
                        ? 'bg-rose-600 text-white shadow shadow-rose-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Tempo Parado
                  </button>
                </div>
              </div>
              <div className="h-72">
                {equipmentChartMode === 'quantity' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={assetsDemand.slice(0, 5).map(d => ({name: d[0], value: d[1]}))} layout="vertical" margin={{ right: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 10}} />
                      <Bar dataKey="value" name="Quantidade" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={25} className="cursor-pointer" onClick={(data) => { if (data && data.name) { setSelectedEquipmentForModal(data.name); } }}>
                        <LabelList dataKey="value" position="insideRight" offset={10} formatter={(value: number) => { const percent = stats.total > 0 ? ((value / stats.total) * 100).toFixed(1) : "0"; return `${percent}%`; }} style={{ fill: '#ffffff', fontSize: '11px', fontWeight: '900' }} />
                        <LabelList dataKey="value" position="right" offset={10} formatter={(value: number) => `${value}`} style={{ fill: '#3b82f6', fontSize: '12px', fontWeight: 'bold' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  downtimeByEquipment.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={downtimeByEquipment.slice(0, 5)} layout="vertical" margin={{ right: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 10}} />
                        <Bar dataKey="value" name="Tempo Parado" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={25} className="cursor-pointer" onClick={(data) => { if (data && data.name) { setSelectedEquipmentForModal(data.name); } }}>
                          <LabelList dataKey="value" position="insideRight" offset={10} formatter={(value: number) => { const percent = totalDowntime > 0 ? ((value / totalDowntime) * 100).toFixed(1) : "0"; return `${percent}%`; }} style={{ fill: '#ffffff', fontSize: '11px', fontWeight: '900' }} />
                          <LabelList dataKey="value" position="right" offset={10} formatter={(value: number) => formatDetailedTime(value)} style={{ fill: '#ef4444', fontSize: '12px', fontWeight: 'bold' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">Nenhum tempo de parada registrado para este período</div>
                  )
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800">
              <div className="flex items-center mb-6"><Building className="w-5 h-5 text-primary mr-2" /><h3 className="font-bold text-slate-800 dark:text-white">Abertura por Setor</h3></div>
              <div className="h-72">
                {sectorDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectorDistribution} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" type="category" tick={{fontSize: 10}} interval={0} angle={-15} textAnchor="end" />
                      <YAxis type="number" hide />
                      <Bar dataKey="value" name="Quantidade" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40}>
                        <LabelList dataKey="value" position="insideTop" offset={10} formatter={(value: number) => { const percent = totalSectorOS > 0 ? ((value / totalSectorOS) * 100).toFixed(1) : "0"; return `${percent}%`; }} style={{ fill: '#ffffff', fontSize: '11px', fontWeight: '900' }} />
                        <LabelList dataKey="value" position="top" offset={10} formatter={(value: number) => `${value}`} style={{ fill: '#10b981', fontSize: '12px', fontWeight: 'bold' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">Sem dados para exibir</div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800 lg:col-span-2">
              <div className="flex items-center mb-6"><Users className="w-5 h-5 text-amber-500 mr-2" /><h3 className="font-bold text-slate-800 dark:text-white">OS por Requisitante</h3></div>
              <div className="h-72">
                {requesterDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={requesterDistribution} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" type="category" tick={{fontSize: 10}} interval={0} angle={-15} textAnchor="end" />
                      <YAxis type="number" hide />
                      <Bar 
                        dataKey="value" 
                        name="Quantidade" 
                        fill="#f59e0b" 
                        radius={[4, 4, 0, 0]} 
                        barSize={40}
                        className="cursor-pointer"
                        onClick={(data) => { if (data && data.name) setSelectedRequesterForModal(data.name); }}
                      >
                        <LabelList dataKey="value" position="top" offset={10} formatter={(value: number) => `${value}`} style={{ fill: '#f59e0b', fontSize: '12px', fontWeight: 'bold' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">Sem dados para exibir</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8 no-print">
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 flex justify-between items-center px-6 py-4">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="font-bold text-slate-800 dark:text-white">Detalhamento por Profissional</h3>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ordenado por Média de Resposta</span>
            </div>
            <div className="overflow-x-auto bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0">
                  <tr>
                    <th className="px-6 py-4">Profissional</th>
                    <th className="px-6 py-4 text-center">OS</th>
                    <th className="px-6 py-4 text-center">Total Tempo Serviço</th>
                    <th className="px-6 py-4 text-right">MÉDIA RESPOSTA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {professionalStats.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{p.name}</td>
                      <td className="px-6 py-4 text-center font-black text-blue-600">{p.count}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-600 dark:text-slate-400">{formatDetailedTimeWithSpace(p.hours)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center px-3 py-1 border rounded-full text-[11px] font-black ${getBadgeColor(p.avgResp)}`}>
                          {formatDetailedTimeWithSpace(p.avgResp)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      {false && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 no-print">
          {/* LATERAL: LISTA DE RELATÓRIOS SALVOS */}
          <div className="xl:col-span-1 bg-white dark:bg-dark-card rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-md flex flex-col h-[700px]">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <h4 className="font-bold text-sm uppercase tracking-tight text-slate-700 dark:text-slate-300 flex items-center">
                <FileText className="w-4 h-4 text-blue-500 mr-2" />
                Relatórios Salvos ({savedReports.length})
              </h4>
              <button
                onClick={handleCreateNewReport}
                className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all active:scale-95"
                title="Novo Relatório"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {savedReports.length > 0 ? (
                savedReports.map((rep) => (
                  <div
                    key={rep.id}
                    onClick={() => handleLoadReport(rep)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all hover:border-blue-300 dark:hover:border-blue-800 flex justify-between items-start gap-2 ${
                      selectedReportId === rep.id
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                        : 'border-gray-100 dark:border-gray-800 bg-slate-50/30 dark:bg-slate-900/10'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-blue-600 bg-blue-100/60 dark:bg-blue-950/40 px-2 py-0.5 rounded uppercase">
                          {rep.tag || 'S/T'}
                        </span>
                        <span className="text-[9px] font-medium text-slate-400">
                          {rep.dataCriacao}
                        </span>
                      </div>
                      <h5 className="font-bold text-xs text-slate-800 dark:text-white truncate">
                        {rep.equipamento}
                      </h5>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {rep.problema}
                      </p>
                      <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                        Ref: {rep.mesOcorrencia}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteReport(rep.id);
                      }}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all self-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <FileText className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400 italic">Nenhum relatório salvo no momento. Crie um novo abaixo!</p>
                </div>
              )}
            </div>
            
            <button
              onClick={handleCreateNewReport}
              className="mt-4 w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 mr-2" /> Novo Diagnóstico
            </button>
          </div>

          {/* COMPONENTE PRINCIPAL: EDITOR DO RELATÓRIO */}
          <div className="xl:col-span-3 bg-white dark:bg-dark-card rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-gray-100 dark:border-gray-800 pb-4 gap-4">
              <div>
                <h3 className="font-black text-base text-slate-800 dark:text-white uppercase tracking-tight flex items-center">
                  <Sparkles className="w-5 h-5 text-amber-500 mr-2 animate-pulse" />
                  {selectedReportId ? 'Editar Análise de Causa Raiz' : 'Novo Diagnóstico 5 Porquês'}
                </h3>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Identifique causas e elabore planos de ação robustos</p>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={handleSaveReport}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center shadow-md active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4 mr-2" /> Salvar
                </button>
                {formEquipamento && (
                  <button
                    onClick={() => setShowFiveWhysPrintPreview(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center shadow-md active:scale-95 transition-all"
                  >
                    <Printer className="w-4 h-4 mr-2" /> Imprimir A4
                  </button>
                )}
              </div>
            </div>

            {/* SELEÇÃO DO ATIVO TOP 5 */}
            <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2.5">Escolher Ativos com Maior Impacto ({selectedMonth === 'Todos' ? 'Mês Selecionado' : selectedMonth})</h4>
              <div className="flex flex-wrap gap-2">
                {top5Equipment.map((eq, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setFormEquipamento(eq.name);
                      const topReason = eq.reasons && eq.reasons.length > 0 ? eq.reasons[0].name : '';
                      handleGenerateAIDraft(eq.name, topReason ? `Parada crítica: ${topReason}` : '');
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 active:scale-95 ${
                      formEquipamento === eq.name
                        ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: VIBRANT_COLORS[i % VIBRANT_COLORS.length] }}></span>
                    <span className="uppercase">{eq.name}</span>
                    <span className="text-[10px] opacity-75 font-mono ml-1">
                      ({eq.type === 'downtime' ? `${formatDetailedTime(eq.metric)} parado` : `${eq.metric} OS`})
                    </span>
                  </button>
                ))}
                <button
                  onClick={() => {
                    handleCreateNewReport();
                    setFormEquipamento('Outro');
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    formEquipamento === 'Outro' || (!top5Equipment.some(e => e.name === formEquipamento) && formEquipamento !== '')
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  MÁQUINA CUSTOMIZADA...
                </button>
              </div>
              
              {/* SUGESTÃO DE PROBLEMAS BASEADA EM REGISTROS REAIS */}
              {formEquipamento && formEquipamento !== 'Outro' && (
                <div className="mt-4 border-t border-dashed border-gray-200 dark:border-gray-800 pt-3">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Selecione uma falha real registrada na planilha para analisar:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                    {top5Equipment.find(e => e.name === formEquipamento)?.reasons.map((r, rIdx) => (
                      <button
                        key={rIdx}
                        onClick={() => {
                          setFormProblema(`Falha de parada por: ${r.name}`);
                          handleGenerateAIDraft(formEquipamento, `Parada por: ${r.name}`);
                        }}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-gray-700 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-tight text-left truncate max-w-[280px]"
                        title={r.name}
                      >
                        {r.name} ({r.count}x)
                      </button>
                    ))}
                    {(!top5Equipment.find(e => e.name === formEquipamento)?.reasons || top5Equipment.find(e => e.name === formEquipamento)?.reasons.length === 0) && (
                      <span className="text-[10px] text-slate-400 italic">Nenhum motivo de parada detalhado encontrado para este ativo no mês corrente.</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO 1: CABEÇALHO DO DIAGNÓSTICO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Equipamento / Máquina (MÁQ)</label>
                <input
                  type="text"
                  value={formEquipamento}
                  onChange={(e) => setFormEquipamento(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white uppercase outline-none focus:border-blue-500 transition-all"
                  placeholder="Ex: Prensa 01"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">TAG / Identificação Ativo</label>
                <input
                  type="text"
                  value={formTag}
                  onChange={(e) => setFormTag(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white uppercase outline-none focus:border-blue-500 transition-all"
                  placeholder="Ex: PR-01"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Mês de Ocorrência</label>
                <input
                  type="text"
                  value={formMesOcorrencia}
                  onChange={(e) => setFormMesOcorrencia(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-blue-500 transition-all"
                  placeholder="Ex: Julho"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Problema Identificado</label>
              <textarea
                value={formProblema}
                onChange={(e) => setFormProblema(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-blue-500 transition-all h-16"
                placeholder="Insira a descrição detalhada do problema observado..."
              />
            </div>

            {/* SEÇÃO 2: OS 5 PORQUÊS */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400">Análise de Desdobramento (Metodologia dos 5 Porquês)</h4>
                {formEquipamento && (
                  <button
                    onClick={() => handleGenerateAIDraft(formEquipamento, formProblema)}
                    className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-amber-500/20 active:scale-95 transition-all flex items-center"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> Rascunho IA
                  </button>
                )}
              </div>

              <div className="space-y-3.5">
                {[
                  { label: '1º Porquê', value: formPq1, setter: setFormPq1, desc: 'Por que ocorreu o problema identificado?' },
                  { label: '2º Porquê', value: formPq2, setter: setFormPq2, desc: 'Por que ocorreu a causa do primeiro porquê?' },
                  { label: '3º Porquê', value: formPq3, setter: setFormPq3, desc: 'Por que ocorreu a causa do segundo porquê?' },
                  { label: '4º Porquê', value: formPq4, setter: setFormPq4, desc: 'Por que ocorreu a causa do terceiro porquê?' },
                  { label: '5º Porquê', value: formPq5, setter: setFormPq5, desc: 'Por que ocorreu a causa do quarto porquê? (Bloqueio definitivo)' },
                ].map((pq, idx) => (
                  <div key={idx} className="flex gap-4 items-start bg-slate-50/20 dark:bg-slate-900/10 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="w-20 shrink-0 text-slate-700 dark:text-slate-300 font-extrabold text-xs text-right mt-2 uppercase">{pq.label}</span>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={pq.value}
                        onChange={(e) => pq.setter(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-blue-500 transition-all"
                        placeholder={pq.desc}
                      />
                    </div>
                  </div>
                ))}

                <div className="flex gap-4 items-start bg-amber-500/5 dark:bg-amber-950/10 p-3.5 rounded-xl border border-amber-500/20">
                  <span className="w-20 shrink-0 text-amber-600 dark:text-amber-400 font-black text-xs text-right mt-2.5 uppercase">Causa Raiz</span>
                  <div className="flex-1">
                    <textarea
                      value={formCausaRaiz}
                      onChange={(e) => setFormCausaRaiz(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-amber-500/30 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-amber-500 transition-all h-16"
                      placeholder="Conclusão sobre a causa raiz fundamental após a árvore de porquês"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: PLANO DE AÇÃO */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400">Plano de Ação Corretiva</h4>
                <button
                  onClick={handleAddActionRow}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Ação
                </button>
              </div>

              <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 w-1/2">Ação Recomendada</th>
                      <th className="px-4 py-3">Responsável</th>
                      <th className="px-4 py-3">Prazo</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Remover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {formAcoes.map((ac) => (
                      <tr key={ac.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="p-2">
                          <input
                            type="text"
                            value={ac.acao}
                            onChange={(e) => handleUpdateActionRow(ac.id, 'acao', e.target.value)}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-white"
                            placeholder="Descreva a ação corretiva..."
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={ac.responsavel}
                            onChange={(e) => handleUpdateActionRow(ac.id, 'responsavel', e.target.value)}
                            className="w-28 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-white"
                            placeholder="Nome"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="date"
                            value={ac.prazo}
                            onChange={(e) => handleUpdateActionRow(ac.id, 'prazo', e.target.value)}
                            className="w-32 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-white"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={ac.status}
                            onChange={(e) => handleUpdateActionRow(ac.id, 'status', e.target.value)}
                            className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
                          >
                            <option value="Pendente">Pendente</option>
                            <option value="Em Andamento">Em Andamento</option>
                            <option value="Concluído">Concluído</option>
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleRemoveActionRow(ac.id)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {formAcoes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                          Nenhuma ação corretiva definida. Clique em "Adicionar Ação" para planejar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SEÇÃO 4: RESPONSÁVEL E ASSINATURA */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Responsável pela Emissão (Assinatura)</label>
                  <input
                    type="text"
                    value={formResponsavelAssinatura}
                    onChange={(e) => setFormResponsavelAssinatura(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 transition-all"
                    placeholder="Ex: Cláudio"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 italic">Conforme solicitado, o responsável preenche o campo de assinatura no rodapé do documento para validação formal.</p>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleCreateNewReport}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95"
                  >
                    Novo Relatório
                  </button>
                  <button
                    onClick={handleSaveReport}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center shadow-lg active:scale-95 transition-all"
                  >
                    <Save className="w-4 h-4 mr-2" /> Salvar Diagnóstico
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-white dark:bg-dark-card overflow-auto flex flex-col print-mode-wrapper animate-in fade-in duration-300 print:static print:block print:h-auto print:overflow-visible print:bg-white">
            {/* Header Print Preview */}
            <div className="sticky top-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-md z-50 no-print preview-header">
                <div className="flex items-center gap-6">
                    <div className="flex items-center">
                        <Printer className="mr-2 w-5 h-5" />
                        <span className="font-bold text-sm uppercase tracking-widest">Painel de Ordens de Serviço - Relatório</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-700 hover:bg-slate-650 transition-colors px-3 py-1.5 rounded-lg border border-slate-650">
                        <input 
                            type="checkbox" 
                            checked={resumido}
                            onChange={(e) => setResumido(e.target.checked)}
                            className="rounded border-slate-500 text-blue-600 focus:ring-blue-500 h-4 w-4 bg-slate-800 cursor-pointer"
                        />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">Relatório Resumido</span>
                    </label>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowPrintPreview(false)} className="px-6 py-2 bg-slate-600 hover:bg-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center transition-all active:scale-95"><X className="w-4 h-4 mr-2" /> Voltar</button>
                    <button onClick={handleConfirmPrint} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase flex items-center shadow-lg active:scale-95 transition-all"><Check className="w-4 h-4 mr-2" /> Confirmar Impressão</button>
                </div>
            </div>

            <div className="flex-1 p-4 md:p-12 print:p-0 print:block print:h-auto print:static">
                <div className="printable-area bg-white text-black p-10 max-w-[210mm] mx-auto border border-gray-100 h-auto overflow-visible block print:border-none print:p-0 print:static print:max-w-none print:block">
                    <div className="w-full print:static">
                        <header className="mb-8 text-center border-b-[3px] border-black pb-4 no-break-inside" style={{ pageBreakInside: 'avoid' }}>
                            <h1 className="text-4xl font-black mb-1 text-black">ALUMASA</h1>
                            <p className="text-lg font-bold mb-4 uppercase text-black">Alumínio & Plástico</p>
                            <div className="bg-black text-white py-2 mb-2">
                                <h2 className="text-xl font-black uppercase tracking-wider">RELATÓRIO DE GESTÃO DE ORDENS DE SERVIÇO</h2>
                            </div>
                            <p className="text-[10px] font-bold uppercase text-black">Monitoramento Técnico Industrial • Filtros: {selectedYear} / {selectedMonth} • Setor: {selectedSector}</p>
                        </header>

                        <section className="mb-8" style={{ pageBreakInside: 'avoid' }}>
                            <h3 className="text-[10px] font-black uppercase mb-1 bg-gray-100 text-black p-2 border border-black">1. INDICADORES EXECUTIVOS (KPIS)</h3>
                            <table className="w-full text-[11px] border-collapse border border-black text-black">
                                <tbody>
                                    <tr className="border-b border-black">
                                        <td className="p-2 border-r border-black font-black w-1/4 bg-gray-50 uppercase text-[10px] text-black">Total O.S.</td>
                                        <td className="p-2 font-black text-black">{stats.total} chamados</td>
                                        <td className="p-2 border-l border-black font-black w-1/4 bg-gray-50 uppercase text-[10px] text-black">Méd. Resposta</td>
                                        <td className="p-2 font-black text-black">{formatDetailedTimeWithSpace(stats.avgResponseTime)}</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                        <td className="p-2 border-r border-black font-black bg-gray-50 uppercase text-[10px] text-black">Horas Totais Trab.</td>
                                        <td className="p-2 font-black text-black">{formatDetailedTimeWithSpace(stats.totalHours)}</td>
                                        <td className="p-2 border-l border-black font-black bg-gray-50 uppercase text-[10px] text-black">Méd. Execução</td>
                                        <td className="p-2 font-black text-black">{formatDetailedTimeWithSpace(stats.avgExecutionTime)}</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                        <td className="p-2 border-r border-black font-black bg-gray-50 uppercase text-[10px] text-black">Tempo Total Parado</td>
                                        <td className="p-2 font-black text-black" colSpan={3}>{formatDetailedTimeWithSpace(totalDowntime)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section className="mb-8" style={{ pageBreakInside: 'avoid' }}>
                            <h3 className="text-[10px] font-black uppercase mb-1 bg-gray-100 text-black p-2 border border-black">2. TEMPO TOTAL PARADO POR EQUIPAMENTO (TOP 5) E PRINCIPAIS MOTIVOS</h3>
                            <table className="w-full text-[11px] border-collapse border border-black text-black">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="border border-black p-2 text-left font-black uppercase text-black">EQUIPAMENTO / MOTIVOS DE PARADA (TOP 5)</th>
                                        <th className="border border-black p-2 text-right font-black uppercase text-black w-1/4">TEMPO PARADO</th>
                                        <th className="border border-black p-2 text-center font-black uppercase text-black w-1/4">REPRESENTATIVIDADE (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {downtimeByEquipment.slice(0, 5).map((item, i) => (
                                        <React.Fragment key={i}>
                                            <tr className="border-b border-black bg-gray-50/70" style={{ pageBreakInside: 'avoid' }}>
                                                <td className="border-r border-black p-2 font-black uppercase text-black">{item.name}</td>
                                                <td className="border-r border-black p-2 text-right font-black text-black">{formatDetailedTime(item.value)}</td>
                                                <td className="p-2 text-center font-black text-black">{((item.value / (stats.totalHours || 1)) * 100).toFixed(1)}%</td>
                                            </tr>
                                            {item.reasons && item.reasons.length > 0 && (
                                                <tr className="border-b border-black" style={{ pageBreakInside: 'avoid' }}>
                                                    <td colSpan={3} className="p-2.5 bg-white pl-6">
                                                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Principais Motivos de Parada do Equipamento:</div>
                                                        <div className="space-y-2.5">
                                                            {item.reasons.slice(0, 5).map((r, rIdx) => (
                                                                <div key={rIdx} className="pl-2.5 border-l-2 border-slate-300 text-left">
                                                                    <div className="flex justify-between items-center text-[10px] text-slate-800 font-bold mb-0.5">
                                                                        <span className="uppercase text-[9.5px] font-extrabold">{r.name}</span>
                                                                        <span className="text-[10px] font-extrabold text-black shrink-0 ml-4">
                                                                            {r.count}x ({formatDetailedTime(r.hours)})
                                                                        </span>
                                                                    </div>
                                                                    {r.activities && r.activities.length > 0 && (
                                                                        <ul className="list-disc list-outside pl-4 text-[9px] text-slate-600 font-normal italic space-y-0.5 leading-relaxed">
                                                                            {r.activities.map((act, actIdx) => (
                                                                                <li key={actIdx}>{act}</li>
                                                                            ))}
                                                                        </ul>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <section className="mb-8" style={{ pageBreakInside: 'avoid' }}>
                            <h3 className="text-[10px] font-black uppercase mb-1 bg-gray-100 text-black p-2 border border-black">3. PERFORMANCE DO TIME TÉCNICO</h3>
                            <table className="w-full text-[11px] border-collapse border border-black text-black">
                                <thead>
                                    <tr className="bg-gray-200">
                                        <th className="border border-black p-2 text-left font-black text-black uppercase text-[10px]">Técnico Responsável</th>
                                        <th className="border border-black p-2 text-center font-black text-black uppercase text-[10px]">Qtd. OS</th>
                                        <th className="border border-black p-2 text-center font-black text-black uppercase text-[10px]">Horas Totais</th>
                                        <th className="border border-black p-2 text-center font-black text-black uppercase text-[10px]">Média Resposta</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {professionalStats.map((p, i) => (
                                    <tr key={i} className="border-b border-black text-black">
                                        <td className="border-r border-black p-2 font-black text-black uppercase">{p.name}</td>
                                        <td className="border-r border-black p-2 text-center font-black text-black">{p.count}</td>
                                        <td className="border-r border-black p-2 text-center font-black text-black">{formatDetailedTimeWithSpace(p.hours)}</td>
                                        <td className="p-2 text-center font-black text-black">{formatDetailedTimeWithSpace(p.avgResp)}</td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <section className="mb-8 font-sans" style={{ pageBreakInside: 'avoid' }}>
                            <h3 className="text-[10px] font-black uppercase mb-1 bg-gray-100 text-black p-2 border border-black">4. MÉTRICAS DE ABERTURA POR EQUIPAMENTO E PEÇAS</h3>
                            <table className="w-full text-[11px] border-collapse border border-black text-black">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="border border-black p-2 text-left font-black uppercase text-black w-1/3 text-[10px]">EQUIPAMENTO (TOTAL OS)</th>
                                        <th className="border border-black p-2 text-left font-black uppercase text-black w-1/3 text-[10px]">PEÇA CITADA (QTD.)</th>
                                        <th className="border border-black p-2 text-left font-black uppercase text-black w-1/3 text-[10px]">MOTIVO DA TROCA / ABERTURA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {equipmentReportStats.map((eq, i) => {
                                        const partsArray = Object.entries(eq.parts);
                                        if (partsArray.length === 0) {
                                            return (
                                                <tr key={i} className="border-b border-black text-black" style={{ pageBreakInside: 'avoid' }}>
                                                    <td className="border-r border-black p-2 font-bold uppercase text-black">{eq.name} ({eq.count} OS)</td>
                                                    <td className="border-r border-black p-2 text-slate-500 italic">Sem peças citadas</td>
                                                    <td className="p-2 text-slate-500 italic">Sem motivos registrados</td>
                                                </tr>
                                            );
                                        }
                                        return partsArray.map(([partName, partData], partIdx) => (
                                            <tr key={`${i}-${partIdx}`} className="border-b border-black text-[10.5px] text-black" style={{ pageBreakInside: 'avoid' }}>
                                                {partIdx === 0 && (
                                                    <td className="border-r border-black p-2 font-bold uppercase text-black align-top" rowSpan={partsArray.length}>
                                                        <div className="font-extrabold">{eq.name}</div>
                                                        <div className="text-[9px] text-gray-500 mt-0.5">{eq.count} {eq.count === 1 ? 'abertura' : 'aberturas'}</div>
                                                    </td>
                                                )}
                                                <td className="border-r border-black p-2 font-semibold text-black align-top">
                                                    {partName !== 'Nenhuma peça citada' ? `${partName} (${partData.count}x)` : <span className="text-slate-500 italic">Geral / Sem peça citada</span>}
                                                </td>
                                                <td className="p-2 text-black align-top">
                                                    <ul className="list-disc list-inside">
                                                        {Object.entries(partData.reasons).map(([reason, cnt]) => (
                                                            <li key={reason} className="text-black">
                                                                {reason} <span className="font-black">({cnt}x)</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </td>
                                            </tr>
                                        ));
                                    })}
                                </tbody>
                            </table>
                        </section>

                        <section className="mb-8 font-sans" style={{ pageBreakInside: 'avoid' }}>
                            <h3 className="text-[10px] font-black uppercase mb-1 bg-gray-100 text-black p-2 border border-black">5. DISTRIBUIÇÃO DE ABERTURA POR SETOR</h3>
                            <table className="w-full text-[11px] border-collapse border border-black text-black">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="border border-black p-2 text-left font-black uppercase text-black text-[10px]">SETOR</th>
                                        <th className="border border-black p-2 text-center font-black uppercase text-black w-24 text-[10px]">QTD. OS</th>
                                        <th className="border border-black p-2 text-center font-black uppercase text-black w-36 text-[10px]">REPRESENTATIVIDADE (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sectorDistribution.map((item, i) => (
                                        <tr key={i} className="border-b border-black text-black" style={{ pageBreakInside: 'avoid' }}>
                                            <td className="border-r border-black p-2 font-bold uppercase text-black">{item.name}</td>
                                            <td className="border-r border-black p-2 text-center font-black text-black">{item.value}</td>
                                            <td className="p-2 text-center font-black text-black">
                                                {((item.value / (totalSectorOS || 1)) * 100).toFixed(1)}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        {!resumido && (
                            <section className="mb-8 font-sans" style={{ pageBreakInside: 'avoid' }}>
                                <h3 className="text-[10px] font-black uppercase mb-1 bg-gray-100 text-black p-2 border border-black">6. DISTRIBUIÇÃO DE ABERTURA POR REQUISITANTE</h3>
                                <table className="w-full text-[11px] border-collapse border border-black text-black">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="border border-black p-2 text-left font-black uppercase text-black text-[10px]">REQUISITANTE</th>
                                            <th className="border border-black p-2 text-center font-black uppercase text-black w-24 text-[10px]">QTD. OS</th>
                                            <th className="border border-black p-2 text-center font-black uppercase text-black w-36 text-[10px]">REPRESENTATIVIDADE (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requesterDistribution.map((item, i) => (
                                            <tr key={i} className="border-b border-black text-black" style={{ pageBreakInside: 'avoid' }}>
                                                <td className="border-r border-black p-2 font-bold uppercase text-black">{item.name}</td>
                                                <td className="border-r border-black p-2 text-center font-black text-black">{item.value}</td>
                                                <td className="p-2 text-center font-black text-black">
                                                    {((item.value / (totalRequesterOS || 1)) * 100).toFixed(1)}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                        )}

                        {!resumido && (
                            <div className="mb-12 overflow-visible">
                                <h3 className="text-[10px] font-black uppercase mb-1 bg-black text-white p-2 border border-black">7. LOG ANALÍTICO DE ORDENS DE SERVIÇO</h3>
                                <table className="w-full text-[8.5px] border-collapse border border-black text-black">
                                    <thead style={{ display: 'table-header-group' }}>
                                        <tr className="bg-gray-200">
                                            <th className="border border-black p-2 text-left font-black text-black uppercase text-[10px]">DATA / NÚMERO</th>
                                            <th className="border border-black p-2 text-left font-black text-black uppercase text-[10px]">EQUIPAMENTO</th>
                                            <th className="border border-black p-2 text-left font-black text-black uppercase text-[10px]">ATIVIDADE / PEÇA</th>
                                            <th className="border border-black p-2 text-center font-black text-black uppercase text-[10px]">TEMPO</th>
                                            <th className="border border-black p-2 text-left font-black text-black uppercase text-[10px]">TÉCNICO</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.map((os, i) => (
                                            <tr key={i} className="border-b border-black text-black" style={{ pageBreakInside: 'avoid' }}>
                                                <td className="border-r border-black p-1.5">
                                                    <div className="font-bold text-black">{os.dataAbertura.toLocaleDateString('pt-BR')}</div>
                                                    <div className="font-black text-blue-700">{os.numero}</div>
                                                </td>
                                                <td className="border-r border-black p-1.5 uppercase font-bold text-black">{os.equipamento}</td>
                                                <td className="border-r border-black p-1.5 italic text-black">
                                                    <div className="line-clamp-2">{os.descricao}</div>
                                                    {os.peca && <div className="font-black text-[7px] text-gray-500 uppercase mt-0.5">PEÇA: {os.peca}</div>}
                                                </td>
                                                <td className="border-r border-black p-1.5 text-center font-black text-black">{formatDetailedTime(os.horas)}</td>
                                                <td className="p-1.5 uppercase font-bold text-black">{os.professional}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <footer className="mt-20 pt-10 flex justify-between gap-24 no-break-inside text-black" style={{ pageBreakInside: 'avoid' }}>
                            <div className="text-center flex-1"><div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Responsável Manutenção / PCM</div></div>
                            <div className="text-center flex-1"><div className="w-full border-t-2 border-black pt-1 text-[9px] font-black uppercase text-black">Gerência Industrial</div></div>
                        </footer>
                        <div className="mt-8 pt-4 border-t border-black flex justify-between text-[7px] font-black uppercase text-black no-break-inside" style={{ pageBreakInside: 'avoid' }}>
                            <div>Relatório Gerencial Alumasa Industrial - Emitido em: {new Date().toLocaleString('pt-BR')}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {selectedEquipmentForModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-[#1e293b] w-full max-w-4xl rounded-[2rem] shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-700 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl"><BarChart3 className="w-6 h-6 text-blue-400" /></div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight uppercase">Peças Citadas em OS</h2>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{selectedEquipmentForModal}</p>
                  <p className="text-xs font-black text-emerald-500 uppercase tracking-widest mt-1">Ocorrências: {totalPieceOccurrences}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    const eqItem = allAvailableEquipments.find(item => item.name === selectedEquipmentForModal) || {
                      name: selectedEquipmentForModal,
                      metricStr: '0 OS',
                      topReason: undefined
                    };
                    handlePrintSinglePDCA(eqItem.name, eqItem.metricStr, eqItem.topReason);
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 border border-blue-400/30"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" /> Gerar PDCA Deste Equipamento
                </button>
                <button onClick={() => setSelectedEquipmentForModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
            </div>
            <div className="p-8 flex-1 overflow-y-auto">
              <div 
                style={{ 
                  height: equipmentPartsData.length > 10 
                    ? `${equipmentPartsData.length * 40}px` 
                    : '384px' 
                }}
              >
                {equipmentPartsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={equipmentPartsData} layout="vertical" margin={{ right: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={180} tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 'bold'}} />
                      <Bar dataKey="value" name="Quantidade" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={25} className="cursor-pointer" onClick={(data) => { if (data && data.name) setSelectedPartForReasons(data.name); }}>
                        <LabelList dataKey="value" position="insideRight" offset={10} formatter={(value: number) => { const percent = stats.total > 0 ? ((value / stats.total) * 100).toFixed(1) : "0"; return `${percent}%`; }} style={{ fill: '#ffffff', fontSize: '11px', fontWeight: '900' }} />
                        <LabelList dataKey="value" position="right" offset={10} formatter={(value: number) => `${value}`} style={{ fill: '#3b82f6', fontSize: '12px', fontWeight: 'bold' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 gap-4 py-12"><AlertCircle className="w-12 h-12 opacity-20" /><p className="font-bold uppercase tracking-widest text-xs">Nenhuma peça registrada para este equipamento</p></div>
                )}
              </div>
            </div>
            <div className="p-6 bg-slate-900/50 border-t border-slate-700 flex justify-end"><button onClick={() => setSelectedEquipmentForModal(null)} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg border border-slate-700">Fechar</button></div>
          </div>
        </div>
      )}

      {selectedRequesterForModal && requesterModalData && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-[#1e293b] w-full max-w-4xl rounded-[2rem] shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-700 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-2xl"><Users className="w-6 h-6 text-amber-400" /></div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight uppercase">Análise de Requisitante</h2>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{requesterModalData.name}</p>
                </div>
              </div>
              <button onClick={() => setSelectedRequesterForModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-8 flex-1 overflow-y-auto space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total de OS Abertas</p>
                  <p className="text-3xl font-black text-white">{requesterModalData.total}</p>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Abertas após Início da Manutenção</p>
                  <p className="text-3xl font-black text-rose-400">{requesterModalData.afterStartCount}</p>
                </div>
              </div>

              {requesterModalData.detailedOs.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Detalhamento de Atrasos na Abertura
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-slate-700">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <tr>
                          <th className="px-4 py-3">OS</th>
                          <th className="px-4 py-3">Equipamento</th>
                          <th className="px-4 py-3">Início Manut.</th>
                          <th className="px-4 py-3">Data Abertura</th>
                          <th className="px-4 py-3 text-right">Atraso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700 bg-slate-800/20">
                        {requesterModalData.detailedOs.map((os, idx) => (
                          <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3 font-bold text-blue-400">{os.numero}</td>
                            <td className="px-4 py-3 text-slate-300 uppercase">{os.equipamento}</td>
                            <td className="px-4 py-3 text-slate-400">{os.dataInicio?.toLocaleString('pt-BR')}</td>
                            <td className="px-4 py-3 text-slate-400">{os.dataAbertura.toLocaleString('pt-BR')}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded font-black">
                                {formatDetailedTime(os.delayHours)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Check className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-20" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhuma OS aberta com atraso identificada</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-900/50 border-t border-slate-700 flex justify-end">
              <button onClick={() => setSelectedRequesterForModal(null)} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg border border-slate-700">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPartForReasons && (
        <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200 no-print">
          <div className="bg-[#1e293b] w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-700 overflow-hidden flex flex-col">
            <div className="p-10 border-b border-slate-700 flex justify-between items-start">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-blue-500/10 rounded-2xl">
                  <MessageCircle className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight uppercase">Motivos de Troca</h2>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{selectedPartForReasons}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPartForReasons(null)} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-10 flex-1 overflow-y-auto max-h-[60vh] space-y-4">
              {partReasons.length > 0 ? (
                partReasons.map((item, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setSelectedReasonForActivities(item.reason)}
                    className="w-full text-left flex items-center justify-between group p-4 rounded-2xl hover:bg-slate-800/60 cursor-pointer transition-all border border-transparent hover:border-slate-700/50 outline-none focus:border-slate-600 focus:bg-slate-800/80"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-1.5 h-12 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:scale-y-110 transition-transform" />
                      <div>
                        <p className="text-base font-black text-white italic leading-tight group-hover:text-blue-400 transition-colors">{item.reason}</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                          <span>Última Ocorrência: {item.lastDate}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-blue-500 group-hover:text-blue-400 font-extrabold flex items-center gap-0.5">
                            Ver atividades <ChevronDown className="w-3 h-3 -rotate-90" />
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg group-hover:bg-blue-500/20 transition-all shrink-0 ml-4">
                      <span className="text-xs font-black text-blue-400">{item.count}x</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-20" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Nenhum motivo detalhado encontrado</p>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-900/50 border-t border-slate-700">
              <button 
                onClick={() => setSelectedPartForReasons(null)} 
                className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-[0.98] shadow-xl border border-slate-700"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedReasonForActivities && (
        <div className="fixed inset-0 z-[250] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200 no-print">
          <div className="bg-[#1e293b] w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-10 border-b border-slate-700 flex justify-between items-start">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-emerald-500/10 rounded-2xl">
                  <ClipboardList className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight uppercase">Atividades Realizadas</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Motivo: {selectedReasonForActivities}</p>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-0.5">
                    {selectedEquipmentForModal} • {selectedPartForReasons}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedReasonForActivities(null)} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-10 flex-1 overflow-y-auto space-y-6">
              {activitiesForSelectedReason.length > 0 ? (
                <div className="space-y-4">
                  {activitiesForSelectedReason.map((os, idx) => (
                    <div key={idx} className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 hover:bg-slate-800/60 transition-all">
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-3">
                        <div>
                          <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md text-[10px] font-black uppercase tracking-wider">
                            OS: {os.numero}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-400 text-xs">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {os.dataAbertura.toLocaleDateString('pt-BR')}
                          </span>
                          {os.horas > 0 && (
                            <span className="flex items-center gap-1 font-semibold text-slate-300 bg-slate-700/40 px-2 py-0.5 rounded">
                              <Timer className="w-3.5 h-3.5 text-amber-500" />
                              {formatDetailedTime(os.horas)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-white font-medium text-sm leading-relaxed mb-4 bg-slate-900/30 p-3.5 rounded-xl border border-slate-700/40 italic">
                        "{os.descricao || 'Nenhuma descrição de atividade registrada.'}"
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-slate-700/40 pt-3">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span className="font-bold text-slate-300 uppercase">Técnico:</span>
                        <span className="uppercase font-semibold">{os.professional || 'N/D'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-20" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Nenhuma atividade detalhada encontrada</p>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-900/50 border-t border-slate-700">
              <button 
                onClick={() => setSelectedReasonForActivities(null)} 
                className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-[0.98] shadow-xl border border-slate-700"
              >
                Voltar aos Motivos
              </button>
            </div>
          </div>
        </div>
      )}


      {showFiveWhysPrintPreview && (
        <div className="fixed inset-0 z-[200] bg-white overflow-auto flex flex-col print-mode-wrapper animate-in fade-in duration-300 print:static print:block print:h-auto print:overflow-visible print:bg-white text-black">
          {/* Header Print Preview */}
          <div className="sticky top-0 bg-slate-800 text-white p-4 flex justify-between items-center shadow-md z-50 no-print">
            <div className="flex items-center gap-4">
              <Printer className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-sm uppercase tracking-widest">Visualização de Impressão - 5 Porquês (A4)</span>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowFiveWhysPrintPreview(false)} 
                className="px-5 py-2 bg-slate-600 hover:bg-slate-700 rounded-xl font-bold text-xs uppercase flex items-center transition-all active:scale-95"
              >
                <X className="w-4 h-4 mr-2" /> Voltar ao Editor
              </button>
              <button 
                onClick={() => window.print()} 
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-xs uppercase flex items-center shadow-lg active:scale-95 transition-all"
              >
                <Check className="w-4 h-4 mr-2" /> Imprimir Documento
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 md:p-12 print:p-0 print:block print:h-auto print:static bg-slate-100 dark:bg-slate-900/40 print:bg-white">
            {isAllPDCAPrint ? (
              allPDCAData.map((doc, docIdx) => (
                <div 
                  key={docIdx} 
                  className="printable-area bg-white text-black p-10 max-w-[210mm] mx-auto border border-gray-300 shadow-xl h-auto overflow-visible block print:border-none print:p-0 print:static print:max-w-none print:block print:shadow-none mb-8 last:mb-0 print:mb-0"
                  style={{ pageBreakAfter: docIdx < allPDCAData.length - 1 ? 'always' : 'auto' }}
                >
                  <div className="w-full print:static">
                    {/* CABEÇALHO DO LAUDO INDUSTRIAL */}
                    <div className="border-[3px] border-black p-4 mb-6">
                      <div className="grid grid-cols-4 gap-4 items-center">
                        <div className="col-span-1 text-center border-r-2 border-black pr-4 h-full flex flex-col justify-center">
                          <h2 className="font-black text-lg tracking-tighter">ALUMASA</h2>
                          <span className="text-[7px] font-bold uppercase tracking-widest text-slate-500">Alumínio & Plástico</span>
                        </div>
                        <div className="col-span-2 text-center h-full flex flex-col justify-center px-2">
                          <h1 className="font-black text-[13px] uppercase tracking-wide">ANÁLISE DE CAUSA RAIZ - 5 PORQUÊS</h1>
                          <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Plano de Ação Corretiva do Sistema de Gestão de PCM</p>
                        </div>
                        <div className="col-span-1 border-l-2 border-black pl-4 text-right h-full flex flex-col justify-center text-[9px] font-bold space-y-0.5">
                          <div>DATA: {new Date().toLocaleDateString('pt-BR')}</div>
                          <div>MÊS REF: {doc.mesOcorrencia}</div>
                          <div>TAG: {doc.tag || 'N/D'}</div>
                        </div>
                      </div>
                    </div>

                    {/* DADOS DO ATIVO */}
                    <div className="border-2 border-black p-4 mb-6 bg-slate-50">
                      <h3 className="text-[10px] font-black uppercase mb-3 border-b border-black pb-1">1. IDENTIFICAÇÃO DO PROBLEMA</h3>
                      <div className="grid grid-cols-3 gap-4 text-[11px] mb-3">
                        <div>
                          <span className="font-black text-slate-500 block text-[9px] uppercase">EQUIPAMENTO (MÁQ)</span>
                          <span className="font-bold text-black uppercase">{doc.equipamento}</span>
                        </div>
                        <div>
                          <span className="font-black text-slate-500 block text-[9px] uppercase">TAG ATIVO</span>
                          <span className="font-bold text-black uppercase">{doc.tag || 'SEM REGISTRO'}</span>
                        </div>
                        <div>
                          <span className="font-black text-slate-500 block text-[9px] uppercase">MÊS DE REFERÊNCIA</span>
                          <span className="font-bold text-black uppercase">{doc.mesOcorrencia}</span>
                        </div>
                      </div>
                      <div className="text-[11px]">
                        <span className="font-black text-slate-500 block text-[9px] uppercase">DESCRIÇÃO DA FALHA / PROBLEMA DETALHADO</span>
                        <p className="font-bold text-black uppercase bg-white border border-gray-300 p-2.5 rounded mt-1">
                          {doc.problema || 'Nenhum detalhe adicional de falha informado.'}
                        </p>
                      </div>
                    </div>

                    {/* DESDOBRAMENTO PORQUÊS */}
                    <div className="border-2 border-black p-4 mb-6">
                      <h3 className="text-[10px] font-black uppercase mb-4 border-b border-black pb-1">2. INVESTIGAÇÃO DE CAUSA RAIZ (5 PORQUÊS)</h3>
                      
                      <div className="space-y-3.5 text-[11px]">
                        {[
                          { num: '1º', pq: doc.pq1 },
                          { num: '2º', pq: doc.pq2 },
                          { num: '3º', pq: doc.pq3 },
                          { num: '4º', pq: doc.pq4 },
                          { num: '5º', pq: doc.pq5 },
                        ].map((p, pIdx) => (
                          <div key={pIdx} className="flex gap-4 border-b border-dashed border-gray-200 pb-2">
                            <span className="w-20 font-black text-slate-500 text-right uppercase shrink-0">{p.num} Porquê:</span>
                            <p className="font-bold text-black uppercase italic">
                              {p.pq ? `"${p.pq.toUpperCase()}"` : '—'}
                            </p>
                          </div>
                        ))}

                        <div className="bg-amber-50 p-3.5 border border-amber-300 rounded mt-4">
                          <span className="font-black text-amber-700 block text-[9px] uppercase mb-1">🔍 CAUSA RAIZ CONFIRMADA</span>
                          <p className="font-black text-black text-xs uppercase leading-relaxed">
                            {doc.causaRaiz ? doc.causaRaiz.toUpperCase() : 'AGUARDANDO CONCLUSÃO DEFINITIVA.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* PLANO DE AÇÃO */}
                    <div className="border-2 border-black p-4 mb-8">
                      <h3 className="text-[10px] font-black uppercase mb-3 border-b border-black pb-1">3. PLANO DE AÇÃO CORRETIVA</h3>
                      <table className="w-full text-[10px] border-collapse border border-black text-black">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-black p-2 text-left font-black uppercase">Ação Corretiva Recomendada</th>
                          </tr>
                        </thead>
                        <tbody>
                          {doc.acoes.map((ac, acIdx) => (
                            <tr key={ac.id} className="border-b border-black">
                              <td className="p-2 font-bold uppercase">{acIdx + 1}. {ac.acao || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* ASSINATURA */}
                    {docIdx === allPDCAData.length - 1 && (
                      <div className="flex justify-end mt-12">
                        <div className="text-center w-64 border-t-2 border-black pt-2">
                          <span className="text-[10px] font-black text-slate-800 uppercase block mb-1">
                            PCM - ALUMASA
                          </span>
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">
                            Responsável pela Análise
                          </span>
                          <span className="text-[7.5px] text-slate-400 italic">Área de PCM - Alumasa</span>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              ))
            ) : (
              <div className="printable-area bg-white text-black p-10 max-w-[210mm] mx-auto border border-gray-300 shadow-xl h-auto overflow-visible block print:border-none print:p-0 print:static print:max-w-none print:block print:shadow-none">
                <div className="w-full print:static">
                  {/* CABEÇALHO DO LAUDO INDUSTRIAL */}
                  <div className="border-[3px] border-black p-4 mb-6">
                    <div className="grid grid-cols-4 gap-4 items-center">
                      <div className="col-span-1 text-center border-r-2 border-black pr-4 h-full flex flex-col justify-center">
                        <h2 className="font-black text-lg tracking-tighter">ALUMASA</h2>
                        <span className="text-[7px] font-bold uppercase tracking-widest text-slate-500">Alumínio & Plástico</span>
                      </div>
                      <div className="col-span-2 text-center h-full flex flex-col justify-center px-2">
                        <h1 className="font-black text-[13px] uppercase tracking-wide">ANÁLISE DE CAUSA RAIZ - 5 PORQUÊS</h1>
                        <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Plano de Ação Corretiva do Sistema de Gestão de PCM</p>
                      </div>
                      <div className="col-span-1 border-l-2 border-black pl-4 text-right h-full flex flex-col justify-center text-[9px] font-bold space-y-0.5">
                        <div>DATA: {new Date().toLocaleDateString('pt-BR')}</div>
                        <div>MÊS REF: {formMesOcorrencia || 'JULHO'}</div>
                        <div>TAG: {formTag || 'N/D'}</div>
                      </div>
                    </div>
                  </div>

                  {/* DADOS DO ATIVO */}
                  <div className="border-2 border-black p-4 mb-6 bg-slate-50">
                    <h3 className="text-[10px] font-black uppercase mb-3 border-b border-black pb-1">1. IDENTIFICAÇÃO DO PROBLEMA</h3>
                    <div className="grid grid-cols-3 gap-4 text-[11px] mb-3">
                      <div>
                        <span className="font-black text-slate-500 block text-[9px] uppercase">EQUIPAMENTO (MÁQ)</span>
                        <span className="font-bold text-black uppercase">{formEquipamento}</span>
                      </div>
                      <div>
                        <span className="font-black text-slate-500 block text-[9px] uppercase">TAG ATIVO</span>
                        <span className="font-bold text-black uppercase">{formTag || 'SEM REGISTRO'}</span>
                      </div>
                      <div>
                        <span className="font-black text-slate-500 block text-[9px] uppercase">MÊS DE REFERÊNCIA</span>
                        <span className="font-bold text-black uppercase">{formMesOcorrencia}</span>
                      </div>
                    </div>
                    <div className="text-[11px]">
                      <span className="font-black text-slate-500 block text-[9px] uppercase">DESCRIÇÃO DA FALHA / PROBLEMA DETALHADO</span>
                      <p className="font-bold text-black uppercase bg-white border border-gray-300 p-2.5 rounded mt-1">
                        {formProblema || 'Nenhum detalhe adicional de falha informado.'}
                      </p>
                    </div>
                  </div>

                  {/* DESDOBRAMENTO PORQUÊS */}
                  <div className="border-2 border-black p-4 mb-6">
                    <h3 className="text-[10px] font-black uppercase mb-4 border-b border-black pb-1">2. INVESTIGAÇÃO DE CAUSA RAIZ (5 PORQUÊS)</h3>
                    
                    <div className="space-y-3.5 text-[11px]">
                      {[
                        { num: '1º', pq: formPq1 },
                        { num: '2º', pq: formPq2 },
                        { num: '3º', pq: formPq3 },
                        { num: '4º', pq: formPq4 },
                        { num: '5º', pq: formPq5 },
                      ].map((p, pIdx) => (
                        <div key={pIdx} className="flex gap-4 border-b border-dashed border-gray-200 pb-2">
                          <span className="w-20 font-black text-slate-500 text-right uppercase shrink-0">{p.num} Porquê:</span>
                          <p className="font-bold text-black uppercase italic">
                            {p.pq ? `"${p.pq.toUpperCase()}"` : '—'}
                          </p>
                        </div>
                      ))}

                      <div className="bg-amber-50 p-3.5 border border-amber-300 rounded mt-4">
                        <span className="font-black text-amber-700 block text-[9px] uppercase mb-1">🔍 CAUSA RAIZ CONFIRMADA</span>
                        <p className="font-black text-black text-xs uppercase leading-relaxed">
                          {formCausaRaiz ? formCausaRaiz.toUpperCase() : 'AGUARDANDO CONCLUSÃO DEFINITIVA.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* PLANO DE AÇÃO */}
                  <div className="border-2 border-black p-4 mb-8">
                    <h3 className="text-[10px] font-black uppercase mb-3 border-b border-black pb-1">3. PLANO DE AÇÃO CORRETIVA</h3>
                    <table className="w-full text-[10px] border-collapse border border-black text-black">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-black p-2 text-left font-black uppercase">Ação Corretiva Recomendada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formAcoes.map((ac, idx) => (
                          <tr key={ac.id} className="border-b border-black">
                            <td className="p-2 font-bold uppercase">{idx + 1}. {ac.acao || '—'}</td>
                          </tr>
                        ))}
                        {formAcoes.length === 0 && (
                          <tr>
                            <td className="p-4 text-center text-slate-400 italic">
                              Nenhum plano de ação definido para esta causa raiz.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* ASSINATURA */}
                  <div className="flex justify-end mt-12">
                    <div className="text-center w-64 border-t-2 border-black pt-2">
                      <span className="text-[10px] font-black text-slate-800 uppercase block mb-1">
                        {formResponsavelAssinatura || 'ASSINATURA RESPONSÁVEL'}
                      </span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">
                        Responsável pela Análise
                      </span>
                      <span className="text-[7.5px] text-slate-400 italic">Área de PCM - Alumasa</span>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {downtimeTrendEquipment && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300 no-print">
          <div className="bg-[#1e293b] w-full max-w-4xl rounded-[2rem] shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-700 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-500/10 rounded-2xl">
                  <TrendingDown className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight uppercase">Tendência de Tempo Parado</h2>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{downtimeTrendEquipment}</p>
                  <p className="text-xs font-black text-rose-500 uppercase tracking-widest mt-1">
                    Filtro: {selectedYear === 'Todos' ? 'Histórico Geral' : `Ano ${selectedYear}`} • Setor: {selectedSector}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setDowntimeTrendEquipment(null)} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 flex-1 overflow-y-auto space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tempo Total Parado</p>
                  <p className="text-3xl font-black text-rose-400">
                    {formatDetailedTimeWithSpace(downtimeTrendStats.total)}
                  </p>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Média por Mês</p>
                  <p className="text-3xl font-black text-blue-400">
                    {formatDetailedTimeWithSpace(downtimeTrendStats.average)}
                  </p>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mês com Maior Pico</p>
                  <p className="text-lg font-black text-amber-400 mt-2 truncate">
                    {downtimeTrendStats.maxMonth ? `${downtimeTrendStats.maxMonth}: ${formatDetailedTime(downtimeTrendStats.maxValue)}` : 'N/D'}
                  </p>
                </div>
              </div>

              {/* Chart container */}
              <div className="bg-slate-800/20 rounded-2xl border border-slate-700 p-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-500" /> Histórico Mensal de Paradas
                </h3>
                <div className="h-[320px]">
                  {downtimeTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={downtimeTrendData} margin={{ top: 30, right: 30, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#94a3b8" 
                          fontSize={11} 
                          fontWeight="700" 
                          tickLine={false} 
                        />
                        <YAxis 
                          stroke="#94a3b8" 
                          fontSize={11} 
                          fontWeight="700" 
                          tickLine={false} 
                          tickFormatter={(val) => `${val}h`} 
                        />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (active && payload && payload.length) {
                              const item = payload[0].payload;
                              return (
                                <div className="bg-[#0f172a] border border-slate-700/80 p-4 rounded-xl shadow-2xl backdrop-blur-md">
                                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">{item.fullName || item.name}</p>
                                  <p className="text-sm font-black text-rose-400 mt-1 flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-rose-500" />
                                    {formatDetailedTime(payload[0].value)}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name="Downtime"
                          stroke="#ef4444"
                          strokeWidth={3}
                          dot={{ r: 4, stroke: "#ef4444", strokeWidth: 2, fill: "#1e293b" }}
                          activeDot={{ r: 7, stroke: "#ef4444", strokeWidth: 1, fill: "#ef4444" }}
                        >
                          <LabelList
                            dataKey="value"
                            position="top"
                            offset={10}
                            formatter={(val: any) => val > 0 ? formatDetailedTime(val) : ''}
                            style={{ fill: '#f87171', fontSize: '11px', fontWeight: '900' }}
                          />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 gap-4 py-12">
                      <AlertCircle className="w-12 h-12 opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-xs">Nenhum tempo parado registrado para este equipamento</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-slate-900/50 border-t border-slate-700 flex justify-end">
              <button 
                onClick={() => setDowntimeTrendEquipment(null)} 
                className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg border border-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrdersPage;