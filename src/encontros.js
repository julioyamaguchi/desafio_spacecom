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
