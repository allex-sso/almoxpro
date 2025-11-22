export interface InventoryItem {
  id: string;
  codigo: string;
  descricao: string;
  equipamento: string;
  fornecedor: string; // Preenchido via cruzamento de dados ou planilha
  localizacao: string;
  quantidadeAtual: number;
  quantidadeMinima: number;
  unidade: string; // Nova coluna para Unidade de Medida
  entradas: number;
  saidas: number;
  categoria: string;
  valorUnitario: number;
  valorTotal: number;
  dataAtualizacao: string;
  ultimaMovimentacao?: Date; // Data da última entrada ou saída encontrada
}

export interface Movement {
  id: string;
  data: Date;
  codigo: string;
  quantidade: number;
  tipo: 'entrada' | 'saida';
  fornecedor?: string; // Apenas para entradas
  valorUnitario?: number; // Novo campo para capturar preço da aba de Entradas
  obs?: string;
}

export interface AppSettings {
  inventoryUrl: string; // URL Estoque Atual
  inUrl: string;        // URL Entradas
  outUrl: string;       // URL Saídas
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
  ALERTS = 'alerts',
  SETTINGS = 'settings',
}