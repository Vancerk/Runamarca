from pathlib import Path
import json, hashlib, difflib, subprocess, re
root=Path.cwd();out=root/'prototype-qa/hybrid-9';snapshot=root.parent/'revisions/before-hybrid-slice-9'
counts={'geometry':91,'limits':60,'review':35,'reveal':17,'apprentice':16,'hands':693,'touch':21,'gameplay':40,'flights':37,'motion':12,'sequence':7,'emana':129,'emana-interaction':24}
for name,count in counts.items():
    result=json.loads((root/f'prototype-qa/hybrid9-{name}.log').read_text(encoding='utf-8-sig'));assert result['passed']==count and not result.get('errors'),(name,result)
native=(root/'prototype-qa/hybrid9-native.log').read_text(encoding='utf-8-sig');assert re.search(r'pass 21\b',native) and re.search(r'fail 0\b',native)
viewport=json.loads((out/'viewport-result.json').read_text());assert len(viewport)==8 and all(x['noScroll'] and x.get('stableHover',True) and x.get('stableDraw',True) for x in viewport)
probe=json.loads((out/'atomic/baseline-probe.json').read_text());assert all(not x['unprojected'] and not x['welcome'] and not x['mulligan'] for x in probe['frames'])
startup=json.loads((out/'startup.json').read_text());assert all(not x['direct']['fitting'] and abs(x['direct']['layout']['scale']-x['afterResize']['layout']['scale'])<.003 for x in startup)
hands=json.loads((out/'hands.json').read_text());oldhands=json.loads((root/'prototype-qa/hybrid-8/hands.json').read_text());old={ (m['viewport']['width'],m['viewport']['height'],m['dpr']):m for m in oldhands['metrics'] }
growth=[]
for m in hands['metrics']:
    b=old[(m['viewport']['width'],m['viewport']['height'],m['dpr'])];growth.append({'viewport':m['viewport'],'dpr':m['dpr'],'scale':m['scale'],'ownWidth':m['fan']['own']['width'],'rivalWidth':m['fan']['rival']['width'],'ownDelta':m['fan']['own']['width']/b['fan']['own']['width']-1,'rivalDelta':m['fan']['rival']['width']/b['fan']['rival']['width']-1,'height':m['height']})
