"""Export the authored testcase catalog to XLSX using only Python's standard library."""
from pathlib import Path
import json
from zipfile import ZipFile, ZIP_DEFLATED
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent
DATA = json.loads((ROOT / 'implemented-usecase-workbook.json').read_text(encoding='utf-8'))
OUT = ROOT / 'IMPLEMENTED-USECASE-TESTCASES.xlsx'
MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
PACKAGE = 'http://schemas.openxmlformats.org/package/2006/relationships'
CONTENT = 'http://schemas.openxmlformats.org/package/2006/content-types'
ET.register_namespace('', MAIN)
ET.register_namespace('r', REL)

def sub(parent, name, attributes=None, text=None, namespace=MAIN):
    element = ET.SubElement(parent, f'{{{namespace}}}{name}', attributes or {})
    if text is not None:
        element.text = str(text)
    return element

def encoded(element):
    return ET.tostring(element, encoding='utf-8', xml_declaration=True)

def column(index):
    value = ''
    while index:
        index, digit = divmod(index - 1, 26)
        value = chr(65 + digit) + value
    return value

styles = ET.Element(f'{{{MAIN}}}styleSheet')
fonts = sub(styles, 'fonts', {'count': '2'})
for color, bold in [('FF203D36', False), ('FFFFFFFF', True)]:
    font = sub(fonts, 'font')
    sub(font, 'sz', {'val': '11'})
    sub(font, 'name', {'val': 'Calibri'})
    sub(font, 'color', {'rgb': color})
    if bold:
        sub(font, 'b')
fills = sub(styles, 'fills', {'count': '6'})
sub(sub(fills, 'fill'), 'patternFill', {'patternType': 'none'})
sub(sub(fills, 'fill'), 'patternFill', {'patternType': 'gray125'})
for color in ['FF087F6E', 'FFF0F8F5', 'FFFFE9DD', 'FFFFF3C9']:
    pattern = sub(sub(fills, 'fill'), 'patternFill', {'patternType': 'solid'})
    sub(pattern, 'fgColor', {'rgb': color})
    sub(pattern, 'bgColor', {'indexed': '64'})
borders = sub(styles, 'borders', {'count': '1'})
border = sub(borders, 'border')
for side in ['left', 'right', 'top', 'bottom', 'diagonal']:
    sub(border, side)
base = sub(styles, 'cellStyleXfs', {'count': '1'})
sub(base, 'xf', {'numFmtId': '0', 'fontId': '0', 'fillId': '0', 'borderId': '0'})
xfs = sub(styles, 'cellXfs', {'count': '5'})
for font_id, fill_id in [(0, 0), (1, 2), (0, 3), (0, 4), (0, 5)]:
    xf = sub(xfs, 'xf', {'numFmtId': '0', 'fontId': str(font_id), 'fillId': str(fill_id), 'borderId': '0', 'xfId': '0', 'applyAlignment': '1'})
    sub(xf, 'alignment', {'vertical': 'top', 'wrapText': '1'})
cell_styles = sub(styles, 'cellStyles', {'count': '1'})
sub(cell_styles, 'cellStyle', {'name': 'Normal', 'xfId': '0', 'builtinId': '0'})

def worksheet(spec):
    rows = spec['rows']
    width = max(len(row) for row in rows)
    last = f'{column(width)}{len(rows)}'
    root = ET.Element(f'{{{MAIN}}}worksheet')
    sub(root, 'dimension', {'ref': f'A1:{last}'})
    views = sub(root, 'sheetViews')
    view = sub(views, 'sheetView', {'workbookViewId': '0', 'zoomScale': '85'})
    testcase = spec.get('testcases', False)
    pane = {'ySplit': '1', 'topLeftCell': 'A2', 'activePane': 'bottomLeft', 'state': 'frozen'}
    if testcase:
        pane.update({'xSplit': '3', 'topLeftCell': 'D2', 'activePane': 'bottomRight'})
    sub(view, 'pane', pane)
    sub(root, 'sheetFormatPr', {'defaultRowHeight': '18'})
    widths = [34, 14, 30, 38, 28, 22, 12, 60, 65, 85, 70, 60, 26, 18, 45, 65, 65] if testcase else {
        'Huong_dan': [26, 130], 'Usecase': [15, 35, 30, 55, 100, 14],
        'Fixtures': [26, 22, 48, 110], 'Payload': [24, 16, 42, 65, 70, 70, 75],
        'Phan_quyen': [17, 35, 55, 65, 55, 40],
    }[spec['name']]
    cols = sub(root, 'cols')
    for index in range(1, width + 1):
        sub(cols, 'col', {'min': str(index), 'max': str(index), 'width': str(widths[index - 1]), 'customWidth': '1'})
    grid = sub(root, 'sheetData')
    for number, values in enumerate(rows, 1):
        height = '38' if number == 1 else '126' if testcase else '100' if spec['name'] == 'Payload' else '62'
        row = sub(grid, 'row', {'r': str(number), 'ht': height, 'customHeight': '1'})
        for index, value in enumerate(values, 1):
            style = 1 if number == 1 else 2 if number % 2 == 0 else 0
            if testcase and number > 1:
                if index == 7 and value == 'P0':
                    style = 3
                elif index == 14:
                    style = 4
            cell = sub(row, 'c', {'r': f'{column(index)}{number}', 's': str(style)})
            if isinstance(value, (int, float)):
                sub(cell, 'v', text=value)
            else:
                cell.set('t', 'inlineStr')
                text = sub(sub(cell, 'is'), 't', text=value)
                text.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    sub(root, 'autoFilter', {'ref': f'A1:{last}'})
    if testcase:
        validations = sub(root, 'dataValidations', {'count': '2'})
        for col, options in [('N', 'Not run,Pass,Fail,Blocked,Skipped'), ('G', 'P0,P1,P2')]:
            rule = sub(validations, 'dataValidation', {'type': 'list', 'allowBlank': '0', 'showErrorMessage': '1', 'errorTitle': 'Giá trị không hợp lệ', 'error': 'Chọn một giá trị trong danh sách.', 'sqref': f'{col}2:{col}{len(rows)}'})
            sub(rule, 'formula1', text=f'"{options}"')
    sub(root, 'pageMargins', {'left': '0.25', 'right': '0.25', 'top': '0.4', 'bottom': '0.4', 'header': '0.2', 'footer': '0.2'})
    sub(root, 'pageSetup', {'orientation': 'landscape', 'paperSize': '9'})
    return encoded(root)

