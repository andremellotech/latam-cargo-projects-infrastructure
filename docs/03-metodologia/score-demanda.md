# Score por localidade e camadas de demanda (dados públicos)

## O que o score mede
**Relevância para priorizar diagnóstico** (0–100). Não mede condição física, nem necessidade de CAPEX, nem é KPI oficial da LATAM Cargo.

## Cálculo
`score = Σ (componente × peso) / Σ pesos`, arredondado. Pesos em `data/config.json`:

| Dimensão | Peso | Leitura |
|---|---:|---|
| Demanda (proxy público) | 30% | Expansões, frequências e sazonalidade divulgadas |
| Papel na rede | 25% | Hub ou corredor relevante |
| Porte da infraestrutura | 20% | Materialidade da instalação |
| Conectividade | 15% | Ligações com outros nós da rede |
| Cargas especiais | 10% | Pharma, perecíveis, valiosas etc. |

Faixas: alta ≥ 85; média ≥ 75; moderada < 75.

## Confiança
- **Alta:** vários fatos públicos diretos sobre a localidade.
- **Média:** evidência indireta ou complementar.
- **Baixa:** apenas o papel de hub; o score só ordena a agenda de diagnóstico.

## Camadas de demanda
E-commerce, corredor doméstico, perecíveis (Fresh), internacional/Pharma e regional. Cada localidade tem uma camada principal (cor) e pode ter secundárias (filtro). **Não há toneladas estimadas**: a empresa não divulga volume por terminal.

## Limitações
Os componentes são julgamento analítico e devem ser recalibrados com volumes, ocupação, SLA e condição dos ativos quando houver dados autorizados.
