// src/processador.js
import fs from "node:fs";
import { parsearLinha } from "./parser.js";
import { detectarEncontros } from "./encontros.js";

// Tamanho de cada pedaço lido do disco: 1 MB.
// Pedaços grandes = menos idas ao disco; a memória continua constante.
const TAMANHO_PEDACO_PADRAO = 1024 * 1024;

/**
 * Processa o lote atual (se houver) e guarda os encontros encontrados.
 * @param {{ encontros: Object[], lote: Object[] }} estado
 */
function fecharLote(estado) {
  const encontrosDoLote = detectarEncontros(estado.lote, completarMonitorado);
  for (const encontro of encontrosDoLote) {
    estado.encontros.push(encontro);
  }
}

/**
 * Converte um item leve do lote no monitorado completo, usando o parser.
 * Só é chamada para os pares que viraram encontro.
 * @param {{ latitude: number, longitude: number, linha: string }} itemLeve
 * @returns {Object} monitorado completo
 */
function completarMonitorado(itemLeve) {
  return parsearLinha(itemLeve.linha);
}

/**
 * Trata uma linha do arquivo com "parse preguiçoso": extrai só o que toda linha
 * precisa (timestamp, latitude e longitude) e guarda a linha original.
 * O parse completo fica para depois, e só acontece se a linha fizer parte de um encontro.
 * @param {Object} estado - variáveis que precisam sobreviver entre uma linha e outra
 * @param {string} linha
 */
function processarLinha(estado, linha) {
  // A primeira linha é o cabeçalho: pula
  if (estado.ehCabecalho) {
    estado.ehCabecalho = false;
    return;
  }

  // Linha vazia (ex.: \n no final do arquivo): ignora
  if (linha === "") {
    return;
  }

  // Posições dos ";" que separam os campos.
  // Formato: id ; faccao ; "timestamp" ; latitude ; longitude ; medida ; ids
  //            p1        p2             p3         p4          p5
  // Achar só os separadores evita o split, que criaria 7 textos novos por linha.
  const p1 = linha.indexOf(";");
  const p2 = linha.indexOf(";", p1 + 1);
  const p3 = linha.indexOf(";", p2 + 1);
  const p4 = linha.indexOf(";", p3 + 1);
  const p5 = linha.indexOf(";", p4 + 1);

  if (p5 === -1) {
    throw new Error(`Linha com campos faltando: ${linha}`);
  }

  // O timestamp é comparado ainda com as aspas: só serve para saber se o lote mudou.
  // A ordem de texto continua cronológica, porque todas as linhas têm as aspas.
  const timestamp = linha.substring(p2 + 1, p3);

  // Mudou o timestamp: o lote anterior está completo e pode ser processado
  if (timestamp !== estado.timestampAtual) {
    // Proteção: a abordagem por lotes depende do arquivo estar ordenado
    if (estado.timestampAtual !== null && timestamp < estado.timestampAtual) {
      throw new Error(
        `Arquivo fora de ordem: ${timestamp} veio depois de ${estado.timestampAtual}`,
      );
    }

    fecharLote(estado);
    estado.lote = [];
    estado.timestampAtual = timestamp;
  }

  // Item leve: só o necessário para o pré-filtro e a Haversine, mais a linha original
  estado.lote.push({
    latitude: Number(linha.substring(p3 + 1, p4)),
    longitude: Number(linha.substring(p4 + 1, p5)),
    linha: linha,
  });
}

/**
 * Lê um dataset em pedaços (stream), corta as linhas manualmente,
 * agrupa as posições por timestamp e detecta os encontros de cada lote.
 * Cortar as linhas na mão evita o custo por linha do módulo readline,
 * e o parse preguiçoso evita converter campos que quase nunca são usados.
 * @param {string} caminhoEntrada - caminho do arquivo .txt
 * @param {number} [tamanhoPedaco] - tamanho de cada leitura, em bytes (os testes usam valores pequenos)
 * @returns {Promise<Object[]>} todos os encontros do arquivo, em ordem de timestamp
 */
export async function processarArquivo(
  caminhoEntrada,
  tamanhoPedaco = TAMANHO_PEDACO_PADRAO,
) {
  const estado = {
    encontros: [],
    lote: [],
    timestampAtual: null,
    ehCabecalho: true,
  };

  const stream = fs.createReadStream(caminhoEntrada, {
    encoding: "utf8",
    highWaterMark: tamanhoPedaco,
  });

  // Pedaço de linha que sobrou no fim do pedaço anterior (linha cortada ao meio)
  let resto = "";

  for await (const pedaco of stream) {
    // Junta a sobra do pedaço anterior com o pedaço novo
    const texto = resto + pedaco;

    // Corta todas as linhas completas (que terminam em \n) deste texto
    let inicio = 0;
    let fim = texto.indexOf("\n", inicio);
    while (fim !== -1) {
      processarLinha(estado, texto.slice(inicio, fim));
      inicio = fim + 1;
      fim = texto.indexOf("\n", inicio);
    }

    // O que vem depois do último \n é uma linha incompleta: guarda para o próximo pedaço
    resto = texto.slice(inicio);
  }

  // Última linha do arquivo, caso ele não termine com \n
  if (resto !== "") {
    processarLinha(estado, resto);
  }

  // O último lote não é seguido por nenhum timestamp diferente: processa agora
  fecharLote(estado);

  return estado.encontros;
}
