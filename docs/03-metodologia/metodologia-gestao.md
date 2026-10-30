# Metodologia dos números de gestão

Aplica-se aos modos **demonstração** e **interno**. Todas as fórmulas estão em `js/core.js` e `js/analytics.js` e são verificadas por `npm test`.

## Valor agregado (EVM) por projeto
| Sigla | Cálculo |
|---|---|
| PV (valor planejado) | orçamento × % planejado. O % planejado é **linear** entre o início e o fim da linha de base |
| EV (valor agregado) | orçamento × % de avanço físico |
| AC (custo real) | CAPEX realizado |
| SPI | EV / PV |
| CPI | EV / AC |
| EAC (previsão no término) | orçamento / CPI (ou o realizado, se concluído) |
| VAC | orçamento − EAC |

Limitação: o planejamento linear é uma simplificação. Se o cronograma real tiver curva em S, informe o % planejado real ao carregar dados internos.

## Status do projeto (semáforo)
Pelo **menor** entre SPI e CPI: ≥ 0,95 **no plano**; ≥ 0,85 **atenção**; abaixo disso **crítico**. Projetos concluídos (avanço 100%) e não iniciados têm tratamento próprio.

## Curva S
Soma mensal dos projetos: planejado (distribuição do orçamento entre início e fim base), realizado até a data de corte e previsão (EAC − realizado distribuído até o fim previsto).

## Indicadores operacionais
Cada terminal tem meta por indicador. O semáforo compara o último mês com a meta, com tolerância: ocupação 4%, permanência 8%, custo por tonelada 5%, nível de serviço 1,5%, incidentes 0,5. Variação = último mês menos a média dos 3 meses anteriores. Ocupação = volume / capacidade mensal.

## Saúde do terminal
Média de 6 dimensões avaliadas de 1 a 5: capacidade, fluxo, ativos, segurança, sistemas e cadeia fria. Célula ≤ 2 vermelho, 3 âmbar, ≥ 4 verde; média < 2,5 vermelho, < 3,5 âmbar.

## Business case
Fluxo: ano 0 = −CAPEX; anos 1..N = benefício − OPEX, com crescimento anual de cada um, mais o valor residual no último ano. Resultados: VPL, TIR (bissecção), payback simples e descontado. Recomendação: **aprovar** se VPL > 0 e TIR ≥ custo de capital + 5 p.p.; **reavaliar** se VPL > 0 com retorno marginal; **não aprovar** se VPL ≤ 0. O tornado varia benefício, CAPEX e OPEX em ±20%, taxa em ±2 p.p. e crescimento do benefício em ±2 p.p.

## KPIs: nível executivo e KPIs de apoio

O portal tem **18 KPIs** (7 financeiros e 11 operacionais), em dois níveis. Cada KPI tem definição, fórmula, responsável, periodicidade, **por que importa** e os KPIs que o movem (`drivers`). A justificativa da escolha está em `docs/08-revisao-executiva-de-kpis.md`.

### Nível 1: quadro executivo (8 KPIs)
Respondem a uma pergunta de gestão cada (pilar). Aparecem na Visão do consultor, no quadro executivo, no mapa de calor, na tabela de Terminais e na ficha do mapa.

| KPI | Pilar | Unidade | Fórmula | Leitura | Tolerância do âmbar | Responsável |
|---|---|---|---|---|---|---|
| Contribuição | Resultado | R$ mi | receita alocada − OPEX; meta = volume orçado × (receita-meta − custo-meta por tonelada) | maior é melhor | 5% | Finanças |
| Margem de contribuição | Resultado | % | (receita alocada − OPEX) ÷ receita alocada × 100; meta derivada das metas de receita e de custo por tonelada | maior é melhor | 5% | Finanças |
| Custo por tonelada | Custo | R$/t | OPEX ÷ toneladas processadas | menor é melhor | 5% | Controladoria |
| Ocupação da capacidade | Capacidade | % | toneladas processadas ÷ capacidade mensal × 100 | menor é melhor | 4% | Operações |
| Nível de serviço | Cliente | % | embarques no prazo ÷ embarques totais × 100 | maior é melhor | 1.5% | Operações |
| Avarias e extravios | Qualidade | % | toneladas com ocorrência ÷ toneladas processadas × 100 | menor é melhor | 15% | Qualidade |
| Cargas fora da faixa de temperatura | Qualidade | % | cargas com excursão ÷ cargas refrigeradas × 100 | menor é melhor | 20% | Qualidade |
| Incidentes operacionais | Segurança | ocorr./mês | contagem de ocorrências | menor é melhor | 50% | Segurança Operacional |

