
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
}

export interface ServiceOrder {
  id: string;
  numero: string;
  dataAbertura: Date;
  dataInicio?: Date;
  dataFim?: Date;
  profissional: string;
  equipamento: string;
  setor: string;
  status: string;
  horas: number;
  descricao: string;
}

export interface AppSettings {
  inventoryUrl: string;
  inUrl: string;
  outUrl: string;
  osUrl: string; // URL da planilha de OS
  refreshRate: number;
  darkMode: boolean;
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
  SERVICE_ORDERS = 'service_orders', // Nova página
  ALERTS = 'alerts',
  SETTINGS = 'settings',
}
