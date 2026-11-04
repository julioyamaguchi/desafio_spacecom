# Detecção de Encontros — Desafio Trainee Tech Spacecom 2027

Algoritmo em **JavaScript (Node.js)** que processa dados de geolocalização de monitorados
(tornozeleiras eletrônicas) e vítimas com medida protetiva, e detecta encontros físicos
a menos de 20 metros, classificados em **protetiva**, **faccao** ou **generico**.

- Sem dependências externas: só o Node.js
- Leitura em stream: memória constante, mesmo com arquivos de mais de 600 MB
- 20 testes automatizados (`node:test`)
- Dataset de 638 MB processado em menos de 9 s
- Validado contra as respostas oficiais: **4/4** no dataset1 e **6/6** no dataset2, JSON idêntico

---

## Como executar

**Requisito:** Node.js 18 ou mais novo (testado na v20, no Windows e no Linux).
Não é preciso rodar `npm install`.

1. Coloque os datasets (`dataset1.txt` a `dataset7.txt`) e as respostas de exemplo
   (`respostas1.json` e `respostas2.json`) na pasta `dados/`.
2. Rode:

```bash
npm start            # processa todos os datasets de dados/ e grava os JSONs em saida/
npm test             # roda os testes automatizados
npm run validar      # compara saida/respostas1 e 2 com as respostas oficiais
```

Para processar só um arquivo:

```bash
node src/index.js dados/dataset3.txt
```

Cada `datasetN.txt` gera um `saida/respostasN.json`.

---

## Resultados

| Dataset | Tamanho | Encontros | Tempo |
|---|---|---|---|
| 1 | 261 KB | 4 | 14 ms |
| 2 | 1,3 MB | 6 | 24 ms |
| 3 | 5,3 MB | 10 | 71 ms |
| 4 | 21 MB | 15 | 262 ms |
| 5 | 53 MB | 21 | 645 ms |
| 6 | 423 MB | 27 | 5,4 s |
| 7 | 638 MB | 35 | 8,6 s |

Tempos da versão final, medidos em Windows com Node.js v20.11.1.

---

## Regras de negócio adotadas

| Regra | Decisão |
|---|---|
| Encontro | Mesmo timestamp exato e distância de Haversine **menor** que 20 m (exatamente 20 m não conta) |
| Raio da Terra | 6.371.000 m, conforme o enunciado |
| Tipo | Cada encontro recebe **um único tipo**, checado em ordem de gravidade: protetiva → faccao → generico |
| Protetiva | Um dos dois é vítima e o outro está na lista `idsRestricaoMedida` dela. A lista fica na vítima, então os dois sentidos do par são verificados |
| Facção | Os dois têm facção preenchida **e** ela é a mesma. Facção vazia nunca conta como "mesma facção" |
| Genérico | Qualquer outro par a menos de 20 m: vítima com quem não é seu agressor, facções diferentes, pessoas sem facção |
| Unicidade | Cada par é comparado uma única vez por timestamp, e o menor ID vem primeiro em `monitoradosEncontro` |

**Por que um único tipo, nessa ordem:** os JSONs de resposta mostram um registro por par
(o par de facção [7, 8] aparece só como `faccao`, e não também como `generico`). A ordem segue
a gravidade para a segurança pública: um encontro entre vítima e agressor representa risco
direto a uma pessoa com medida judicial, e nunca deve ser mascarado por uma classificação menos grave.

**Por que vítima com outra pessoa é genérico:** o enunciado define o encontro genérico como
"entre quaisquer dois monitorados", e a vítima também possui `idMonitorado`. Os datasets de
exemplo não têm nenhum caso assim, então a decisão segue o texto literal do enunciado.

---

## Lógica da solução

```
arquivo .txt
   ↓ stream em pedaços de 1 MB, linhas cortadas manualmente
parsearLinha: texto → objeto com tipos corretos
   ↓ agrupa as linhas do mesmo timestamp em um lote
detectarEncontros(lote): compara cada par uma vez
   ↓ pré-filtro de latitude → Haversine → classificarEncontro
lista de encontros
   ↓ JSON.stringify
arquivo .json
```

### 1. Leitura em stream, por lotes de timestamp

