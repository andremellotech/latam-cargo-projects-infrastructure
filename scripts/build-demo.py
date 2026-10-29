"""Gera os dados FICTICIOS de demonstracao em data/demo/*.json (deterministico).

Nada aqui representa a LATAM Cargo: sao valores sinteticos para mostrar como a gestao ficaria.
O mesmo esquema (formato dos arquivos) e usado pela camada interna em data/internal/.
Uso: python scripts/build-demo.py
"""
import json, math, random, datetime as dt
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "demo"
OUT.mkdir(parents=True, exist_ok=True)
R = random.Random(20261029)
ASOF = dt.date(2026, 10, 29)
MI = 1_000_000

def w(name, obj):
    (OUT / f"{name}.json").write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")

def clamp(x, lo, hi): return max(lo, min(hi, x))

# ------------------------------------------------------------------ meta
TL_START, TL_MONTHS = (2026, 1), 18
tl = [f"{2026 + i // 12}-{i % 12 + 1:02d}" for i in range(TL_MONTHS)]
M12 = [f"{2025 + (10 + i) // 12}-{(10 + i) % 12 + 1:02d}" for i in range(12)]  # 2025-11 .. 2026-10
w("meta", {
    "synthetic": True, "label": "DADOS FICTÍCIOS DE DEMONSTRAÇÃO", "asOf": ASOF.isoformat(),
    "currency": "BRL", "timeline": {"start": "2026-01", "months": TL_MONTHS, "asOfIdx": 9},
    "note": "Todos os valores de ocupação, custos, projetos, CAPEX, riscos, fornecedores e pipeline são sintéticos e não representam a LATAM Cargo."})

# ------------------------------------------------------------------ terminais + series
T = {
 "GRU": dict(area=62000, cap=42000, docks=48, cold=3200, occ0=.82, slope=.008, dwell=21.5, dwellT=24, cost=285, costT=280, svc=94.8, svcT=95, a=(2, 3, 3, 4, 4, 3)),
 "VCP": dict(area=24000, cap=18000, docks=20, cold=1200, occ0=.70, slope=.004, dwell=18.0, dwellT=22, cost=240, costT=245, svc=96.2, svcT=95, a=(4, 4, 4, 4, 3, 3)),
 "MAO": dict(area=9000, cap=7000, docks=10, cold=900, occ0=.79, slope=.011, dwell=26.0, dwellT=24, cost=410, costT=390, svc=92.5, svcT=94, a=(2, 2, 2, 3, 2, 2)),
 "MIA": dict(area=33000, cap=36000, docks=40, cold=6500, occ0=.79, slope=.004, dwell=19.0, dwellT=20, cost=330, costT=330, svc=96.5, svcT=96, a=(3, 4, 4, 5, 4, 5)),
 "SCL": dict(area=21000, cap=20000, docks=24, cold=5200, occ0=.72, slope=.002, dwell=22.0, dwellT=22, cost=360, costT=350, svc=94.0, svcT=95, a=(2, 3, 4, 4, 4, 3)),
 "LIM": dict(area=10500, cap=9000, docks=12, cold=700, occ0=.67, slope=.003, dwell=21.0, dwellT=24, cost=380, costT=370, svc=93.8, svcT=94, a=(3, 3, 3, 4, 3, 3)),
 "BOG": dict(area=12000, cap=11000, docks=14, cold=1800, occ0=.70, slope=.003, dwell=20.0, dwellT=22, cost=350, costT=345, svc=94.5, svcT=95, a=(3, 3, 2, 3, 3, 2)),
}
SEASON = {"SCL": {"11": .10, "12": .17, "01": .15, "02": .08}, "BOG": {"01": .08, "02": .14, "03": .05, "04": .05, "05": .10}}
SEASONAL = {"SCL": {"label": "Safra de cerejas", "start": "2026-11-15"}, "BOG": {"label": "Temporada de flores", "start": "2027-01-15"}}
DIMS = ["capacity", "flow", "assets", "safety", "systems", "coldchain"]

terminals, byT = [], {}
for code, p in T.items():
    terminals.append({
        "code": code, "areaM2": p["area"], "capacityTMonth": p["cap"], "docks": p["docks"], "coldRoomM2": p["cold"],
        "targets": {"occupancy": 85, "dwell": p["dwellT"], "costPerT": p["costT"], "service": p["svcT"], "incidents": 2},
        "assessment": dict(zip(DIMS, p["a"])), "seasonal": SEASONAL.get(code)})
    s = {k: [] for k in ["throughput", "occupancy", "dwell", "costPerT", "service", "incidents"]}
    for i, m in enumerate(M12):
        occ = clamp(p["occ0"] + p["slope"] * i + SEASON.get(code, {}).get(m[5:], 0) + R.gauss(0, .012), .5, .985)
        thr = round(p["cap"] * occ)
        occ_r = thr / p["cap"]
        s["throughput"].append(thr)
        s["occupancy"].append(round(occ_r * 100, 1))
        s["dwell"].append(round(p["dwell"] + max(0, occ_r - .80) * 40 + R.gauss(0, .6), 1))
        s["costPerT"].append(round(p["cost"] * (1 + .0025 * i) * (1 + max(0, occ_r - .9) * .4) + R.gauss(0, 4)))
        s["service"].append(round(clamp(p["svc"] - max(0, occ_r - .86) * 35 + R.gauss(0, .4), 86, 99.5), 1))
        s["incidents"].append(max(0, round(R.gauss(1.0 + max(0, occ_r - .8) * 8, .8))))
    byT[code] = s
