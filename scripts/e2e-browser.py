"""Verificacao opcional em navegador real (Playwright + Chromium).
Confere: nenhum erro de JavaScript, nenhuma tela com estouro horizontal em 4 larguras e troca de modos.
Uso: python scripts/e2e-browser.py            (sobe um servidor local na porta 8788)
     CHROMIUM_PATH=/caminho/chrome python scripts/e2e-browser.py
O 404 de data/internal/meta.json e esperado quando nao ha dados internos."""
import os, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PORT = 8788
VIEWS = ['consultant', 'overview', 'network', 'terminals', 'projects', 'kpis', 'business', 'risks', 'suppliers', 'opportunities', 'governance']
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2); fails = []
try:
    with sync_playwright() as p:
        kw = {'args': ['--no-sandbox']}
        if os.environ.get('CHROMIUM_PATH'): kw['executable_path'] = os.environ['CHROMIUM_PATH']
        b = p.chromium.launch(**kw)
        for w in (390, 768, 1024, 1400):
            pg = b.new_page(viewport={'width': w, 'height': 900}); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(f'http://localhost:{PORT}/index.html#consultant'); pg.wait_for_selector('#appContent .callout, #appContent .panel', timeout=10000)
            for v in VIEWS:
                pg.evaluate(f"location.hash='{v}'"); pg.wait_for_timeout(200)
                sw = pg.evaluate('document.documentElement.scrollWidth')
                if sw > w + 1: fails.append(f'{v} @ {w}px: estouro horizontal ({sw}px)')
                if 'NaN' in pg.inner_text('#appContent') or 'undefined' in pg.inner_text('#appContent'): fails.append(f'{v} @ {w}px: NaN/undefined na tela')
            pg.evaluate("location.hash='kpis'"); pg.wait_for_timeout(200)   # estados internos da tela de KPIs
            def check(label):
                sw = pg.evaluate('document.documentElement.scrollWidth')
                if sw > w + 1: fails.append(f'kpis/{label} @ {w}px: estouro horizontal ({sw}px)')
                t = pg.inner_text('#appContent')
                if 'NaN' in t or 'undefined' in t: fails.append(f'kpis/{label} @ {w}px: NaN/undefined na tela')
            if 'Quadro de KPIs executivos' not in pg.inner_text('#appContent'): fails.append(f'kpis @ {w}px: a tela deve abrir no quadro executivo')
            if pg.locator('.exec-heat .hmb').count() < 8: fails.append(f'kpis @ {w}px: mapa de calor executivo ausente')
            check('exec')
            for tab, ks in (('financial', ('revenue', 'opexAdherence', 'contribution', 'margin')), ('operational', ('occupancy', 'tempExc', 'dwell'))):
                pg.click(f'[data-set="kv"][data-val="{tab}"]'); pg.wait_for_timeout(150); check(tab)
                for k in ks:
                    pg.click(f'[data-set="kpi"][data-val="{k}"]'); pg.wait_for_timeout(150); check(k)
                    if pg.locator('.kcard.on').count() != 1: fails.append(f'kpis/{k} @ {w}px: deve haver exatamente um cartao selecionado')
            pg.click('[data-set="kv"][data-val="exec"]'); pg.wait_for_timeout(150); check('exec (volta)')
            pg.click('.exec-heat tbody tr.net td:nth-child(4) button'); pg.wait_for_timeout(150)   # celula do mapa de calor abre o KPI
            if pg.locator('.kcard.on').count() != 1: fails.append(f'kpis @ {w}px: celula do mapa de calor deve abrir o KPI')
            fails += [f'erro JS @ {w}px: {e}' for e in errs]; pg.close()
        pg = b.new_page(viewport={'width': 1300, 'height': 900}); pg.goto(f'http://localhost:{PORT}/index.html#consultant'); pg.wait_for_selector('#appContent .callout')
        if pg.locator('#modeSwitch button').count() >= 2:
            pg.click('#modeSwitch button:has-text("Públicos")'); pg.wait_for_timeout(200)
            if 'indisponível' not in pg.inner_text('#appContent'): fails.append('modo publico deveria avisar que a gestao esta indisponivel')
            pg.click('#modeSwitch button:has-text("Demonstração")'); pg.wait_for_timeout(200)
            if 'fictício' not in pg.inner_text('#appContent'): fails.append('modo demonstracao deveria marcar "fictício"')
        # ---- tema de vidro, busca por teclado, indicador do menu e modo TV (desktop)
        pg = b.new_page(viewport={'width': 1440, 'height': 900}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://localhost:{PORT}/index.html#consultant'); pg.wait_for_selector('#appContent .callout'); pg.wait_for_timeout(700)
        bf = pg.evaluate("getComputedStyle(document.querySelector('.panel')).backdropFilter || getComputedStyle(document.querySelector('.panel')).webkitBackdropFilter")
        if not bf or bf == 'none': fails.append('vidro: .panel deveria ter backdrop-filter no desktop')
        a, ind = pg.locator('.nav-item.active').bounding_box(), pg.locator('#navInd').bounding_box()
        if not ind or abs(ind['y'] - a['y']) > 2 or abs(ind['height'] - a['height']) > 2: fails.append(f'menu: indicador desalinhado do item ativo ({ind} vs {a})')
        pg.evaluate("location.hash='risks'"); pg.wait_for_timeout(500)
        a, ind = pg.locator('.nav-item.active').bounding_box(), pg.locator('#navInd').bounding_box()
        if abs(ind['y'] - a['y']) > 2: fails.append('menu: indicador nao acompanhou a troca de tela')
        pg.evaluate("location.hash='consultant'"); pg.wait_for_timeout(300)
        if pg.locator('.rg').count() != 3 or any((pg.locator('.rg').nth(i).bounding_box() or {'width': 0})['width'] < 60 for i in range(3)): fails.append('aneis: devem existir 3 e ter largura visivel')
        if pg.locator('.cons-rail').count() != 1 or (pg.locator('.cons-rail').bounding_box() or {'height': 0})['height'] > 900: fails.append('painel lateral deve caber na altura da janela (rolagem interna)')
        pg.keyboard.press('/'); pg.keyboard.type('P04'); pg.wait_for_timeout(250)
        if pg.locator('#searchResults [role=option]').count() < 1 or pg.get_attribute('#globalSearch', 'aria-expanded') != 'true': fails.append('busca: digitar deve abrir resultados e marcar aria-expanded')
        pg.keyboard.press('ArrowDown'); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
        if pg.inner_text('#pageTitle') != 'Projetos e portfólio' or 'P04' not in pg.inner_text('#appContent'): fails.append('busca: Enter no primeiro resultado deveria abrir o projeto P04')
        if pg.locator('#searchResults').is_visible() or pg.input_value('#globalSearch') != '': fails.append('busca: deveria fechar e limpar depois de escolher')
        pg.keyboard.press('/'); pg.keyboard.type('zzzzqq'); pg.wait_for_timeout(200)
        if 'Nada encontrado' not in pg.inner_text('#searchResults'): fails.append('busca: sem resultado deveria mostrar mensagem')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
        if pg.locator('#searchResults').is_visible(): fails.append('busca: Esc deveria fechar')
        pg.click('#themeToggle'); pg.wait_for_timeout(300)
        if not pg.evaluate("document.body.classList.contains('dark')"): fails.append('tema escuro deveria ativar')
        pg.click('#tvMode'); pg.wait_for_timeout(300)
        tv = pg.evaluate("getComputedStyle(document.querySelector('.panel')).backdropFilter")
        if tv not in ('none', '', None): fails.append('modo TV: desfoque deveria estar desligado (' + str(tv) + ')')
        fails += [f'erro JS (vidro): {e}' for e in errs]; pg.close()
        # ---- transparencia reduzida: o vidro vira opaco
        ctx = b.new_context(viewport={'width': 1300, 'height': 900}, reduced_motion='reduce'); pg = ctx.new_page(); pg.goto(f'http://localhost:{PORT}/index.html#consultant'); pg.wait_for_selector('#appContent .callout')
        if pg.evaluate("getComputedStyle(document.querySelector('.card')).transitionDuration") not in ('0s', '0s, 0s', '0s, 0s, 0s'): fails.append('movimento reduzido: transicoes deveriam ser desligadas')
        ctx.close()
        b.close()
finally:
    srv.terminate()
print('FALHAS:\n- ' + '\n- '.join(fails) if fails else 'OK: sem erros de JS, sem estouro horizontal em 4 larguras e modos funcionando.')
sys.exit(1 if fails else 0)
