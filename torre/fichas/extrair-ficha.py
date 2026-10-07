"""Leitura do modelo Elysium; não altera a planilha original."""
import argparse
import json
import posixpath
import zipfile
import re
import unicodedata
import struct
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {
    'xdr': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}

def division_for_level(level):
    """Regra de divisão fornecida pelo usuário para os níveis 1 a 20."""
    if isinstance(level, bool):
        return None
    try:
        numeric = float(level)
    except (TypeError, ValueError):
        return None
    if not numeric.is_integer() or not 1 <= numeric <= 20:
        return None
    for maximum, division in [(4, 7), (7, 6), (10, 5), (13, 4), (16, 3), (19, 2), (20, 1)]:
        if numeric <= maximum:
            return f'{division}ª Divisão'

def relationships(archive, part):
    path = posixpath.join(posixpath.dirname(part), '_rels', posixpath.basename(part) + '.rels')
    if path not in archive.namelist():
        return {}
    return {r.attrib['Id']: posixpath.normpath(posixpath.join(posixpath.dirname(part), r.attrib['Target']))
            for r in ET.fromstring(archive.read(path))
            if r.attrib.get('TargetMode') != 'External'}

def cell_position(reference):
    match = re.fullmatch(r'([A-Z]+)([0-9]+)', reference)
    column = 0
    for letter in match[1]:
        column = column * 26 + ord(letter) - 64
    return column - 1, int(match[2]) - 1

def normalize(value):
    return ''.join(c for c in unicodedata.normalize('NFD', str(value)) if not unicodedata.combining(c)).strip().casefold()

def portrait_region(sheet_xml, values, main):
    """Localiza o quadro mesclado abaixo do nível, sem fixar uma letra de coluna."""
    level_cell = next((cell for cell, value in values.items() if normalize(value) == 'nivel'), None)
    if not level_cell:
        return None
    column, row = cell_position(level_cell)
    candidates = []
    for merged in sheet_xml.iter(main + 'mergeCell'):
        first, last = merged.attrib['ref'].split(':')
        left, top = cell_position(first)
        right, bottom = cell_position(last)
        if left == column and row + 1 <= top <= row + 5 and right - left >= 1 and bottom - top >= 7:
            candidates.append((top, left, right, bottom, merged.attrib['ref']))
    return min(candidates) if candidates else None

def sheet_geometry(sheet_xml, main):
    """Converte âncoras e offsets para coordenadas, incluindo linhas/colunas ocultas."""
    settings = sheet_xml.find(main + 'sheetFormatPr')
    defaults = settings.attrib if settings is not None else {}
    default_width = float(defaults.get('defaultColWidth', 8.43))
    default_height = float(defaults.get('defaultRowHeight', 15)) * 96 / 72
    columns = {}
    for col in sheet_xml.iter(main + 'col'):
        width = 0 if col.attrib.get('hidden') == '1' else float(col.attrib.get('width', default_width)) * 7 + 5
        for index in range(int(col.attrib['min']) - 1, int(col.attrib['max'])):
            columns[index] = width
    rows = {int(row.attrib['r']) - 1: (0 if row.attrib.get('hidden') == '1' else float(row.attrib.get('ht', default_height * 72 / 96)) * 96 / 72)
            for row in sheet_xml.iter(main + 'row')}
    def point(column, row, column_offset=0, row_offset=0):
        return (sum(columns.get(i, default_width * 7 + 5) for i in range(column)) + column_offset / 9525,
                sum(rows.get(i, default_height) for i in range(row)) + row_offset / 9525)
    return point

