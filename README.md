# Projetos e Infraestrutura · LATAM Cargo

Portal analítico estático (HTML/CSS/JS, sem dependências) para a consultoria de projetos e infraestrutura de terminais de carga: mapa de demanda, score por localidade, marcos públicos, indicadores, simulador de business case e hipóteses de novos negócios.

> Ferramenta independente. **Fatos públicos** citam fonte oficial e data; **score e hipóteses** são análise desta consultoria; **dados internos** ficam em camada separada e privada.

## Telas
Visão geral · Mapa de atuação (camadas, score mínimo, corredores, detalhe) · Localidades · Projetos e marcos · Indicadores · Business case (VPL/TIR/payback) · Novos negócios · Governança e fontes. Modo TV (55") e tema claro/escuro.

## Executar
```bash
npm start          # http://localhost:8080  (precisa de servidor; file:// bloqueia JSON)
npm test           # valida dados, fórmulas e renderiza todas as telas
```

## Publicar no GitHub Pages
1. Envie o conteúdo para a branch `main`.
2. **Settings → Pages → Source: GitHub Actions**.
3. O workflow roda os testes e publica só os arquivos do site (**exclui `data/internal/`**).

## Estrutura
```
index.html · styles.css · js/ (core, views, app)
data/    dados públicos, config e mapa
scripts/ validate.mjs · smoke-test.mjs · build-map.py
docs/    escopo, governança, metodologia, fontes
templates/ modelos para a camada interna
```

## Dados internos
Crie `data/internal/projects.json` (modelo em `templates/`) **apenas em ambiente privado**. GitHub Pages é público por padrão: use `npm start` ou intranet para exibir dados internos.

## Atualizar dados públicos
Edite os JSON em `data/`, inclua a fonte em `sources.json` (https + data de acesso) e rode `npm test`.

## Licença e marcas
Ver `LICENSE.md` e `NOTICE.md`. O uso de nomes e marcas LATAM deve seguir as diretrizes corporativas.
