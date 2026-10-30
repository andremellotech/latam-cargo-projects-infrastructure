# Publicação e atualização

Portal: **https://andremellotech.github.io/latam-cargo-projects-infrastructure/**

Este repositório usa a publicação do GitHub Pages a partir da branch `main`. A execução gerenciada aparece na aba **Actions** como **pages build and deployment**. Não há workflow de testes próprio neste pacote; execute a suíte local antes de publicar.

## Atualizar

1. Rode `npm test` com Node 20 ou superior.
2. Confira o diff: publique apenas código, documentação, fatos públicos e dados sintéticos. Não inclua dados reais de gestão em `data/internal/`.
3. Envie o commit para `main` conforme as permissões do repositório.
4. Em **Actions**, abra a execução cujo commit corresponde ao enviado. Aguarde os jobs de build e deploy terminarem com sucesso.
5. Abra o portal e atualize com Ctrl+F5 para evitar uma cópia antiga do navegador.

## Conferir o resultado

- A abertura **Consultoria** contém quatro indicadores, três decisões e o plano proposto.
- O menu preserva as outras onze visões: Painel, Visão geral, Mapa, Terminais, Projetos, Indicadores, Business cases, Riscos, Fornecedores, Negócios e Governança.
- O modo demonstração exibe o aviso de dados fictícios; o modo público não exibe valores de gestão.
- Os atalhos P07/P04/BC5 abrem a evidência correspondente; o filtro de país fica visível nas análises.
- O Modo entrevista percorre as cinco etapas e restaura o contexto anterior ao sair.
- Busca, temas e visualização em celular funcionam.

## Dados e publicação

`data/internal/` contém somente um README. O `.gitignore` evita adicionar seus arquivos de gestão por engano. **Não há etapa de sanitização automática no deploy gerenciado**: revise o conteúdo do commit antes de publicar. Dados internos devem ser usados apenas localmente ou em ambiente privado.

Para uma publicação pública sem demonstração, retire `data/demo/` do artefato publicado. A aplicação inicia no modo público quando a demonstração não está disponível; o teste `ui-test.js --without-demo` cobre esse cenário. Nenhuma variável `PUBLISH_DEMO` é usada pelo deploy atual.

## Problemas comuns

| Situação | Conferência |
|---|---|
| Página antiga | Confira o commit do último deploy e atualize com Ctrl+F5 |
| Erro de leitura ao abrir o código por `file://` | Use `npm start` ou a versão HTML offline fornecida |
| Deploy não apareceu | Verifique a origem configurada em Settings → Pages e a aba Actions |
| Arquivo `data/internal/meta.json` ausente | Esperado quando não há dados internos; a aplicação trata a ausência |
| Teste falhou | Corrija o dado ou regra indicada antes de enviar o commit |

Referência: [documentação oficial de configuração do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
