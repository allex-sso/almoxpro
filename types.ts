
export interface InventoryItem {
  id: string;
  codigo: string;
  descricao: string;
  equipamento: string;
  fornecedor: string;
  localizacao: string;
  quantidadeAtual: number; // Saldo Total
  quantidadeEstoque: number; // Reserva/Pulmão
  quantidadePicking: number; // Picking
  quantidadeMinima: number;
  quantidadeMaxima: number;
  tempoEntrega: number; // Tempo de Entrega em Dias
  unidade: string;
  entradas: number;
  saidas: number;
  categoria: string;
  valorUnitario: number;
  valorTotal: number;
  setor?: string;
  situacao?: string;
  dataAtualizacao: string;
  ultimaMovimentacao?: Date;
}

export interface AddressItem {
  id: string;
  endereco: string;
  rua: string;
  predio: string;
  andar: string;
  sala: string;
  quantidadeInicial: number;
  quantidadeAtual: number;
}

export interface Movement {
  id: string;
  data: Date;
  codigo: string;
  quantidade: number;
  tipo: 'entrada' | 'saida' | 'transferencia';
  fornecedor?: string;
  responsavel?: string;
  liberador?: string; // Pessoa que liberou o material
  equipamento?: string;
  valorUnitario?: number;
  valorTotal?: number;
  obs?: string;
  setor?: string;
  motivo?: string;
  perfil?: string;
  cor?: string;
  turno?: string;
  op?: string; // Ordem de Produção (Almoxarifado Geral)
  localizacaoOrigem?: string;
  localizacaoDestino?: string;
  movimentoTipo?: string; // Ex: Mover p/ Picking
  loteInterno?: string;
  loteFornecedor?: string;
  validade?: string;
  notaFiscal?: string;
  divergencia?: string;
  isDateFallback?: boolean; // Indica se a data é fictícia/fallback
}

export interface ProductionEntry {
  id: string;
  data: Date;
  tipologia: string;
  metaDia: number;
  pecasHoraAlvo: number; 
  mesa: string;
  horasTrabalhadas: number;
  produzido: number;
  percentual: number;
  turno: string;
  semana: string;
  setor?: string;
  valA?: number;
  valB?: number;
  valC?: number;
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

export interface PreventiveEntry {
  id: string;
  dataPrevista: Date | null;
  dataExecucao: Date | null;
  setor: string;
  equipamento: string;
  atividade: string;
  natureza: string;
  status: string;
  descricaoTrabalho: string;
  tempo: number; // em horas decimais
  profissional: string;
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
  moveUrl?: string; // Movimentação Interna
  addressUrl?: string; // Endereços
  osUrl: string;
  preventiveUrl?: string;
  isCentral?: boolean;
  isProduction?: boolean;
  isMaintenance?: boolean;
  isWarehouse?: boolean; // Nova Flag para Almoxarifado Geral
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
  PREVENTIVES = 'preventives',
  ALERTS = 'alerts',
  SETTINGS = 'settings',
  CENTRAL_DASHBOARD = 'central_dashboard',
  CENTRAL_PERFIL = 'central_perfil',
  PRODUCTION_DASHBOARD = 'production_dashboard',
  PRODUCTION_DETAILS = 'production_details',
  PRODUCTION_TYPOLOGY = 'production_typology',
  WAREHOUSE_ADDRESSES = 'warehouse_addresses',
  WAREHOUSE_MOVEMENTS = 'warehouse_movements',
  WAREHOUSE_PERFORMANCE = 'warehouse_performance'
}
