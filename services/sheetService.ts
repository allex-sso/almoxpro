
import { InventoryItem, Movement, ServiceOrder, ProductionEntry, PreventiveEntry, AddressItem } from '../types';

const normalizeStr = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

const formatCodigo = (code: any): string => {
  if (code === null || code === undefined) return "";
  let str = String(code).trim();
  if (str === "" || str === "0") return str;
  if (/^\d$/.test(str)) return "0" + str;
  return str;
}

const parseNumber = (value: string | number): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  let str = value.toString().trim().replace(/R\$/gi, '').replace(/\s/g, '').replace(/[^\d,.-]/g, '');
  if (!str || str === '-' || str === '.') return 0;
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  if (hasComma && hasDot) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) str = str.replace(/\./g, '').replace(',', '.');
    else str = str.replace(/,/g, '');
  } else if (hasComma) str = str.replace(',', '.');
  else if (hasDot) {
    const parts = str.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) str = str.replace(/\./g, '');
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

const parseDurationToHours = (value: string | number): number => {
  if (value === null || value === undefined) return 0;
  const str = value.toString().trim();
  if (str.includes(':')) {
    const parts = str.split(':').map(p => {
      const clean = p.replace(/[^0-9]/g, '');
      return parseFloat(clean) || 0;
    });
    if (parts.length >= 2) {
      const h = parts[0];
      const m = parts[1];
      const s = parts.length > 2 ? parts[2] : 0;
      return h + (m / 60) + (s / 3600);
    }
  }
  return parseNumber(value);
};

const detectDelimiter = (text: string): string => {
  const lines = text.split('\n').slice(0, 20).filter(l => l.trim().length > 0);
  let commaCount = 0, semicolonCount = 0;
  lines.forEach(line => {
      commaCount += (line.match(/,/g) || []).length;
      semicolonCount += (line.match(/;/g) || []).length;
  });
  return semicolonCount > commaCount ? ';' : ',';
};

const parseCSVLine = (text: string, delimiter: string): string[] => {
  const result: string[] = [];
  let cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') { cell += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) { result.push(cell.trim()); cell = ''; }
    else cell += char;
  }
  result.push(cell.trim());
  return result;
};

const parseDate = (value: string): Date | null => {
  if (!value || value.trim() === '') return null;
  const trimmedValue = value.trim();
  if (!isNaN(Number(trimmedValue)) && !trimmedValue.includes('/') && !trimmedValue.includes('-')) {
    const serial = Number(trimmedValue);
    if (serial > 30000) return new Date(Math.round((serial - 25569) * 86400 * 1000));
  }
  const dateTimeParts = trimmedValue.split(' ');
  const datePart = dateTimeParts[0];
  const timePart = dateTimeParts.length > 1 ? dateTimeParts[1] : '00:00:00';
  const separator = datePart.includes('/') ? '/' : '-';
  const parts = datePart.split(separator);
  let d, m, y;
  if (parts.length === 3) {
    if (parts[0].length === 4) { y = parseInt(parts[0]); m = parseInt(parts[1]); d = parseInt(parts[2]); }
    else { d = parseInt(parts[0]); m = parseInt(parts[1]); y = parseInt(parts[2]); }
    if (y < 100) y += 2000;
    const [hh, min, ss] = timePart.split(':').map(x => parseInt(x) || 0);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      const date = new Date(y, m - 1, d, hh, min, ss || 0);
      return isNaN(date.getTime()) ? null : date;
    }
  }
  return null;
};

const fetchCSV = async (url: string): Promise<string[][]> => {
  let targetUrl = url ? url.trim() : '';
  if (!targetUrl || targetUrl.length < 5) return [];
  if (!targetUrl.startsWith('http')) targetUrl = `https://docs.google.com/spreadsheets/d/${targetUrl}/export?format=csv`;
  try {
    const response = await fetch(`${targetUrl}${targetUrl.includes('?') ? '&' : '?'}cache=${Date.now()}`, { method: 'GET', cache: 'no-store' });
    if (!response.ok) return [];
    const text = await response.text();
    if (text.trim().startsWith('<!DOCTYPE html>')) return [];
    const delimiter = detectDelimiter(text);
    return text.split(/\r?\n/).filter(l => l.trim().length > 0).map(line => parseCSVLine(line, delimiter));
  } catch (error) { return []; }
};

