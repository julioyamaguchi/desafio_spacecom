/**
 * Remove todas as aspas duplas de um texto.
 * Ex.: '"2024-01-01 00:16:45"' → '2024-01-01 00:16:45'
 * @param {string} texto
 * @returns {string}
 */
function removerAspas(texto) {
  return texto.replaceAll('"', "");
}

/**
 * Converte o campo idsRestricaoMedida em um array de números.
 * Ex.: '"1,2,3"' → [1, 2, 3]   |   '' → []
 * @param {string} texto - campo bruto, como veio do arquivo
 * @returns {number[]}
 */
function converterIdsRestricao(texto) {
  const semAspas = removerAspas(texto);

  // Sem agressores: devolve array vazio (nunca null), para o includes() funcionar direto
  if (semAspas === "") {
    return [];
  }

  const partes = semAspas.split(",");
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
  // Passo 1: remove o \r do final (arquivos com quebra de linha do Windows)
  const linhaLimpa = linha.trimEnd();

  // Passo 2: separa os 7 campos pelo ponto e vírgula
  const campos = linhaLimpa.split(";");
  const id = campos[0];
  const faccao = campos[1];
  const timestamp = campos[2];
  const latitude = campos[3];
  const longitude = campos[4];
  const medidaProtetiva = campos[5];
  const idsRestricao = campos[6];

  // Passos 3 e 4: limpa as aspas e converte cada campo para o tipo certo
  return {
    idMonitorado: Number(id),
    // Facção vazia vira null; preenchida continua texto (é só um rótulo)
    faccaoMonitorado: faccao === "" ? null : faccao,
    // Timestamp fica como texto: só é comparado e escrito na saída
    timestamp: removerAspas(timestamp),
    latitude: Number(latitude),
    longitude: Number(longitude),
    // Comparação explícita: Boolean('false') seria true
    medidaProtetiva: medidaProtetiva === "true",
    idsRestricaoMedida: converterIdsRestricao(idsRestricao),
  };
}
