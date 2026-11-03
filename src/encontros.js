// src/encontros.js
import { calcularDistancia } from "./haversine.js";

// Raio máximo (em metros) para configurar um encontro. A regra é estritamente menor.
const LIMITE_ENCONTRO_METROS = 20;

/**
 * Verifica se "possivelAgressor" está na lista de restrição da "vitima".
 * @param {{ medidaProtetiva: boolean, idsRestricaoMedida: number[] }} vitima
 * @param {{ idMonitorado: number }} possivelAgressor
 * @returns {boolean}
 */
function ehAgressorDe(vitima, possivelAgressor) {
  return (
    vitima.medidaProtetiva &&
    vitima.idsRestricaoMedida.includes(possivelAgressor.idMonitorado)
  );
}

/**
 * Classifica o encontro entre dois monitorados que já estão a menos de 20 m.
 * Cada encontro recebe um único tipo, checado em ordem de gravidade:
 * protetiva → faccao → generico.
 * @param {Object} a - monitorado no formato do parser
 * @param {Object} b - monitorado no formato do parser
 * @returns {'protetiva' | 'faccao' | 'generico'}
 */
export function classificarEncontro(a, b) {
  // 1. Protetiva: a lista de agressores fica na vítima, então checa os dois sentidos
  if (ehAgressorDe(a, b) || ehAgressorDe(b, a)) {
    return "protetiva";
  }

  // 2. Facção: os dois precisam TER facção (não null) e ela precisa ser a mesma
  if (
    a.faccaoMonitorado !== null &&
    a.faccaoMonitorado === b.faccaoMonitorado
  ) {
    return "faccao";
  }

  // 3. Qualquer outro encontro a menos de 20 m
  return "generico";
}

/**
 * Monta o objeto de encontro no formato exigido pelo JSON de saída.
 * O menor ID sempre vem primeiro em "monitoradosEncontro".
 * @param {Object} a - monitorado
 * @param {Object} b - monitorado
 * @param {'protetiva' | 'faccao' | 'generico'} tipo
 * @param {number} distancia - em metros
 * @returns {Object}
 */
function montarEncontro(a, b, tipo, distancia) {
  // Garante a ordem [menor, maior] independente da ordem em que o par chegou
  let primeiro = a;
  let segundo = b;
  if (b.idMonitorado < a.idMonitorado) {
    primeiro = b;
    segundo = a;
  }

  // As chaves de "posicoes" são os IDs; latitude/longitude viram lat/lon
  const posicoes = {};
  posicoes[primeiro.idMonitorado] = {
    lat: primeiro.latitude,
    lon: primeiro.longitude,
  };
  posicoes[segundo.idMonitorado] = {
    lat: segundo.latitude,
    lon: segundo.longitude,
  };

  return {
    tipo: tipo,
    monitoradosEncontro: [primeiro.idMonitorado, segundo.idMonitorado],
    timestamp: primeiro.timestamp,
    posicoes: posicoes,
    distanciaMetros: distancia,
  };
}

/**
 * Detecta todos os encontros dentro de um lote de monitorados do MESMO timestamp.
 * Compara cada par uma única vez (j começa em i + 1).
 * @param {Object[]} lote - monitorados de um mesmo timestamp
 * @returns {Object[]} encontros no formato de saída
 */
export function detectarEncontros(lote) {
  const encontros = [];

  for (let i = 0; i < lote.length; i++) {
    for (let j = i + 1; j < lote.length; j++) {
      const a = lote[i];
      const b = lote[j];

      const distancia = calcularDistancia(
        a.latitude,
        a.longitude,
        b.latitude,
        b.longitude,
      );

      // Filtro principal: a grande maioria dos pares para aqui
      if (distancia >= LIMITE_ENCONTRO_METROS) {
        continue;
      }

      const tipo = classificarEncontro(a, b);
      encontros.push(montarEncontro(a, b, tipo, distancia));
    }
  }

  return encontros;
}
