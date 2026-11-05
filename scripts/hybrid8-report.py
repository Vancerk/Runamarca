from pathlib import Path
import json, hashlib, difflib, subprocess

root=Path.cwd(); out=root/'prototype-qa/hybrid-8'; snapshot=root.parent/'revisions/before-hybrid-slice-8'
counts={'geometry':91,'limits':60,'review':35,'reveal':17,'apprentice':16,'hands':693,'touch':21,'gameplay':40,'flights':37,'motion':12,'sequence':7}
for name,count in counts.items():
    r=json.loads((root/f'prototype-qa/hybrid8-{name}.log').read_text(encoding='utf-8-sig'))
    assert r['passed']==count and not r.get('errors'),(name,r)
viewport=json.loads((out/'viewport-result.json').read_text());assert len(viewport)==8 and all(x['noScroll'] and x.get('stableHover',True) and x.get('stableDraw',True) for x in viewport)
baseline=json.loads((out/'baseline-probe.json').read_text());final=json.loads((out/'atomic/baseline-probe.json').read_text())
assert sum(bool(x['unprojected']) for x in baseline['frames'])==5
assert all(not x['unprojected'] and not x['welcome'] and not x['mulligan'] for x in final['frames'])
perf=[json.loads((out/f'performance-dpr{n}.json').read_text()) for n in [1,2]]
fog=json.loads((out/'fog-performance.json').read_text()); layouts=json.loads((out/'final-layout.json').read_text())
assert all(x['overflow']['h']==x['viewport']['h'] for x in layouts if x['viewport']['w']>900)
manifest=json.loads((snapshot/'SHA256.json').read_text());changes=[]
for item in manifest:
    path=item['path']; current=root/path
    if current.is_file() and hashlib.sha256(current.read_bytes()).hexdigest()!=item['sha256']:
        before=(snapshot/path).read_text(encoding='utf-8-sig').splitlines();after=current.read_text(encoding='utf-8-sig').splitlines()
        diff=list(difflib.unified_diff(before,after,fromfile='rev7/'+path,tofile='rev8/'+path,lineterm=''))
        changes.append({'path':path,'added':sum(s.startswith('+') and not s.startswith('+++') for s in diff),'removed':sum(s.startswith('-') and not s.startswith('---') for s in diff)})