scale_table='\n'.join(f"| {m['viewport']['width']}×{m['viewport']['height']} | {m['dpr']} | {m['ownWidth']:.1f} / {m['rivalWidth']:.1f} px | {m['ownDelta']*100:.1f}% / {m['rivalDelta']*100:.1f}% | {m['height']} px |" for m in growth)
perf=[json.loads((out/f'performance-dpr{d}.json').read_text()) for d in [1,2]];fog=json.loads((out/'fog-performance.json').read_text());emana=json.loads((out/'emanation.json').read_text());assert not emana['errors'];life=[s['lifeGrowth'] for m in emana['metrics'] for s in m['slots']]
before=json.loads((out/'before-layout.json').read_text());after=json.loads((out/'after-layout.json').read_text());b=next(m for m in before if m['viewport']=={'w':1920,'h':900});a=next(m for m in after if m['viewport']=={'w':1920,'h':900});panel_moves={n:(a['nodes'][n]['x']+a['nodes'][n]['width']/2)-(b['nodes'][n]['x']+b['nodes'][n]['width']/2) for n in ['nartvanyr','record','actions']}
manifest=json.loads((snapshot/'SHA256.json').read_text());hashes={x['path']:x['sha256'] for x in manifest}
preserved=['mesa-nova/app.js','mesa-nova/game.mjs','mesa-nova/combat-triggers.mjs','mesa-nova/progressive-reveal.mjs','bot/runner/source/manifest.json','bot/runner/source/mesa-nova/game.mjs','bot/runner/source/mesa-nova/combat-triggers.mjs']
for p in preserved:assert hashlib.sha256((root/p).read_bytes()).hexdigest()==hashes[p],p
git=lambda args:subprocess.check_output(['git',*args],text=True,encoding='utf-8').strip()
assert not git(['diff','--name-only','--','mesa-nova/cartas.json','mesa-nova/card-visual.js'])
main=r'C:\Users\vanxf\Documents\Codex\2026-10-27\task-10\runamarca-v25-integration';main_status=git(['-C',main,'status','--short']);assert not main_status
tests='\n'.join(f'| `node scripts/hybrid9-{name}.{ "cjs" if name=="gameplay" else "mjs"}` | {count} passaram |' for name,count in counts.items())
doc=f'''# RunaMarca híbrido — revisão 9: campo compacto e emanações

Abrir **http://127.0.0.1:3086/runamarca/hybrid/index.html** e usar **Ctrl+F5** (`hybrid-9`). Se necessário, executar `ABRIR-PROTOTIPO.cmd` na raiz e manter o terminal aberto. O servidor foi recuperado após o reinício do PC, restrito a **127.0.0.1:3086**. A revisão 6 continua em `/runamarca/`.

Worktree `C:/Users/vanxf/Documents/Codex/2026-10-28/task-2/runamarca-board-prototype`, branch `prototype/board-perspective-20261028`, base `d1420a66e4bb431c8ceb374cc527b41a3c76506d`. Checkout principal confirmado limpo, mesma base. Sem commit, push ou publicação. Rollback da revisão 8 preservado em **`../revisions/before-hybrid-slice-9/`**, 148 arquivos com SHA256. Histórico anterior abaixo.

## Alterações concluídas

**Teste de diálogo corrigido.** A falha de `test-ui.mjs` vinha do objeto simulado: o código real usa `addEventListener`, `removeEventListener` e evento `close`, mas o stub não implementava esse contrato. O simulador agora mantém listeners, entrega o fechamento e os remove. Asserções verificam seleção, cancelamento pelo menu de contexto, fechamento repetido sem cancelar duas vezes e ausência de listeners órfãos. O teste passou; a bateria nativa selecionada passou com **21 testes, zero falhas**. Nenhuma mudança de regra ou do diálogo de produção foi necessária.

**Câmera:** 22,1253106801° × 0,85 = **18,8065140781°**, proporcional ao ângulo em relação à vista reta. Mantida a câmera suave e a ponte entre superfície 3D e controles nativos.

**Campo e painéis:** cortadas as duas faixas externas do plano de combate, cada uma com 2,8333% da largura calculada (5,6667% no total, no plano 3D). Registro/Nartvanyr e Preparação acompanham a borda menor. No comparativo em 1920×900, os centros moveram-se **{panel_moves['nartvanyr']:.1f} px** e **{panel_moves['record']:.1f} px** para a direita, e Preparação **{abs(panel_moves['actions']):.1f} px** para a esquerda. O print foi descrito pelo parent após inspeção visual autorizada; não alegamos inspeção local desse anexo.

A distribuição agora é **C–E–C–E–C** em cada lado, com as três casas de combate de dimensões iguais no mundo 3D, emanações mais largas e espaçamento simétrico. A largura de cada combate é `(campo − 2 × emanação − 4 × intervalo) / 3`. As bordas correspondentes das três casas de uma mesma fileira têm a mesma medida projetada; caixas retangulares que englobam trapézios podem ter larguras diferentes por causa da perspectiva. Não foram igualadas artificialmente essas bounding boxes.

**Mãos:** fator nominal de **1,25** nas duas dimensões e na porção visível, mantendo o leque aprovado e o recorte intencional. Limites de largura mobile: `(viewport útil − 28) / 2,8` para a aliada e `/ 4,4` para a rival, com nove cartas acessíveis. O ajuste geral de altura/HUD continua responsivo; não se afirma ganho integral de 25% em todo tamanho de janela. A abertura inicial recebe um único ajuste após os observers de layout; não depende de redimensionar manualmente. Em DPR 1/2, abertura direta e após resize diferiram apenas 0,001 na escala. A primeira exibição aguarda esse ajuste; compras/hover não reexecutam a escolha da escala por quantidade de cartas.

Medidas das larguras das cartas e comparação com as capturas da revisão 8, nos mesmos percursos de viewport:

| Viewport CSS | DPR | Aliada / rival | Aumento medido vs. R8 | Documento |
| --- | --- | --- | --- | --- |
{scale_table}

O aumento de cerca de 42% no caso DPR 2 inclui a correção da abertura anterior, que havia ficado presa em escala 1,00: a revisão atual estabiliza em cerca de 1,14, além do fator 1,25 da mão. Em 1280×720 o ganho efetivo fica próximo de 20%; mobile reduz o ganho da mão aliada para cerca de 17,9%. Em 1920×900/1080 DPR 1, as duas mãos atingiram 25%. São medidas lineares, não de área. Desktop foi medido sem rolagem vertical; mobile mantém a rolagem intencional.

**Apresentação experimental exclusiva da emanação:** somente ilustração derivada do canvas público original, descrição e vida. Nome, custo e ataque não aparecem no slot. Os dados/controles nativos continuam presentes; a descrição acessível mantém identidade e texto completo e agora anuncia a vida atual. A vida usa 1,5× o tamanho nominal anterior, com piso de 10,5 px para leitura; o aumento observado variou de {min(life):.2f}× a {max(life):.2f}× em slots estreitos devido a esse piso.

O texto ocupa área própria sobre a ilustração, com contraste escuro e fonte ajustada para resultar em cerca de 11 px no desktop e 10 px no mobile após a projeção. **Descrições longas não cabem inteiras simultaneamente:** há rolagem dentro do slot, verificada por wheel/toque emulado e posição da última linha. A carta completa original continua disponível no foco/hover, com nome, custo, ataque, moldura e texto intactos. A mão, reserva e zoom não adotam essa face compacta. O experimento exige avaliar a preferência visual; não foi apresentado como solução definitiva para textos longos.

Vida dinâmica, buff, alvo real, menu por clique/teclado e transições nos dois sentidos entre reserva e emanação foram verificados. O arrasto nativo permanece nas suas origens já existentes; a área do texto permite leitura/rolagem sem iniciar arrasto. Em perda de WebGL, faces compactas e clones são removidos e a carta nativa é restaurada. A nova apresentação não consulta estado privado; compõe apenas cartas já aprovadas pelo renderer nativo. Regras, catálogo, `app.js`, motor, bot e módulos de revelação/sigilo permaneceram idênticos ao snapshot da revisão 8.

**Único detalhe decorativo novo:** uma pequena gota de cera junto ao selo existente, apenas acima de 1100 px. Demais objetos foram preservados. A decoração WebGL não captura input.

## QA e evidências

**{sum(counts.values())} checagens de navegador aprovadas**, mais oito medições de viewport/estabilidade e duas verificações de abertura direta DPR 1/2. Sem erros JS/WebGL nas baterias finais. O conjunto nativo selecionado teve **21 aprovados, zero falhas**.

| Comando | Resultado |
| --- | --- |
{tests}
| `node scripts/hybrid9-viewport.cjs` | 8 medições sem deslocamento geral na compra/hover e sem scroll desktop |
| `node scripts/hybrid9-startup.mjs` | abertura direta estabilizada em DPR 1/2 |
| `node scripts/hybrid9-probe.mjs` | {len(probe['frames'])} quadros sem DOM intermediário não projetado; {probe['screencastFrames']} capturas do compositor |
| `node scripts/hybrid9-performance.mjs 1` e `2` | 20 reconstruções + 20 reamostragens por DPR |
| `node scripts/hybrid9-fog-performance.mjs` | 60 amostras |

Comando nativo: `node --test mesa-nova/test-opening-return.mjs mesa-nova/test-match-effect-cleanup.mjs mesa-nova/test-public-visibility.mjs mesa-nova/test-ui.mjs mesa-nova/test-interactions-audit.mjs mesa-nova/test-visual-ghosts.mjs mesa-nova/test-apprentice-cancel.mjs mesa-nova/test-progressive-reveal.mjs`. Também executado diretamente `node mesa-nova/test-ui.mjs`. Sintaxe dos módulos alterados validada com `node --check`. `npm test` completo não foi executado; o package não define build/lint/typecheck.

CPU de reconstrução/submissão WebGL em Chrome headless, sem cronômetro GPU: DPR 1 mediana **{perf[0]['warm']['median']:.1f} ms**, p95 **{perf[0]['warm']['p95']:.1f} ms**; DPR 2 mediana **{perf[1]['warm']['median']:.1f} ms**, p95 **{perf[1]['warm']['p95']:.1f} ms**. Primeira construção observada {perf[0]['startup']['bridgeMs']:.1f}/{perf[1]['startup']['bridgeMs']:.1f} ms; não é benchmark frio controlado. Fumaça: mediana **{fog['median']:.1f} ms**, p95 **{fog['p95']:.1f} ms**. Testes físicos de Chrome com barras, toque em aparelho real e FPS/GPU não foram executados. 1920×900 é uma área útil CSS representativa de navegador normal em Full HD, a 100%, além de 1920×1080, 1440×900, 1280×720, 390 e 320 emulados.

Resultados/capturas internas: **`prototype-qa/hybrid-9/`**. Logs: **`prototype-qa/hybrid9-*.log`**. Antes preservado das capturas finais verificadas da revisão 8 (`before-*.png`); depois `after-*.png`. Capturas de emanação em duas visões, zoom, hover, revelação e interação foram inspecionadas localmente; nada foi enviado à Library ou a outro serviço. O reinício do PC interrompeu execuções com `ERR_CONNECTION_REFUSED`; o servidor foi recuperado e essas baterias foram reexecutadas. Não há bloqueio de acesso pendente.

## Como testar

Abrir o endereço e Ctrl+F5. Criar sala em duas abas, escolher decks e jogar normalmente. Comparar a câmera e os painéis mais próximos, encher a mão, testar cada hover e o arrasto de formação. Colocar uma criatura em Emanação: observar arte/descrição/vida, rolar o texto, usar foco/hover para a carta integral e clicar para abrir o menu nativo. Usar uma magia de buff em uma criatura na emanação e conferir a vida nas duas visões. A posição oculta do rival continua protegida até sua etapa de revelação.

Arquivos alterados nesta etapa: `mesa-nova/test-ui.mjs`, `mesa-nova/hybrid/bridge.js`, `bridge.css`, `card-plane.js`, `fan-layout.js`, `layout.js`, `index.html`; novo `hybrid/emanation.js`. Guias atualizados e scripts `hybrid9-*` adicionados. Diffstat exato, hashes preservados e estado Git em `prototype-qa/hybrid-9/change-report.json`.

---

'''
guide=root/'mesa-nova/hybrid/README.md';previous=guide.read_text(encoding='utf-8-sig')
if previous.startswith('# RunaMarca híbrido — revisão 9:'):previous=previous.split('\n---\n\n',1)[1]
guide.write_text(doc+previous,encoding='utf-8')
local=root/'PROTOTIPO-LOCAL.md';previous=local.read_text(encoding='utf-8-sig')
if not previous.startswith('# Mesa híbrida — revisão 9'):
    local.write_text('# Mesa híbrida — revisão 9\n\nAbrir http://127.0.0.1:3086/runamarca/hybrid/index.html e usar Ctrl+F5. Reiniciar, se necessário, executando `ABRIR-PROTOTIPO.cmd` e mantendo o terminal aberto. Guia, medidas, testes e limitações em `mesa-nova/hybrid/README.md`. Sem commit/publicação. Histórico anterior abaixo.\n\n---\n\n'+previous,encoding='utf-8')
