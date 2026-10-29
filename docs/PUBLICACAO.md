# Publicação no GitHub e no GitHub Pages

Guia passo a passo para colocar o portal no ar. Tempo estimado: 10 a 15 minutos.

> **Antes de começar:** o portal inclui um **modo demonstração com dados fictícios** e usa a marca LATAM. Decida se o site público deve incluir a demonstração (seção 7) e confirme a política de confidencialidade do projeto antes de tornar o repositório público.

---

## 1. Escolha a visibilidade

| Cenário | Repositório | Site | Plano necessário |
|---|---|---|---|
| Só guardar o código | Privado | Sem site | GitHub Free |
| Publicar o portal sem custo | **Público** | Público | GitHub Free |
| Código privado e site no ar | Privado | **Público** | GitHub Pro (conta pessoal) ou Team (organização) |
| Site restrito a pessoas autorizadas | Privado | Privado | Organização com GitHub Enterprise Cloud e controle de acesso do Pages |

Pontos importantes:

- **O site do Pages é público mesmo quando o repositório é privado**, salvo no cenário Enterprise Cloud.
- Com **GitHub Free**, o Pages só funciona em repositório **público**.
- Dados internos (volumes, CAPEX, contratos) **nunca** vão para o Pages público. Para usá-los, rode o portal localmente (`npm start`) ou em intranet.

Fonte: documentação oficial do GitHub (*GitHub Pages limits* e *Configuring a publishing source*).

---

## 2. Crie o repositório

1. Acesse **github.com → New repository** (botão **+** no canto superior direito).
2. Preencha:
   - **Repository name:** `latam-cargo-projects-infrastructure`
   - **Description:** `Portal analítico de projetos e infraestrutura de terminais de carga: visão do consultor, mapa de demanda, portfólio, KPIs, business cases, riscos e fornecedores.`
   - **Visibility:** conforme a seção 1.
3. **Não marque** *Add a README*, *.gitignore* nem *license*. O pacote já traz esses arquivos.
4. Clique em **Create repository**.
5. (Opcional) Em **About → engrenagem**, adicione os tópicos: `logistica`, `infraestrutura`, `dashboard`, `github-pages`, `cargo`.

---

## 3. Envie os arquivos

Extraia o ZIP. Dentro dele há uma pasta `latam-cargo-projects-infrastructure`. **Envie o conteúdo dessa pasta, não a pasta em si.** O arquivo `index.html` precisa ficar na raiz do repositório.

### Opção A: pelo navegador (sem instalar nada)

1. No repositório vazio, clique em **uploading an existing file**.
2. Abra a pasta extraída, selecione **todo o conteúdo** (Ctrl+A) e arraste para a página.
   - No Mac, mostre os arquivos ocultos antes (Cmd+Shift+.), pois `.github`, `.gitignore` e `.nojekyll` começam com ponto.
   - O navegador aceita até 100 arquivos por envio; o pacote tem 77.
3. Em **Commit changes**, escreva `Publicação inicial` e mantenha **Commit directly to the main branch**.
4. Clique em **Commit changes**.
5. **Confira** se a pasta `.github/workflows/` e o arquivo `pages.yml` aparecem no repositório. Se não aparecerem:
   - Clique em **Add file → Create new file**.
   - No nome, digite `.github/workflows/pages.yml` (as barras criam as pastas).
   - Cole o conteúdo do `pages.yml` do pacote e faça o commit.

### Opção B: pelo Git (linha de comando)

```bash
cd latam-cargo-projects-infrastructure
git init -b main
git add -A
git status
```

No resultado do `git status`, confirme que:

- `.github/workflows/pages.yml` **aparece**;
- nenhum arquivo em `data/internal/` (exceto o `README.md`) **aparece**.

Depois:

```bash
git commit -m "Publicação inicial"
git remote add origin https://github.com/SEU-USUARIO/latam-cargo-projects-infrastructure.git
git push -u origin main
```

**Autenticação:** o GitHub não aceita a senha da conta no `git push`. Use o *Git Credential Manager* (já vem com o Git para Windows) ou um *Personal Access Token*. Para enviar o arquivo `.github/workflows/pages.yml`, o token precisa da permissão **workflow** (token clássico) ou **Workflows: Read and write** (token fine-grained). Sem isso, o push é recusado.

---

## 4. Ative o GitHub Pages

Faça isso **antes** de esperar o site, pois o workflow depende dessa configuração.

1. No repositório, clique em **Settings**.
2. No menu lateral, em *Code and automation*, clique em **Pages**.
3. Em **Build and deployment → Source**, selecione **GitHub Actions**.

Não há botão de salvar: a seleção vale na hora.

Se o primeiro workflow já rodou e falhou por causa do Pages desativado, vá para **Actions**, abra a execução e clique em **Re-run all jobs**.

---

## 5. Acompanhe a execução

1. Abra a aba **Actions**. Deve existir a execução **Validate and deploy to GitHub Pages**.
2. Ela tem dois jobs em sequência:
   - **test**: roda `npm test` (dados, regras de gestão, telas, links e integração).
   - **deploy**: monta o site **sem** `data/internal/` e publica.
3. Aguarde as duas etapas ficarem verdes (normalmente 1 a 3 minutos).
4. Se pedir aprovação do ambiente `github-pages`, aprove.

---

## 6. Abra o site

O endereço padrão é:

```
https://SEU-USUARIO.github.io/latam-cargo-projects-infrastructure/
```

