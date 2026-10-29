# Changelog

## 2.3.0 — 2026-10-29
**Visual em vidro, busca global e painel de prazos** (`docs/09-design-vidro.md`)
- **Tema de vidro fosco** (claro e escuro) com degradê, superfícies translúcidas, cantos maiores e micro-interações; sem imagens de fundo nem dependências.
- **Menu com ícones** e **indicador deslizante** (vertical no desktop, horizontal no celular).
- **Busca global** na barra superior: localidades, marcos, hipóteses e fontes (sempre) e terminais, projetos, riscos, fornecedores, business cases, oportunidades e KPIs (modos demonstração e interno). Teclado: `/`, setas, Enter e Esc. No modo público não vaza dado de gestão.
- **Visão do consultor**: cartões com ícones e um em destaque, **anéis de metas** (ocupação, CAPEX realizado com marcador do plano, projetos no plano), **barras agrupadas de OPEX orçado × realizado** por terminal e **painel lateral** com atalhos e **próximos prazos** (decisões, riscos críticos, entregas, contratos e oportunidades), ordenados por data e respeitando os filtros.
- **Balão de valor** no último ponto dos gráficos de linha da ficha do terminal.
- Novos gráficos SVG próprios: anel (gauge) e barras agrupadas.
- **Acessibilidade**: contraste calculado a partir do `styles.css` nos dois temas (a verificação corrigiu o verde e o âmbar do tema claro, que ficavam entre 4,1 e 4,4:1 sobre o vidro); alternativas para transparência reduzida, sem `backdrop-filter`, alto contraste e movimento reduzido; modo TV sem desfoque; busca como `combobox`; anéis com rótulo acessível.
- Corrigido (já existia): no tema escuro, números coloridos do SPI/CPI ganhavam caixa de fundo.
- Corrigido: painel lateral mais alto que a janela agora rola por dentro; abaixo de 1360 px ele entra logo após os cartões de resumo.
- Sem mudança no formato dos dados. `data/references.json` ganha a referência de design; imagens da documentação refeitas; duas capturas antigas removidas.
- Testes: contraste do vidro, prazos, anéis, barras, balão, busca (ranking, acentos, E, modo público, escape), sprite de ícones, painel lateral, teclado e indicador; 8 testes de mutação conferidos; navegador cobre busca por teclado, indicador, desfoque no modo TV e movimento reduzido.

## 2.2.0 — 2026-10-29
**Revisão dos KPIs com foco executivo** (achados e limitações em `docs/08-revisao-executiva-de-kpis.md`)
- **8 KPIs executivos em 6 pilares** (resultado, custo, capacidade, cliente, qualidade, segurança); os demais 10 viram KPIs de apoio. Antes eram 17 com peso igual.
- Novo KPI **Contribuição** (receita − OPEX) frente ao orçado, com **ponte exata de volume, receita por tonelada e custo por tonelada**.
- Indicadores passa a abrir na aba **Executivo**: leitura executiva (3 a 5 frases calculadas), quadro de KPIs (status, **meses fora da meta**, terminais V/A/OK, pior terminal, efeito em R$), **mapa de calor terminal × KPI** com símbolos além da cor e notas de leitura.
- Sinal **"média esconde terminais no vermelho"**: ocupação, avarias e temperatura estavam verdes na rede com terminais vermelhos.
- **Meta de margem derivada** das metas de receita e custo por tonelada (antes divergia de 0,4 a 2,9 p.p.); testes impedem metas incoerentes, inclusive nos dados internos.
- Cada KPI ganha **por que importa**, **nível**, **pilar** e **o que o move** (com o status atual de cada um); dicionário ampliado.
- Linguagem simples: "Cargas fora da faixa de temperatura", "Tempo de giro de caminhão", "kg por hora-homem", "OPEX frente ao orçamento"; teste barra siglas e jargão em nomes e unidades.
- Visão do consultor: o quadro de KPIs executivos (8) vem logo após os cartões, em duas colunas.
- Aviso de que a variação não é ajustada à sazonalidade, com as temporadas do recorte.
- **Formato dos dados:** `series.json` ganha `tier`, `pillar`, `why`, `drivers`, `targetSeries` (e `featured` foi removido); novas séries `contribution` e `contributionBudget`. Valores anteriores das séries não mudaram; mudaram apenas as metas de margem.
- Testes: coerência de metas, identidades da contribuição, ponte, duração (`streak`), quadro executivo, brevidade da leitura, mapa de calor acessível, abas e navegação; 7 testes de mutação conferidos; e2e em navegador cobre as abas nas 4 larguras.