workbook = ET.Element(f'{{{MAIN}}}workbook')
sheet_list = sub(workbook, 'sheets')
relationships = ET.Element(f'{{{PACKAGE}}}Relationships')
types = ET.Element(f'{{{CONTENT}}}Types')
sub(types, 'Default', {'Extension': 'rels', 'ContentType': 'application/vnd.openxmlformats-package.relationships+xml'}, namespace=CONTENT)
sub(types, 'Default', {'Extension': 'xml', 'ContentType': 'application/xml'}, namespace=CONTENT)
sub(types, 'Override', {'PartName': '/xl/workbook.xml', 'ContentType': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'}, namespace=CONTENT)
sub(types, 'Override', {'PartName': '/xl/styles.xml', 'ContentType': 'application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml'}, namespace=CONTENT)
root_relationships = ET.Element(f'{{{PACKAGE}}}Relationships')
sub(root_relationships, 'Relationship', {'Id': 'rId1', 'Type': REL + '/officeDocument', 'Target': 'xl/workbook.xml'}, namespace=PACKAGE)
with ZipFile(OUT, 'w', ZIP_DEFLATED) as archive:
    for index, spec in enumerate(DATA['sheets'], 1):
        sub(sheet_list, 'sheet', {'name': spec['name'], 'sheetId': str(index), f'{{{REL}}}id': f'rId{index}'})
        sub(relationships, 'Relationship', {'Id': f'rId{index}', 'Type': REL + '/worksheet', 'Target': f'worksheets/sheet{index}.xml'}, namespace=PACKAGE)
        sub(types, 'Override', {'PartName': f'/xl/worksheets/sheet{index}.xml', 'ContentType': 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'}, namespace=CONTENT)
        archive.writestr(f'xl/worksheets/sheet{index}.xml', worksheet(spec))
    sub(relationships, 'Relationship', {'Id': f'rId{len(DATA["sheets"]) + 1}', 'Type': REL + '/styles', 'Target': 'styles.xml'}, namespace=PACKAGE)
    archive.writestr('xl/workbook.xml', encoded(workbook))
    archive.writestr('xl/styles.xml', encoded(styles))
    archive.writestr('xl/_rels/workbook.xml.rels', encoded(relationships))
    archive.writestr('_rels/.rels', encoded(root_relationships))
    archive.writestr('[Content_Types].xml', encoded(types))

# Verify every XML part, unique IDs, row count and editable result columns.
with ZipFile(OUT) as archive:
    assert archive.testzip() is None
    for part in archive.namelist():
        ET.fromstring(archive.read(part))
    testcase = ET.fromstring(archive.read('xl/worksheets/sheet3.xml'))
    xml_rows = testcase.findall(f'{{{MAIN}}}sheetData/{{{MAIN}}}row')
    assert len(xml_rows) - 1 == DATA['summary']['testcases']
    ids = [row.find(f'{{{MAIN}}}c[@r="A{index}"]/{{{MAIN}}}is/{{{MAIN}}}t').text for index, row in enumerate(xml_rows[1:], 2)]
    assert len(set(ids)) == len(ids)
    for index, row in enumerate(xml_rows[1:], 2):
        assert row.find(f'{{{MAIN}}}c[@r="N{index}"]/{{{MAIN}}}is/{{{MAIN}}}t').text == 'Not run'
    assert len(testcase.findall(f'{{{MAIN}}}dataValidations/{{{MAIN}}}dataValidation')) == 2
print(json.dumps({'file': str(OUT), 'sheets': len(DATA['sheets']), 'testcases': len(ids), 'validated': True}))