changes=[]
for item in manifest:
    path=item['path'];now=root/path
    if now.is_file() and hashlib.sha256(now.read_bytes()).hexdigest()!=item['sha256']:
        delta=list(difflib.ndiff((snapshot/path).read_text(encoding='utf-8-sig').splitlines(),now.read_text(encoding='utf-8-sig').splitlines()));changes.append({'path':path,'added':sum(s.startswith('+ ') for s in delta),'removed':sum(s.startswith('- ') for s in delta)})
for p in [root/'mesa-nova/hybrid/emanation.js',*sorted((root/'scripts').glob('hybrid9-*'))]:changes.append({'path':p.relative_to(root).as_posix(),'new':True,'added':len(p.read_text(encoding='utf-8-sig').splitlines()),'removed':0})
result={'branch':git(['branch','--show-current']),'base':git(['rev-parse','HEAD']),'snapshot':str(snapshot),'mainStatus':main_status,'worktreeStatus':git(['status','--short']),'changes':changes,'addedLines':sum(x['added'] for x in changes),'removedLines':sum(x['removed'] for x in changes),'browserChecksPassed':sum(counts.values()),'nativePassed':21,'nativeFailed':0,'growthMeasured':growth,'panelCenterMoves1920x900':panel_moves,'preservedHashes':{p:hashes[p] for p in preserved},'limits':['Native full npm test not run','Physical Chrome UI, real device touch and GPU/FPS not measured','Long emanation descriptions require scrolling or full zoom','Responsive hand growth varies; DPR2 comparison includes corrected startup scale']}
(out/'change-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'browserPassed':sum(counts.values()),'nativePassed':21,'nativeFailed':0,'files':len(changes),'added':result['addedLines'],'removed':result['removedLines'],'mainClean':True}))
