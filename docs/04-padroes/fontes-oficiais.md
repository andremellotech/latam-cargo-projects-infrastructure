# Fontes e rastreabilidade (dados públicos)

Toda informação pública está em `data/sources.json` com URL, publicador, tipo (Oficial/Imprensa), fatos extraídos e data de acesso (2026-10-29).
Cada localidade, marco, KPI, corredor e hipótese referencia fontes por ID (S1, S2…). O `npm test` falha se uma referência não existir **ou se uma fonte não for usada por nenhum dado**.

## Pontos de atenção
- **Frota cargueira:** o "About Us" atual cita 19 Boeing 767 (S1); o comunicado de ago/2024 cita 21 (S9). O portal usa 19 e sinaliza a divergência. Confirmar a frota vigente.
- **URLs truncadas:** S3 e S7 foram usadas como indexadas pelo buscador (terminam truncadas). Se o link não abrir, localize o comunicado pelo título na Sala de Imprensa.
- **S6** (4 principais hubs) vem de página voltada a passageiros; serve só para identificar hubs.
- **S8** é de 2023: contexto histórico de sazonalidade de flores, não situação atual.
- **Derivado:** a frequência VCP–MAO (6/semana) é calculada (18 − 12) e marcada como derivada no mapa.
- Os dados de **gestão** (ocupação, projetos, CAPEX etc.) **não** vêm destas fontes: no modo demonstração são fictícios.
