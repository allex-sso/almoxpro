
import { InventoryItem, Movement } from '../types';

// --- UTILITÁRIOS DE PARSE ---

// Função de normalização para remover acentos e caracteres especiais
const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const parseNumber = (value: string): number => {
  if (!value) return 0;
  let str = value.toString().trim();
  
  // Limpeza de espaços não-quebráveis (comum em web) e R$
  str = str.replace(/R\$\s?/gi, '').replace(/\u00A0/g, '').replace(/\s/g, '').trim();
  
  // Verifica formato brasileiro (1.000,00)
  if (str.includes(',') && !str.includes('.')) {
     // Ex: 199,79 -> 199.79
     str = str.replace(',', '.');
  } else if (str.includes('.') && str.includes(',')) {
     // Ex: 1.000,00 -> remove ponto, troca virgula
     if (str.indexOf('.') < str.indexOf(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
     }
  } else if (str.includes(',') && str.includes('.')) {
     // Caso bizarro: 1,000.00 -> remove virgula
     if (str.indexOf(',') < str.indexOf('.')) {
        str = str.replace(/,/g, '');
     }
  }
  
  // Limpeza final para garantir que sobraram apenas números e ponto
  str = str.replace(/[^0-9.-]/g, '');

  const num = parseFloat(str);
  
  // TRAVA DE SEGURANÇA: 
  // Se o valor unitário for maior que 50.000, provavelmente é um erro de leitura (EAN/Código).
  if (!isNaN(num) && num > 50000) {
      return 0;
  }

  return isNaN(num) ? 0 : num;
};

// Converte unidades extensas para siglas
const formatUnit = (raw: string): string => {
  const val = normalizeStr(raw);
  
  if (!val) return 'uni';
  
  if (val.startsWith('unid') || val === 'und' || val === 'un') return 'uni';
  if (val.startsWith('metr') || val === 'm' || val === 'mts') return 'mt';
  if (val.startsWith('pec') || val.startsWith('pc') || val === 'pç') return 'pç';
  if (val.startsWith('caix') || val === 'cx') return 'cx';
  if (val.startsWith('kilo') || val === 'kg') return 'kg';
  if (val.startsWith('litr') || val === 'l' || val === 'lt') return 'lt';
  if (val.startsWith('paco') || val === 'pct') return 'pct';
  if (val.startsWith('rolo') || val === 'rl') return 'rl';
  
  return raw.substring(0, 3).toLowerCase();
};

const detectDelimiter = (text: string): string => {
  const lines = text.split('\n').slice(0, 15).filter(l => l.trim().length > 0);
  let commaCount = 0;
  let semicolonCount = 0;

  lines.forEach(line => {
      // Ignora linhas muito longas sem separadores claros
      if (line.length > 50 && (line.match(/,/g) || []).length < 2 && (line.match(/;/g) || []).length < 2) return;
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
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
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
  
  // Excel serial date
  if (!isNaN(Number(value)) && !value.includes('/')) {
    const serial = Number(value);
    // Datas muito pequenas (ex: 0, 1) não são datas válidas de movimentação
    if (serial < 1000) return null; 
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date;
  }
  
  // PT-BR format DD/MM/YYYY
  if (value.includes('/')) {
    const parts = value.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      const y = parseInt(parts[2]);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
          // Data válida?
          const date = new Date(y, m - 1, d);
          if (date.getFullYear() === y && date.getMonth() === m - 1) return date;
      }
    }
  }
  
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

const fetchCSV = async (url: string): Promise<string[][]> => {
  // Limpeza agressiva da URL para remover espaços invisíveis
  let targetUrl = url ? url.trim() : '';
  
  if (!targetUrl || targetUrl.length < 5) return [];
  
  if (!targetUrl.startsWith('http')) {
    // Tenta corrigir IDs soltos transformando em link de exportação
    targetUrl = `https://docs.google.com/spreadsheets/d/${targetUrl}/export?format=csv`;
  }

  const timestamp = Date.now();
  const separator = targetUrl.includes('?') ? '&' : '?';
  const finalUrl = `${targetUrl}${separator}t=${timestamp}`;

  try {
    // Importante: NÃO enviar headers customizados (como Accept) para Google Sheets.
    // Isso dispara um preflight CORS (OPTIONS) que o Google bloqueia.
    // O modo 'cors' é padrão, e credentials 'omit' evita envio de cookies desnecessários.
    const response = await fetch(finalUrl, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit'
    });

    if (!response.ok) {
      console.warn(`Falha ao buscar CSV (${response.status}):`, finalUrl);
      return [];
    }

    const text = await response.text();
    
    // Verificação se retornou HTML (página de login) em vez de CSV
    if (text.trim().startsWith('<!DOCTYPE html>') || text.includes('<html')) {
        console.warn("A URL retornou uma página HTML em vez de CSV. Verifique se a planilha está 'Publicada na Web'.");
        return [];
    }
    
    const delimiter = detectDelimiter(text);
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    
    return lines.map(line => parseCSVLine(line, delimiter));
  } catch (error) {
    console.error("Erro de rede ao buscar CSV:", error);
    return [];
  }
};

const findHeaderRow = (rows: string[][], keywords: string[]): { index: number, headers: string[] } => {
  for (let i = 0; i < Math.min(rows.length, 20); i++) { 
    const rowNormalized = rows[i].map(c => normalizeStr(c));
    if (keywords.every(k => rowNormalized.some(h => h.includes(normalizeStr(k))))) {
      return { index: i, headers: rowNormalized };
    }
  }
  return { index: -1, headers: [] };
};

export const fetchMovements = async (url: string, type: 'entrada' | 'saida'): Promise<Movement[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];

  let headerIdx = -1;
  let headers: string[] = [];

  // HEADER HUNTING: Prioridade para termos exatos da planilha do usuário
  const exactTerm = type === 'entrada' ? 'quantidade recebida' : 'quantidade retirada';

  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i].map(c => normalizeStr(c));
    
    // 1. Tenta encontrar a linha exata (Quantidade Recebida/Retirada)
    if (row.some(h => h === normalizeStr(exactTerm))) {
        headerIdx = i;
        headers = row;
        break;
    }
    // 2. Fallback: Procura 'Código' E 'Data' na mesma linha
    if (row.some(h => h.includes('codigo')) && row.some(h => h.includes('data'))) {
        headerIdx = i;
        headers = row;
        break;
    }
  }

  if (headerIdx === -1) return [];

  const findCol = (terms: string[], avoidTerms: string[] = []) => {
      return headers.findIndex(h => {
          const normalizedH = normalizeStr(h);
          const matchesTerm = terms.some(t => normalizedH.includes(normalizeStr(t)));
          const matchesAvoid = avoidTerms.some(t => normalizedH.includes(normalizeStr(t)));
          return matchesTerm && !matchesAvoid;
      });
  };

  const idxData = findCol(['data', 'dia', 'registro']);
  const idxCodigo = findCol(['cód', 'cod', 'item']);
  
  // Colunas exatas de quantidade
  const qtdTerms = type === 'entrada' 
    ? ['quantidade recebida', 'recebida', 'qtd'] 
    : ['quantidade retirada', 'retirada', 'qtd'];
  const idxQtd = findCol(qtdTerms);
  
  const idxForn = findCol(['fornecedor', 'fabricante']);

  // --- NOVA COLUNA: Responsável (Geralmente na saída) ---
  const idxResp = findCol(['responsável', 'responsavel', 'retirado por', 'solicitante', 'destino', 'funcionário', 'funcionario', 'equipe']);
  
  // Colunas financeiras (Importante: ler Total e Unitário separadamente)
  const idxValUnit = findCol(['valor unitário', 'valor unitario', 'vl. unit', 'preco unit'], ['total', 'bruto', 'ean', 'barras', 'cnpj', 'nota']);
  
  // Valor Total: Aceita colunas que tenham "Valor" e "Total". Rejeita códigos e notas fiscais.
  const idxValTotal = findCol(['valor total', 'vl. total'], ['unit', 'ean', 'barras', 'cnpj', 'nota']);

  return rows.slice(headerIdx + 1).map((row, i): Movement | null => {
    let codigo = (idxCodigo !== -1 ? row[idxCodigo] : row[0])?.trim();
    if (!codigo) return null;
    if (/^\d$/.test(codigo)) codigo = `0${codigo}`;

    // DATA RIGOROSA: Se não achar a data ou for inválida, DESCARTA a linha.
    // Não assume 'new Date()' (hoje) para evitar movimentações fantasmas de linhas vazias.
    const rawDate = idxData !== -1 ? parseDate(row[idxData]) : null;
    if (!rawDate) return null;

    const qtd = idxQtd !== -1 ? parseNumber(row[idxQtd]) : 0;
    
    if (qtd === 0) return null;

    let valUnit = 0;
    if (idxValUnit !== -1) valUnit = parseNumber(row[idxValUnit]);

    let valTotal = 0;
    if (idxValTotal !== -1) {
        valTotal = parseNumber(row[idxValTotal]);
    }

    return {
      id: `${type}-${i}`,
      tipo: type,
      data: rawDate, // Data confirmada
      codigo: codigo,
      quantidade: qtd,
      fornecedor: idxForn !== -1 ? row[idxForn] : undefined,
      responsavel: idxResp !== -1 ? row[idxResp] : undefined, // Popula o responsável
      valorUnitario: valUnit,
      valorTotal: valTotal // Passa o valor total lido para ser usado no fallback
    };
  }).filter((m): m is Movement => m !== null);
};