# ---- KPIs financeiros e operacionais adicionais (gerador separado: nao altera os valores acima)
R2 = random.Random(20261030)
X = {  # parametros FICTICIOS por terminal
 "GRU": dict(bf=.75, yld=430, prod=820, prodT=850, turn=58, turnT=70, dmg=.26, dmgT=.30, tmp=.45, tmpT=.50, trc=97.4, trcS=.06, trcT=98.0),
 "VCP": dict(bf=1.6, yld=360, prod=900, prodT=880, turn=55, turnT=60, dmg=.20, dmgT=.25, tmp=.35, tmpT=.50, trc=97.8, trcS=.05, trcT=98.0),
 "MAO": dict(bf=.75, yld=560, prod=640, prodT=700, turn=80, turnT=90, dmg=.38, dmgT=.30, tmp=.90, tmpT=.50, trc=95.8, trcS=.02, trcT=98.0),
 "MIA": dict(bf=.9, yld=520, prod=880, prodT=870, turn=60, turnT=65, dmg=.16, dmgT=.20, tmp=.20, tmpT=.30, trc=98.8, trcS=.02, trcT=98.5),
 "SCL": dict(bf=.75, yld=570, prod=760, prodT=780, turn=62, turnT=68, dmg=.24, dmgT=.28, tmp=.40, tmpT=.50, trc=97.6, trcS=.04, trcT=98.0),
 "LIM": dict(bf=.75, yld=520, prod=700, prodT=740, turn=70, turnT=75, dmg=.30, dmgT=.30, tmp=.55, tmpT=.50, trc=94.4, trcS=.00, trcT=98.0),
 "BOG": dict(bf=.75, yld=500, prod=720, prodT=750, turn=66, turnT=70, dmg=.28, dmgT=.30, tmp=.55, tmpT=.50, trc=95.0, trcS=.03, trcT=98.0),
}
for t in terminals:
    code, p, x, s = t["code"], T[t["code"]], X[t["code"]], byT[t["code"]]
    for k in ["opex", "opexBudget", "volumeBudget", "opexAdherence", "revenue", "yield", "margin", "contribution", "contributionBudget", "productivity", "dockUtil", "truckTurn", "damage", "tempExc", "traceAcc"]:
        s[k] = []
    for i, m in enumerate(M12):
        season = SEASON.get(code, {}).get(m[5:], 0)
        thr, cost, occ_r = s["throughput"][i], s["costPerT"][i], s["occupancy"][i] / 100
        yld = round(x["yld"] * (1 + .0015 * i) + R2.gauss(0, x["yld"] * .008))
        opex, revenue = thr * cost, thr * yld                                  # identidades exatas (validadas)
        vbud = round(p["cap"] * clamp(p["occ0"] + p["slope"] * i * x["bf"] + season * .8, .5, .98))
        obud = vbud * p["costT"]                                               # orcado = volume orcado x custo-meta
        s["opex"].append(opex); s["opexBudget"].append(obud); s["volumeBudget"].append(vbud)
        s["opexAdherence"].append(round(opex / obud * 100, 1))
        s["revenue"].append(revenue); s["yield"].append(yld)
        s["margin"].append(round((revenue - opex) / revenue * 100, 1))
        s["contribution"].append(revenue - opex)                                # R$, identidade exata
        s["contributionBudget"].append(vbud * (x["yld"] - p["costT"]))          # orcado = volume orcado x (receita-meta - custo-meta)
        s["productivity"].append(round(x["prod"] - max(0, occ_r - .85) * 600 + R2.gauss(0, 10)))
        s["dockUtil"].append(round(clamp(occ_r * 100 * .95 + 3 + R2.gauss(0, 1.2), 40, 99), 1))
        s["truckTurn"].append(round(x["turn"] + max(0, occ_r - .8) * 130 + R2.gauss(0, 2.5)))
        s["damage"].append(round(clamp(x["dmg"] + max(0, occ_r - .85) * 1.2 + R2.gauss(0, .03), .05, 2), 2))
        s["tempExc"].append(round(clamp(x["tmp"] + season * 6 + R2.gauss(0, .06), 0, 5), 2))
        s["traceAcc"].append(round(clamp(x["trc"] + x["trcS"] * i + R2.gauss(0, .25), 85, 99.9), 1))
    t["targets"].update({"opexAdherence": 100, "yield": x["yld"], "margin": round((x["yld"] - p["costT"]) / x["yld"] * 100, 1), "productivity": x["prodT"], "dockUtil": 85,
                         "truckTurn": x["turnT"], "damage": x["dmgT"], "tempExc": x["tmpT"], "traceAcc": x["trcT"]})
w("terminals", terminals)

def kd(id, name, group, unit, dir, dec, tk, tol, definition, formula, owner, freq, agg, why, tier=2, pillar=None, drivers=None, scale=None, ts=None):
    d = {"id": id, "name": name, "group": group, "tier": tier, "unit": unit, "dir": dir, "decimals": dec, "definition": definition, "formula": formula, "owner": owner, "frequency": freq, "agg": agg, "why": why}
    if pillar: d["pillar"] = pillar
    if tk: d["targetKey"] = tk
    if ts: d["targetSeries"] = ts
    if tol is not None: d["tol"] = tol
    if drivers: d["drivers"] = drivers
    if scale: d["scale"] = scale
    return d
