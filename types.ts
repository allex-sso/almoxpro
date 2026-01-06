export interface InventoryItem {
  id: string;
  codigo: string;
  descricao: string;
  equipamento: string;
  fornecedor: string;
  localizacao: string;
  quantidadeAtual: number;
  quantidadeMinima: number;
  unidade: string;
  entradas: number;
  saidas: number;
  categoria: string;
  valorUnitario: number;
  valorTotal: number;
  dataAtualizacao: string;
  ultimaMovimentacao?: Date;
}

export interface Movement {
  id: string;
  data: Date;
  codigo: string;
  quantidade: number;
  tipo: 'entrada' | 'saida';
  fornecedor?: string;
  responsavel?: string;
  valorUnitario?: number;
  valorTotal?: number;
  obs?: string;
  setor?: string;
  motivo?: string;
  perfil?: string;
}

export interface ServiceOrder {
  id: string;
  numero: string;
  dataAbertura: Date;
  dataInicio?: Date;
  dataFim?: Date;
  professional: string;
  equipamento: string;
  setor: string;
  status: string;
  horas: number;
  descricao: string;
  parada?: string;
  peca?: string;
  motivo?: string;
}

export interface CentralSource {
  label: string;
  url: string;
}

export interface SectorProfile {
  id: string;
  name: string;
  accessKey?: string;
  inventoryUrl: string;
  inUrl: string;
  outUrl: string;
  osUrl: string;
  isCentral?: boolean;
  sources?: CentralSource[];
}

export interface AppSettings {
  profiles: SectorProfile[];
  activeProfileId: string | null;
  refreshRate: number;
}

export interface DashboardStats {
  totalItems: number;
  totalValue: number;
  totalIn: number;
  totalOut: number;
}

export enum Page {
  DASHBOARD = 'dashboard',
  INVENTORY = 'inventory',
  CONSUMPTION = 'consumption',
  SERVICE_ORDERS = 'service_orders',
  ALERTS = 'alerts',
  SETTINGS = 'settings',
  CENTRAL_DASHBOARD = 'central_dashboard'
}