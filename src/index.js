// src/index.js
import fs from 'node:fs';
import path from 'node:path';
import { processarArquivo } from './processador.js';

const PASTA_DADOS = 'dados';
const PASTA_SAIDA = 'saida';

/**
 * Gera o nome do arquivo de saída a partir do nome do dataset.
 * Ex.: dados/dataset3.txt → saida/respostas3.json
 * @param {string} caminhoEntrada
 * @returns {string}
 */
function caminhoDeSaida(caminhoEntrada) {
    const nome = path.basename(caminhoEntrada, '.txt');   // 'dataset3'
    const nomeSaida = nome.replace('dataset', 'respostas'); // 'respostas3'
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
        if (arquivo.endsWith('.txt')) {
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
            `${caminhoEntrada}: ${encontros.length} encontros em ${duracaoMs.toFixed(0)} ms → ${caminhoSaidaArquivo}`
        );
    }
}

main();