FIN, OPE = "financial", "operational"
DEFS = [
 # ---- nivel 1: KPIs executivos (8)
 kd("contribution", "Contribuição", FIN, "R$ mi", "max", 1, None, .05, "Resultado do terminal depois do custo operacional, comparado com a contribuição orçada para o volume orçado.", "receita alocada − OPEX; meta = volume orçado × (receita-meta − custo-meta por tonelada)", "Finanças", "Mensal", "sum",
    "É o resultado que o terminal gera antes dos custos corporativos. Compara o que sobrou com o que foi orçado e mostra se o desvio vem de volume, preço ou custo.", 1, "Resultado", ["yield", "costPerT", "throughput"], 1000000, "contributionBudget"),
 kd("margin", "Margem de contribuição", FIN, "%", "max", 1, "margin", .05, "Quanto da receita alocada sobra depois do custo operacional do terminal.", "(receita alocada − OPEX) ÷ receita alocada × 100; meta derivada das metas de receita e de custo por tonelada", "Finanças", "Mensal", "ratio",
    "Mostra quanto de cada real de receita sobra. Cai quando o custo sobe ou o preço cai, e independe do volume.", 1, "Resultado", ["yield", "costPerT"]),
 kd("costPerT", "Custo por tonelada", FIN, "R$/t", "min", 0, "costPerT", .05, "Custo operacional por tonelada processada.", "OPEX ÷ toneladas processadas", "Controladoria", "Mensal", "ratio",
    "É o principal indicador de eficiência: quanto custa mover uma tonelada. Compara terminais de portes diferentes.", 1, "Custo", ["productivity", "occupancy", "truckTurn"]),
 kd("occupancy", "Ocupação da capacidade", OPE, "%", "min", 1, "occupancy", .04, "Quanto da capacidade mensal do terminal foi utilizada.", "toneladas processadas ÷ capacidade mensal × 100", "Operações", "Mensal", "ratio",
    "Acima da meta, o terminal perde folga para picos e o serviço piora; abaixo, há capacidade ociosa. Decide quando expandir.", 1, "Capacidade", ["throughput", "dwell", "dockUtil"]),
 kd("service", "Nível de serviço", OPE, "%", "max", 1, "service", .015, "Embarques concluídos dentro do prazo acordado.", "embarques no prazo ÷ embarques totais × 100", "Operações", "Mensal", "wavg",
    "É a promessa ao cliente: embarques que saem no prazo. Queda prolongada leva a perda de contratos.", 1, "Cliente", ["dwell", "truckTurn", "traceAcc"]),
 kd("damage", "Avarias e extravios", OPE, "%", "min", 2, "damage", .15, "Parcela do volume com avaria ou extravio registrado.", "toneladas com ocorrência ÷ toneladas processadas × 100", "Qualidade", "Mensal", "wavg",
    "Cada ocorrência vira indenização, retrabalho e perda de confiança do cliente.", 1, "Qualidade", ["dockUtil", "dwell", "traceAcc"]),
 kd("tempExc", "Cargas fora da faixa de temperatura", OPE, "%", "min", 2, "tempExc", .20, "Cargas refrigeradas que saíram da faixa de temperatura exigida.", "cargas com excursão ÷ cargas refrigeradas × 100", "Qualidade", "Mensal", "wavg",
    "Carga fora da faixa pode ser perdida e põe em risco clientes de Pharma e Fresh.", 1, "Qualidade", ["dwell", "traceAcc"]),
 kd("incidents", "Incidentes operacionais", OPE, "ocorr./mês", "min", 0, "incidents", .5, "Incidentes operacionais com registro formal no mês.", "contagem de ocorrências", "Segurança Operacional", "Mensal", "sum",
    "Segurança operacional vem antes de produtividade e custo.", 1, "Segurança", ["occupancy", "dockUtil"]),
 # ---- nivel 2: KPIs de apoio (explicam o que move os executivos)
 kd("opexAdherence", "OPEX frente ao orçamento", FIN, "%", "min", 1, "opexAdherence", .05, "Aderência do custo operacional ao orçamento aprovado. Acima de 100% = estouro.", "OPEX realizado ÷ OPEX orçado × 100, com OPEX orçado = volume orçado × custo-meta por tonelada", "Controladoria", "Mensal", "ratio",
    "Mostra se o gasto cabe no orçado. Parte do desvio é só volume (veja a ponte), então não deve ser lido isoladamente."),
 kd("opex", "Custo operacional (OPEX)", FIN, "R$ mi", "info", 1, None, None, "Custo operacional do terminal no mês (pessoal, ground handling, energia, manutenção e transporte local).", "toneladas processadas × custo por tonelada", "Controladoria", "Mensal", "sum",
    "Gasto absoluto do mês. Cresce com o volume, por isso diz pouco sobre eficiência sozinho.", scale=1000000),
 kd("revenue", "Receita alocada", FIN, "R$ mi", "info", 1, None, None, "Receita de carga atribuída ao terminal por regra de alocação (preço de transferência), definida com Finanças.", "toneladas processadas × receita por tonelada", "Finanças", "Mensal", "sum",
    "Base da margem e da contribuição. Depende da regra de alocação de receita acordada com Finanças.", scale=1000000),
 kd("yield", "Receita por tonelada", FIN, "R$/t", "max", 0, "yield", .03, "Receita alocada por tonelada processada.", "receita alocada ÷ toneladas processadas", "Finanças", "Mensal", "ratio",
    "Preço médio realizado. Queda indica mix de carga mais barato ou desconto.", drivers=None),
 kd("throughput", "Volume processado", OPE, "t", "info", 0, None, None, "Toneladas processadas no mês (entrada e saída).", "soma das toneladas movimentadas", "Operações", "Mensal", "sum",
    "Dá a escala. É o contexto para custo, receita e ocupação."),
 kd("productivity", "Produtividade", OPE, "kg por hora-homem", "max", 0, "productivity", .05, "Quilos processados por hora-homem trabalhada.", "kg processados ÷ horas-homem", "Operações", "Mensal", "wavg",
    "Quantas toneladas cada hora de trabalho processa. É o principal motor do custo por tonelada."),
 kd("dwell", "Tempo de permanência", OPE, "h", "min", 1, "dwell", .08, "Tempo médio entre o recebimento e a expedição da carga.", "média de (expedição − recebimento) por embarque", "Operações", "Mensal", "wavg",
    "Quanto tempo a carga fica parada. Pesa no nível de serviço, na ocupação e na exposição da carga."),
 kd("dockUtil", "Utilização de docas", OPE, "%", "min", 1, "dockUtil", .04, "Quanto do tempo as docas ficaram ocupadas.", "horas de doca ocupadas ÷ horas de doca disponíveis × 100", "Operações", "Mensal", "wavg",
    "Gargalo físico: com docas saturadas, caminhões e cargas esperam."),
 kd("truckTurn", "Tempo de giro de caminhão", OPE, "min", "min", 0, "truckTurn", .08, "Tempo do caminhão no terminal, da chegada à saída.", "média de (saída − chegada) por caminhão", "Logística Terrestre", "Mensal", "wavg",
    "Afeta o custo do transporte e o prazo da integração rodoviária."),
 kd("traceAcc", "Acurácia de rastreabilidade", OPE, "%", "max", 1, "traceAcc", .02, "Eventos de rastreamento registrados corretamente em relação ao esperado.", "eventos corretos ÷ eventos esperados × 100", "Sistemas", "Mensal", "wavg",
    "Sem rastreabilidade confiável não há visibilidade ao cliente nem controle de avarias."),
]
w("series", {"months": M12, "defs": DEFS, "byTerminal": byT})

