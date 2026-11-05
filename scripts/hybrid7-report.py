from pathlib import Path
import json,hashlib,difflib
r=Path('prototype-qa/hybrid-7')
counts={'geometry':91,'limits':60,'review':35,'reveal':17,'gameplay':40,'apprentice':16,'viewport':8,'hands':693,'touch':21}
for name,count in counts.items():
    if name=='viewport':
        data=json.loads((r/'viewport-result.json').read_text());assert len(data)==count and all(x['noScroll'] and x.get('stableHover',True) and x.get('stableDraw',True) for x in data)
    else:
        output=Path('prototype-qa/hybrid7-'+name+'.log').read_text(encoding='utf-8-sig').strip();result=json.loads(output);assert result['passed']==count and not result.get('errors')
perf=[json.loads((r/f'performance-dpr{n}.json').read_text()) for n in [1,2]]
fog=json.loads((r/'fog-performance.json').read_text())
hands=json.loads((r/'hands.json').read_text())
scale_table='\n'.join(f"| {x['viewport']['width']}×{x['viewport']['height']} | {x['dpr']} | {(x['scale']-1)*100:.1f}% | {x['height']} px |" for x in hands['metrics'])
doc=f'''# RunaMarca híbrido — revisão 7: mãos nas bordas e câmera mais reta

Abrir **http://127.0.0.1:3086/runamarca/hybrid/index.html** e usar **Ctrl+F5** (`hybrid-7`). Se o servidor estiver parado, executar `ABRIR-PROTOTIPO.cmd` na raiz e manter o terminal aberto. Servidor exclusivamente local, porta 3086 em 127.0.0.1. Sem commit ou publicação. Branch `prototype/board-perspective-20261028`, base `d1420a66e4bb431c8ceb374cc527b41a3c76506d`.

Rollback preservado em `../revisions/before-hybrid-slice-7/` (revisão 6, 113 arquivos) e `../revisions/before-hybrid-7-hands/` (etapa somente câmera, 121 arquivos), ambos com SHA256. O checkout principal permaneceu limpo.

## Resultado visual e interação

Mão aliada em leque, com o centro mais alto, laterais girando para fora e apenas a parte superior das cartas entrando na arena pela borda inferior. Mão rival com o arco invertido: centro mais baixo, extremidades mais altas e versos saindo da borda superior. O recorte é deliberado e externo à mão. As nove cartas conservam partes acessíveis; não houve recorte dos arquivos de arte ou redesenho da carta.

As mãos usam os próprios botões, UIDs e handlers nativos. A ordem continua controlada pelo jogo, inclusive na reorganização por arrasto. O leque não reposiciona o tabuleiro ao comprar ou fazer hover. O hover mantém a origem reconhecível e estável, amplia a carta completa acima da mão e aplica contorno verde. No mobile, a carta ampliada e os textos de apoio são organizados verticalmente e o conjunto é dimensionado para caber; não há corte de título, custo ou regras da carta. O toque continua abrindo o menu nativo de colocação, com cancelamento sem comando de jogo. Não foi criada uma mecânica nova de toque.

Os versos rivais continuam sem faces, nomes ou canvas de cartas. O módulo de leque lê somente a apresentação já existente no DOM e não acessa estado privado ou API. A própria imagem original completa continua em 900×1260 na mão; o combate/reserva e o renderizador nativo permanecem preservados.

A câmera suave foi reduzida proporcionalmente em 15%: **30,6232673773° × 0,85 = 26,0297772707°**, em relação à vista perpendicular. Mesa, cartas, decks, placas, fumaça e coordenadas de interação são recalculados pelo sistema comum de projeção.

O único novo elemento decorativo é **um pequeno selo de cera junto à vela**, em viewports acima de 1100 px. Livro, vela, marcador, parafuso e folha da revisão anterior foram conservados. O selo é geometria sem captura de input. Também foi corrigida uma faixa transparente do menu que interceptava o deck superior, preservando os controles do menu.

## Recorte intencional e limites responsivos

As guardas agora verificam HUD, controles e altura real do documento, aceitando as partes da mão que ficam fora da viewport. O recorte deixa de reduzir artificialmente todo o conteúdo para 4,6%. A escala máxima continua em 15%; uma margem para a prateleira evita rolagem involuntária. Escalas efetivas registradas no ensaio das mãos:

| Viewport CSS | DPR | Escala linear do conteúdo | Altura do documento |
| --- | --- | --- | --- |
{scale_table}

Essas são medidas da execução, não promessa de escala idêntica em toda sequência de redimensionamento. A altura efetiva e o ajuste da prateleira participam do cálculo; compra e hover mantêm a geometria estável. Em 1920×900 houve 13,8% no percurso de redimensionamento DPR 1 e 15% na abertura DPR 2. As caixas projetadas não crescem uniformemente, e a largura mobile continua limitada à tela. No mobile, o campo usa rolagem vertical, a mão aliada permanece junto à borda inferior e a rival acompanha a saída do topo ao rolar. O patrono e os controles inferiores podem ser trazidos acima do leque pela rolagem.

As cinco referências desta etapa foram inspecionadas em pixels pelo parent em outro ambiente autorizado e transmitidas por briefing visual fiel, posteriormente autorizado como base da implementação. A leitura local da Library forneceu ponteiros/OCR; a materialização falhou no Windows antes da instalação do primeiro arquivo por `os.setxattr` indisponível. Não alegamos inspeção local desses cinco arquivos nem contornamos a falha. As capturas do próprio protótipo foram geradas e inspecionadas localmente.

## Validação final

**{sum(counts.values())} verificações/medições, zero falhas finais e nenhum erro JS/WebGL registrado.** Evidências em `prototype-qa/hybrid-7/`, logs em `prototype-qa/hybrid7-*.log`.

| Comando | Resultado |
| --- | --- |
| `node scripts/hybrid7-hands.mjs` | 693: mãos 0/1/2/5/9, nove hovers individuais, identidade integral, teclado, arrasto da origem recortada/cancelamento, mobile e DPR 2 |
| `node scripts/hybrid7-touch.mjs` | 21: toque em emulação mobile 320/390, menus e cancelamento sem comandos |
| `node scripts/hybrid7-geometry.mjs` | 91: câmera, projeção, hitboxes, DPR 2, clones e fallback WebGL |
| `node scripts/hybrid7-limits.mjs` | 60: dez posições ocupadas, ausência de colisões e nove alvos |
| `node scripts/hybrid7-review.mjs` | 35: reservas, decks/menu, placas, fumaça e decoração |
| `node scripts/hybrid7-reveal.mjs` | 17: quadros de revelação progressiva e segredo nas duas perspectivas |
| `node scripts/hybrid7-gameplay.cjs` | 40: HTTP real, compra, menu, arrasto interrompido/repetido e retorno |
| `node scripts/hybrid7-apprentice.mjs` | 16: mira, cancelamento, confirmação, recarga e duas visões |
| `node scripts/hybrid7-viewport.cjs` | 8 medições: compra e hover sem reorganização geral ou rolagem desktop |
| `node scripts/hybrid7-performance.mjs 1` e `2` | 20 reconstruções e 20 reamostragens por DPR |
| `node scripts/hybrid7-fog-performance.mjs` | 60 amostras isoladas |

Na preparação inicial de uma execução HTTP não havia criatura adequada na mão aleatória. O teste passou a usar a troca inicial legal quando necessário; a repetição final passou. O registro anterior está preservado em `gameplay-setup-failed.json`. A QA também encontrou e corrigiu a interceptação transparente do deck e o pixel extra de rolagem em um cenário 720p. Os resultados finais substituem os ensaios intermediários que falharam.

CPU quente do bridge: medianas **{perf[0]['warm']['median']:.1f}/{perf[1]['warm']['median']:.1f} ms**, p95 **{perf[0]['warm']['p95']:.1f}/{perf[1]['warm']['p95']:.1f} ms** em DPR 1/2. Reamostragem da mão: medianas **{perf[0]['handSampling']['median']:.1f}/{perf[1]['handSampling']['median']:.1f} ms**. Fumaça isolada: mediana **{fog['median']:.1f} ms**, p95 **{fog['p95']:.1f} ms**. A primeira amostra observada chegou a **{max(p['startup']['bridgeMs'] for p in perf):.1f} ms** em DPR 2; não é um ensaio controlado de partida fria e não foi descartada. Não se mede FPS físico ou tempo GPU por esses números.

Capturas úteis: `hands-before-1920x900.png` / `hands-after-1920x900.png`, `fan-nine-1920x900-dpr1.png`, `fan-hover-1920x900-dpr1-4.png`, `fan-hover-320x800-dpr1-8.png`, `fan-mobile-scrolled-390x800-dpr1.png`, `touch-390.png`, capturas privadas A/B e `reveal-*`. A geometria cobre também 1280×720, 1440×900, 1536×740, 1920×1080 e 320 px; o teste das mãos inclui DPR 2 e emulação de toque.

Limites: QA headless em CSS pixels, sem medir barras físicas de uma janela nativa, aparelho móvel real ou FPS de hardware. Textos muito extensos podem reduzir o conjunto de hover para caber. As faces continuam DOM sobre geometria WebGL. Não foi executado o pacote npm completo, nem rede pública; o pacote não possui scripts de build/lint/typecheck. Não houve alteração de regras, instalação de dependências ou envio de dados a terceiros. Nenhuma captura foi salva na Library.

---

## Histórico — revisão 6

'''
p=Path('mesa-nova/hybrid/README.md');previous=p.read_text(encoding='utf-8');marker='# RunaMarca híbrido — revisão 6';previous=previous[previous.index(marker):];p.write_text(doc+previous,encoding='utf-8')
snapshot=Path('../revisions/before-hybrid-slice-7');manifest=json.loads((snapshot/'SHA256.json').read_text(encoding='utf-8-sig'));changes=[];protected=[]
for f in manifest:
    name=f['path']
    if not name.startswith('mesa-nova/'):continue
    src=Path(name);sha=hashlib.sha256(src.read_bytes()).hexdigest()
    if sha.lower()==f['sha256'].lower():protected.append(name);continue
    delta=list(difflib.unified_diff((snapshot/name).read_text(encoding='utf-8-sig').splitlines(),src.read_text(encoding='utf-8-sig').splitlines()))
    changes.append({'path':name,'sha256':sha,'added':sum(l.startswith('+') and not l.startswith('+++') for l in delta),'removed':sum(l.startswith('-') and not l.startswith('---') for l in delta)})