const findHeaderRow = (rows: string[][], keywords: string[]): { index: number, headers: string[] } => {
  for (let i = 0; i < Math.min(rows.length, 100); i++) { 
    const rowNormalized = rows[i].map(c => normalizeStr(c));
    let matches = 0;
    keywords.forEach(k => { 
        const kNorm = normalizeStr(k);
        if (rowNormalized.some(h => h === kNorm || h.includes(kNorm))) matches++; 
    });
    if (matches >= 2) return { index: i, headers: rowNormalized };
  }
  return { index: -1, headers: [] };
};

const findBestCol = (headers: string[], terms: string[]) => {
  for (const term of terms) {
    const tNorm = normalizeStr(term);
    for (let i = 0; i < headers.length; i++) {
        const hNorm = normalizeStr(headers[i]);
        if (hNorm === tNorm || hNorm.includes(tNorm)) return i;
    }
  }
  return -1;
};

const getPersistentFallbackDate = (fingerprint: string): Date => {
  const storageKey = 'alumasa_persistent_timestamps';
  let timestamps: Record<string, string> = {};
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) timestamps = JSON.parse(stored);
  } catch (e) {}

  if (timestamps[fingerprint]) {
    const date = new Date(timestamps[fingerprint]);
    if (!isNaN(date.getTime())) return date;
  }

  const now = new Date();
  timestamps[fingerprint] = now.toISOString();
  try {
    localStorage.setItem(storageKey, JSON.stringify(timestamps));
  } catch (e) {}
  return now;
};

export const fetchInventoryData = async (url: string): Promise<InventoryItem[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['codigo', 'descricao', 'quantidade em estoque']);
  if (headerIdx === -1) return []; 
  
  const idxCodigo = findBestCol(headers, ['codigo', 'cod', 'id']);
  const idxDesc = findBestCol(headers, ['descricao', 'item', 'nome']);
  const idxQtdEstoque = findBestCol(headers, ['quantidade em estoque', 'estoque', 'reserva', 'pulmao']);
  const idxQtdPicking = findBestCol(headers, ['quantidade em picking', 'picking']);
  const idxQtdTotal = findBestCol(headers, ['quantidade total', 'saldo total', 'estoque total', 'saldo']);
  const idxMin = findBestCol(headers, ['quantidade minima', 'minimo']);
  const idxSit = findBestCol(headers, ['situacao', 'status']);
  const idxCat = findBestCol(headers, ['categoria', 'tipo']);
  const idxMedida = findBestCol(headers, ['medida', 'unidade']);
  const idxEquip = findBestCol(headers, ['equipamento', 'maquina', 'vinculo']);
  const idxSetor = findBestCol(headers, ['setor', 'area', 'departamento']);
  const idxValUni = findBestCol(headers, ['valor unitario', 'preco unitario', 'custo unit', 'vlr unit']);
  const idxValTot = findBestCol(headers, ['valor total', 'total', 'vlr total']);
  const idxLocal = findBestCol(headers, ['endereco', 'localizacao', 'local']);

  return rows.slice(headerIdx + 1).map((row) => {
    const codigo = formatCodigo(row[idxCodigo]);
    if (!codigo) return null;
    const qtyEstoque = parseNumber(row[idxQtdEstoque]);
    const qtyPicking = idxQtdPicking !== -1 ? parseNumber(row[idxQtdPicking]) : 0;
    const qtyTotal = idxQtdTotal !== -1 ? parseNumber(row[idxQtdTotal]) : (qtyEstoque + qtyPicking);
    const unitPrice = idxValUni !== -1 ? parseNumber(row[idxValUni]) : 0;
    const totalPrice = idxValTot !== -1 ? parseNumber(row[idxValTot]) : (qtyTotal * unitPrice);
    return {
        id: codigo, codigo, 
        descricao: row[idxDesc] || 'Sem Descrição', 
        quantidadeEstoque: qtyEstoque,
        quantidadePicking: qtyPicking,
        quantidadeAtual: qtyTotal,
        quantidadeMinima: parseNumber(row[idxMin]),
        valorUnitario: unitPrice, valorTotal: totalPrice, 
        categoria: row[idxCat] || 'Geral', unidade: row[idxMedida] || 'un',
        situacao: row[idxSit] || 'OK', equipamento: row[idxEquip] || 'Geral',
        setor: row[idxSetor] || 'N/D', localizacao: idxLocal !== -1 ? row[idxLocal] : '',
        dataAtualizacao: new Date().toISOString()
    } as InventoryItem;
  }).filter((i): i is InventoryItem => i !== null);
};

