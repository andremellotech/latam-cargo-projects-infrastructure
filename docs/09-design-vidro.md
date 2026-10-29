# Design: tema de vidro (v2.3)

O visual segue a linha de painéis em **vidro fosco** (glassmorphism): superfícies translúcidas sobre degradê, cantos grandes, ícones, gauges circulares e um painel lateral. Todo o código é próprio, em HTML, CSS e SVG, **sem dependências e sem imagens de fundo**.

## Referências e o que foi adotado
| Referência | Adotado | Não adotado, e por quê |
|---|---|---|
| Painel financeiro **claro** (lavanda e rosa) | vidro fosco sobre degradê, busca em pílula, menu com ícones e barra ativa, anel de eficiência, barras agrupadas, painel lateral com atalhos e lista de movimentos | texto cinza muito claro (não atinge contraste 4,5:1), cartão de crédito e avatares |
| Painel financeiro **escuro** (brilho quente) | vidro escuro com brilho quente ao fundo, ponto destacado com balão de valor, metas em anéis | foto de fundo (pesa e atrapalha a leitura), cartão de pagamento |
| Painel administrativo (blocos de número com ícone) | blocos grandes de número com ícone | painel de chat, foto de fundo |
| Página CodeXR no Topmate (componentes de interface) | indicador ativo animado no menu, navbar e busca "glassy", micro-interações ao passar o mouse | o código-fonte: os componentes são produtos pagos; aqui só se usou o padrão visual descrito publicamente |

As imagens de referência não estão no repositório. Veja `NOTICE.md`.

## O que mudou na interface
| Elemento | Detalhe |
|---|---|
| Superfícies | `--panel` translúcido + `backdrop-filter`; contornos opacos nos gráficos e no mapa para manter a leitura |
| Menu lateral | ícones, seções e **indicador deslizante** (vertical no desktop, horizontal no celular) |
| Busca global | pílula na barra superior; teclado: `/` foca, setas navegam, `Enter` abre, `Esc` fecha |
| Cartões | ícone em cada KPI do consultor e um cartão em destaque (previsão no término) |
| Anéis (gauges) | ocupação, CAPEX realizado (com marcador do plano) e projetos no plano |
| Barras agrupadas | OPEX orçado × realizado por terminal, com alerta acima de 3% |
| Balão de valor | último ponto dos gráficos de linha da ficha do terminal |
| Painel lateral | atalhos e **próximos prazos** (decisões, riscos críticos, entregas, contratos e oportunidades) |

## Busca global
Indexa, conforme o modo de dados: localidades, marcos, hipóteses e fontes (sempre), e terminais, projetos, riscos, fornecedores, business cases, oportunidades e KPIs (só nos modos demonstração e interno). Os termos se combinam com **E**, ignoram acentos e maiúsculas e tratam caracteres especiais como texto. Código exato (por exemplo `P04` ou `GRU`) vem primeiro. No **modo público** não aparecem dados de gestão (teste automático).

## Próximos prazos
Calculados a partir da data de corte, sem prazos vencidos, em ordem de data e respeitando os filtros de país e camada. Tipos: decisão do comitê, risco crítico (nota ≥ 15), entrega de projeto em até 60 dias, contrato que vence em até 120 dias e decisão de oportunidade em até 45 dias.

## Acessibilidade
- **Contraste verificado** por `npm test`, calculado a partir das variáveis do `styles.css`: texto, texto secundário, destaque e cores de status sobre o pior caso do vidro (painel e painel aninhado sobre o trecho mais escuro do degradê), nos dois temas, mínimo de 4,5:1. A verificação encontrou e corrigiu verde e âmbar do tema claro (4,1 a 4,4:1).
- **Transparência reduzida** (`prefers-reduced-transparency`), **navegadores sem `backdrop-filter`** e **alto contraste** (`prefers-contrast: more`): o vidro vira opaco.
- **Movimento reduzido** (`prefers-reduced-motion`): sem transições.
- **Modo TV**: desfoque desligado e vidro mais opaco (telas fracas).
- Busca como `combobox` com `listbox`, status anunciado (`aria-live`), foco visível; anéis com rótulo acessível que traz o valor.
- Impressão: sem degradê nem desfoque.

## Para mudar o visual
Cores e vidro ficam nas variáveis do início de `styles.css` (`--pg0..3` degradê, `--panel` opacidade, `--accent`). Ao alterar, rode `npm test`: o contraste é reverificado.