O arquivo é lido em pedaços de 1 MB com `fs.createReadStream`, e as linhas são cortadas
manualmente com `indexOf('\n')`. A parte final de cada pedaço (uma linha cortada ao meio)
é guardada e colada no início do pedaço seguinte. Como os datasets são ordenados por
timestamp, as linhas de um mesmo instante chegam em sequência. O programa acumula essas
linhas em um **lote** e, quando o timestamp muda, processa o lote e o descarta.

- **Memória constante:** em qualquer momento existe só um lote (~100 monitorados) na memória,
  seja o arquivo de 1 MB ou de 10 GB.
- **Necessário, não só desejável:** o dataset7 tem 638 MB, e o tamanho máximo de uma string no
  Node é de cerca de 537 milhões de caracteres. Carregar o arquivo inteiro com `readFileSync`
  nem funcionaria.
- **Proteção:** se um timestamp vier fora de ordem, o programa para com uma mensagem de erro,
  em vez de gerar um resultado errado em silêncio.
- O último lote do arquivo é processado depois do fim da leitura, para não perder os encontros
  do último timestamp.

A entrada é grande, então é lida em stream. A saída é pequena (dezenas de encontros), então é
acumulada em memória e gravada de uma vez no final.

### 2. Parser com os tipos corretos

Cada linha vira um objeto. Decisões de conversão:

- `idMonitorado`, `latitude` e `longitude` viram **números**, porque saem como números no JSON.
- `faccaoMonitorado` continua **texto** (é um rótulo que só é comparado) ou vira `null` quando vazia.
- `medidaProtetiva` é convertida com `=== 'true'` (`Boolean('false')` seria `true`).
- As aspas do timestamp e da lista de restrição são removidas com `slice(1, -1)`, que é mais
  barato que procurar aspas no texto. Isso assume que as aspas vêm sempre nas pontas,
  conforme o formato do enunciado.
- `idsRestricaoMedida` vira um **array de números**, ou `[]` quando vazio, para o `includes()`
  funcionar sem casos especiais. Os IDs precisam ser números: `[10].includes('10')` é `false`.
- O `\r` final de arquivos com quebra de linha do Windows é removido.

### 3. Comparação de pares

Dentro de cada lote, o `j` começa em `i + 1`: cada par é comparado uma única vez, e ninguém é
comparado consigo mesmo. São N × (N − 1) / 2 comparações por timestamp.

### 4. Otimizações de desempenho

As otimizações foram feitas uma de cada vez, sempre medindo antes (para atacar a parte que
realmente consumia tempo) e conferindo depois que os 7 JSONs continuavam **idênticos** (`diff -r`).

**4.1 Pré-filtro de latitude**

Com 100 monitorados e cerca de 100 mil timestamps, o dataset7 tem perto de 500 milhões de
pares, e quase todos estão a quilômetros de distância. Antes da Haversine, o programa compara
só a diferença de latitude:

- 1 grau de latitude vale sempre ~111 km, em qualquer ponto da Terra.
- A distância real entre dois pontos nunca é menor que a distância norte-sul entre eles.
  Na fórmula de Haversine, o termo da longitude nunca é negativo, então
  `distância ≥ R × Δlatitude`.
- Se só a diferença de latitude já passa de **0,0002° (~22 m, 20 m + margem de segurança contra
  arredondamento)**, o par é descartado sem calcular seno, cosseno nem raiz quadrada.

O filtro só descarta pares que **com certeza** não são encontro. Os demais seguem para a
Haversine, que dá a palavra final.

**4.2 Parser mais barato**

O parser roda uma vez por linha (cerca de 10 milhões de vezes no dataset7). Foram removidas
operações que percorriam o texto sem necessidade: `replaceAll` trocado por `slice(1, -1)`,
`trimEnd()` trocado pela checagem só do último caractere (`\r`), e o campo de restrição
vazio (o caso mais comum) devolvido antes de qualquer processamento.

**4.3 Leitura manual em pedaços**

