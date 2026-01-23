
import { InventoryItem, Movement, ServiceOrder, ProductionEntry } from '../types';

const normalizeStr = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

const formatCodigo = (code: any): string => {
  if (code === null || code === undefined) return "";
  let str = String(code).trim();
  if (str === "" || str === "0") return str;
  return str;
}

const parseNumber = (value: string | number): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  let str = value.toString().trim();
  
  str = str.replace(/R\$/gi, '').replace(/%/g, '').replace(/\s/g, '');
  if (!str || str === '-' || str === '.') return 0;

  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else {
    const parts = str.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length !== 2) {
      str = str.replace(/\./g, '');
    }
  }
  
  str = str.replace(/[^0-9.-]/g, '');
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
  let commaCount = 0;
  let semicolonCount = 0;
  lines.forEach(line => {
      commaCount += (line.match(/,/g) || []).length;
      semicolonCount += (line.match(/;/g) || []).length;
  });
  return semicolonCount > commaCount ? ';' : ',';
};

const parseCSVLine = (text: string, delimiter: string): string[] => {
  const result: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
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
    if (parts[0].length === 4) {
      y = parseInt(parts[0]); m = parseInt(parts[1]); d = parseInt(parts[2]);
    } else {
      d = parseInt(parts[0]); m = parseInt(parts[1]); y = parseInt(parts[2]);
    }
    if (y < 100) y += 2000;
    const [hh, min, ss] = timePart.split(':').map(x => parseInt(x) || 0);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      const date = new Date(y, m - 1, d, hh, min, ss || 0);
      return isNaN(date.getTime()) ? null : date;
    }
  } else if (parts.length === 2) {
    d = parseInt(parts[0]); m = parseInt(parts[1]);
    if (!isNaN(d) && !isNaN(m)) return new Date(new Date().getFullYear(), m - 1, d);
  }

  const nativeDate = new Date(trimmedValue);
  return !isNaN(nativeDate.getTime()) ? nativeDate : null;
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

/**
 * PARSER ESPECIALIZADO PARA O LAYOUT DE MATRIZ DA ALUMASA (ESCADA E PLÁSTICO)
 * Este parser busca por nomes de funcionários e semanas em blocos fixos na grade.
 */
const parseAlumasaProductionSheet = (rows: string[][]): ProductionEntry[] => {
  const entries: ProductionEntry[] = [];
  const names = [
    'RENATO', 'CHARLES', 'MATEUS', 'TIAGO', 'ANTONIA', 
    'JAILSON', 'EMERSON', 'JOEDSON', 'MARCILIO', 'ISRAEL',
    'ADRIANA/RANNY', 'DANILO/ANGELICA'
  ];

  // Datas virtuais para as semanas de Janeiro 2026 conforme cabeçalho
  const weekDates = [
    new Date(2026, 0, 5),  // Semana 1 (Início 05/01)
    new Date(2026, 0, 12), // Semana 2 (Início 12/01)
    new Date(2026, 0, 19), // Semana 3 (Início 19/01)
    new Date(2026, 0, 26)  // Semana 4 (Início 26/01)
  ];

  // Estrutura da Planilha:
  // Lado Esquerdo: Colunas 0 a 10 (S1 e S3)
  // Lado Direito: Colunas 12 a 22 (S2 e S4)
  // Topo: Linhas 1 a 20 (S1 e S2)
  // Fundo: Linhas 21 a 40 (S3 e S4)

  const processBlock = (startRow: number, endRow: number, startCol: number, totalColOffset: number, weekIdx: number) => {
    for (let r = startRow; r < Math.min(endRow, rows.length); r++) {
      const row = rows[r];
      if (!row) continue;
      
      const potentialName = normalizeStr(row[startCol + 1]); // Coluna B ou N
      
      const matchedName = names.find(n => normalizeStr(n) === potentialName);
      if (matchedName) {
        const produzido = parseNumber(row[startCol + totalColOffset]); // Coluna J ou T
        if (produzido > 0) {
          entries.push({
            id: `prod-${weekIdx}-${r}-${Date.now()}`,
            data: weekDates[weekIdx],
            tipologia: matchedName,
            metaDia: 700,
            pecasHoraAlvo: 0,
            mesa: 'N/D',
            horasTrabalhadas: 8,
            produzido: produzido,
            percentual: 100,
            turno: (r < 8 || (r > 20 && r < 30)) ? '1º Turno' : '2º Turno',
            semana: `Semana ${weekIdx + 1}`
          });
        }
      }
    }
  };

  // Semana 1: Colunas 0-10, Linhas 1-20
  processBlock(1, 20, 0, 9, 0);
  // Semana 2: Colunas 12-22, Linhas 1-20
  processBlock(1, 20, 12, 9, 1);
  // Semana 3: Colunas 0-10, Linhas 21-40
  processBlock(21, 40, 0, 9, 2);
  // Semana 4: Colunas 12-22, Linhas 21-40
  processBlock(21, 40, 12, 9, 3);

  return entries;
};

