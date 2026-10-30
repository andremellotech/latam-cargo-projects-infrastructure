# Contribuição

1. Uma branch por alteração; abra um pull request com objetivo e evidências.
2. Todo fato público novo em `data/` precisa de fonte em `data/sources.json` (URL https e data de acesso).
3. Dados de demonstração: edite `scripts/build-demo.py` e rode `npm run build:demo`; não edite `data/demo/*.json` à mão.
4. Rode `npm test` antes do commit (valida dados, fórmulas, telas, links e integração).
5. Não inclua dados internos fora de `data/internal/` e nunca em repositório público.
