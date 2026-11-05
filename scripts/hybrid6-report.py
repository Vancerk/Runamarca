from pathlib import Path
import json, hashlib, difflib

root = Path('prototype-qa/hybrid-6')
rows = json.loads((root/'slice.json').read_text(encoding='utf-8'))['measurements']
p1 = json.loads((root/'performance-dpr1.json').read_text())
p2 = json.loads((root/'performance-dpr2.json').read_text())
fog = json.loads((root/'fog-performance.json').read_text())
fmt = lambda n: f'{n:.2f}'.replace('.', ',')
table = '\n'.join(f"| {r['viewport']['w']}×{r['viewport']['h']} | +{fmt((r['scale']-1)*100)}% | +{fmt(max(0,(r['fieldAreaRatio']-1)*100))}% |" for r in rows)
doc = f'''# RunaMarca híbrido — revisão 6, apresentação das cartas e escala responsiva

Abrir **http://127.0.0.1:3086/runamarca/hybrid/index.html** e atualizar com **Ctrl+F5**. O HTML identifica `hybrid-6`. Servidor local na porta 3086, vinculado somente a 127.0.0.1. Se ele estiver parado, executar `ABRIR-PROTOTIPO.cmd` na raiz e manter esse terminal aberto. Não executar outro servidor na mesma porta.

Trabalho em `prototype/board-perspective-20261028`, base `d1420a66e4bb431c8ceb374cc527b41a3c76506d`. Nenhum commit ou publicação. A revisão 5 foi preservada em `../revisions/before-hybrid-slice-6/`: 99 arquivos e manifesto SHA256. O checkout principal permaneceu limpo na conferência final, sem edição.

## Cartas preservadas e projeção corrigida

As cartas conservam integralmente arte, moldura, títulos, regras, custo, ícones de estado, SVG de atributos e coração líquido nativos. Nenhum asset ou renderizador original foi substituído. As fontes continuam 900×1260 na mão/emanação e 900×820 no combate/reserva; a ilustração FV03 continua em 736×575. Não há recuperação artificial de detalhe nem novos rótulos. Textos extensos em miniaturas continuam pequenos e podem ser lidos pelo hover original.

Além da filtragem da mão existente na revisão 5, as faces da mesa agora usam uma amostra integral com suavização alta e densidade 2×DPR calculada pelo tamanho projetado. O bitmap de cada amostra é comparado à redução integral do canvas nativo. Isso confirma fidelidade do conteúdo; não é uma medição de ganho subjetivo de nitidez. O enquadramento visual usa a proporção do canvas e unidades CSS nativas, mantendo o tamanho dos ícones adicionais. Arte, atributos e ícones seguem a mesma transformação.

O hover genérico de `.card`, que deslocava a carta de mesa em 4 px independentemente de seu corpo 3D, foi neutralizado apenas nas faces da mesa híbrida. As animações nativas continuam. Cópias que passam à camada de efeitos compensam o zoom do grupo e preservam a geometria projetada. O hover da mão mantém a origem reconhecível no mesmo retângulo e exibe o zoom separado. Os nove alvos foram exercitados individualmente.

Reserva e combate conservam proporções físicas comuns entre os lados no desktop; a distância reduz naturalmente o lado rival. Emanações mantêm a face completa original, com sua proporção de retrato. Em telas móveis, a largura do combate é limitada pelo intervalo disponível entre emanações: a ampliação de 15% não é aplicada a essas faces quando causaria sobreposição. Os botões nativos e seus eventos permanecem.

## Ampliação realmente medida em relação à revisão 5

A meta de 15% incide no conteúdo de jogo, não na decoração. O ajuste escolhe uma escala estável por viewport e reserva margem para nove cartas nas duas mãos. Comprar ou fazer hover não recalcula essa escala. O espaço interno vazio da arena foi reduzido em 20 px; a altura física do campo central foi mantida para caber no navegador. Por isso não se trata de aumentar cada dimensão de todo o layout em 15%.

| Viewport CSS, zoom 100% | Escala de conteúdo (mão/patronos/cartas e fontes dos controles) | Área projetada do feltro |
| --- | --- | --- |
{table}

Em 1920×1080 o conteúdo recebe os 15%. Em uma viewport de **1920×900**, que deixa altura para barras de um navegador normal em monitor Full HD, o conteúdo fica em **+4,6%** e o campo em **+15% de área**. Aumentar integralmente os grupos em 15% cortaria cartas; a limitação é explícita. Em 1440×900 e 1280×720, a largura do campo já está restrita pela tela. Pequenas diferenças da tabela são arredondamento da projeção.

As medidas acima descrevem conteúdo e campo, não todos os retângulos externos. A largura da reserva e dos patronos acompanha a escala em desktop; as prateleiras foram compactadas verticalmente. Nartvanyr, registro e preparação têm largura responsiva. Seus textos recebem a escala, mas os limites das placas seguem a perspectiva e o espaço disponível: não se alega +15% uniforme dessas caixas. As razões exatas de cada retângulo estão em `slice.json`, inclusive os limites mobile. No mobile, patronos/reservas permanecem limitados à largura; a mão cresce 15%, o campo cresce cerca de 12,74% em área e a página usa rolagem vertical.

A câmera suave permanece em **30,623267°** em relação à normal da mesa. Livros, vela, marcador e parafuso conservam posição e dimensões da revisão 5. O único elemento novo é **uma folha seca discreta ao lado dos livros**, somente onde há espaço, acima de 1100 px; não recebe input nem cria mecânica.

## Testes e evidências desta revisão

Capturas, JSON e logs em `prototype-qa/hybrid-6/` e `prototype-qa/hybrid6-*.log`. Chrome headless local, recursos externos bloqueados nas execuções visuais, sem usar a janela bloqueada ou mouse do usuário.

| Comando | Resultado |
| --- | --- |
| `node scripts/hybrid6-geometry.mjs` | 85 verificações: projeção, centros, hitboxes, clone, DPR 2 e fallback |
| `node scripts/hybrid6-concept.mjs` | 75: éter, 2 poderes, C–E–C–E–C, mãos 9 e reserva 8 |
| `node scripts/hybrid6-slice.mjs` | 113: escala, identidade integral, hover, sigilo e duas perspectivas |
| `node scripts/hybrid6-limits.mjs` | 60: 10 posições ocupadas sem colisão e hover individual nas nove cartas, desktop/720p/mobile |
| `node scripts/hybrid6-review.mjs` | 35: placas, decks, fumaça, espaçamento e decoração |
| `node scripts/hybrid6-reveal.mjs` | 17: revelação progressiva e ausência de faces futuras nas duas visões |
| `node scripts/hybrid6-gameplay.cjs` | 40: HTTP real, compra, clique, arrasto interrompido/repetido, retorno e sigilo |
| `node scripts/hybrid6-apprentice.mjs` | 16: mira, cancelamento, confirmação e recarga nas duas perspectivas |
| `node scripts/hybrid6-viewport.cjs` | 8 medições: compra/hover estáveis em seis rodadas e alturas 960/1000 |
| `node --test mesa-nova/test-public-visibility.mjs mesa-nova/test-progressive-reveal.mjs mesa-nova/test-apprentice-cancel.mjs` | 8 subtestes, 0 falhas |
| `node scripts/hybrid6-performance.mjs 1` e `2` | 20 reconstruções e 20 reamostragens por DPR |
| `node scripts/hybrid6-fog-performance.mjs` | 60 amostras isoladas de fumaça |

Foram corrigidos os problemas recuperáveis encontrados nos ensaios: badge CSS reduzido indevidamente durante o primeiro ajuste da face, coração tocando o título da reserva, corte da mão rival no topo e colisão combate/emanação no mobile. Os arquivos de resultado final substituem as rodadas intermediárias que falharam. Não houve alteração de regras nesta iteração.

Tempos CPU quentes do bridge: DPR 1 mediana **{fmt(p1['warm']['median'])} ms**, p95 **{fmt(p1['warm']['p95'])} ms**; DPR 2 mediana **{fmt(p2['warm']['median'])} ms**, p95 **{fmt(p2['warm']['p95'])} ms**. Reamostragem da mão: medianas **{fmt(p1['handSampling']['median'])}/{fmt(p2['handSampling']['median'])} ms**. As amostras iniciais não são um benchmark de partida fria. FPS físico, tempo GPU e uso de memória de vídeo não foram medidos.

Comparativos: `before-1920x900.png` / `after-1920x900.png`, `after-1920x1080.png`, `native-hover-1920x900-dpr1.png`, `occupied-public-dpr2.png`, `limits-occupied-390.png`, capturas privadas A/B e quadros `reveal-*`. As telas de 1920×900/1080, 1536×740, 1440×900, 1280×720 e 390×1000 foram medidas; a geometria cobre também 320 px e DPR 2. As capturas selecionadas foram inspecionadas visualmente, não apenas geradas.

Limites: navegador headless em CSS pixels, não inspeção das barras reais de uma janela nativa nem aparelho móvel físico. As faces continuam DOM projetado sobre corpos WebGL: suas cores não recebem toda a iluminação do material 3D. Textos longos ainda exigem zoom para leitura confortável. Não foram executados o pacote npm completo nem ensaios de rede pública; não existem scripts de build/lint/typecheck neste pacote. Foram usados os testes de regressão e motor relevantes listados acima. Nenhum dado ou imagem foi enviado à Anthropic e nenhuma captura foi salva na Library.

---

## Histórico preservado — revisão 5

'''
p=Path('mesa-nova/hybrid/README.md')
previous=p.read_text(encoding='utf-8')
if previous.startswith('# RunaMarca híbrido — revisão 6'):
    previous=previous.split('## Histórico preservado — revisão 5\n\n',1)[1]