export const fetchProductionData = async (url: string): Promise<ProductionEntry[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];

  // Tentar primeiro o parser especializado para o layout da Alumasa (Matriz Semanal)
  const alumasaData = parseAlumasaProductionSheet(rows);
  if (alumasaData.length > 0) return alumasaData;

  // Fallback para o parser de lista padrão
  const { index: headerIdx, headers: rawHeaders } = findHeaderRow(rows, ['dia', 'data', 'tipologia', 'produzido']);
  if (headerIdx === -1) return [];
  
  const idxData = findBestCol(rawHeaders, ['dia', 'data']);
  const idxMaquina = findBestCol(rawHeaders, ['maquina', 'mesa', 'posto']);
  const idxTipologia = findBestCol(rawHeaders, ['tipologia', 'tpologia', 'modelo']);
  const idxMeta = findBestCol(rawHeaders, ['meta dia', 'meta']);
  const idxPcsHoraAlvo = findBestCol(rawHeaders, ['producao/ horas', 'pecas/hora alvo', 'producao/ hora']);
  const idxHoras = findBestCol(rawHeaders, ['horas trabalhadas', 'tempo trabalhado', 'horas']);
  const idxTurnoA = findBestCol(rawHeaders, ['turno a']);
  const idxTurnoB = findBestCol(rawHeaders, ['turno b']);
  const idxTurnoC = findBestCol(rawHeaders, ['turno c']);
  const idxTurnoGeral = findBestCol(rawHeaders, ['turno', 'periodo']);
  const idxTotal = findBestCol(rawHeaders, ['total', 'produzido', 'producao']);
  const idxPercentual = findBestCol(rawHeaders, ['percentual', 'eficiencia', '%']);
  
  return rows.slice(headerIdx + 1).map((row, i): ProductionEntry | null => {
    const dateVal = row[idxData]?.trim();
    const tipoVal = row[idxTipologia]?.trim();
    if (!dateVal || !tipoVal || tipoVal === '-' || tipoVal === '0' || tipoVal === '') return null;
    const dataParsed = parseDate(dateVal);
    if (!dataParsed) return null;
    const valA = parseNumber(row[idxTurnoA]);
    const valB = parseNumber(row[idxTurnoB]);
    const valC = parseNumber(row[idxTurnoC]);
    let produzido = parseNumber(row[idxTotal]);
    if (produzido === 0) produzido = valA + valB + valC;
    if (produzido === 0) return null;
    let turnoLabel = row[idxTurnoGeral]?.trim() || '';
    const horasTrabalhadas = parseDurationToHours(row[idxHoras]);
    
    return {
      id: `prod-${i}-${Date.now()}`,
      data: dataParsed,
      tipologia: tipoVal,
      metaDia: parseNumber(row[idxMeta]),
      pecasHoraAlvo: parseNumber(row[idxPcsHoraAlvo]),
      mesa: row[idxMaquina]?.trim() || 'N/D',
      horasTrabalhadas: horasTrabalhadas,
      produzido: produzido,
      percentual: parseNumber(row[idxPercentual]),
      turno: turnoLabel,
      semana: '',
      valA,
      valB,
      valC
    };
  }).filter((p): p is ProductionEntry => p !== null);
};

