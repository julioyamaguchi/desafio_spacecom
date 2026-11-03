// Código do caractere \r (carriage return), usado nas quebras de linha do Windows
const CODIGO_CR = 13;

/**
 * Remove o primeiro e o último caractere de um texto (as aspas do formato do dataset).
 * Ex.: '"2024-01-01 00:16:45"' → '2024-01-01 00:16:45'
 * Mais barato que replaceAll: não percorre o texto procurando aspas,
 * porque o formato garante que elas estão só nas pontas.
 * @param {string} texto
 * @returns {string}
 */
function removerAspasDasPontas(texto) {
    return texto.slice(1, -1);
}

/**
 * Converte o campo idsRestricaoMedida em um array de números.
 * Ex.: '"1,2,3"' → [1, 2, 3]   |   '' → []
 * @param {string} texto - campo bruto, como veio do arquivo
 * @returns {number[]}
 */
function converterIdsRestricao(texto) {
    // Caso mais comum (quem não é vítima): campo vazio, sai antes de qualquer processamento
    if (texto === '') {
        return [];
    }

    const semAspas = removerAspasDasPontas(texto);
    if (semAspas === '') {
        return [];
    }

    const partes = semAspas.split(',');
    const ids = [];
    for (const parte of partes) {
        ids.push(Number(parte));
    }
    return ids;
}

/**
 * Converte uma linha do dataset em um objeto de monitorado.
 * Formato da linha:
 * idMonitorado;faccaoMonitorado;timestamp;latitude;longitude;medidaProtetiva;idsRestricaoMedida
 * @param {string} linha - linha bruta do arquivo (sem o cabeçalho)
 * @returns {{
 *   idMonitorado: number,
 *   faccaoMonitorado: string | null,
 *   timestamp: string,
 *   latitude: number,
 *   longitude: number,
 *   medidaProtetiva: boolean,
 *   idsRestricaoMedida: number[]
 * }}
 */
export function parsearLinha(linha) {
    // Remove o \r do final só se ele existir (arquivos com quebra de linha do Windows).
    // Checar o último caractere é mais barato que trimEnd(), que procura vários tipos de espaço.
    let linhaLimpa = linha;
    if (linha.charCodeAt(linha.length - 1) === CODIGO_CR) {
        linhaLimpa = linha.slice(0, -1);
    }

    const campos = linhaLimpa.split(';');
    const id = campos[0];
    const faccao = campos[1];
    const timestamp = campos[2];
    const latitude = campos[3];
    const longitude = campos[4];
    const medidaProtetiva = campos[5];
    const idsRestricao = campos[6];

    return {
        idMonitorado: Number(id),
        // Facção vazia vira null; preenchida continua texto (é só um rótulo)
        faccaoMonitorado: faccao === '' ? null : faccao,
        // Timestamp fica como texto: só é comparado e escrito na saída
        timestamp: removerAspasDasPontas(timestamp),
        latitude: Number(latitude),
        longitude: Number(longitude),
        // Comparação explícita: Boolean('false') seria true
        medidaProtetiva: medidaProtetiva === 'true',
        idsRestricaoMedida: converterIdsRestricao(idsRestricao)
    };
}