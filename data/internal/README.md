# Dados internos (não publicar)

Coloque aqui `projects.json` (modelo em `templates/internal-projects.template.json`) **somente em ambiente privado**.
O portal lê este arquivo se existir; sem ele, exibe um aviso. A pasta está no `.gitignore` e é excluída do deploy no GitHub Pages,
porque Pages é público por padrão. Para uso interno, sirva a pasta localmente ou em intranet: `npm start`.