export const fetchMovements = async (url: string, type: 'entrada' | 'saida'): Promise<Movement[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['codigo', 'descricao', 'quantidade', 'data']);
  if (headerIdx === -1) return [];
  const idxData = findBestCol(headers, ['data de entrada', 'data de saida', 'data', 'dia']);
  const idxCodigo = findBestCol(headers, ['codigo', 'cod', 'item', 'material']);
  const idxQtd = findBestCol(headers, ['quantidade recebida', 'quantidade retirada', 'quantidade', 'qtd', 'volume']);
  const idxValUnit = findBestCol(headers, ['valor unitario', 'unitario', 'vlr unit', 'preco unit', 'custo unit']);
  const idxValTotal = findBestCol(headers, ['valor total', 'vlr total', 'total']);
  const idxResp = findBestCol(headers, ['responsavel', 'solicitante', 'quem']);
  const idxSetor = findBestCol(headers, ['setor', 'area', 'departamento', 'setor solicitante']);
  const idxForn = findBestCol(headers, ['fornecedor', 'marca', 'vendedor', 'empresa']);
  return rows.slice(headerIdx + 1).map((row, i): Movement | null => {
    const codigo = formatCodigo(row[idxCodigo]);
    if (!codigo) return null;
    const qtd = parseNumber(row[idxQtd]);
    const valUnit = idxValUnit !== -1 ? parseNumber(row[idxValUnit]) : 0;
    const valTotal = idxValTotal !== -1 ? parseNumber(row[idxValTotal]) : (qtd * valUnit);
    return {
      id: `${type}-${i}-${Date.now()}`,
      tipo: type,
      data: parseDate(row[idxData]) || new Date(),
      codigo,
      quantidade: qtd,
      valorUnitario: valUnit,
      valorTotal: valTotal,
      responsavel: row[idxResp],
      setor: row[idxSetor],
      fornecedor: idxForn !== -1 ? row[idxForn] : ''
    };
  }).filter((m): m is Movement => m !== null && m.quantidade > 0);
};

export const fetchInventoryData = async (url: string): Promise<InventoryItem[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['codigo', 'descricao', 'quantidade em estoque']);
  if (headerIdx === -1) return []; 
  const idxCodigo = findBestCol(headers, ['codigo', 'cod', 'id', 'referencia']);
  const idxDesc = findBestCol(headers, ['descricao', 'nome', 'item', 'produto']);
  const idxQtdEstoque = findBestCol(headers, ['quantidade em estoque', 'estoque atual', 'estoque', 'atual', 'saldo', 'qtd']);
  const idxMin = findBestCol(headers, ['quantidade minima', 'minimo', 'estoque minimo', 'min']);
  const idxEquip = findBestCol(headers, ['equipamento', 'maquina', 'onde']);
  const idxForn = findBestCol(headers, ['fornecedor', 'marca', 'vendedor']);
  const idxLocal = findBestCol(headers, ['localizacao', 'local', 'rua', 'gaveta']);
  const idxUnid = findBestCol(headers, ['unidade', 'medida', 'um', 'un']);
  const idxCat = findBestCol(headers, ['categoria', 'tipo', 'grupo']);
  return rows.slice(headerIdx + 1).map((row) => {
    const codigo = formatCodigo(row[idxCodigo]);
    if (!codigo) return null;
    // Fix: correct property names and add missing dataAtualizacao to match InventoryItem interface
    return {
        id: codigo, 
        codigo, 
        descricao: row[idxDesc] || 'Sem Descrição', 
        equipamento: row[idxEquip] || '',
        fornecedor: row[idxForn] || '',
        localizacao: row[idxLocal] || '',
        quantidadeAtual: parseNumber(row[idxQtdEstoque]), 
        quantidadeMinima: parseNumber(row[idxMin]),
        valorUnitario: 0, 
        valorTotal: 0, 
        categoria: row[idxCat] || 'Geral', 
        unidade: row[idxUnid] || 'un',
        entradas: 0,
        saidas: 0,
        dataAtualizacao: new Date().toISOString()
    } as InventoryItem;
  }).filter((i): i is InventoryItem => i !== null);
};

