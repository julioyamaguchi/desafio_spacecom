import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularDistancia } from "../src/haversine.js";

test("calcula a distância do encontro protetivo 9 x 10 do dataset1", () => {
  //Arrange: posições do monitorado 9  e da vitima 10 (respostas1.json)
  const lat9 = 1.83355;
  const lon9 = -69.5461;
  const lat10 = 1.83351;
  const lon10 = -69.54618;
  const distanciaEsperada = 9.941503149375345;

  //Act: chama a função com os dados
  const distanciaObtida = calcularDistancia(lat9, lon9, lat10, lon10);

  // Assert: verifica se são iguais
  assert.equal(distanciaObtida, distanciaEsperada);
});

test("calcula a distância do encontro de 2 pontos no mesmo lugar", () => {
  //Arrange: posições do monitorados na mesma posição
  const latA = -25.4284;
  const lonA = -49.2733;
  const latB = -25.4284;
  const lonB = -49.2733;
  const distanciaEsperada = 0;

  //Act: chama a função com os dados
  const distanciaObtida = calcularDistancia(latA, lonA, latB, lonB);
  // Assert: verifica se são iguais
  assert.equal(distanciaObtida, distanciaEsperada);
});

test("calcula a distância do encontro de facções do respostas2", () => {
  //Arrange: posições do faccionado 10 e 11 (respostas2.json)
  const lat10 = -14.62732;
  const lon10 = -36.31859;
  const lat11 = -14.62731;
  const lon11 = -36.31869;
  const distanciaEsperada = 10.81640474094182;

  //Act: chama a função com os dados
  const distanciaObtida = calcularDistancia(lat10, lon10, lat11, lon11);
  // Assert: verifica se são iguais
  assert.equal(distanciaObtida, distanciaEsperada);
});

test("a distância é a mesma independente da ordem dos pontos", () => {
  //Arrange: posições do faccionado 10 e 11 (respostas2.json)
  const lat10 = -14.62732;
  const lon10 = -36.31859;
  const lat11 = -14.62731;
  const lon11 = -36.31869;

  //Act: chama a função com os dados
  const distanciaAB = calcularDistancia(lat10, lon10, lat11, lon11);
  const distanciaBA = calcularDistancia(lat11, lon11, lat10, lon10);

  // Assert: a distância tem que ser a mesma nos dois sentidos
  assert.equal(distanciaAB, distanciaBA);
});
