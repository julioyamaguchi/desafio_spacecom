// src/validar.js
// Compara os JSONs gerados em "saida" com as respostas oficiais em "dados".
// Uso: npm run validar
import fs from "node:fs";

const CASOS = ["respostas1.json", "respostas2.json"];

/**
 * Cria uma chave única para um encontro: tipo + par + timestamp + distância.
 * @param {Object} encontro
 * @returns {string}
 */
function chaveDoEncontro(encontro) {
  return `${encontro.tipo}|${encontro.monitoradosEncontro.join("-")}|${encontro.timestamp}|${encontro.distanciaMetros}`;
}

for (const nome of CASOS) {
  const esperados = JSON.parse(fs.readFileSync(`dados/${nome}`, "utf8"));
  const obtidos = JSON.parse(fs.readFileSync(`saida/${nome}`, "utf8"));

  const chavesEsperadas = new Set();
  for (const encontro of esperados) {
    chavesEsperadas.add(chaveDoEncontro(encontro));
  }

  let corretos = 0;
  let incorretos = 0;
  for (const encontro of obtidos) {
    if (chavesEsperadas.has(chaveDoEncontro(encontro))) {
      corretos++;
    } else {
      incorretos++;
      console.log(`  falso positivo: ${chaveDoEncontro(encontro)}`);
    }
  }

  const faltando = esperados.length - corretos;
  console.log(
    `${nome}: ${corretos}/${esperados.length} corretos, ${incorretos} incorretos, ${faltando} faltando`,
  );
}