export const fetchMovements = async (url: string, type: 'entrada' | 'saida' | 'transferencia'): Promise<Movement[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['peça', 'equipamento', 'codigo', 'data', 'quantidade', 'colaborador']);
  if (headerIdx === -1) return [];
  
  const idxData = findBestCol(headers, ['data/hora', 'data lançamento', 'data mov', 'data', 'dia', 'abertura', 'lancamento']);
  const idxCodigo = findBestCol(headers, ['peça', 'peca', 'item', 'codigo', 'cod']);
  const idxQtd = findBestCol(headers, ['quantidade recebida', 'quantidade retirada', 'quantidade movimentada', 'quantidade', 'qtd']);
  const idxResp = findBestCol(headers, ['colaborador', 'responsavel', 'solicitante', 'quem', 'profissional', 'operador']);
  const idxEquip = findBestCol(headers, ['equipamento', 'maquina', 'destino', 'ativo']);
  const idxEndOrigem = findBestCol(headers, ['endereço origem', 'origem']);
  const idxEndDestino = findBestCol(headers, ['endereço destino', 'endereço', 'destino', 'localizacao', 'localização']);
  const idxMovType = findBestCol(headers, ['tipo movimentação', 'tipo mov', 'tipo']);
  
  // NOVAS COLUNAS FINANCEIRAS NAS MOVIMENTAÇÕES
  const idxForn = findBestCol(headers, ['fornecedor', 'origem material']);
  const idxValUni = findBestCol(headers, ['valor unitario', 'preco unitario', 'custo unit', 'vlr unit']);
  const idxValTot = findBestCol(headers, ['valor total', 'total', 'vlr total']);

  const seenFpCount: Record<string, number> = {};

  return rows.slice(headerIdx + 1).map((row, i): Movement | null => {
    const codigo = formatCodigo(row[idxCodigo] || row[idxEquip]);
    if (!codigo) return null;
    const qty = parseNumber(row[idxQtd]);
    const resp = row[idxResp] || 'N/D';
    const parsedDate = parseDate(row[idxData]);
    
    let finalDate: Date;
    let isDateFallback = false;

    if (parsedDate) {
      finalDate = parsedDate;
    } else {
      const fpBase = `mov_${type}_${codigo}_${qty}_${resp}_${row[idxEquip] || 'none'}`;
      seenFpCount[fpBase] = (seenFpCount[fpBase] || 0) + 1;
      finalDate = getPersistentFallbackDate(`${fpBase}_v${seenFpCount[fpBase]}`);
      isDateFallback = true;
    }
    
    return {
      id: `${type}-${i}-${finalDate.getTime()}`,
      tipo: type, data: finalDate, isDateFallback, codigo, quantidade: qty,
      responsavel: resp, equipamento: String(row[idxEquip] || ''),
      localizacaoOrigem: idxEndOrigem !== -1 ? row[idxEndOrigem] : '',
      localizacaoDestino: idxEndDestino !== -1 ? row[idxEndDestino] : '',
      movimentoTipo: idxMovType !== -1 ? row[idxMovType] : '',
      fornecedor: idxForn !== -1 ? row[idxForn] : '',
      valorUnitario: idxValUni !== -1 ? parseNumber(row[idxValUni]) : 0,
      valorTotal: idxValTot !== -1 ? parseNumber(row[idxValTot]) : 0
    };
  }).filter((m): m is Movement => m !== null && m.quantidade > 0);
};