new_runtime=['mesa-nova/hybrid/lifecycle.js','mesa-nova/hybrid/flights.js','mesa-nova/hybrid/visuals.js']
test_table='\n'.join(f'| `node scripts/hybrid8-{name}.{ "cjs" if name=="gameplay" else "mjs"}` | {count} passaram |' for name,count in counts.items())
scale_table='\n'.join(f"| {x['viewport']['w']}×{x['viewport']['h']} | {x['scale']['scale']:.3f} | {x['overflow']['h']} px |" for x in layouts)
doc=f'''# RunaMarca híbrido — revisão 8: sequência e estabilidade

Abrir **http://127.0.0.1:3086/runamarca/hybrid/index.html** e usar **Ctrl+F5** (`hybrid-8`). Reiniciar, se necessário: executar `ABRIR-PROTOTIPO.cmd` na raiz e manter o terminal aberto. O servidor foi confirmado em **127.0.0.1:3086**, PID 2348, HTTP 200. A revisão 6 continua em `/runamarca/`.

Worktree: `C:/Users/vanxf/Documents/Codex/2026-10-28/task-2/runamarca-board-prototype`, branch `prototype/board-perspective-20261028`, base `d1420a66e4bb431c8ceb374cc527b41a3c76506d`. Sem commit, push, publicação ou alteração do checkout principal, confirmado limpo. Rollback desta etapa: **`../revisions/before-hybrid-slice-8/`**, 127 arquivos e manifesto SHA256. O histórico da revisão 7 segue abaixo.

## Implementação e diagnóstico

* **Adquirir Atualização (FL10):** regra real “Conceda +1/+1 a uma criatura aliada.” Não há requisito de rodada na reserva. A busca do alvo escolhia primeiro uma cópia antiga de mulligan invisível (caixa 0×0). A saída do mulligan agora limpa essas cópias, e a busca prefere o nó vivo do jogo. Outro conflito foi reproduzido com clique real: o pointerdown do arrasto cancelava a mira antes do click confirmá-la. Durante uma mira ativa, esse início de arrasto deixa o clique para o seletor de alvos. Nenhuma regra de buff ou elegibilidade foi alterada.
* **Descontinuidade reproduzida:** cinco quadros de DOM sem projeção em 49 amostras de reconstruções repetidas; o screencast mostra encaixes e rótulos transitórios em posições nativas. A reconstrução híbrida agora é atômica com o render nativo. Na amostra final, zero quadros sem projeção em 49 e 28 capturas do compositor. Não apareceu tela de entrada/mulligan nessa reprodução; não há alegação de corrigir toda origem possível de flicker.
* **Compra:** verso parte do deck atual, sobe em 260 ms, vira em 220 ms, mostra a carta completa por 1050 ms e segue à mão em 360 ms. A mão fica inert e bloqueada para comandos de cartas durante a fila; volta ao terminar ou ao interromper. Movimento reduzido mantém leitura de 600 ms e encurta deslocamentos. O rival recebe apenas um verso. Cancelamento, perda de foco, redimensionamento e interrupção antes/durante a transferência inicial foram testados.
* **Mulligan/colocação:** destinos são medidos após o layout e a projeção atuais, sem fallback em coordenadas zero. Devolução usa o deck observado; confirmação envia as cinco cartas à mão. Transferências interpolam as quatro esquinas da geometria antiga/nova. Vizinhos da mão/reserva movem-se suavemente por 240–300 ms, conservando os controles nativos. A sequência real com duas sessões locais passou.
* **Perspectiva:** 26,0297772707° × 0,85 = **22,1253106801°**. Magias colocadas e seus versos ocultos agora usam a mesma projeção da superfície; emanações, cartas, decks, painéis e fumaça recalculam a câmera comum. Não houve substituição de identidade, arte, título, moldura, custo ou regras das cartas.
* **Espaços:** conforme esclarecimento do usuário, não foi adicionado zoom. Os intervalos configuráveis positivos foram multiplicados por 0,85: margem superior da reserva 18→15,3 px, margem da arena 1→0,85 px, padding vertical 4/6→3,4/5,1 px e afastamentos laterais/registro 4/1→3,4/0,85 antes da escala. Distâncias visuais finais também dependem da perspectiva, escala responsiva e hitboxes; não se afirma redução exata de 15% de todo vão na tela. Intervalos já nulos permanecem nulos.
* **Recorte da mão:** recuperados 25% da altura nominal antes oculta, `visível = visível_anterior + 0,25 × (altura − visível_anterior)`, nos dois lados. O centro sem giro segue essa proporção; nas pontas giradas, a porção visível varia com ângulo e curvatura. Nove cartas permanecem alcançáveis e o hover conserva a carta integral.
* **Única decoração nova:** pequena **arruela de bronze junto ao parafuso**, apenas quando há espaço (>1100 px), sem capturar input. Selo, folha, parafuso, marcador, livros e vela anteriores foram mantidos.

## Viewport e desempenho medidos

Viewport CSS, zoom 100%, DPR 1; 1920×900 representa área útil de navegador normal num monitor Full HD. Headless não mede a altura real das barras instaladas no navegador do usuário. Também houve testes DPR 2 e mobile. O ajuste ignora a altura transitória do DOM de combate antes da projeção e valida o fluxo/HUD; o documento final foi medido sem rolagem desktop. Mobile mantém rolagem vertical intencional.

| Viewport | Escala herdada efetiva | Documento final |
| --- | --- | --- |
{scale_table}

Não houve novo aumento de 15%: a escala herdada máxima continua 1,15 e se adapta ao envelope da mão/HUD. A geometria do campo mantém dimensões próprias, sem crescimento uniforme de todos os objetos.

CPU de reconstrução/submissão WebGL em Chrome headless: DPR 1 mediana **{perf[0]['warm']['median']:.1f} ms**, p95 **{perf[0]['warm']['p95']:.1f} ms**; DPR 2 mediana **{perf[1]['warm']['median']:.1f} ms**, p95 **{perf[1]['warm']['p95']:.1f} ms**. Primeiras construções observadas: {perf[0]['startup']['bridgeMs']:.1f}/{perf[1]['startup']['bridgeMs']:.1f} ms. Essa amostra inclui aquecimento e não é benchmark frio controlado. Fumaça: mediana {fog['median']:.1f} ms, p95 {fog['p95']:.1f} ms. Não foram medidos FPS/GPU em janela física.

## Verificações e evidências

**{sum(counts.values())} checagens de navegador aprovadas**, mais oito medições de estabilidade/viewport. Sem erro JS/WebGL nas baterias finais. Logs `prototype-qa/hybrid8-*.log`, resultados/capturas internas `prototype-qa/hybrid-8/`.

| Comando | Resultado |
| --- | --- |
{test_table}
| `node scripts/hybrid8-viewport.cjs` | 8 medições: sem scroll desktop e sem deslocamento do campo no hover/compra |
| `node scripts/hybrid8-probe.mjs` | alvo antigo/novo válidos; zero quadro sem projeção na amostra final |
| `node scripts/hybrid8-performance.mjs 1` e `2` | 20 reconstruções + 20 reamostragens por DPR |
| `node scripts/hybrid8-fog-performance.mjs` | 60 amostras |

Regressão nativa: `node --test mesa-nova/test-opening-return.mjs mesa-nova/test-match-effect-cleanup.mjs mesa-nova/test-public-visibility.mjs mesa-nova/test-ui.mjs mesa-nova/test-interactions-audit.mjs mesa-nova/test-visual-ghosts.mjs`: **13 passaram, 1 falhou**. Falha em `test-ui.mjs`: `TypeError: dialog.addEventListener is not a function`, no stub do diálogo. A mesma falha foi confirmada executando o teste contra o `app.js` do snapshot anterior (log `hybrid8-native-ui-baseline.log`). Não foi mascarada nem alterada. Os cliques de mira/transferências equivalentes passaram no navegador. `node --test mesa-nova/test-apprentice-cancel.mjs mesa-nova/test-progressive-reveal.mjs`: **7 passaram, 0 falharam**. Sintaxe dos módulos JS da fatia validada com `node --check`. Não foi executado `npm test` completo; não há scripts de build/lint/typecheck nesse package.

Capturas inspecionadas: `final-1920x900.png`, `final-1920x1080.png`, `fan-hover-1280x720-dpr1-4.png`, `draw-read-1920x900.png`, `draw-read-390x800.png`, `spell-perspective-a.png`, `reveal-stage-1.png`, `sequence-after-confirm.png`, `baseline-frame-01.png` e `atomic/baseline-frame-01.png`. As capturas permanecem locais; nada foi salvo na Library. Comparativo com a revisão anterior em `prototype-qa/hybrid-7/hands-after-*.png`; diagnóstico antes/depois da falha nesta pasta.

O vídeo foi analisado pelo parent em ambiente autorizado e transmitido por descrição temporal: compra com verso, virada, leitura ampliada e chegada à mão; hover conserva o restante do leque. O trecho de arrasto termina antes da soltura; não foi usado como prova da animação final de colocação. Não se copiou asset nem se atribuiu implementação interna ao Hearthstone.

## Como testar

1. Abrir o endereço e Ctrl+F5. Criar sala local e entrar na segunda aba pelo código.
2. Escolher decks, trocar duas cartas e confirmar: observar ida ao deck, leitura e chegada na grade/mão. O relógio continua sendo o do jogo.
3. Comprar nas rodadas seguintes: a mão fica brevemente bloqueada, depois volta a responder. Testar sair/voltar da aba durante a animação.
4. Com Adquirir Atualização na mão, selecionar criatura antiga da reserva pela seta. A magia deve conceder +1/+1; Esc cancela a mira antes do comando.
5. Testar nove cartas/hover, colocar criatura na reserva e arrastar na formação. Conferir a segunda visão sem acesso à mão ou às posições futuras do rival.

## Arquivos desta etapa

Código existente alterado: `mesa-nova/app.js`, `mesa-nova/hybrid/bridge.js`, `bridge.css`, `card-plane.js`, `fan-layout.js`, `layout.js`, `index.html`. Novos: `hybrid/lifecycle.js`, `hybrid/flights.js`, `hybrid/visuals.js`. Documentação atualizada: este guia e `PROTOTIPO-LOCAL.md`. Scripts `scripts/hybrid8-*` e evidências locais adicionados. Diffstat exato relativo à revisão 7 em `prototype-qa/hybrid-8/change-report.json`.

Motor, regras, catálogo e módulos de sigilo/revelação não mudaram nesta revisão. A reprodução é local com servidor de teste; jogo hospedado, latência de internet, Chrome visível, GPU/FPS e vídeo completo não foram verificados nesta etapa. Não há bloqueio de acesso pendente.

---

'''
readme=root/'mesa-nova/hybrid/README.md'; old=readme.read_text(encoding='utf-8-sig');
if old.startswith('# RunaMarca híbrido — revisão 8:'): old=old.split('\n---\n\n',1)[1]
readme.write_text(doc+old,encoding='utf-8')
local=root/'PROTOTIPO-LOCAL.md';old=local.read_text(encoding='utf-8-sig');prefix='# Mesa híbrida — revisão 8\n\nAbrir http://127.0.0.1:3086/runamarca/hybrid/index.html e usar Ctrl+F5. Se necessário, executar `ABRIR-PROTOTIPO.cmd` e manter o terminal aberto. Guia completo e resultados em `mesa-nova/hybrid/README.md`. Revisão 6 preservada abaixo. Sem commit/publicação.\n\n---\n\n'
if not old.startswith('# Mesa híbrida — revisão 8'):local.write_text(prefix+old,encoding='utf-8')
changes=[]
for item in manifest:
    p=item['path'];now=root/p
    if now.is_file() and hashlib.sha256(now.read_bytes()).hexdigest()!=item['sha256']:
        delta=list(difflib.ndiff((snapshot/p).read_text(encoding='utf-8-sig').splitlines(),now.read_text(encoding='utf-8-sig').splitlines()));changes.append({'path':p,'added':sum(s.startswith('+ ') for s in delta),'removed':sum(s.startswith('- ') for s in delta)})