# ------------------------------------------------------------------ projetos
def D(s): return dt.date.fromisoformat(s)
def tl_idx(d): return (d.year - 2026) * 12 + d.month - 1
def bell(n): return [math.sin(math.pi * (k + .5) / n) for k in range(n)]
def split(total, idxs, weights):
    sw = sum(weights); out = [round(total * x / sw) for x in weights]
    out[-1] += round(total) - sum(out)  # garante a soma exata
    return dict(zip(idxs, out))

# id, nome, terminal, tipo, fase, dono, inicio, fim base, fim previsto, orcamento, realizado, %fisico, impacto, esforco
PR = [
 ("P01", "Reconfiguração do fluxo de recebimento e expedição", "GRU", "Fluxo logístico", "Implantação", "Gerência de Projetos GRU", "2026-02-01", "2026-12-15", "2027-01-20", 18.5, 15.0, 78, 5, 3),
 ("P02", "Automação da triagem (fase 2)", "GRU", "Automação", "Implantação", "Gerência de Automação", "2026-04-01", "2027-03-31", "2027-03-31", 26.0, 13.6, 56, 5, 4),
 ("P03", "Ampliação de docas e pátio de cargas", "GRU", "Expansão de terminal", "Business case", "Consultoria de Projetos", "2026-11-15", "2027-06-30", "2027-06-30", 21.0, 0.35, 0, 4, 5),
 ("P04", "Expansão da armazenagem com câmara climatizada", "MAO", "Expansão de terminal", "Implantação", "Gerência de Projetos Norte", "2026-05-01", "2027-03-15", "2027-06-10", 14.2, 6.9, 38, 5, 4),
 ("P05", "Integração rodoviária e contingência do corredor", "MAO", "Integração terrestre", "Implantação", "Logística Terrestre", "2026-07-01", "2027-01-31", "2027-01-31", 3.1, 1.7, 60, 4, 2),
 ("P06", "Zona Pharma e cadeia fria ampliada", "MIA", "Cadeia fria", "Implantação", "Gerência de Projetos MIA", "2026-03-01", "2026-11-30", "2026-11-30", 9.8, 8.6, 90, 4, 3),
 ("P07", "Câmaras frias para o pico de safra", "SCL", "Cadeia fria", "Implantação", "Gerência de Projetos SCL", "2026-06-01", "2026-12-10", "2027-01-05", 7.4, 5.5, 70, 5, 2),
 ("P08", "Renovação de equipamentos de movimentação", "VCP", "Equipamentos", "Implantação", "Manutenção e Ativos", "2026-04-15", "2026-12-20", "2026-12-20", 5.2, 4.0, 82, 3, 2),
 ("P09", "Padronização de processos e WMS leve", "LIM", "Tecnologia e dados", "Projeto", "Gerência de Sistemas", "2026-08-01", "2027-04-30", "2027-05-31", 4.4, 1.3, 30, 3, 3),
 ("P10", "Câmara fria para a temporada de flores", "BOG", "Cadeia fria", "Implantação", "Gerência de Projetos BOG", "2026-09-15", "2027-01-31", "2027-02-28", 6.0, 1.9, 22, 4, 3),
 ("P11", "Plataforma de rastreabilidade e dados (BI/IoT)", "REDE", "Tecnologia e dados", "Implantação", "Gerência de Sistemas", "2026-01-15", "2026-12-31", "2026-12-31", 8.9, 7.3, 85, 4, 3),
 ("P12", "Shuttle rodoviário dedicado GRU–VCP", "VCP", "Integração terrestre", "Implantação", "Logística Terrestre", "2026-06-01", "2026-12-31", "2026-12-31", 2.8, 2.1, 72, 3, 1),
 ("P13", "Renovação da frota de empilhadeiras", "MIA", "Equipamentos", "Operação", "Manutenção e Ativos", "2026-01-10", "2026-06-30", "2026-07-15", 3.5, 3.62, 100, 2, 1),
 ("P14", "Módulo para mercadorias perigosas (DG)", "GRU", "Expansão de terminal", "Conceito", "Consultoria de Projetos", "2027-02-01", "2027-06-30", "2027-06-30", 11.0, 0, 0, 3, 4),
 ("P15", "Hub Fresh Santiago (fase 2)", "SCL", "Expansão de terminal", "Aprovação", "Consultoria de Projetos", "2027-01-15", "2027-06-30", "2027-06-30", 15.0, 0.2, 0, 4, 5),
]
BENEFIT_TXT = {
 "P01": "Menor tempo de permanência e mais capacidade efetiva no pico", "P02": "Produtividade de triagem e redução de mão de obra",
 "P03": "Capacidade para crescimento de volume", "P04": "Capacidade e conservação de cargas sensíveis em Manaus",
 "P05": "Regularidade do corredor e menor risco de ruptura", "P06": "Receita de Pharma e conformidade de temperatura",
 "P07": "Capacidade para o pico de safra e menos perdas", "P08": "Disponibilidade de equipamentos e produtividade",
 "P09": "Padronização e visibilidade de estoque/fluxo", "P10": "Capacidade de frio para a temporada de flores",
 "P11": "Rastreabilidade de ponta a ponta e dados para BI", "P12": "Transferência regular entre os terminais do Sudeste",
 "P13": "Disponibilidade e segurança operacional", "P14": "Nova capacidade para mercadorias perigosas", "P15": "Capacidade adicional de perecíveis em Santiago"}