p.write_text(doc+previous,encoding='utf-8')

snapshot=Path('../revisions/before-hybrid-slice-6')
manifest=json.loads((snapshot/'SHA256.json').read_text(encoding='utf-8-sig'))
changed=[];unchanged=[]
for entry in manifest:
    file=Path(entry['path']);data=file.read_bytes()
    sha=hashlib.sha256(data).hexdigest()
    if sha.lower()==entry['sha256'].lower():unchanged.append(str(file));continue
    old=(snapshot/file).read_text(encoding='utf-8-sig').splitlines();new=data.decode('utf-8-sig').splitlines()
    diff=list(difflib.unified_diff(old,new))
    changed.append({'path':file.as_posix(),'sha256':sha,'added':sum(l.startswith('+') and not l.startswith('+++') for l in diff),'removed':sum(l.startswith('-') and not l.startswith('---') for l in diff)})
new_files=['mesa-nova/hybrid/layout.js']
for name in new_files:
    file=Path(name);changed.append({'path':name,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'added':len(file.read_text().splitlines()),'removed':0})
result={'comparison':'before-hybrid-slice-6, last saved revision 5; excludes QA outputs and newly added QA scripts','changed':changed,'unchangedSnapshotFiles':unchanged,'totalAdded':sum(r['added'] for r in changed),'totalRemoved':sum(r['removed'] for r in changed)}
(root/'source-delta.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'changed':changed,'unchanged':len(unchanged),'added':result['totalAdded'],'removed':result['totalRemoved']},ensure_ascii=False))
