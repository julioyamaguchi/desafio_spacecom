// src/processador.js
import fs from 'node:fs';
import { parsearLinha } from './parser.js';
import { detectarEncontros } from './encontros.js';

// Tamanho de cada pedaço lido do disco: 1 MB.
// Pedaços grandes = menos idas ao disco; a memória continua constante.
const TAMANHO_PEDACO_PADRAO = 1024 * 1024;

/**
 * Processa o lote atual (se houver) e guarda os encontros encontrados.
 * @param {{ encontros: Object[], lote: Object[] }} estado
 */
function fecharLote(estado) {
    const encontrosDoLote = detectarEncontros(estado.lote);
    for (const encontro of encontrosDoLote) {
        estado.encontros.push(encontro);
    }
}

/**
 * Trata uma linha do arquivo: pula o cabeçalho e linhas vazias,
 * interpreta a linha e organiza os monitorados em lotes por timestamp.
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
    if (linha === '') {
        return;
    }

    const monitorado = parsearLinha(linha);

    // Mudou o timestamp: o lote anterior está completo e pode ser processado
    if (monitorado.timestamp !== estado.timestampAtual) {
        // Proteção: a abordagem por lotes depende do arquivo estar ordenado
        if (estado.timestampAtual !== null && monitorado.timestamp < estado.timestampAtual) {
            throw new Error(
                `Arquivo fora de ordem: ${monitorado.timestamp} veio depois de ${estado.timestampAtual}`
            );
        }

        fecharLote(estado);
        estado.lote = [];
        estado.timestampAtual = monitorado.timestamp;
    }

    estado.lote.push(monitorado);
}

/**
 * Lê um dataset em pedaços (stream), corta as linhas manualmente,
 * agrupa as posições por timestamp e detecta os encontros de cada lote.
 * Cortar as linhas na mão evita o custo por linha do módulo readline.
 * @param {string} caminhoEntrada - caminho do arquivo .txt
 * @param {number} [tamanhoPedaco] - tamanho de cada leitura, em bytes (os testes usam valores pequenos)
 * @returns {Promise<Object[]>} todos os encontros do arquivo, em ordem de timestamp
 */
export async function processarArquivo(caminhoEntrada, tamanhoPedaco = TAMANHO_PEDACO_PADRAO) {
    const estado = {
        encontros: [],
        lote: [],
        timestampAtual: null,
        ehCabecalho: true
    };

    const stream = fs.createReadStream(caminhoEntrada, {
        encoding: 'utf8',
        highWaterMark: tamanhoPedaco
    });

    // Pedaço de linha que sobrou no fim do pedaço anterior (linha cortada ao meio)
    let resto = '';

    for await (const pedaco of stream) {
        // Junta a sobra do pedaço anterior com o pedaço novo
        const texto = resto + pedaco;

        // Corta todas as linhas completas (que terminam em \n) deste texto
        let inicio = 0;
        let fim = texto.indexOf('\n', inicio);
        while (fim !== -1) {
            processarLinha(estado, texto.slice(inicio, fim));
            inicio = fim + 1;
            fim = texto.indexOf('\n', inicio);
        }

        // O que vem depois do último \n é uma linha incompleta: guarda para o próximo pedaço
        resto = texto.slice(inicio);
    }

    // Última linha do arquivo, caso ele não termine com \n
    if (resto !== '') {
        processarLinha(estado, resto);
    }

    // O último lote não é seguido por nenhum timestamp diferente: processa agora
    fecharLote(estado);

    return estado.encontros;
}