projects = []
for (pid, name, term, typ, phase, owner, st, eb, ef, bud, ac, prog, imp, eff) in PR:
    b, a = round(bud * MI), round(ac * MI)
    s, e1, e2 = D(st), D(eb), D(ef)
    # plano (cada orcamento distribuido entre inicio e fim base)
    pi = list(range(clamp(tl_idx(s), 0, 17), clamp(tl_idx(e1), 0, 17) + 1))
    plan = split(b, pi, bell(len(pi)))
    planArr = [plan.get(i, 0) for i in range(TL_MONTHS)]
    # realizado ate out/2026 (indice 9)
    cum9 = sum(planArr[:10])
    act = {}
    if a > 0:
        if cum9 > 0:
            idxs = [i for i in range(10) if planArr[i] > 0]
            act = split(a, idxs, [planArr[i] for i in idxs])
        else:
            act = {9: a}
    actArr = [act.get(i, 0) for i in range(10)]
    # previsao (nov/2026 em diante): EAC = orcamento / CPI
    ev = b * prog / 100
    cpi = ev / a if ev > 0 and a > 0 else None
    eac = a if prog >= 100 else (round(b / cpi) if cpi else b)
    rem = max(0, eac - a)
    fc = {}
    if rem > 0:
        f0 = max(10, clamp(tl_idx(s), 0, 17)); f1 = max(f0, clamp(tl_idx(e2), 0, 17))
        fi = list(range(f0, f1 + 1)); fc = split(rem, fi, bell(len(fi)))
    fcArr = [fc.get(i, 0) for i in range(10, TL_MONTHS)]
    projects.append({
        "id": pid, "name": name, "terminal": term, "type": typ, "phase": phase, "owner": owner,
        "start": st, "endBaseline": eb, "endForecast": ef, "budget": b, "capexActual": a, "progress": prog,
        "impact": imp, "effort": eff, "benefit": BENEFIT_TXT[pid],
        "spendPlan": planArr, "spendActual": actArr, "spendForecast": fcArr})
w("projects", projects)

# ------------------------------------------------------------------ business cases
def case(i, name, pid, capex, benefit, opex, years, rate, residual, bk, assum):
    return {"id": i, "name": name, "projectId": pid, "capex": round(capex * MI), "benefit": round(benefit * MI), "opex": round(opex * MI),
            "years": years, "rate": rate, "benefitGrowth": .03, "opexGrowth": .03, "residual": round(residual * MI),
            "breakdown": [{"label": l, "value": round(v * MI)} for l, v in bk], "assumptions": assum}