export const fetchServiceOrders = async (url: string): Promise<ServiceOrder[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['equipamento', 'peca', 'motivo', 'tempo servico', 'ordem de servico']);
  if (headerIdx === -1) return [];
  const idxNum = findBestCol(headers, ['ordem de servico', 'os', 'numero']);
  const idxAbertura = findBestCol(headers, ['data/hora abertura', 'data abertura', 'abertura', 'data', 'dia']);
  const idxInicio = findBestCol(headers, ['inicio manutencao', 'inicio', 'data inicio', 'hr inicio', 'inicio da manutenção']);
  const idxFim = findBestCol(headers, ['data/hora fim manutencao', 'fim', 'conclusao', 'data fim', 'fim da manutenção']);
  const idxProf = findBestCol(headers, ['profissional', 'professional', 'tecnico', 'mecanico', 'responsavel']);
  const idxEquip = findBestCol(headers, ['equipamento', 'maquina', 'ativo']);
  const idxSetor = findBestCol(headers, ['setor', 'departamento', 'area']);
  const idxStatus = findBestCol(headers, ['status', 'situacao']);
  const idxHoras = findBestCol(headers, ['tempo servico', 'tempo', 'horas', 'duracao']);
  const idxParada = findBestCol(headers, ['parada', 'maquina parada']);
  const idxPeca = findBestCol(headers, ['peca', 'peça', 'material']);
  const idxMotivo = findBestCol(headers, ['motivo', 'defeito', 'causa']);
  const idxDesc = findBestCol(headers, ['atividade', 'descricao', 'obs', 'observacao']);
  return rows.slice(headerIdx + 1).map((row, i): ServiceOrder | null => {
    const equip = row[idxEquip]?.trim() || '';
    const osNum = row[idxNum]?.trim() || '';
    const aberturaStr = row[idxAbertura]?.trim();
    if (!equip && !osNum && !aberturaStr) return null;
    return {
      id: `os-${i}-${Date.now()}`,
      numero: osNum || `S/N-${String(i + 1).padStart(2, '0')}`,
      dataAbertura: parseDate(aberturaStr) || new Date(),
      dataInicio: parseDate(row[idxInicio]) || undefined,
      dataFim: parseDate(row[idxFim]) || undefined,
      professional: idxProf !== -1 ? row[idxProf] : 'N/D',
      equipamento: equip || 'Geral',
      setor: idxSetor !== -1 ? row[idxSetor] : 'Manutenção',
      status: idxStatus !== -1 ? row[idxStatus] : 'Concluído',
      horas: idxHoras !== -1 ? parseDurationToHours(row[idxHoras]) : 0,
      parada: idxParada !== -1 ? (normalizeStr(row[idxParada]) === 'sim' ? 'Sim' : 'Não') : 'Não',
      peca: idxPeca !== -1 ? row[idxPeca] : '',
      motivo: idxMotivo !== -1 ? row[idxMotivo] : '',
      descricao: idxDesc !== -1 ? row[idxDesc] : ''
    };
  }).filter((os): os is ServiceOrder => os !== null);
};

export const fetchCentralData = async (url: string): Promise<Movement[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];
  const { index: headerIdx, headers } = findHeaderRow(rows, ['material', 'data', 'quantidade', 'turno', 'motivo', 'responsavel']);
  if (headerIdx === -1) return [];
  
  const idxData = findBestCol(headers, ['data', 'dia']);
  const idxDesc = findBestCol(headers, ['material', 'descricao', 'item', 'perfil']);
  const idxQtd = findBestCol(headers, ['quantidade', 'saida', 'qtd', 'barras']);
  const idxTurno = findBestCol(headers, ['turno', 'periodo']);
  const idxResp = findBestCol(headers, ['responsavel', 'solicitante', 'quem']);
  const idxMotivo = findBestCol(headers, ['motivo', 'causa', 'defeito']);
  const idxSetor = findBestCol(headers, ['setor', 'area', 'departamento']);
  const idxCor = findBestCol(headers, ['cor', 'especificacao', 'pintura']);

  return rows.slice(headerIdx + 1).map((row, i) => ({
    id: `c-${i}-${Date.now()}`,
    data: parseDate(row[idxData]) || new Date(),
    codigo: row[idxDesc] || 'N/D',
    perfil: row[idxDesc] || 'N/D',
    quantidade: parseNumber(row[idxQtd]),
    tipo: 'saida',
    turno: row[idxTurno] || '',
    responsavel: row[idxResp] || 'N/D',
    motivo: row[idxMotivo] || 'Geral',
    setor: row[idxSetor] || 'Outros',
    cor: row[idxCor] || 'N/D'
  })).filter(x => x.quantidade > 0) as Movement[];
};
