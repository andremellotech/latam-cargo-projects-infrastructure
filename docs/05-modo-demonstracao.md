# Modo demonstração (dados fictícios)

Existe para **mostrar como ficaria a gestão completa** antes de haver dados reais. Tudo o que for de gestão é sintético.

## O que é fictício
Todos os KPIs financeiros (contribuição, margem, custo por tonelada, OPEX e orçamento, receita alocada e receita por tonelada) e operacionais (ocupação, volume, produtividade, permanência, serviço, docas, giro de caminhão, avarias, excursões de temperatura, rastreabilidade, incidentes); avaliação de saúde dos terminais; projetos, CAPEX, prazos e avanço; business cases; riscos; fornecedores e rotas rodoviárias (nomes genéricos, como "Provedor GH-A"); pipeline de novos negócios; decisões e plano de 30/60/90 dias.

## O que continua sendo fato público
Os marcos, KPIs da rede, mapa, score por localidade e fontes (selo S1, S2…), que valem em qualquer modo.

## Como o portal evita confusão
- Faixa amarela permanente "Modo demonstração… fictícios".
- Etiqueta "fictício" nos painéis de gestão.
- Modo **Públicos**: mostra só fatos e avisa que os dados de gestão não estão disponíveis (teste automático garante que nada fictício vaza).
- Alguns números coincidem com dados públicos por coerência (por exemplo, a área de Miami em ~33.000 m²). Isso **não** os torna dados internos.

## Como os dados são gerados
`scripts/build-demo.py` é determinístico (semente fixa) e grava `data/demo/*.json`.
```bash
npm run build:demo   # regenera
npm test             # valida a consistência
```
Para alterar um cenário (por exemplo, mudar o avanço de um projeto), edite o script e regenere; não edite os JSON à mão.

### Cenário da demonstração (para a apresentação)
- Guarulhos e Manaus operam acima de 85% de ocupação há meses.
- Santiago e Bogotá têm câmaras frias que terminam **depois** da temporada.
- A contribuição da rede está ~4% abaixo do orçado: o custo por tonelada pesa −R$ 1,8 mi, em parte compensado pela receita por tonelada (+R$ 0,8 mi).
- Ocupação, avarias e temperatura estão verdes na rede, mas com terminais vermelhos (a média esconde).
- O OPEX da rede está ~6% acima do orçado, e a maior parte do desvio é custo unitário (não volume).
- Manaus tem excursões de temperatura e margem abaixo da meta, ligadas à expansão da câmara climatizada atrasada.
- Lima, Bogotá e Manaus têm rastreabilidade abaixo da meta, ligada à implantação da plataforma de dados e do WMS.
- Dois projetos estão críticos (Manaus e Bogotá) e três em atenção.
- Dois contratos de ground handling/transporte vencem em até 90 dias.
- Dos seis business cases, quatro são recomendados, um é marginal e um tem VPL negativo.

## Como substituir pelos dados reais
1. Copie `data/demo/` para `data/internal/` e troque o conteúdo (formato em `docs/04-padroes/dicionario-dados.md`).
2. Em `meta.json`, remova `"synthetic": true`.
3. Rode `npm test`; abra com `npm start` ou em intranet. O modo **Internos** aparece sozinho e vira o padrão.

## Como não publicar a demonstração no site
Por padrão o workflow publica a demonstração (com os avisos). Para retirá-la do site, crie a variável de repositório `PUBLISH_DEMO` com o valor `false` em **Settings → Secrets and variables → Actions → Variables**. O site volta a mostrar só o modo público.

Considere isso se o repositório for público e usar marcas da LATAM: dados fictícios com a marca de uma empresa real podem ser mal interpretados fora de contexto.