cases = [
 case("BC1", "Automação da triagem GRU (fase 2)", "P02", 26.0, 9.4, 1.8, 10, .11, 3.0, [("Saving de mão de obra", 4.6), ("Receita incremental", 3.1), ("Redução de perdas e avarias", 1.7)], "Ganho de produtividade de triagem e capacidade adicional para e-commerce; sem aumento de área."),
 case("BC2", "Expansão da armazenagem em Manaus", "P04", 14.2, 5.6, 1.0, 12, .11, 2.0, [("Receita incremental", 3.6), ("Penalidades e SLAs evitados", 1.2), ("Redução de perdas e avarias", .8)], "Capacidade para o corredor com crescimento de demanda; premissa de CAPEX no orçamento original (ver EAC do projeto)."),
 case("BC3", "Câmaras frias para o pico de safra em Santiago", "P07", 7.4, 3.3, .5, 10, .11, 0, [("Receita incremental", 2.0), ("Redução de perdas e avarias", 1.3)], "Capacidade dedicada à safra, com ocupação concentrada em poucos meses."),
 case("BC4", "Ampliação de docas e pátio em Guarulhos", "P03", 21.0, 4.3, 1.4, 12, .11, 1.5, [("Receita incremental", 2.7), ("Eficiência de custo logístico", 1.6)], "Retorno marginal: depende de crescimento de volume além do já previsto."),
 case("BC5", "Hub Fresh Santiago (fase 2)", "P15", 15.0, 3.4, 1.3, 10, .11, 2.0, [("Receita incremental", 2.4), ("Eficiência de custo logístico", 1.0)], "Premissa de volume incerta; sem contratos de demanda firmados."),
 case("BC6", "Módulo de mercadorias perigosas em Guarulhos", "P14", 11.0, 2.9, .8, 10, .11, 1.0, [("Receita incremental", 2.1), ("Penalidades e SLAs evitados", .8)], "Atende demanda hoje redirecionada a terceiros."),
]
w("cases", cases)

# ------------------------------------------------------------------ riscos
def risk(i, t, term, pid, cat, p, im, owner, mit, status, trend, due):
    return dict(id=i, title=t, terminal=term, projectId=pid, category=cat, probability=p, impact=im, owner=owner, mitigation=mit, status=status, trend=trend, due=due)
w("risks", [
 risk("R01", "Saturação do TECA em picos de e-commerce", "GRU", "P01", "Capacidade", 4, 5, "Gerência do terminal GRU", "Turno adicional e área de buffer temporária até a conclusão do P01", "Em mitigação", "up", "2026-11-20"),
 risk("R02", "Atraso na expansão da armazenagem de Manaus", "MAO", "P04", "Prazo", 4, 4, "Gerência de Projetos Norte", "Rebaseline com plano de recuperação e revisão de escopo", "Em mitigação", "up", "2026-11-12"),
 risk("R03", "Câmaras não prontas para a safra de cerejas", "SCL", "P07", "Prazo", 4, 5, "Gerência de Projetos SCL", "Câmaras móveis temporárias; antecipar comissionamento por módulos", "Aberto", "up", "2026-11-05"),
 risk("R04", "Capacidade de frio insuficiente na temporada de flores", "BOG", "P10", "Capacidade", 4, 4, "Gerência de Projetos BOG", "Reforçar equipe da obra e negociar câmara temporária", "Aberto", "flat", "2026-12-15"),
 risk("R05", "Dependência de integrador único de TI", "REDE", "P11", "Fornecedores", 3, 4, "Gerência de Sistemas", "Documentação e plano de transição; segunda fonte para suporte", "Monitorado", "flat", "2027-02-28"),
 risk("R06", "Interrupção do transporte terrestre/fluvial no corredor de Manaus", "MAO", "P05", "Operacional", 3, 4, "Logística Terrestre", "Plano de contingência e parceiro alternativo", "Em mitigação", "flat", "2026-12-20"),
 risk("R07", "Não conformidades na auditoria de certificação Pharma", "MIA", "P06", "Regulatório", 2, 5, "Qualidade MIA", "Pré-auditoria interna e plano de ação antes da conclusão do P06", "Monitorado", "down", "2026-11-30"),
 risk("R08", "Estouro de CAPEX na reconfiguração de fluxo", "GRU", "P01", "Financeiro", 2, 3, "Controladoria de Projetos", "Gatilho de aprovação para variações acima de 5%", "Monitorado", "flat", "2027-01-15"),
 risk("R09", "Falha de equipamentos durante a renovação", "VCP", "P08", "Operacional", 3, 3, "Manutenção e Ativos", "Escalonar a entrega e manter equipamentos reserva", "Monitorado", "down", "2026-12-20"),
 risk("R10", "Baixa adesão ao novo processo e ao WMS", "LIM", "P09", "Operacional", 3, 3, "Gerência de Sistemas", "Treinamento, líderes locais e piloto por turno", "Aberto", "flat", "2027-02-10"),
 risk("R11", "Reajuste de contratos de ground handling acima do orçado", "REDE", None, "Financeiro", 4, 3, "Compras e Contratos", "Renegociação antecipada e cláusulas de indexação", "Em mitigação", "up", "2026-12-31"),
 risk("R12", "Restrição de licenciamento para ampliação de docas", "GRU", "P03", "Regulatório", 2, 4, "Consultoria de Projetos", "Consulta prévia ao operador aeroportuário", "Aberto", "flat", "2027-01-31"),
 risk("R13", "Variação cambial sobre equipamentos importados", "SCL", "P07", "Financeiro", 3, 2, "Controladoria de Projetos", "Proteção cambial para compras remanescentes", "Monitorado", "down", "2026-12-10"),
 risk("R14", "Incidente com mercadorias perigosas", "MIA", None, "Segurança", 2, 5, "Segurança Operacional", "Reforço de treinamento e auditorias de aceitação", "Monitorado", "flat", "2027-03-31"),
])

