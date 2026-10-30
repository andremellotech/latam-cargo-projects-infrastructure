# Painel executivo para entrevista

## Intenção
Apresentar uma análise independente de projetos e infraestrutura de carga, com leitura executiva e um caso demonstrativo de cinco minutos. O usuário pediu melhorias de layout com referências de dashboards e mapas e do catálogo público CodeXR.

## Abordagens
1. Evoluir apenas o vidro existente: menor alteração, mas mantém a dispersão de informação na abertura.
2. Painel executivo com navegação escura, conteúdo claro, hierarquia de decisões e roteiro guiado: direção recomendada pelo assistente para o contexto de entrevista.
3. Migrar para React e integrar um template comercial: mais manutenção e dependências; não agrega ao conteúdo analítico já implementado.

A direção 2 foi aprovada pelo usuário, que autorizou o assistente a tomar as decisões de layout. O escopo informado pelo usuário inclui governança de CAPEX, modelos operacionais de engenharia/implantação/investimentos, melhoria contínua, diagnóstico de maturidade e workshops executivos. Não foi fornecido um anúncio oficial verificável da vaga.

## Escopo
- Evoluir o layout de todas as telas por uma camada visual coesa: azul profundo, magenta discreto, tipografia legível, espaçamento consistente, contraste e estados claros.
- Destacar decisões e suas evidências antes dos detalhes extensos. Manter indicadores e gráficos existentes.
- Acrescentar modo de entrevista com cinco etapas sobre o caso demonstrativo Santiago: contexto, P07, risco, BC3, execução. Voltar e avançar com botões; sair restaura o estado anterior.
- Atualizar README e roteiro, incluindo como ensaiar e quais premissas precisam de validação.

## Restrições
HTML/CSS/JavaScript sem dependências de produção. Preservar cálculos, dados, separação público/demo/interno, busca, filtros, tema escuro, modo TV, teclado e movimento reduzido. Nenhum dado fictício pode ser apresentado como resultado real da empresa ou experiência do candidato. Não adquirir nem copiar código comercial do Topmate; registrar inspiração e links. O desenvolvimento ocorre em cópia local e branch própria; publicação exige decisão posterior sobre o resultado concreto.

## Critérios de aceite
Pauta e ação acessíveis na abertura; modo de entrevista navegável e reversível; recortes e modos continuam coerentes; fontes públicas permanecem acessíveis; testes existentes passam; inspeção visual em desktop e celular sem conteúdo cortado.

## Divisão técnica
`executive.css`: sistema visual e responsividade. `index.html`: identidade e entrada da entrevista. `js/views-mgmt.js`: abertura orientada a decisão. `js/app.js` e módulo de entrevista: navegação do roteiro. Documentação: narrativa e instruções. Revisor independente verifica comportamento e limites antes da entrega.