O módulo `readline` faz uma pausa assíncrona (`await`) para cada linha. A leitura manual faz
uma por pedaço de 1 MB: cerca de 640 no dataset7, em vez de 10 milhões. Um teste processa o
dataset1 com pedaços de 7 bytes (quase toda linha cortada ao meio) e confere que o resultado
continua idêntico ao `respostas1.json`.

**4.4 Parse preguiçoso**

Para quase todas as linhas, só três campos importam: o timestamp (para montar o lote) e a
latitude e a longitude (para o pré-filtro e a Haversine). Cada linha vira um item leve com
esses três valores e a linha original, localizados com `indexOf(';')`, sem `split`. O parse
completo (ID, facção, medida protetiva, lista de agressores) só acontece para os dois
monitorados de cada encontro: dezenas de vezes por arquivo, em vez de milhões.

**Evolução dos tempos** (versões v1 a v4 medidas em Linux, na mesma máquina):

| Versão | Dataset 6 (423 MB) | Dataset 7 (638 MB) |
|---|---|---|
| v1: solução direta | 19,0 s | 32,2 s |
| v2: + pré-filtro de latitude | 8,0 s | 12,8 s |
| v3: + parser otimizado | 6,9 s | 10,9 s |
| v4: + leitura manual em pedaços | 5,7 s | 9,1 s |

O parse preguiçoso (v5) reduziu mais cerca de 35% do tempo total, medido num arquivo de
teste de 92 MB na mesma máquina (de 1,70 s para 1,11 s). Desde a v1, o processamento ficou
cerca de 5 vezes mais rápido, sem nenhuma mudança nos resultados: os JSONs da v5 são
idênticos aos da v4.

### 5. Haversine

Implementada conforme o enunciado (R = 6.371.000 m). Entre as formas matematicamente
equivalentes da fórmula, foi escolhida a que reproduz **exatamente** as distâncias dos JSONs
de resposta (10 de 10), calculando as diferenças em graus antes de converter para radianos e
usando `asin`. Outras ordens de operação diferiam na última casa decimal por arredondamento
de ponto flutuante.

---

## Estrutura do projeto

```
src/
  index.js       linha de comando: lista os datasets, mede o tempo e grava os JSONs
  processador.js leitura em pedaços, corte das linhas, parse preguiçoso e lotes por timestamp
  parser.js      converte uma linha do dataset em objeto
  encontros.js   detecção dos pares, classificação e formato de saída
  haversine.js   cálculo da distância em metros
  validar.js     compara a saída com as respostas oficiais
test/            testes automatizados (node:test)
saida/           JSONs gerados para os 7 datasets
```

Funções de lógica (parser, Haversine, classificação e detecção) são **puras**: recebem dados e
devolvem dados, sem acessar arquivos. Por isso são testadas isoladamente. Só dois arquivos lidam
com o disco: o `processador.js` (leitura) e o `index.js` (gravação).

---

## Por que considero esta a melhor abordagem

1. **Correta:** reproduz exatamente as respostas oficiais e trata os casos que custariam pontos
   (facção vazia, ordem do par na medida protetiva, distância de exatamente 20 m, pares repetidos).
2. **Escalável:** memória constante independente do tamanho do arquivo. Num sistema real de
   rastreamento, os dados crescem continuamente.
3. **Eficiente:** cada otimização foi medida antes e validada depois; o pré-filtro elimina a maior
   parte do custo sem nenhum risco de perder encontros, e o dataset de 638 MB roda em ~9 s.
4. **Simples de rodar e auditar:** zero dependências, funções pequenas com uma responsabilidade
   cada e testes que documentam as regras de negócio.

## Uso de IA

Usei o Claude (Anthropic) ao longo do desafio, como tutor e par de programação, para pesquisa
e geração de código.

- As regras de negócio foram decididas por mim antes de programar: tipo único por encontro,
  ordem de prioridade, facção vazia não ser "mesma facção" e o limite de exatamente 20 m.
- Grande parte do código foi gerada pela IA a partir dessas decisões. Pedi a explicação de cada
  arquivo, linha a linha, até entender toda a lógica e a sintaxe.
- Validei tudo com os 20 testes, com a comparação contra as respostas oficiais e com `diff` dos
  7 JSONs a cada otimização (versões marcadas no Git, de v1 a v5).
