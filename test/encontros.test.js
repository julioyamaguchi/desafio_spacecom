// test/encontros.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { classificarEncontro } from "../src/encontros.js";

/**
 * Cria um monitorado com valores padrão.
 * "dados" sobrescreve só os campos que o teste precisa.
 */
function criarMonitorado(dados) {
  return {
    idMonitorado: 1,
    faccaoMonitorado: null,
    timestamp: "2024-01-01 00:00:00",
    latitude: 0,
    longitude: 0,
    medidaProtetiva: false,
    idsRestricaoMedida: [],
    ...dados,
  };
}

test("vítima encontrando seu agressor é protetiva", () => {
  // Arrange
  const vitima = criarMonitorado({
    idMonitorado: 9,
    medidaProtetiva: true,
    idsRestricaoMedida: [10],
  });
  const agressor = criarMonitorado({ idMonitorado: 10 });

  // Act
  const tipo = classificarEncontro(vitima, agressor);

  // Assert
  assert.equal(tipo, "protetiva");
});

test("protetiva é detectada mesmo com o agressor na primeira posição", () => {
  // Arrange: mesma dupla do teste anterior, com a ordem invertida
  const vitima = criarMonitorado({
    idMonitorado: 9,
    medidaProtetiva: true,
    idsRestricaoMedida: [10],
  });
  const agressor = criarMonitorado({ idMonitorado: 10 });

  // Act
  const tipo = classificarEncontro(agressor, vitima);

  // Assert
  assert.equal(tipo, "protetiva");
});

test("dois monitorados da mesma facção é faccao", () => {
  // Arrange
  const a = criarMonitorado({ idMonitorado: 7, faccaoMonitorado: "1" });
  const b = criarMonitorado({ idMonitorado: 8, faccaoMonitorado: "1" });

  // Act
  const tipo = classificarEncontro(a, b);

  // Assert
  assert.equal(tipo, "faccao");
});

test("monitorados de facções diferentes é generico", () => {
  // Arrange
  const a = criarMonitorado({ idMonitorado: 7, faccaoMonitorado: "1" });
  const b = criarMonitorado({ idMonitorado: 8, faccaoMonitorado: "2" });

  // Act
  const tipo = classificarEncontro(a, b);

  // Assert
  assert.equal(tipo, "generico");
});

test("dois monitorados sem facção não são da mesma facção (generico)", () => {
  // Arrange: os dois com faccaoMonitorado null
  const a = criarMonitorado({ idMonitorado: 4 });
  const b = criarMonitorado({ idMonitorado: 6 });

  // Act
  const tipo = classificarEncontro(a, b);

  // Assert
  assert.equal(tipo, "generico");
});

test("vítima encontrando quem não é seu agressor é generico", () => {
  // Arrange
  const vitima = criarMonitorado({
    idMonitorado: 9,
    medidaProtetiva: true,
    idsRestricaoMedida: [10],
  });
  const outro = criarMonitorado({ idMonitorado: 99 });

  // Act
  const tipo = classificarEncontro(vitima, outro);

  // Assert
  assert.equal(tipo, "generico");
});