Para repositório de organização: `https://NOME-DA-ORGANIZACAO.github.io/latam-cargo-projects-infrastructure/`.

Ele também aparece em **Settings → Pages** e no job **deploy**.

### Checklist de verificação

Abra em uma **janela anônima** e confirme:

- [ ] A faixa amarela **"Modo demonstração… fictícios"** aparece no topo (se a demonstração estiver publicada).
- [ ] **Visão do consultor** mostra oito cartões, a lista "O que importa agora", as decisões e o quadro de KPIs executivos.
- [ ] A **busca** no topo funciona (digite `P04` ou `manaus`; no modo Públicos não aparecem projetos). Com `/` o campo recebe o foco.
- [ ] O **menu** mostra ícones e o indicador acompanha a tela ativa; o botão **Tema** alterna claro e escuro.
- [ ] O seletor **Demonstração | Públicos** funciona. No modo Públicos, as telas de gestão avisam que estão indisponíveis.
- [ ] **Mapa de atuação** mostra 7 pontos e as linhas GRU–MAO e VCP–MAO. O botão **Ocupação** colore os pontos por semáforo.
- [ ] **Projetos e portfólio** mostra a tabela com status, o cronograma, a curva S e a matriz de priorização.
- [ ] **Indicadores** abre na aba **Executivo (8)** com a leitura executiva, o quadro, o mapa de calor e a ponte da contribuição; as abas **Financeiros (7)** e **Operacionais (11)** mostram os demais KPIs.
- [ ] **Business cases** mostra a carteira, e **Abrir no simulador** preenche o formulário.
- [ ] **Governança e fontes** lista as 10 fontes e as referências de mercado.
- [ ] O botão **Modo TV** oculta o menu e aumenta a fonte.
- [ ] No celular, o menu vira uma barra rolável no topo e a página não rola para o lado.

---

## 7. Decida se a demonstração vai para o site

Por padrão, o site publicado **inclui** o modo demonstração (dados fictícios, com faixa de aviso e etiquetas "fictício").

Para publicar **somente os dados públicos**:

1. **Settings → Secrets and variables → Actions → aba Variables → New repository variable**.
2. Nome: `PUBLISH_DEMO`. Valor: `false`.
3. Faça um novo push (ou **Actions → Run workflow**). O site passa a abrir só no modo Públicos.

Considere fazer isso se o repositório for público e usar marcas da LATAM, para evitar que dados fictícios sejam lidos fora de contexto.

---

## 8. Atualize o conteúdo depois

- **Fatos públicos:** edite os arquivos em `data/`, inclua a fonte em `data/sources.json` (URL https e data de acesso) e rode `npm test`.
- **Demonstração:** edite `scripts/build-demo.py`, rode `npm run build:demo` e `npm test`. Não edite `data/demo/*.json` à mão.
- O deploy é automático a cada push na `main`.

Para revisão por pares, use uma branch e abra um **pull request**. Nele, apenas o job **test** roda; o deploy só acontece na `main`.

### Proteger a branch `main` (recomendado)

**Settings → Branches → Add branch ruleset** (ou *Add rule*): exigir pull request e o check **test** aprovado. Em repositório privado, algumas dessas regras dependem do plano.

---

## 9. Dados internos

- O portal lê `data/internal/*.json` se existirem (mesmo formato de `data/demo/`; ver `docs/04-padroes/dicionario-dados.md`).
- Essa pasta está no `.gitignore` e é **removida** do site pelo workflow.
- Use o portal com dados internos **localmente** (`npm start`) ou em uma **intranet**, nunca no GitHub Pages público.

---

## 10. Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Job **deploy** falha com "Not Found" ou "Get Pages site failed" | Pages não está ativado | Seção 4 e depois **Re-run all jobs** |
| Não existe a opção **Pages** ou ela pede upgrade | Repositório privado em plano Free | Tornar o repositório público ou usar plano Pro/Team |
| A aba **Actions** não mostra o workflow | `.github/workflows/pages.yml` não foi enviado | Seção 3, Opção A, passo 5 |
| Site mostra "Não foi possível carregar os dados" | `index.html` está dentro de uma subpasta, ou o arquivo foi aberto por `file://` | Subir o **conteúdo** da pasta na raiz; abrir pela URL do Pages ou por `npm start` |
| Erro 404 no site | Deploy ainda não terminou, ou URL sem o nome do repositório | Aguardar alguns minutos e conferir a URL |
| Job **test** falha | Dado inconsistente (fonte inexistente, soma que não fecha, vínculo quebrado) | Ler o log, corrigir o dado e rodar `npm test` |
| Push recusado mencionando `workflow` | Token sem a permissão de workflow | Gerar token com a permissão **workflow** |
| "Branch main is not allowed to deploy to github-pages" | Regra do ambiente | **Settings → Environments → github-pages** e permitir a branch `main` |
| O site não mostra o modo demonstração | `PUBLISH_DEMO` está como `false` | Remover a variável ou definir outro valor |
| O console do navegador mostra um 404 em `data/internal/meta.json` | Esperado: não há dados internos no site | Pode ignorar; o portal trata o caso |
| Pages bloqueado em repositório da empresa | Política da organização | Pedir ao administrador da organização |
| Alterações não aparecem | Cache do navegador | Atualizar com **Ctrl+F5** |
| Uma ação do workflow falha por versão | Versão de ação antiga | Atualizar para a versão principal mais recente indicada na documentação da ação |

---

## 11. Referências oficiais

- Publicar de um workflow: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Workflows personalizados: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- Limites e disponibilidade por plano: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