## 2.1.0 — 2026-10-29
**KPIs financeiros e operacionais**
- Painel **Indicadores** reformulado: 6 KPIs financeiros e 11 operacionais, com cartão de rede (valor, meta, semáforo, variação e tendência), detalhe por terminal, linha de rede e dicionário de KPIs (definição, fórmula, responsável, periodicidade).
- Novos KPIs: receita alocada, OPEX, OPEX realizado/orçado, receita por tonelada, margem de contribuição, produtividade, utilização de docas, giro de caminhão, avarias e extravios, excursões de temperatura e acurácia de rastreabilidade.
- **Ponte do desvio de OPEX**: separa efeito volume e efeito custo unitário (identidade exata, testada).
- **Financeiro do portfólio de projetos**: CAPEX realizado x planejado, EAC x orçamento, VPL dos casos recomendados e índice de rentabilidade.
- **Consolidação da rede** por somas e razões recalculadas (não média de médias), respeitando os filtros.
- Visão do consultor: painel de KPIs da rede e quatro novas mensagens-chave (OPEX, margem, cadeia fria, rastreabilidade). Terminais: ficha completa de KPIs e gráficos de OPEX x orçamento e de margem.
- Dados de demonstração ampliados sem alterar nenhum valor anterior; metadados de KPI passam a fazer parte do formato (`series.json`).
- Tema escuro: cores de status com contraste adequado; teste de contraste ampliado.
- Testes: identidades financeiras, consolidação da rede, ponte de OPEX, regras novas, telas e navegador (estados internos do painel de KPIs nas 4 larguras).

## 2.0.0 — 2026-10-29
**Visão de consultor e modo demonstração**
- Nova tela **Visão do consultor**: indicadores do portfólio, mensagens-chave calculadas por regras, decisões necessárias e plano de 30, 60 e 90 dias.
- **Modo demonstração** com dados fictícios (`data/demo/`, gerados por `scripts/build-demo.py`) e **modo interno** com o mesmo formato (`data/internal/`), além do modo público. Faixa de aviso permanente e marcação "fictício" nos painéis.
- Novas telas: **Terminais** (mapa de calor de saúde, KPIs com semáforo, drill-down), **Projetos e portfólio** (status com valor agregado SPI/CPI/EAC, Gantt com semáforo, curva S, matriz impacto x esforço, CAPEX por tipo), **Indicadores** (série de 12 meses por terminal), **Riscos** (matriz 5x5 e registro), **Fornecedores e malha rodoviária** (scorecard, custo x SLA, rotas) e **Novos negócios** (funil e valor ponderado).
- **Business cases**: carteira com VPL, TIR e payback, cascata, tornado de sensibilidade, fluxo acumulado e simulador pré-carregável; alerta quando o CAPEX previsto do projeto supera o do caso.
- Mapa colorível por score, ocupação ou saúde; filtros do mapa aplicados a todas as telas.
- Biblioteca de gráficos SVG própria (sem dependências).
- Referências de painéis de mercado documentadas (`data/references.json`).
- Testes: consistência dos dados fictícios e internos, regras de gestão, links entre telas, escape de HTML, isolamento do modo público, contraste e integração do app. Script opcional de teste em navegador real.
- Workflow: opção `PUBLISH_DEMO=false` remove a demonstração do site publicado.

## 1.0.2 — 2026-10-29
- Guia de publicação no GitHub e no GitHub Pages.

## 1.0.1 — 2026-10-29
- Auditoria das fontes públicas; novas fontes S7, S8 e S9; correção de contraste; foco do teclado preservado.

## 1.0.0 — 2026-10-29
- Mapa com geometria real, camadas de demanda, score por localidade, fontes oficiais rastreáveis e simulador de business case.
