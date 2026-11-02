// src/haversine.js

// Raio da Terra em metros, conforme definido no enunciado do desafio
const RAIO_TERRA_METROS = 6371000;

/**
 * Converte um ângulo de graus para radianos.
 * As funções trigonométricas do JS (Math.sin, Math.cos...) trabalham em radianos.
 * @param {number} graus
 * @returns {number}
 */
function grausParaRadianos(graus) {
  // 180 graus = π radianos
  return (graus * Math.PI) / 180;
}

/**
 * Calcula a distância em metros entre dois pontos na superfície da Terra
 * usando a fórmula de Haversine.
 * @param {number} lat1 - latitude do ponto 1, em graus
 * @param {number} lon1 - longitude do ponto 1, em graus
 * @param {number} lat2 - latitude do ponto 2, em graus
 * @param {number} lon2 - longitude do ponto 2, em graus
 * @returns {number} distância em metros
 */
export function calcularDistancia(lat1, lon1, lat2, lon2) {
  // Diferenças calculadas em graus e só depois convertidas para radianos.
  // Essa ordem de operações reproduz exatamente as distâncias dos JSONs de resposta.
  const deltaLat = grausParaRadianos(lat2 - lat1);
  const deltaLon = grausParaRadianos(lon2 - lon1);

  // As latitudes também precisam estar em radianos para o cosseno
  const lat1Rad = grausParaRadianos(lat1);
  const lat2Rad = grausParaRadianos(lat2);

  // "a" é o quadrado da metade da corda entre os dois pontos (fórmula de Haversine)
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) ** 2;

  // "c" é a distância angular em radianos; multiplicada pelo raio vira metros
  const c = 2 * Math.asin(Math.sqrt(a));

  return RAIO_TERRA_METROS * c;
}