name='mesa-nova/hybrid/fan-layout.js';src=Path(name);changes.append({'path':name,'sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'added':len(src.read_text().splitlines()),'removed':0})
native=['mesa-nova/app.js','mesa-nova/game.mjs','mesa-nova/combat-triggers.mjs','mesa-nova/targeting.js','mesa-nova/progressive-reveal.mjs'];assert all(n in protected for n in native)
source={'against':'revision 6 / before-hybrid-slice-7','changed':changes,'added':sum(c['added'] for c in changes),'removed':sum(c['removed'] for c in changes),'unchangedSnapshotProductFiles':protected,'nativeRulesAndInteractionUnchanged':native}
(r/'source-delta.json').write_text(json.dumps(source,ensure_ascii=False,indent=2),encoding='utf-8')
(r/'validation-summary.json').write_text(json.dumps({'counts':counts,'total':sum(counts.values()),'finalFailures':0,'referencePixels':'inspected by parent elsewhere; authorized visual briefing used locally','originalsViewedLocally':False,'qaScreenshotsViewedLocally':True,'newElement':'wax-seal','cameraDegrees':26.029777270737352},indent=2),encoding='utf-8')
print(json.dumps({'total':sum(counts.values()),'sourceChanges':[c['path'] for c in changes],'added':source['added'],'removed':source['removed']}))
