import { test } from "node:test";
import assert from "node:assert/strict";
import { classificarEncontro, detectarEncontros } from "../src/encontros.js";

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

// ---------- detectarEncontros ----------

test("detecta o encontro protetivo 9 x 10 exatamente como no respostas1", () => {
  // Arrange: posições reais do timestamp 00:16:45 do dataset1
  const lote = [
    criarMonitorado({
      idMonitorado: 9,
      timestamp: "2024-01-01 00:16:45",
      latitude: 1.83355,
      longitude: -69.5461,
      medidaProtetiva: true,
      idsRestricaoMedida: [10],
    }),
    criarMonitorado({
      idMonitorado: 10,
      timestamp: "2024-01-01 00:16:45",
      latitude: 1.83351,
      longitude: -69.54618,
    }),
  ];
  const esperado = [
    {
      tipo: "protetiva",
      monitoradosEncontro: [9, 10],
      timestamp: "2024-01-01 00:16:45",
      posicoes: {
        9: { lat: 1.83355, lon: -69.5461 },
        10: { lat: 1.83351, lon: -69.54618 },
      },
      distanciaMetros: 9.941503149375345,
    },
  ];

  // Act
  const obtido = detectarEncontros(lote);

  // Assert
  assert.deepEqual(obtido, esperado);
});

test("não detecta encontro entre monitorados distantes", () => {
  // Arrange: um em Curitiba, outro a ~1 km de distância
  const lote = [
    criarMonitorado({
      idMonitorado: 1,
      latitude: -25.4284,
      longitude: -49.2733,
    }),
    criarMonitorado({
      idMonitorado: 2,
      latitude: -25.4374,
      longitude: -49.2733,
    }),
  ];

  // Act
  const obtido = detectarEncontros(lote);

  // Assert - array vazio é a reposta correta quando nao há encontro
  assert.deepEqual(obtido, []);
});

test("coloca o menor ID primeiro mesmo quando o maior vem antes no lote", () => {
  // Arrange: o 10 aparece antes do 9
  const lote = [
    criarMonitorado({
      idMonitorado: 10,
      latitude: 1.83351,
      longitude: -69.54618,
    }),
    criarMonitorado({
      idMonitorado: 9,
      latitude: 1.83355,
      longitude: -69.5461,
    }),
  ];

  // Act
  const obtido = detectarEncontros(lote);

  // Assert
  assert.deepEqual(obtido[0].monitoradosEncontro, [9, 10]);
});

test("registra cada par uma única vez em um lote com três monitorados próximos", () => {
  // Arrange: três pessoas no mesmo ponto formam 3 pares: (1,2), (1,3), (2,3)
  const lote = [
    criarMonitorado({
      idMonitorado: 1,
      latitude: -25.4284,
      longitude: -49.2733,
    }),
    criarMonitorado({
      idMonitorado: 2,
      latitude: -25.4284,
      longitude: -49.2733,
    }),
    criarMonitorado({
      idMonitorado: 3,
      latitude: -25.4284,
      longitude: -49.2733,
    }),
  ];

  // Act
  const obtido = detectarEncontros(lote);

  // Assert: 3 encontros, e não 6 (sem repetir o par invertido)
  assert.equal(obtido.length, 3);
});