export const fetchAddressData = async (url: string): Promise<AddressItem[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['endereco', 'quantidade atual']);
  if (headerIdx === -1) return [];
  const idxEnd = findBestCol(headers, ['endereco', 'cod']);
  const idxQtd = findBestCol(headers, ['quantidade atual', 'saldo', 'atual']);
  return rows.slice(headerIdx + 1).map((row, i) => ({
    id: `addr-${i}`, endereco: row[idxEnd] || 'N/D', rua: row[findBestCol(headers, ['rua'])] || '',
    predio: row[findBestCol(headers, ['predio'])] || '', andar: row[findBestCol(headers, ['andar'])] || '',
    sala: row[findBestCol(headers, ['sala'])] || '', quantidadeInicial: 0, quantidadeAtual: parseNumber(row[idxQtd])
  })).filter(a => a.endereco !== 'N/D');
};

export const fetchPreventiveData = async (url: string): Promise<PreventiveEntry[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['equipamento', 'atividade']);
  if (headerIdx === -1) return [];
  return rows.slice(headerIdx + 1).map((row, i): PreventiveEntry | null => {
    const equip = row[findBestCol(headers, ['equipamento', 'maquina'])]?.trim();
    if (!equip) return null;
    return {
      id: `prev-${i}`, dataPrevista: parseDate(row[findBestCol(headers, ['prevista'])]),
      dataExecucao: parseDate(row[findBestCol(headers, ['execucao', 'realizada'])]),
      setor: row[findBestCol(headers, ['setor'])] || 'N/D', equipamento: equip,
      atividade: row[findBestCol(headers, ['atividade'])] || '', natureza: row[findBestCol(headers, ['natureza'])] || 'preventiva',
      status: row[findBestCol(headers, ['status'])] || 'Concluído', tempo: parseDurationToHours(row[findBestCol(headers, ['tempo'])]),
      profissional: row[findBestCol(headers, ['profissional'])] || 'N/D', descricaoTrabalho: ''
    };
  }).filter((p): p is PreventiveEntry => p !== null);
};

export const fetchProductionData = async (url: string): Promise<ProductionEntry[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['dia', 'produzido']);
  if (headerIdx !== -1) {
    return rows.slice(headerIdx + 1).map((row, i): ProductionEntry | null => {
      const dataParsed = parseDate(row[findBestCol(headers, ['dia', 'data'])]);
      if (!dataParsed) return null;
      return {
        id: `prod-${i}`, data: dataParsed, tipologia: row[findBestCol(headers, ['tipologia'])] || 'N/D',
        metaDia: parseNumber(row[findBestCol(headers, ['meta'])]), pecasHoraAlvo: 0, 
        mesa: row[findBestCol(headers, ['mesa'])] || 'N/D', horasTrabalhadas: parseDurationToHours(row[findBestCol(headers, ['horas'])]),
        produzido: parseNumber(row[findBestCol(headers, ['produzido'])]), percentual: parseNumber(row[findBestCol(headers, ['percentual'])]),
        turno: row[findBestCol(headers, ['turno'])] || 'Geral', semana: row[findBestCol(headers, ['semana'])] || ''
      };
    }).filter((p): p is ProductionEntry => p !== null);
  }
  return [];
};

