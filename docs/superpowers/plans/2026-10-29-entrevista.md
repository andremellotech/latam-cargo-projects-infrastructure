# Painel para entrevista — Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans, conforme as ferramentas disponíveis. Etapas usam checkboxes.

**Goal:** melhorar a apresentação do portal e criar uma demonstração relevante de cinco minutos.
**Architecture:** manter as telas puras e a integração DOM existente; acrescentar camada visual e um roteiro de navegação reversível.
**Tech Stack:** HTML, CSS, JavaScript, Node para testes.
**Spec:** ../specs/2026-10-29-entrevista-design.md

## Global Constraints
Sem dependências de produção. Preservar os modos de dados, fórmulas, teclado e responsividade. Código comercial não será obtido nem copiado. Dados demonstrativos continuam identificados.

## Review Focus
Modo público ao iniciar/sair da entrevista; filtros prévios restaurados; links do caso selecionam o registro correto; layout em 390px/768px/desktop; tema escuro e movimento reduzido.

## Task 1 — Sistema visual e leitura da abertura
- [x] Editar `executive.css`, `index.html` e abertura de `js/views-mgmt.js`.
- [x] Exibir pauta de decisões com vínculo para evidência e preservar métricas.
- [x] Verificar testes existentes e visualizar desktop/celular.

## Task 2 — Demonstração guiada
- [x] Testar primeiro as transições entrar, selecionar etapa, avançar, voltar e sair, com restauração do estado e indisponibilidade sem demo.
- [x] Implementar em `js/interview.js` e `js/app.js`; root integra `#interviewStart` e `#interviewPanel` e script em `index.html`.
- [x] Rodar os testes novos e de integração.

## Task 3 — Material de entrevista e revisão
- [x] Atualizar README e roteiro, registrar referências e premissas.
- [x] Executar validação completa; revisor independente verifica diff.
- [x] Entregar pacote local e prévia; informar claramente estado de publicação.

## Evidências de execução
Os seis comandos Node do `package.json` passaram, incluindo 132 renderizações, teste de pauta por recorte, transições da entrevista, restauração e cenário sem demo. Revisor independente repetiu os testes e não encontrou achados pendentes. Inspeção pelo navegador: 11 telas em 390px, 6 telas em 768px, desktop, temas claro/escuro, TV e roteiro completo. Foi corrigida a barra superior em tablet para não encobrir o menu. As capturas do README foram atualizadas. A cópia de ensaio com dados embutidos foi verificada percorrendo as cinco etapas e restaurando o recorte Brasil.
