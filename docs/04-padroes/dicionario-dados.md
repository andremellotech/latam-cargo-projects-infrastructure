# Dicionário de dados

## Dados públicos (`data/`)
| Arquivo | Conteúdo |
|---|---|
| `config.json` | Pesos do score, faixas, camadas, data de atualização, aviso |
| `locations.json` | Localidades, componentes do score, evidências, frentes, fontes, confiança |
| `corridors.json` | Corredores com frequência semanal (marca se derivado) |
| `initiatives.json` | Marcos públicos de infraestrutura e malha |
| `kpis.json` | Indicadores públicos (campo opcional `note`) |
| `opportunities.json` | Hipóteses de atuação e dados necessários |
| `sources.json` | Fontes e fatos |
| `references.json` | Padrões de painéis de mercado usados como referência |
| `americas-paths.json` | Geometria do mapa (gerada por `scripts/build-map.py`) |

## Dados de gestão (`data/demo/` e `data/internal/`, mesmo formato)
Valores monetários em **reais inteiros**; datas `AAAA-MM-DD`; meses `AAAA-MM`. `terminal` usa o código da localidade ou `REDE`.

| Arquivo | Estrutura |
|---|---|
| `meta.json` | `synthetic` (true só na demonstração), `label`, `asOf` (data de corte), `currency`, `timeline` {`start`, `months`, `asOfIdx`} |
| `terminals.json` | Lista: `code`, `areaM2`, `capacityTMonth`, `docks`, `coldRoomM2`, `targets` (uma meta por KPI com `targetKey`: occupancy, dwell, costPerT, service, incidents, opexAdherence, yield, margin (derivada de yield e costPerT), productivity, dockUtil, truckTurn, damage, tempExc, traceAcc), `assessment` {capacity, flow, assets, safety, systems, coldchain: 1 a 5}, `seasonal` {label, start} ou null |
| `series.json` | `months` (12), `defs` (lista de KPIs) e `byTerminal[código]` (um array de 12 valores por série). Ver a seção **KPIs** abaixo |
| `projects.json` | `id`, `name`, `terminal`, `type`, `phase`, `owner`, `start`, `endBaseline`, `endForecast`, `budget`, `capexActual`, `progress` (0-100), `impact`/`effort` (1-5), `benefit`, `spendPlan` (months), `spendActual` (asOfIdx+1), `spendForecast` (months − asOfIdx − 1) |
| `cases.json` | `id`, `name`, `projectId`, `capex`, `benefit`, `opex`, `years`, `rate`, `benefitGrowth`, `opexGrowth`, `residual`, `breakdown` [{label, value}] (soma = `benefit`), `assumptions` |
| `risks.json` | `id`, `title`, `terminal`, `projectId`, `category`, `probability`, `impact` (1-5), `owner`, `mitigation`, `status`, `trend` (up/flat/down), `due` |
| `suppliers.json` | `id`, `name`, `type`, `terminals`, `annualValue`, `contractEnd`, `slaTarget`, `sla` (6 meses), `costIndex`, `safety`, `responsiveness` (1-5), `incidentsYtd` |
| `lanes.json` | `id`, `from`, `to`, `terminal`, `km`, `tripsWeek`, `tonsWeek`, `onTime`, `costPerT`, `utilization`, `supplier` |
| `pipeline.json` | `id`, `name`, `location`, `category`, `stage`, `annualValue`, `probability`, `nextStep`, `owner`, `decisionDate`, `hypothesis` |
| `consultant.json` | `decisions` [{id, title, owner, due, link, recommendation, why}] e `actions` [{id, horizon (30/60/90), title, owner, link, status}] |

### KPIs (`series.json`)
Cada item de `defs`:

| Campo | Significado |
|---|---|
| `id`, `name`, `unit`, `decimals` | identificação e exibição |
| `group` | `financial` ou `operational` |
| `dir` | `min` (menor é melhor), `max` (maior é melhor) ou `info` (sem meta) |
| `targetKey`, `tol` | chave da meta em `terminals[].targets` e tolerância relativa do âmbar (absoluta para incidentes) |
| `definition`, `formula`, `owner`, `frequency` | dicionário do KPI |
| `agg` | `sum`, `ratio` ou `wavg` (consolidação da rede; ver metodologia) |
| `scale` | divisor de exibição (ex.: 1000000 para mostrar R$ mi); opcional |
| `tier` | **1** = KPI executivo (aparece no quadro executivo, na Visão do consultor, no mapa de calor e na ficha do mapa); **2** = KPI de apoio. O teste exige de 6 a 9 KPIs de nível 1, todos com meta, com ao menos um financeiro e um operacional |
| `pillar` | Pergunta de gestão que o KPI responde (obrigatório no nível 1): Resultado, Custo, Capacidade, Cliente, Qualidade, Segurança |
| `why` | Uma frase em linguagem simples sobre por que o KPI importa (obrigatório) |
| `drivers` | Lista de `id` de KPIs que o movem (relação analítica a validar); opcional |
| `targetSeries` | Nome de uma série mensal por terminal usada como meta (ex.: `contributionBudget`); exige `agg` = `sum` |

Séries por terminal (12 valores cada): `throughput`, `occupancy`, `dwell`, `costPerT`, `service`, `incidents`, `productivity`, `dockUtil`, `truckTurn`, `damage`, `tempExc`, `traceAcc`, `yield`, `revenue`, `opex`, `opexAdherence`, `margin`, `contribution` e as séries de apoio `opexBudget`, `volumeBudget` e `contributionBudget`.

Identidades exigidas (verificadas pelo teste): `opex = volume × custoPorTonelada`; `revenue = volume × yield`; `contribution = revenue − opex`; `opexBudget = volumeBudget × meta de custo`; `contributionBudget = volumeBudget × (meta de yield − meta de custo)`; `opexAdherence = opex ÷ opexBudget × 100`; `margin = (revenue − opex) ÷ revenue × 100`; `occupancy = volume ÷ capacidade × 100`. Além disso, a meta de margem não pode ser inalcançável nem destoar em mais de 0,6 p.p. da implícita pelas metas de yield e de custo. Valores monetários em reais inteiros.

O `npm test` confere: somas (plano e realizado por mês, composição do benefício), previsão = EAC, ocupação = volume/capacidade, vínculos entre arquivos, intervalos e datas.