### Nível 2: KPIs de apoio (10 KPIs)
Explicam o que move os executivos. Ficam nas abas **Financeiros** e **Operacionais** de Indicadores.

| KPI | Pilar | Unidade | Fórmula | Leitura | Tolerância do âmbar | Responsável |
|---|---|---|---|---|---|---|
| OPEX frente ao orçamento | – | % | OPEX realizado ÷ OPEX orçado × 100, com OPEX orçado = volume orçado × custo-meta por tonelada | menor é melhor | 5% | Controladoria |
| Custo operacional (OPEX) | – | R$ mi | toneladas processadas × custo por tonelada | informativo | – | Controladoria |
| Receita alocada | – | R$ mi | toneladas processadas × receita por tonelada | informativo | – | Finanças |
| Receita por tonelada | – | R$/t | receita alocada ÷ toneladas processadas | maior é melhor | 3% | Finanças |
| Volume processado | – | t | soma das toneladas movimentadas | informativo | – | Operações |
| Produtividade | – | kg por hora-homem | kg processados ÷ horas-homem | maior é melhor | 5% | Operações |
| Tempo de permanência | – | h | média de (expedição − recebimento) por embarque | menor é melhor | 8% | Operações |
| Utilização de docas | – | % | horas de doca ocupadas ÷ horas de doca disponíveis × 100 | menor é melhor | 4% | Operações |
| Tempo de giro de caminhão | – | min | média de (saída − chegada) por caminhão | menor é melhor | 8% | Logística Terrestre |
| Acurácia de rastreabilidade | – | % | eventos corretos ÷ eventos esperados × 100 | maior é melhor | 2% | Sistemas |

Semáforo: verde se atinge a meta; âmbar se fica dentro da tolerância; vermelho além disso. KPIs informativos não têm meta.

### Consolidação da rede
A rede (ou o recorte de país/camada) **não** é a média simples dos terminais: somas são somadas e razões são recalculadas.

| Tipo | KPIs | Regra |
|---|---|---|
| Aditivos | volume, OPEX, receita alocada, contribuição, incidentes | soma dos terminais |
| Razões | ocupação, custo por tonelada, receita por tonelada, OPEX frente ao orçamento, margem | soma do numerador ÷ soma do denominador (ex.: margem = (Σ receita − Σ OPEX) ÷ Σ receita) |
| Médias ponderadas | produtividade, permanência, nível de serviço, docas, giro, avarias, temperatura, rastreabilidade | média ponderada pelo volume do mês |

A meta da rede é a soma das metas (KPIs aditivos, inclusive a contribuição orçada) ou a média das metas ponderada pelo volume (demais).

### A média da rede pode esconder terminais
Como a rede é consolidada, um KPI pode estar verde na rede com terminais vermelhos. O quadro executivo sinaliza **"média esconde terminais no vermelho"** nesse caso, mostra quantos terminais estão em vermelho, atenção e na meta, qual é o pior terminal, e o mapa de calor mostra todos os terminais lado a lado.

### Duração fora da meta
O semáforo é um retrato do mês; a **duração** mostra se o problema é pontual ou crônico. Conta os meses consecutivos, até o último, em que o KPI ficou em atenção ou vermelho (para na primeira vez que volta ao verde). Quando a contagem chega ao tamanho da série (12 meses), a tela diz "todos os 12 meses da série", pois a janela é a única informação disponível.

### Metas coerentes entre si
A **meta de margem é derivada** das metas de receita e de custo por tonelada: `(receita-meta − custo-meta) ÷ receita-meta`. A **contribuição orçada** é `volume orçado × (receita-meta − custo-meta)`. Assim os três KPIs contam a mesma história. O `npm test` falha se a meta de margem for inalcançável mesmo cumprindo as outras duas, ou se destoar delas em mais de 0,6 p.p. (vale também para dados internos).

### Contribuição: volume, preço e custo
Contribuição = receita alocada − OPEX. O desvio contra o orçado fecha **exatamente** em três efeitos:

- **Volume** = (volume real − volume orçado) × (receita-meta − custo-meta). Mais ou menos carga que o orçado, valorada à margem unitária da meta.
- **Receita por tonelada (preço)** = volume real × (receita real − receita-meta) por tonelada.
- **Custo por tonelada** = − volume real × (custo real − custo-meta) por tonelada.