# ------------------------------------------------------------------ fornecedores e malha rodoviaria
ALL = list(T.keys())
def sup(i, n, typ, terms, val, end, tgt, sla, cidx, saf, resp, inc):
    return dict(id=i, name=n, type=typ, terminals=terms, annualValue=round(val * MI), contractEnd=end, slaTarget=tgt, sla=sla, costIndex=cidx, safety=saf, responsiveness=resp, incidentsYtd=inc)
w("suppliers", [
 sup("F01", "Provedor GH-A", "Ground handling", ["GRU", "VCP"], 38, "2027-01-31", 95, [94.1, 93.8, 94.5, 93.9, 94.2, 93.6], 110, 4, 3, 9),
 sup("F02", "Provedor GH-B", "Ground handling", ["MAO"], 9.5, "2027-06-30", 94, [91.8, 92.2, 91.5, 92.0, 91.2, 91.0], 118, 3, 3, 7),
 sup("F03", "Provedor GH-C", "Ground handling", ["MIA"], 31, "2028-03-31", 96, [96.2, 96.5, 96.0, 96.4, 96.8, 96.3], 98, 5, 4, 2),
 sup("F04", "Provedor GH-D", "Ground handling", ["SCL", "LIM"], 17, "2026-12-31", 95, [95.5, 95.1, 94.8, 94.0, 93.5, 93.2], 103, 4, 4, 4),
 sup("F05", "Transportadora R1", "Transporte rodoviário", ["GRU", "VCP"], 22, "2027-08-31", 93, [95.2, 95.8, 96.0, 95.5, 96.1, 95.9], 96, 4, 5, 3),
 sup("F06", "Transportadora R2", "Transporte rodoviário", ["GRU", "MAO"], 12, "2026-12-15", 92, [89.5, 90.1, 88.9, 90.4, 89.7, 90.2], 112, 3, 3, 6),
 sup("F07", "Transportadora R3 (EUA)", "Transporte rodoviário", ["MIA"], 6.8, "2027-09-30", 94, [95.0, 95.4, 94.8, 95.6, 95.1, 95.3], 101, 4, 4, 1),
 sup("F08", "Transportadora R4 (Andina)", "Transporte rodoviário", ["SCL", "LIM", "BOG"], 8.4, "2027-04-30", 92, [91.0, 92.4, 90.8, 91.7, 92.1, 91.3], 106, 3, 4, 3),
 sup("F09", "Integrador de TI T1", "Tecnologia", ALL, 7.5, "2027-05-31", 98, [98.9, 99.1, 98.8, 99.0, 98.7, 99.2], 100, 4, 4, 1),
 sup("F10", "Manutenção M1", "Manutenção de equipamentos", ["GRU", "VCP"], 6.2, "2027-03-31", 93, [93.4, 92.8, 93.9, 93.1, 92.6, 93.5], 99, 4, 3, 2),
])
def lane(i, f, t, anc, km, tr, tons, ot, cost, ut, sp): return dict(id=i, from_=f, to=t, terminal=anc, km=km, tripsWeek=tr, tonsWeek=tons, onTime=ot, costPerT=cost, utilization=ut, supplier=sp)
lanes = [lane("L01", "GRU", "VCP", "GRU", 100, 42, 1850, 94.5, 62, 78, "F05"), lane("L02", "VCP", "GRU", "VCP", 100, 38, 1620, 95.1, 64, 71, "F05"),
         lane("L03", "GRU", "São José dos Campos", "GRU", 95, 14, 520, 93.0, 70, 66, "F06"), lane("L04", "GRU", "Curitiba", "GRU", 410, 10, 430, 90.5, 195, 69, "F06"),
         lane("L05", "MAO", "Distribuição local (Manaus)", "MAO", 25, 60, 700, 91.0, 88, 82, "F06"), lane("L06", "MIA", "Fort Lauderdale", "MIA", 45, 20, 640, 96.0, 85, 64, "F07"),
         lane("L07", "SCL", "Valparaíso", "SCL", 120, 18, 760, 92.0, 105, 73, "F08"), lane("L08", "BOG", "Medellín", "BOG", 415, 8, 260, 88.0, 230, 61, "F08")]
for l in lanes: l["from"] = l.pop("from_")
w("lanes", lanes)