def choose_portrait(archive, sheet_part, sheet_xml, values, main):
    region = portrait_region(sheet_xml, values, main)
    if not region:
        return None
    top, left, right, bottom, region_ref = region
    point = sheet_geometry(sheet_xml, main)
    rx, ry = point(left, top)
    ex, ey = point(right + 1, bottom + 1)
    candidates = []
    for drawing_part in relationships(archive, sheet_part).values():
        if '/drawings/' not in drawing_part or not drawing_part.endswith('.xml'):
            continue
        media = relationships(archive, drawing_part)
        for anchor in ET.fromstring(archive.read(drawing_part)):
            start, extent = anchor.find('xdr:from', NS), anchor.find('xdr:ext', NS)
            if start is not None:
                col, row = int(start.findtext('xdr:col', namespaces=NS)), int(start.findtext('xdr:row', namespaces=NS))
                x, y = point(col, row, int(start.findtext('xdr:colOff', default='0', namespaces=NS)), int(start.findtext('xdr:rowOff', default='0', namespaces=NS)))
            else:
                pos = anchor.find('xdr:pos', NS)
                if pos is None:
                    continue
                x, y = int(pos.attrib['x']) / 9525, int(pos.attrib['y']) / 9525
            if extent is not None:
                width, height = int(extent.attrib['cx']) / 9525, int(extent.attrib['cy']) / 9525
            else:
                end = anchor.find('xdr:to', NS)
                if end is None:
                    continue
                end_x, end_y = point(int(end.findtext('xdr:col', namespaces=NS)), int(end.findtext('xdr:row', namespaces=NS)), int(end.findtext('xdr:colOff', default='0', namespaces=NS)), int(end.findtext('xdr:rowOff', default='0', namespaces=NS)))
                width, height = end_x - x, end_y - y
            blip = anchor.find('.//a:blip', NS)
            part = media.get(blip.attrib.get('{' + NS['r'] + '}embed')) if blip is not None else None
            if width < 40 or height < 40:
                # Exportações de imagens em célula podem usar uma âncora de 21 px,
                # mesmo quando o retrato ocupa todo o quadro mesclado no Google.
                if part and part.startswith('xl/media/') and abs(x-rx) <= 30 and abs(y-ry) <= 30:
                    raw = archive.read(part)
                    dimensions = None
                    if raw.startswith(b'\x89PNG\r\n\x1a\n') and len(raw) >= 24:
                        dimensions = struct.unpack('>II', raw[16:24])
                    elif raw[:6] in (b'GIF87a', b'GIF89a') and len(raw) >= 10:
                        dimensions = struct.unpack('<HH', raw[6:10])
                    if dimensions and min(dimensions) >= 160:
                        candidates.append((1.0, part))
                continue
            overlap = max(0, min(x + width, ex) - max(x, rx)) * max(0, min(y + height, ey) - max(y, ry))
            coverage = overlap / (width * height)
            region_coverage = overlap / max(1, (ex - rx) * (ey - ry))
            if part and part.startswith('xl/media/') and coverage >= .6 and region_coverage >= .25:
                candidates.append((region_coverage * .7 + coverage * .3, part))
    candidates.sort(reverse=True)
    if not candidates or (len(candidates) > 1 and candidates[0][0] - candidates[1][0] < .1 and candidates[0][1] != candidates[1][1]):
        return None
    return candidates[0][1], region_ref

def extract(source, destination):
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    main = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
    with zipfile.ZipFile(source) as archive:
        if sum(info.file_size for info in archive.infolist()) > 60_000_000:
            raise ValueError('Ficha muito grande para importar.')
        rels = relationships(archive, 'xl/workbook.xml')
        sheets = ET.fromstring(archive.read('xl/workbook.xml')).find(main + 'sheets')
        profile = next(s for s in sheets if s.attrib['name'] == 'Perfil')
        sheet_part = rels[profile.attrib['{' + NS['r'] + '}id']]
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            strings = [''.join(t.text or '' for t in item.iter(main+'t')) for item in ET.fromstring(archive.read('xl/sharedStrings.xml'))]
        values = {}
        sheet_xml = ET.fromstring(archive.read(sheet_part))
        for cell in sheet_xml.iter(main+'c'):
            value = cell.findtext(main+'v')
            if cell.attrib.get('t') == 's' and value is not None:
                value = strings[int(value)]
            elif cell.attrib.get('t') == 'inlineStr':
                value = ''.join(t.text or '' for t in cell.iter(main+'t'))
            values[cell.attrib['r']] = value
    text = lambda cell: str(values.get(cell) or '').strip()
    level = float(values.get('T2') or 0)
    if level.is_integer(): level = int(level)
    result = {'name': text('X5'), 'player': text('V5'), 'level': level,
              'class': text('V11').strip('- ').strip(), 'virtue': text('X11'),
              'division': division_for_level(level), 'portrait': None,
              'sourceCells': {'name': 'Perfil!X5', 'player': 'Perfil!V5', 'level': 'Perfil!T2',
                              'class': 'Perfil!V11', 'virtue': 'Perfil!X11'},
              'warnings': []}
    if result['division'] is None:
        result['warnings'].append('Nível inválido para divisão: informe um inteiro de 1 a 20.')
    with zipfile.ZipFile(source) as archive:
        workbook_part = 'xl/workbook.xml'
        rels = relationships(archive, workbook_part)
        xml = ET.fromstring(archive.read(workbook_part))
        sheets = xml.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheets')
        profile = next(s for s in sheets if s.attrib['name'] == 'Perfil')
        sheet_part = rels[profile.attrib['{' + NS['r'] + '}id']]
        chosen = choose_portrait(archive, sheet_part, sheet_xml, values, main)
        if chosen:
            image_part, region_ref = chosen
            target = destination / ('portrait' + Path(image_part).suffix)
            target.write_bytes(archive.read(image_part))
            result['portrait'] = target.name
            result['portraitRegion'] = 'Perfil!' + region_ref
        else:
            result['warnings'].append('Não foi possível identificar um único retrato no quadro da personagem.')
    (destination / 'personagem.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source')
    parser.add_argument('destination')
    args = parser.parse_args()
    print(json.dumps(extract(args.source, args.destination), ensure_ascii=True, indent=2))
