# Dados internos (não publicar)

Esta pasta recebe os dados **reais** da gestão. O portal os lê automaticamente e passa a oferecer o modo **Internos** (que vira o padrão).

## Como usar
1. Copie os arquivos de `data/demo/` para cá e substitua o conteúdo pelos dados autorizados (mesmo formato; ver `docs/04-padroes/dicionario-dados.md`).
2. Em `meta.json`, **remova** `"synthetic": true` ou defina `"synthetic": false`, e ajuste `asOf`, `timeline` e `label`.
3. Rode `npm test`: a validação confere o formato, as somas, os vínculos e as datas também desta pasta.
4. Abra com `npm start` (local) ou em intranet.

## Regras
- O `.gitignore` impede o commit desta pasta (exceto este arquivo) e o workflow a **exclui** do site publicado.
- O GitHub Pages é público por padrão: **não** publique dados internos nele.
- Só use um repositório **privado** se decidir versionar estes arquivos (remova a regra do `.gitignore` conscientemente).
