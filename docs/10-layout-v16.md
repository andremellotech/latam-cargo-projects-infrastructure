# Layout executivo: composição V16

A direção visual adapta a composição pública do [reel Dashboard V16, do CodeXR](https://www.instagram.com/reel/De1uvwiza9R/), com o [perfil no Topmate](https://topmate.io/code_xr) como referência de autoria. O vídeo serve de inspiração para geometria, hierarquia e cores. A implementação usa HTML, CSS e JavaScript próprios, sem compra ou utilização de código comercial.

## Direção visual

- **Navegação horizontal compacta:** mantém as seções acessíveis no topo e libera largura para as análises. A seção ativa precisa ser identificável; em telas estreitas, a navegação deve continuar acessível sem ampliar a página.
- **Canvas cinza-claro e superfícies brancas:** painéis com contornos discretos, cantos arredondados e espaçamento consistente. Um cartão em azul vivo cria o destaque principal.
- **Abertura com quatro cartões:** concentra a síntese do portfólio. Uma faixa de quatro sinais secundários oferece contexto sem competir com os cartões.
- **Gráficos largos em duas colunas:** a curva S de CAPEX e a comparação entre OPEX orçado e realizado aproveitam a largura do desktop. Os gráficos usam os dados e cálculos existentes; três resumos abaixo complementam a leitura.
- **Tema escuro em preto e cinza:** preserva a mesma hierarquia e o destaque azul, com superfícies e textos ajustados ao contraste.
- **Composição responsiva:** reduz o número de colunas conforme a largura disponível, mantendo rótulos, valores e controles legíveis.

## Decisões de adaptação

A referência orienta a apresentação; o conteúdo continua próprio da consultoria de projetos e infraestrutura. A pauta de decisões, os vínculos com projetos e riscos e o plano de 30/60/90 dias permanecem parte da leitura executiva. A interface não incorpora indicadores de outros setores apenas por aparecerem no vídeo.

Os modos Público, Demonstração e Internos preservam suas regras. O cenário fictício de Santiago, os alvos P07 e BC3, as cinco etapas do Modo entrevista e a restauração do estado ao sair continuam iguais. A mudança visual não altera fórmulas, metas ou fontes nem amplia as afirmações sobre a vaga.

O [roteiro de entrevista](07-roteiro-do-consultor.md) segue como guia de conteúdo. O [documento de design em vidro](09-design-vidro.md) registra uma versão anterior. As capturas atuais mantêm os caminhos `img/17-painel-executivo.png`, `img/18-modo-entrevista.png` e `img/19-mobile-executivo.png`; `img/20-v16-escuro.png` mostra o novo tema escuro.

## Acessibilidade e critérios de verificação

As checagens abaixo orientam a validação do layout; esta lista não é um registro de testes executados.

| Área | Critério de revisão |
|---|---|
| Teclado e navegação | Foco visível, ordem compreensível, seleção ativa identificável e acesso a todas as seções da barra horizontal. |
| Contraste e significado | Conferir contraste nos temas claro e escuro, incluindo o cartão azul; status e séries devem ter rótulos ou símbolos além da cor. |
| Gráficos e valores | Legendas, eixos, unidades e textos legíveis; confirmar que curva S e OPEX refletem os mesmos dados e cálculos das análises existentes. |
| Responsividade | Revisar desktop e celular, zoom e modo TV; a barra horizontal não deve causar estouro da página nem ocultar o item ativo. |
| Entrevista | Conferir entrada, avanço, retorno, exploração livre e restauração de tela, seleção, filtros e modo. |
| Separação dos dados | Conferir a ausência de decisões fictícias no modo Público e a indisponibilidade da entrevista sem dados demonstrativos. |
| Regressões | Executar `npm test` e inspecionar as telas no navegador; revisar busca, filtros, tema, preferência de movimento e acesso aos detalhes. |

## Validação realizada

Os seis comandos Node do `package.json` passaram, incluindo 132 renderizações, isolamento do modo público, pauta por país, navegação e entrevista reversível. A barra horizontal ganhou verificações de posição, largura, revelação do último item e preferência de movimento reduzido.

No navegador, foram percorridas as onze telas em 390, 768 e 1440 pixels: 33 cenários sem estouro horizontal, com indicador alinhado e aba ativa visível. Foram conferidos os temas claro/escuro, o skip link acima da barra superior e as cinco etapas da entrevista. No celular, os gráficos da abertura usam rolagem local para preservar rótulos em tamanho legível; a página mantém sua largura. O cartão em destaque é redesenhado na troca do tema para evitar texto desatualizado em camadas do navegador.