export const fetchInventoryData = async (url: string): Promise<InventoryItem[]> => {
  const rows = await fetchCSV(url);
  if (rows.length === 0) return [];

  const { index: headerIdx, headers } = findHeaderRow(rows, ['cód']);
  if (headerIdx === -1) return []; 

  const findCol = (terms: string[], avoid: string[] = []) => {
      return headers.findIndex(h => {
          const normH = normalizeStr(h);
          return terms.some(t => normH.includes(normalizeStr(t))) && !avoid.some(a => normH.includes(normalizeStr(a)));
      });
  };

  const idxCodigo = findCol(['cód', 'cod']);
  const idxDesc = findCol(['descri', 'nome']);
  const idxEquip = findCol(['equip', 'máquina']);
  const idxLoc = findCol(['local', 'prateleira']);
  const idxForn = findCol(['fornecedor']); 
  const idxUnd = findCol(['medida', 'unidade', 'und']);
  
  let idxQtd = findCol(['quantidade em estoque', 'estoque atual', 'saldo']);
  if (idxQtd === -1) idxQtd = findCol(['quant', 'qtd', 'estoque'], ['min', 'entrad', 'saíd']);

  const idxMin = findCol(['mínim', 'minim', 'min']);
  // Adicionando mais termos para categoria
  const idxCat = findCol(['categ', 'grupo', 'família', 'tipo', 'classe']);

  // --- ALTERAÇÃO IMPORTANTE: AGRUPAMENTO POR CÓDIGO ---
  // Em vez de mapear linha a linha, usamos um Map para garantir que códigos iguais
  // sejam tratados como o mesmo item (somando quantidades e mesclando dados).
  
  const itemMap = new Map<string, InventoryItem>();

  rows.slice(headerIdx + 1).forEach((row) => {
    let codigo = (idxCodigo !== -1 ? row[idxCodigo] : row[0])?.trim();
    if (!codigo) return; // Pula linha se não tiver código
    
    // Remove aspas extras que podem vir do CSV
    codigo = codigo.replace(/^"|"$/g, '');
    
    if (/^\d$/.test(codigo)) codigo = `0${codigo}`; // Padroniza 0 à esquerda para 1 digito

    const qtd = idxQtd !== -1 ? parseNumber(row[idxQtd]) : 0;
    const rawUnd = idxUnd !== -1 ? (row[idxUnd] || 'un.') : 'un.';
    const descricao = idxDesc !== -1 ? row[idxDesc] : '';
    const equipamento = idxEquip !== -1 ? (row[idxEquip] || 'N/D') : 'N/D';
    const localizacao = idxLoc !== -1 ? (row[idxLoc] || '') : '';
    const fornecedor = idxForn !== -1 ? (row[idxForn] || '') : '';
    const qtdMin = idxMin !== -1 ? parseNumber(row[idxMin]) : 0;
    const categoria = idxCat !== -1 ? (row[idxCat] || 'Geral') : 'Geral';

    if (itemMap.has(codigo)) {
        // Se o código já existe, SOMAMOS a quantidade (Ex: mesmo item em dois locais)
        const existing = itemMap.get(codigo)!;
        existing.quantidadeAtual += qtd;
        
        // Opcional: Se a nova linha tiver dados que a anterior não tinha, podemos preencher
        if (!existing.descricao && descricao) existing.descricao = descricao;
        if ((!existing.localizacao || existing.localizacao === '') && localizacao) existing.localizacao = localizacao;
        // Se tiver locais diferentes, concatena? Por enquanto mantemos o primeiro ou o mais completo.
        
    } else {
        // Se é novo, cria
        itemMap.set(codigo, {
            id: codigo, // O ID AGORA É O CÓDIGO (Chave Única Real)
            codigo,
            descricao,
            equipamento,
            localizacao,
            fornecedor, 
            quantidadeAtual: qtd,
            quantidadeMinima: qtdMin,
            unidade: formatUnit(rawUnd),
            entradas: 0, 
            saidas: 0,   
            categoria,
            valorUnitario: 0,
            valorTotal: 0,
            dataAtualizacao: new Date().toISOString()
        });
    }
  });

  // Retorna os valores únicos do mapa
  return Array.from(itemMap.values());
};
