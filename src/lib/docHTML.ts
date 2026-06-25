import { Document, TimberItem } from '../types';
import { calcDerived } from './calc';

const TH = 'border:1px solid #2d7a4f;padding:4px 5px;text-align:center;font-weight:bold;font-size:11px';
const TD = 'border:1px solid #ccc;padding:3px 5px;text-align:center;font-size:11px';
const SUMTD = 'border:1px solid #ddd;padding:6px 12px;font-size:12px';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface DocHTMLParams {
  doc: Partial<Document>;
  type: 'pedido' | 'romaneio';
  totals: { m3: number; subtotal: number };
  commission: number;
  total: number;
  displayDate: string;
  client: Record<string, any>;
  settings: Record<string, any>;
}

export function buildDocHTML(p: DocHTMLParams): string {
  const { doc, type, totals, commission, total, displayDate, client, settings: s } = p;
  const rows = (doc.items || []).map((item: TimberItem, i: number) => {
    const d = calcDerived(item);
    const bg = i % 2 === 0 ? '#fff' : '#f2faf5';
    return (
      '<tr style="background:' + bg + '">' +
      '<td style="' + TD + '">' + item.espessura + '</td>' +
      '<td style="' + TD + '">' + item.largura + '</td>' +
      '<td style="' + TD + ';background:#e8f5ee">' + (item.c3 || '') + '</td>' +
      '<td style="' + TD + ';background:#e8f5ee">' + (item.c4 || '') + '</td>' +
      '<td style="' + TD + ';background:#e8f5ee">' + (item.c5 || '') + '</td>' +
      '<td style="' + TD + ';background:#e8f5ee">' + (item.c6 || '') + '</td>' +
      '<td style="' + TD + ';font-weight:bold">' + (d.qtyTotal || '') + '</td>' +
      '<td style="' + TD + '">' + d.linearMeters.toFixed(3) + '</td>' +
      '<td style="' + TD + ';font-weight:bold">' + (item.pricePerM3 ? fmt(item.pricePerM3) : '') + '</td>' +
      '<td style="' + TD + ';font-style:italic">' + d.avgLength.toFixed(2) + '</td>' +
      '<td style="' + TD + ';font-weight:bold;color:#1a5c34">' + d.finalM3.toFixed(4) + '</td>' +
      '<td style="' + TD + ';font-weight:bold;text-align:right">' + fmt(d.value) + '</td>' +
      '</tr>'
    );
  });

  const minEmpty = Math.max(0, 10 - rows.length);
  const emptyRows = Array.from({ length: minEmpty }).map((_, i) => {
    const bg = (rows.length + i) % 2 === 0 ? '#fff' : '#f2faf5';
    return '<tr style="background:' + bg + '">' +
      Array.from({ length: 12 }).map(() => '<td style="' + TD + ';height:22px"></td>').join('') +
      '</tr>';
  });

  const qtyTotal = (doc.items || []).reduce((s: number, it: TimberItem) => s + calcDerived(it).qtyTotal, 0);

  // Conditional rows
  const freteRow = (type === 'romaneio' && (doc.freight || 0) > 0)
    ? '<tr style="background:#fff8f0"><td style="' + SUMTD + '">– Frete</td><td style="' + SUMTD + ';font-weight:bold;text-align:right;color:#b45309">' + fmt(doc.freight || 0) + '</td></tr>'
    : '';
  const commRow = (type === 'romaneio' && commission > 0)
    ? '<tr style="background:#fffbeb"><td style="' + SUMTD + '">– Comissão</td><td style="' + SUMTD + ';font-weight:bold;text-align:right;color:#92400e">' + fmt(commission) + '</td></tr>'
    : '';
  const settlRow = (type === 'romaneio' && (doc.settlement || 0) > 0)
    ? '<tr style="background:#fff0f0"><td style="' + SUMTD + '">– Acerto escritório</td><td style="' + SUMTD + ';font-weight:bold;text-align:right;color:#b91c1c">' + fmt(doc.settlement || 0) + '</td></tr>'
    : '';

  const notesBar = doc.notes
    ? '<div style="background:#fff8f0;border:1px solid #f0a040;border-top:none;padding:4px 10px;font-size:9px;font-weight:bold;color:#b45309;text-transform:uppercase;margin-bottom:6px;text-align:center">' + doc.notes + '</div>'
    : '';

  const supplierRow = doc.supplier
    ? '<div><strong>FORNECEDOR:</strong> <span style="font-weight:bold;text-transform:uppercase">' + doc.supplier + '</span></div>'
    : '';
  const phoneRow = client.phone ? '<div><strong>FONE:</strong> ' + client.phone + '</div>' : '';
  const addrRow = client.address ? '<div><strong>ENDEREÇO:</strong> ' + client.address + (client.neighborhood ? ', ' + client.neighborhood : '') + '</div>' : '';
  const cityRow = client.city ? '<div><strong>MUNICÍPIO:</strong> ' + client.city + (client.state ? ' — ' + client.state : '') + '</div>' : '';
  const cepRow = client.cep ? '<div><strong>CEP:</strong> ' + client.cep + '</div>' : '';
  const cnpjRow = client.cnpj ? '<div><strong>CNPJ/CPF:</strong> ' + client.cnpj + '</div>' : '';
  const ieRow = client.ie ? '<div><strong>INS. EST.:</strong> ' + client.ie + '</div>' : '';
  const clientPhone = client.phone ? '<div style="font-size:9px;color:#666;margin-top:2px">' + client.phone + '</div>' : '';
  const obsDiv = doc.notes
    ? '<div style="background:#fff8f0;border:1px solid #f0c080;border-radius:4px;padding:6px 10px;font-size:9px;color:#7c4a00"><strong style="display:block;margin-bottom:2px;font-size:9px;text-transform:uppercase;color:#b45309">Obs.:</strong>' + doc.notes + '</div>'
    : '';

  const emittedDate = new Date().toLocaleDateString('pt-BR');

  return '<!DOCTYPE html>\n' +
    '<html lang="pt-BR">\n' +
    '<head>\n' +
    '<meta charset="UTF-8"/>\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>\n' +
    '<title>' + type.toUpperCase() + ' No ' + doc.number + '</title>\n' +
    '<style>\n' +
    '  @page { size: A4 portrait; margin: 8mm; }\n' +
    '  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }\n' +
    '  html, body { height: 100%; }\n' +
    '  body { font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #000; background: #e8e8e8; padding: 12px; }\n' +
    '  table { border-collapse: collapse; width: 100%; }\n' +
    '  .page { background: #fff; border-radius: 8px; box-shadow: 0 2px 16px rgba(0,0,0,0.15); padding: 20px; width: 100%; max-width: 700px; margin: 0 auto; display: flex; flex-direction: column; min-height: calc(100vh - 100px); }\n' +
    '  .content { flex: 1; }\n' +
    '  .print-btn { display: block; width: 100%; padding: 18px; background: #1a5c34; color: #fff; font-size: 18px; font-weight: bold; border: none; border-radius: 10px; cursor: pointer; margin-bottom: 16px; }\n' +
    '  .print-btn:active { background: #155228; }\n' +
    '  @media print {\n' +
    '    body { padding: 0; background: #fff; font-size: 9px; }\n' +
    '    .print-btn { display: none !important; }\n' +
    '    .page { padding: 0; box-shadow: none; border-radius: 0; min-height: 100vh; }\n' +
    '  }\n' +
    '</style>\n' +
    '</head>\n' +
    '<body>\n' +
    '<button class="print-btn" onclick="window.print()">&#8595; Salvar como PDF / Imprimir</button>\n' +
    '<div class="page"><div class="content">\n' +

    // Header
    '<div style="background:#1a5c34;padding:14px 16px;border-radius:6px 6px 0 0">' +
    '<table><tr>' +
    '<td style="vertical-align:middle;width:70px;padding-right:12px"><div style="width:62px;height:62px;background:#fff;border-radius:8px;font-size:36px;text-align:center;line-height:62px">&#127794;</div></td>' +
    '<td style="vertical-align:middle">' +
    '<div style="font-size:18px;font-weight:900;color:#fff;text-transform:uppercase">' + s.companyName + '</div>' +
    '<div style="font-size:10px;color:#a7f3c0;font-weight:bold;text-transform:uppercase;letter-spacing:2px;margin-top:2px">' + s.companyNeighborhood + '</div>' +
    '<div style="font-size:9px;color:#d1fae5;margin-top:3px">' + s.companyAddress + ' — ' + s.companyCity + ' | CEP: ' + s.companyCEP + '</div>' +
    '<div style="font-size:9px;color:#d1fae5">TEL: ' + s.companyPhone + ' | CNPJ: ' + s.companyCNPJ + ' | ' + s.companyEmail + '</div>' +
    '</td>' +
    '<td style="vertical-align:middle;text-align:right;padding-left:12px;white-space:nowrap">' +
    '<div style="display:inline-block;background:#fff;color:#1a5c34;font-weight:900;font-size:20px;padding:6px 18px;text-transform:uppercase;border-radius:6px;margin-bottom:6px">' + type.toUpperCase() + '</div>' +
    '<div style="color:#a7f3c0;font-size:10px;font-weight:bold">DATA: <span style="color:#fff">' + displayDate + '</span></div>' +
    '<div style="color:#a7f3c0;font-size:10px;font-weight:bold">N&ordm; <span style="color:#fff;font-size:16px;font-weight:900">' + doc.number + '</span></div>' +
    '</td></tr></table></div>' +

    // Client data
    '<div style="border:1px solid #ccc;border-top:none;padding:8px 12px;margin-bottom:6px;background:#fafffe">' +
    '<table><tr>' +
    '<td style="width:58%;vertical-align:top;padding-right:12px">' +
    '<div style="margin-bottom:2px"><strong>CLIENTE:</strong> <span style="text-transform:uppercase;font-weight:900;font-size:12px;color:#1a5c34">' + (doc.clientName || client.name || '—') + '</span></div>' +
    addrRow + cityRow + cepRow + cnpjRow + ieRow +
    '</td>' +
    '<td style="vertical-align:top;border-left:1px dashed #ccc;padding-left:12px">' +
    supplierRow + phoneRow +
    '<div><strong>COND. PAGTO:</strong> ' + (doc.paymentTerms || '—') + '</div>' +
    '<div><strong>FRETE:</strong> INCLUSO</div>' +
    '</td></tr></table></div>' +

    notesBar +

    // Table
    '<table style="margin-bottom:0;font-size:9px">' +
    '<thead>' +
    '<tr style="background:#1a5c34;color:#fff">' +
    '<th style="' + TH + '" rowspan="2">Bitola<br>(cm)</th>' +
    '<th style="' + TH + '" rowspan="2">Larg.<br>(cm)</th>' +
    '<th style="' + TH + ';background:#155228;font-size:8px" colspan="4">Comprimento (m) — Qtd de Peças</th>' +
    '<th style="' + TH + '" rowspan="2">Qtd<br>Pcs</th>' +
    '<th style="' + TH + '" rowspan="2">Metros<br>Lin.</th>' +
    '<th style="' + TH + '" rowspan="2">R$/m3</th>' +
    '<th style="' + TH + '" rowspan="2">Med.<br>Comp.</th>' +
    '<th style="' + TH + ';background:#2d7a4f" rowspan="2">M3</th>' +
    '<th style="' + TH + ';background:#b45309" rowspan="2">VALOR</th>' +
    '</tr>' +
    '<tr style="background:#2d7a4f;color:#fff">' +
    '<th style="' + TH + '">3,00</th><th style="' + TH + '">4,00</th><th style="' + TH + '">5,00</th><th style="' + TH + '">6,00</th>' +
    '</tr></thead>' +
    '<tbody>' + rows.join('') + emptyRows.join('') + '</tbody>' +
    '<tfoot><tr style="background:#1a5c34;color:#fff;font-weight:bold">' +
    '<td colspan="6" style="' + TD + '"></td>' +
    '<td style="' + TD + ';text-align:center;font-size:11px">' + qtyTotal + '</td>' +
    '<td colspan="3" style="' + TD + '"></td>' +
    '<td style="' + TD + ';font-size:9px;color:#a7f3c0;font-style:italic;text-align:right;white-space:nowrap">Total m3: <span style="color:#86efac;font-weight:900;font-size:12px">' + totals.m3.toFixed(4) + '</span></td>' +
    '<td style="' + TD + ';color:#fcd34d;font-weight:900;font-size:12px;text-align:right">' + fmt(totals.subtotal) + '</td>' +
    '</tr></tfoot></table>' +

    // Totals + obs
    '<table style="margin-top:8px;margin-bottom:8px"><tr>' +
    '<td style="width:52%;vertical-align:top;padding-right:14px">' + obsDiv + '</td>' +
    '<td style="vertical-align:top">' +
    '<table style="border:2px solid #1a5c34;border-radius:4px;overflow:hidden;font-size:10px">' +
    '<tr style="background:#f0faf4"><td style="' + SUMTD + '"><strong>Total em M3</strong></td><td style="' + SUMTD + ';font-weight:bold;color:#1a5c34;text-align:right;font-size:12px">' + totals.m3.toFixed(4) + ' m3</td></tr>' +
    '<tr><td style="' + SUMTD + '">Subtotal Madeira</td><td style="' + SUMTD + ';font-weight:bold;text-align:right">' + fmt(totals.subtotal) + '</td></tr>' +
    freteRow + commRow + settlRow +
    '<tr style="background:#1a5c34"><td style="' + SUMTD + ';color:#fff;font-weight:900;font-size:13px">TOTAL A PAGAR</td><td style="' + SUMTD + ';color:#fcd34d;font-weight:900;font-size:16px;text-align:right">' + fmt(total) + '</td></tr>' +
    '</table></td></tr></table>' +

    // Footer names
    '<div style="border-top:2px solid #1a5c34;margin-top:10px;padding-top:8px">' +
    '<table><tr>' +
    '<td style="width:33%;padding:6px 10px"><div style="background:#f0faf4;border:1px solid #1a5c34;border-radius:6px;padding:8px 10px">' +
    '<div style="font-size:8px;font-weight:bold;text-transform:uppercase;color:#555;letter-spacing:1px;margin-bottom:3px">Cliente</div>' +
    '<div style="font-weight:900;font-size:11px;text-transform:uppercase;color:#1a5c34">' + (doc.clientName || client.name || '—') + '</div>' +
    clientPhone + '</div></td>' +
    '<td style="width:34%;padding:6px 10px"><div style="background:#f0faf4;border:1px solid #1a5c34;border-radius:6px;padding:8px 10px">' +
    '<div style="font-size:8px;font-weight:bold;text-transform:uppercase;color:#555;letter-spacing:1px;margin-bottom:3px">Fornecedor / Fabrica</div>' +
    '<div style="font-weight:900;font-size:11px;text-transform:uppercase;color:#1a5c34">' + (doc.supplier || '—') + '</div>' +
    '</div></td>' +
    '<td style="width:33%;padding:6px 10px"><div style="background:#f0faf4;border:1px solid #1a5c34;border-radius:6px;padding:8px 10px">' +
    '<div style="font-size:8px;font-weight:bold;text-transform:uppercase;color:#555;letter-spacing:1px;margin-bottom:3px">Motorista</div>' +
    '<div style="font-weight:900;font-size:11px;text-transform:uppercase;color:#1a5c34">' + (doc.motorista || '—') + '</div>' +
    '</div></td>' +
    '</tr></table>' +
    '<div style="text-align:center;margin-top:6px;font-size:8px;color:#aaa">EDI – Gestao de Madeiras | Emitido em ' + emittedDate + '</div>' +
    '</div>' +

    '</div></div></body></html>';
}
