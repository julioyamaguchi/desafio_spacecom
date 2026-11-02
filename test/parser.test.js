// test/parser.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsearLinha } from "../src/parser.js";

// ---------- Casos válidos ----------

test("interpreta a linha de uma vítima com medida protetiva", () => {
  // Arrange: linha do monitorado 9 do dataset1
  const linha = '9;;"2024-01-01 00:16:45";1.83355;-69.5461;true;"10"';
  const esperado = {
    idMonitorado: 9,
    faccaoMonitorado: null,
    timestamp: "2024-01-01 00:16:45",
    latitude: 1.83355,
    longitude: -69.5461,
    medidaProtetiva: true,
    idsRestricaoMedida: [10],
  };

  // Act
  const obtido = parsearLinha(linha);

  // Assert: deepEqual compara o conteúdo do objeto, campo a campo
  assert.deepEqual(obtido, esperado);
});

test("interpreta a linha de um faccionado sem medida protetiva", () => {
  // Arrange: linha do monitorado 7 do dataset1
  const linha = '7;1;"2024-01-01 00:36:00";-13.02054;-46.40609;false;';
  const esperado = {
    idMonitorado: 7,
    faccaoMonitorado: "1", //numero apenas descritivo
    timestamp: "2024-01-01 00:36:00",
    latitude: -13.02054,
    longitude: -46.40609,
    medidaProtetiva: false,
    idsRestricaoMedida: [], //array vazio
  };

  // Act
  const obtido = parsearLinha(linha);

  // Assert
  assert.deepEqual(obtido, esperado);
});

test("ignora o \\r no final da linha (quebra de linha do Windows)", () => {
  // Arrange: a mesma linha do faccionado, mas terminando em \r
  const linha = '7;1;"2024-01-01 00:36:00";-13.02054;-46.40609;false;\r';
  const esperado = {
    idMonitorado: 7,
    faccaoMonitorado: "1",
    timestamp: "2024-01-01 00:36:00",
    latitude: -13.02054,
    longitude: -46.40609,
    medidaProtetiva: false,
    idsRestricaoMedida: [],
  };

  // Act
  const obtido = parsearLinha(linha);

  // Assert
  assert.deepEqual(obtido, esperado);
});

test("interpreta uma vítima com vários agressores", () => {
  // Arrange
  const linha = '5;;"2024-01-01 00:00:00";-30.1;-50.2;true;"1,2,3"';
  const esperado = [1, 2, 3];

  // Act
  const obtido = parsearLinha(linha);

  // Assert: aqui basta conferir o campo que importa neste teste
  assert.deepEqual(obtido.idsRestricaoMedida, esperado);
});