Identidade: `(v − vb)(yT − cT) + v(y − yT) − v(c − cT) = v(y − c) − vb(yT − cT)`. É o único efeito em R$ que o quadro executivo mostra, porque é o único com identidade contábil.

### Desvio de OPEX: volume x custo unitário
O OPEX orçado é **volume orçado × custo-meta por tonelada**. O desvio (realizado − orçado) fecha em duas partes:

- **Efeito volume** = (volume real − volume orçado) × custo-meta. Custo variável de mover mais ou menos carga; pede revisão do orçamento, não ação operacional.
- **Efeito custo unitário** = (custo real − custo-meta) × volume real. Pagar mais ou menos por tonelada que a meta: ineficiência ou preço.

### Leitura executiva
De 3 a 5 frases **calculadas dos dados** (nenhum número está escrito à mão): quantos KPIs executivos estão na meta, a contribuição frente ao orçado e o maior efeito, o terminal que concentra vermelhos, os KPIs fora da meta há mais tempo e os casos em que a média esconde terminais. O `npm test` exige de 3 a 5 frases de até 260 caracteres.

### Efeito em R$ só onde há base
A coluna "Efeito na contribuição" aparece só para **contribuição** (desvio total) e **custo por tonelada** (efeito do custo). Para ocupação, serviço, avarias, temperatura e incidentes não há base para converter em reais sem premissas inventadas; o campo fica em branco de propósito.

### Financeiro do portfólio de projetos
- **CAPEX realizado x planejado até a data** = Σ realizado ÷ Σ plano mensal acumulado até a data de corte. Abaixo de 100% pode ser atraso de execução, não economia: ler junto com o SPI.
- **Previsão (EAC) x orçamento** = Σ EAC ÷ Σ orçamento.
- **VPL dos casos recomendados** e **índice de rentabilidade** (VPL ÷ CAPEX dos mesmos casos).

### Receita alocada
A LATAM Cargo não divulga receita por terminal. A **receita alocada** é uma regra de alocação (preço de transferência) a definir com Finanças; no modo demonstração é fictícia. Sem essa regra, use apenas os KPIs de custo.

### Variação mostrada nos cartões
Último mês menos a média dos 3 meses anteriores. Variações que arredondam para zero na unidade do KPI aparecem como estáveis (seta neutra). **Não é ajustada à sazonalidade**: terminais com temporada (ex.: safra de cerejas, flores) variam por estação. Com apenas 12 meses de série não há comparação com o mesmo mês do ano anterior.

## Riscos
Nota = probabilidade × impacto (1 a 25): ≥ 15 crítico, 8 a 14 médio, < 8 baixo.

## Fornecedores
Score = SLA 40% (média de 6 meses sobre a meta, limitada a 100) + custo 25% (100 − 2,5 por ponto do índice acima de 100) + segurança 20% + responsividade 15%. ≥ 85 verde, ≥ 70 âmbar. Ação sugerida: renegociar/renovar se o contrato vence em até 180 dias; plano de melhoria ou reavaliação conforme o score.

## Mensagens-chave do consultor
Regras em `js/analytics.js` (função `insights`), em ordem de gravidade:
1. Ocupação acima da meta (≥ 90% crítico), com número de meses consecutivos.
2. Projeto de cadeia fria que termina depois do início da temporada do terminal.
3. Projeto crítico (SPI/CPI), com EAC e atraso.
4. Riscos críticos (nota ≥ 15), agrupados.
5. Contratos que vencem em até 180 dias.
6. SLA de fornecedor em queda de 1 p.p. ou mais em 6 meses.
7. Terminais com custo por tonelada mais de 5% acima da meta.
8. **OPEX da rede mais de 3% acima do orçado** (crítico acima de 8%), com a decomposição em efeito volume e custo unitário e os maiores desvios.
9. **Margem de contribuição vermelha** em um ou mais terminais.
10. **Cargas fora da faixa de temperatura (vermelho)** em um terminal (crítico a partir de 2× a meta), ligadas ao projeto de cadeia fria do terminal.
11. **Acurácia de rastreabilidade vermelha**, ligada aos projetos de tecnologia em andamento.
12. Business cases com VPL negativo e casos que continuam (ou deixam de ser) viáveis com o CAPEX previsto (EAC) do projeto.

As mensagens respeitam os filtros de país, camada e score mínimo. São o ponto de partida da discussão, não uma decisão.