export const fetchServiceOrders = async (url: string): Promise<ServiceOrder[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['ordem', 'equipamento']);
  if (headerIdx === -1) return [];

  const colAbertura = findBestCol(headers, ['abertura', 'aberta', 'lancamento']);
  const colInicio = findBestCol(headers, ['inicio', 'comeco', 'start', 'atendimento']); 
  const colFim = findBestCol(headers, ['fim', 'conclusao', 'termino', 'fechamento']);
  const colEquip = findBestCol(headers, ['equipamento', 'maquina', 'ativo']);
  const colPeca = findBestCol(headers, ['peca', 'componente', 'item']);
  const colParada = findBestCol(headers, ['parada', 'maquina parada']);
  const colMotivo = findBestCol(headers, ['motivo', 'falha', 'problema']);
  const colProf = findBestCol(headers, ['colaborador', 'tecnico', 'profissional', 'quem']);
  const colOS = findBestCol(headers, ['ordem', 'os', 'numero']);
  const colAtiv = findBestCol(headers, ['atividade', 'servico', 'descricao']);
  const colTempo = findBestCol(headers, ['tempo', 'horas', 'duracao']);
  const colSetor = findBestCol(headers, ['setor', 'area']);

  return rows.slice(headerIdx + 1).map((row, i): ServiceOrder | null => {
    const dataAbertura = parseDate(row[colAbertura]);
    if (!dataAbertura) return null;

    return {
      id: `os-${i}`, 
      numero: row[colOS] || `OS-${i}`,
      dataAbertura: dataAbertura,
      dataInicio: parseDate(row[colInicio]), 
      dataFim: parseDate(row[colFim]),
      professional: row[colProf] || 'N/D',
      equipamento: row[colEquip] || 'Geral',
      setor: row[colSetor] || 'Manutenção', 
      status: 'Concluído',
      horas: parseDurationToHours(row[colTempo]),
      descricao: row[colAtiv] || '',
      parada: row[colParada] || 'Não',
      peca: row[colPeca] || '',
      motivo: row[colMotivo] || ''
    };
  }).filter((os): os is ServiceOrder => os !== null);
};

export const fetchCentralData = async (url: string): Promise<Movement[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['perfil', 'solicitante', 'quantidade']);
  if (headerIdx === -1) return [];

  const idxData = findBestCol(headers, ['data', 'dia', 'lancamento']);
  const idxSolicitante = findBestCol(headers, ['solicitante', 'quem', 'operador']);
  const idxPerfil = findBestCol(headers, ['perfil', 'material', 'modelo']);
  const idxQuantidade = findBestCol(headers, ['quantidade', 'qtd', 'volume']);
  const idxSetor = findBestCol(headers, ['setor', 'area', 'destino', 'departamento']);
  const idxMotivo = findBestCol(headers, ['motivo', 'finalidade', 'uso', 'obs']);
  const idxTurno = findBestCol(headers, ['turno']);
  const idxCor = findBestCol(headers, ['cor', 'pintura', 'acabamento']);

  const seenFpCount: Record<string, number> = {};

  return rows.slice(headerIdx + 1).map((row, i): Movement | null => {
    const qty = parseNumber(row[idxQuantidade]);
    if (qty <= 0) return null;
    const perfil = row[idxPerfil] || 'N/D';
    const resp = row[idxSolicitante] || 'N/D';
    const dataParsed = parseDate(row[idxData]);

    let finalDate: Date;
    let isDateFallback = false;
    if (dataParsed) {
      finalDate = dataParsed;
    } else {
      const fp = `central_${perfil}_${resp}_${qty}`;
      seenFpCount[fp] = (seenFpCount[fp] || 0) + 1;
      finalDate = getPersistentFallbackDate(`${fp}_v${seenFpCount[fp]}`);
      isDateFallback = true;
    }

    return {
      id: `c-${i}-${finalDate.getTime()}`, 
      data: finalDate, 
      isDateFallback, 
      codigo: perfil, 
      perfil, 
      quantidade: qty, 
      tipo: 'saida', 
      responsavel: resp,
      setor: idxSetor !== -1 ? row[idxSetor] : 'OUTROS',
      motivo: idxMotivo !== -1 ? row[idxMotivo] : 'GERAL',
      turno: idxTurno !== -1 ? row[idxTurno] : 'Geral',
      cor: idxCor !== -1 ? row[idxCor] : 'N/D'
    };
  }).filter((x): x is Movement => x !== null);
};
