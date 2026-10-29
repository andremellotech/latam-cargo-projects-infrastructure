# Segurança

- Não versione credenciais, tokens, layouts de segurança, dados pessoais ou dados operacionais/financeiros internos.
- Em caso de exposição, revogue a credencial, remova o conteúdo do histórico e acione o canal corporativo de segurança.
- Não reporte vulnerabilidades com dados internos em issues públicas.
- O portal escapa todo texto vindo de arquivos de dados; o teste `npm test` verifica isso com um dado malicioso simulado.
