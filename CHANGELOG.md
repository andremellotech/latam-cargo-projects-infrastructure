# Changelog

## 1.0.1 — 2026-10-29 (auditoria final)
- Fontes reconferidas uma a uma; S2 passou para a URL canônica `web.latamcargo.com/br/pt/`.
- Novas fontes: S7 (Manaus: 45% de participação e +41,3 mil t em 2025, ANAC), S8 (flores, 2023), S9 (registro da divergência de frota: 21 em ago/2024 vs 19 no About Us).
- MAO e VCP com evidências diretas; BOG com confiança Média e demanda 72→76 (série de flores 2019–2023).
- KPIs: +4 indicadores verificáveis; nota de divergência na frota.
- Cores das camadas ajustadas para contraste WCAG AA; teste automático de contraste.
- Teste falha se houver fonte não referenciada; teste de UI sem data fixa.
- Foco do teclado preservado ao alternar camadas do mapa.

## 1.0.0 — 2026-10-29
- Mapa com geometria real (Natural Earth), camadas de demanda filtráveis, corredores GRU–MAO e VCP–MAO, detalhe por localidade.
- Score recalculado a partir de componentes e pesos em `data/config.json`; indicação de confiança por localidade.
- Fontes oficiais verificadas e rastreáveis (`data/sources.json`); fatos ligados a fontes.
- Dados fictícios de CAPEX, capacidades e projetos removidos; marcos públicos reais no lugar.
- Simulador de business case (VPL, TIR, payback simples e descontado, sensibilidade).
- Camada interna opcional (`data/internal/projects.json`), fora do deploy público.
- Testes automatizados (dados, fórmulas, telas) e validação no GitHub Actions.
- Acessibilidade (teclado, foco, aria), tema persistente, modo TV, roteamento por hash.