for p in new_runtime:changes.append({'path':p,'added':len((root/p).read_text(encoding='utf-8').splitlines()),'removed':0,'new':True})
for p in sorted((root/'scripts').glob('hybrid8-*')):changes.append({'path':p.relative_to(root).as_posix(),'added':len(p.read_text(encoding='utf-8-sig').splitlines()),'removed':0,'new':True})
main=r'C:\Users\vanxf\Documents\Codex\2026-10-27\task-10\runamarca-v25-integration'
git=lambda args:subprocess.check_output(['git',*args],text=True,encoding='utf-8').strip()
result={'base':git(['rev-parse','HEAD']),'branch':git(['branch','--show-current']),'snapshot':str(snapshot),'mainStatus':git(['-C',main,'status','--short']),'worktreeStatus':git(['status','--short']),'browserChecksPassed':sum(counts.values()),'viewportMeasurements':8,'nativePassed':20,'nativeFailed':1,'nativeFailurePreexisting':True,'changes':changes,'addedLines':sum(x['added'] for x in changes),'removedLines':sum(x['removed'] for x in changes),'runtimeHashes':{p:hashlib.sha256((root/p).read_bytes()).hexdigest() for p in ['mesa-nova/game.mjs','mesa-nova/cartas.json','mesa-nova/progressive-reveal.mjs','mesa-nova/combat-triggers.mjs','bot/runner/source/manifest.json']}}
assert not result['mainStatus'];(out/'change-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'browserPassed':sum(counts.values()),'viewportMeasurements':8,'nativePassed':20,'preexistingNativeFailed':1,'files':len(changes),'added':result['addedLines'],'removed':result['removedLines'],'mainClean':True}))