# ------------------------------------------------------------------ pipeline + consultoria
def opp(i, n, loc, cat, stage, val, prob, nxt, owner, dec, hyp): return dict(id=i, name=n, location=loc, category=cat, stage=stage, annualValue=round(val * MI), probability=prob, nextStep=nxt, owner=owner, decisionDate=dec, hypothesis=hyp)
w("pipeline", [
 opp("O1", "Corredor rodoaéreo consolidado no Sudeste", "GRU", "Integração terrestre", "Viabilidade", 6.5, 45, "Validar demanda com parceiros", "Novos Negócios", "2026-12-10", "H6"),
 opp("O2", "Serviço de cadeia fria para farmacêuticos", "MIA", "Cargas especiais", "Business case", 9.0, 55, "Fechar premissas de ocupação e preço", "Novos Negócios", "2026-12-05", "H5"),
 opp("O3", "Capacidade sazonal de flores", "BOG", "Perecíveis", "Conceito", 3.8, 35, "Dimensionar câmara e contratos de temporada", "Novos Negócios", "2027-01-15", "H4"),
 opp("O4", "Armazenagem dedicada a e-commerce em Manaus", "MAO", "Capacidade e fluxo", "Viabilidade", 5.2, 50, "Levantar volume por dia da semana", "Novos Negócios", "2026-12-20", "H2"),
 opp("O5", "Serviços de cadeia fria a terceiros em Santiago", "SCL", "Perecíveis", "Triagem", 7.5, 25, "Mapear clientes e capacidade ociosa fora da safra", "Novos Negócios", "2027-02-15", "H3"),
 opp("O6", "Gestão de ativos ociosos em Viracopos", "VCP", "Eficiência de ativos", "Triagem", 2.1, 30, "Inventariar áreas e equipamentos", "Novos Negócios", "2027-02-28", None),
 opp("O7", "Parceria regional de ground handling em Lima", "LIM", "Parceiro operacional", "Conceito", 1.8, 40, "Comparar modelos de contratação", "Compras e Contratos", "2027-01-31", None),
])
w("consultant", {
 "decisions": [
  {"id": "D1", "title": "Aprovar capacidade temporária de frio para a safra em Santiago", "owner": "Diretoria de Operações", "due": "2026-11-05", "link": "P07", "recommendation": "Aprovar câmaras móveis até a conclusão do P07 e antecipar o comissionamento por módulos.", "why": "A conclusão prevista do P07 ocorre depois do início da safra."},
  {"id": "D2", "title": "Rebaselinar a expansão de armazenagem de Manaus", "owner": "Comitê de Investimentos", "due": "2026-11-12", "link": "P04", "recommendation": "Aprovar nova linha de base condicionada a plano de recuperação, revisão de escopo e gatilhos de parada.", "why": "O projeto está fora de prazo e de custo, e o corredor segue com ocupação crescente."},
  {"id": "D3", "title": "Definir a estratégia do contrato do Provedor GH-A", "owner": "Compras e Contratos", "due": "2026-11-30", "link": "F01", "recommendation": "Renegociar SLA com bônus e penalidade e abrir cotação paralela antes do vencimento.", "why": "O contrato vence em poucos meses e o SLA está abaixo da meta."},
  {"id": "D4", "title": "Priorizar os business cases da próxima janela de CAPEX", "owner": "Comitê de Investimentos", "due": "2026-12-10", "link": "BC1", "recommendation": "Priorizar BC1, BC2, BC3 e BC6; reavaliar BC4; não aprovar BC5 nas premissas atuais.", "why": "BC4 tem retorno marginal e BC5 tem VPL negativo nas premissas informadas."}],
 "actions": [
  {"id": "A1", "horizon": 30, "title": "Instalar câmaras móveis e plano de contingência para a safra de SCL", "owner": "Gerência de Projetos SCL", "link": "P07", "status": "Em andamento"},
  {"id": "A2", "horizon": 30, "title": "Elaborar plano de recuperação e nova linha de base do P04 (MAO)", "owner": "Gerência de Projetos Norte", "link": "P04", "status": "Em andamento"},
  {"id": "A3", "horizon": 30, "title": "Medir ocupação por turno no TECA GRU para o pico de e-commerce", "owner": "Gerência do terminal GRU", "link": "R01", "status": "Não iniciado"},
  {"id": "A4", "horizon": 60, "title": "Abrir cotação paralela de ground handling em GRU/VCP", "owner": "Compras e Contratos", "link": "F01", "status": "Não iniciado"},
  {"id": "A5", "horizon": 60, "title": "Fechar premissas e validar demanda dos casos BC4 e BC5", "owner": "Consultoria de Projetos", "link": "BC4", "status": "Não iniciado"},
  {"id": "A6", "horizon": 60, "title": "Reforçar obra e acordo de câmara temporária em Bogotá", "owner": "Gerência de Projetos BOG", "link": "P10", "status": "Não iniciado"},
  {"id": "A7", "horizon": 90, "title": "Consolidar o painel de KPIs com dados internos de todos os terminais", "owner": "Gerência de Sistemas", "link": "P11", "status": "Não iniciado"},
  {"id": "A8", "horizon": 90, "title": "Revisar o plano diretor de capacidade da rede com base no score", "owner": "Consultoria de Projetos", "link": "network", "status": "Não iniciado"},
  {"id": "A9", "horizon": 90, "title": "Avançar a oportunidade de cadeia fria para farmacêuticos para decisão", "owner": "Novos Negócios", "link": "O2", "status": "Não iniciado"}]})
print("demo gerado em", OUT)
