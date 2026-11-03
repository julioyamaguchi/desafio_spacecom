// test/processador.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { processarArquivo } from '../src/processador.js';

const CAMINHO_DATASET1 = 'dados/dataset1.txt';
const CAMINHO_RESPOSTAS1 = 'dados/respostas1.json';

// Estes testes usam os arquivos reais da pasta dados/.
// Se eles não estiverem lá, os testes são pulados (em vez de falhar).
const semDados = !fs.existsSync(CAMINHO_DATASET1) || !fs.existsSync(CAMINHO_RESPOSTAS1);

test('o dataset1 gera exatamente o respostas1', { skip: semDados }, async () => {
    // Arrange
    const esperado = JSON.parse(fs.readFileSync(CAMINHO_RESPOSTAS1, 'utf8'));

    // Act
    const obtido = await processarArquivo(CAMINHO_DATASET1);

    // Assert
    assert.deepEqual(obtido, esperado);
});

test('linhas cortadas entre pedaços não mudam o resultado', { skip: semDados }, async () => {
    // Arrange: pedaços de 7 bytes cortam quase todas as linhas ao meio
    const esperado = JSON.parse(fs.readFileSync(CAMINHO_RESPOSTAS1, 'utf8'));

    // Act
    const obtido = await processarArquivo(CAMINHO_DATASET1, 7);

    // Assert
    assert.deepEqual(obtido, esperado);
});