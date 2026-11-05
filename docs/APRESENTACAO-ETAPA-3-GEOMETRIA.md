# Etapa 3 — coordenadas compartilhadas

O cliente consulta `RunaGeometry` para as posições de interação e para as faces projetadas. A distinção é explícita: `rect` acompanha o elemento na tela; `pose` e `surfaceRect` descrevem a face pintada. A ponte publica casas, campo, névoa e obstáculos pela mesma interface. Não há cache de retângulos sobrevivendo à rolagem, redimensionamento ou troca de nós.

Mira, pavio, baixas, retornos e cópias de cartas usam essa interface. A clonagem avisa os adaptadores por `RunaPresentation.clone`; `card-plane.js` deixou de substituir `cloneVisual`. A projeção continua sincronizada antes dos golpes. Câmera, regras, duração e renderer não mudaram.

Validação local, em Edge:

- Testes de Node da geometria, apresentação e entradas: 18/18.
- Comparação com `553c0e1`: 32/32, mesmas posições em 1920×1080 e 1366×768, preparação e formação.
- Geometria focal: 41/41; dois assentos, quatro Emanações, seis casas, painéis, Nartvanyr e pavio alinhados; nenhum erro de página.
- Interação: 145/145, incluindo compras, magias, dano e movimento reduzido.

Evidências locais: `prototype-qa/simplificacao-geometria-20261105/`. A captura de formação em Full HD foi inspecionada. O agrupamento adicional das atualizações e a redução das reconstruções são a etapa 4; esta etapa consolida as coordenadas sem prometer ganho de desempenho.
