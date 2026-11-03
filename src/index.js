// src/index.js
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { parsearLinha } from "./parser.js";
import { detectarEncontros } from "./encontros.js";

const PASTA_DADOS = "dados";
const PASTA_SAIDA = "saida";

/**
 * Lê um dataset linha a linha (stream), agrupa as posições por timestamp
 * e detecta os encontros de cada lote.
 * O arquivo nunca é carregado inteiro na memória: só o lote do timestamp atual.
 * @param {string} caminhoEntrada - caminho do arquivo .txt
 * @returns {Promise<Object[]>} todos os encontros do arquivo, em ordem de timestamp
 */
export async function processarArquivo(caminhoEntrada) {
  const leitor = readline.createInterface({
    input: fs.createReadStream(caminhoEntrada, { encoding: "utf8" }),
    crlfDelay: Infinity, // trata \r\n como uma única quebra de linha
  });

  const encontros = [];
  let lote = [];
  let timestampAtual = null;
  let ehCabecalho = true;

  for await (const linha of leitor) {
    // A primeira linha é o cabeçalho: pula
    if (ehCabecalho) {
      ehCabecalho = false;
      continue;
    }

    const monitorado = parsearLinha(linha);

    // Mudou o timestamp: o lote anterior está completo e pode ser processado
    if (monitorado.timestamp !== timestampAtual) {
      // Proteção: a abordagem por lotes depende do arquivo estar ordenado
      if (timestampAtual !== null && monitorado.timestamp < timestampAtual) {
        throw new Error(
          `Arquivo fora de ordem: ${monitorado.timestamp} veio depois de ${timestampAtual}`,
        );
      }

      const encontrosDoLote = detectarEncontros(lote);
      for (const encontro of encontrosDoLote) {
        encontros.push(encontro);
      }

      // Começa um lote novo com o monitorado atual
      lote = [];
      timestampAtual = monitorado.timestamp;
    }

    lote.push(monitorado);
  }

  // O último lote não é seguido por nenhum timestamp diferente,
  // então precisa ser processado depois que o loop termina
  const encontrosDoUltimoLote = detectarEncontros(lote);
  for (const encontro of encontrosDoUltimoLote) {
    encontros.push(encontro);
  }

  return encontros;
}

/**
 * Gera o nome do arquivo de saída a partir do nome do dataset.
 * Ex.: dados/dataset3.txt → saida/respostas3.json
 * @param {string} caminhoEntrada
 * @returns {string}
 */
function caminhoDeSaida(caminhoEntrada) {
  const nome = path.basename(caminhoEntrada, ".txt"); // 'dataset3'
  const nomeSaida = nome.replace("dataset", "respostas"); // 'respostas3'
  return path.join(PASTA_SAIDA, `${nomeSaida}.json`);
}

/**
 * Lista os datasets a processar: os passados na linha de comando
 * ou, se nenhum for passado, todos os .txt da pasta "dados".
 * @returns {string[]}
 */
function listarDatasets() {
  const argumentos = process.argv.slice(2);
  if (argumentos.length > 0) {
    return argumentos;
  }

  const arquivos = fs.readdirSync(PASTA_DADOS);
  const datasets = [];
  for (const arquivo of arquivos) {
    if (arquivo.endsWith(".txt")) {
      datasets.push(path.join(PASTA_DADOS, arquivo));
    }
  }
  // Ordena para processar dataset1, dataset2, ... em ordem
  datasets.sort();
  return datasets;
}

async function main() {
  fs.mkdirSync(PASTA_SAIDA, { recursive: true });

  const datasets = listarDatasets();
  for (const caminhoEntrada of datasets) {
    const inicio = performance.now();
    const encontros = await processarArquivo(caminhoEntrada);
    const duracaoMs = performance.now() - inicio;

    const caminhoSaidaArquivo = caminhoDeSaida(caminhoEntrada);
    fs.writeFileSync(caminhoSaidaArquivo, JSON.stringify(encontros, null, 2));

    console.log(
      `${caminhoEntrada}: ${encontros.length} encontros em ${duracaoMs.toFixed(0)} ms → ${caminhoSaidaArquivo}`,
    );
  }
}

main();
