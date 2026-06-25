interface PrecoRow {
  id: string;
  bitola: number;
  largura: number;
  comprimento: number;
  valorM3: number;
}

interface TabelaPreco {
  id: string;
  nome: string;
  valorM3: number;
  rows: PrecoRow[];
}

interface Settings {
  companyName: string;
  companyNeighborhood: string;
  companyAddress: string;
  companyCity: string;
  companyCEP: string;
  companyPhone: string;
  companyCNPJ: string;
  companyEmail: string;
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calcRow(r: PrecoRow) {
  const m3Peca = r.bitola > 0 && r.largura > 0 && r.comprimento > 0
    ? (r.bitola / 100) * (r.largura / 100) * r.comprimento
    : 0;
  const qtdPorM3 = m3Peca > 0 ? Math.round(1 / m3Peca) : 0;
  const precoUnidade = r.valorM3 > 0 && m3Peca > 0 ? r.valorM3 * m3Peca : 0;
  return { m3Peca, qtdPorM3, precoUnidade };
}

const TH = 'border:1px solid #2d7a4f;padding:5px 8px;text-align:center;font-weight:bold;font-size:10px;background:#1a5c34;color:#fff';
const TD = 'border:1px solid #ccc;padding:4px 8px;text-align:center;font-size:10px';
const TD_GRAY = 'border:1px solid #ccc;padding:4px 8px;text-align:center;font-size:10px;background:#f5f5f5';

export function buildTabelaHTML(tabela: TabelaPreco, s: Settings): string {
  const today = new Date().toLocaleDateString('pt-BR');

  const tableRows = tabela.rows.map((r, i) => {
    const c = calcRow(r);
    const bg = i % 2 === 0 ? '#ffffff' : '#f7faf8';
    return (
      '<tr style="background:' + bg + '">' +
      '<td style="' + TD_GRAY + '">' + r.bitola + '</td>' +
      '<td style="' + TD_GRAY + '">' + r.largura + '</td>' +
      '<td style="' + TD_GRAY + '">' + r.comprimento + '</td>' +
      '<td style="' + TD + ';font-weight:bold">' + (c.qtdPorM3 || '—') + '</td>' +
      '<td style="' + TD + ';font-weight:bold;color:#b45309">' + (c.precoUnidade > 0 ? fmt(c.precoUnidade) : '—') + '</td>' +
      '<td style="' + TD + '">' + r.comprimento.toFixed(2) + '</td>' +
      '<td style="' + TD + ';background:#f0faf4;font-weight:bold;color:#1a5c34">' + fmt(r.valorM3) + '</td>' +
      '<td style="' + TD + ';background:#f0faf4;font-weight:bold;color:#1a5c34">' + (c.m3Peca > 0 ? c.m3Peca.toFixed(4) : '—') + '</td>' +
      '</tr>'
    );
  }).join('');

  return '<!DOCTYPE html>' +
    '<html lang="pt-BR"><head>' +
    '<meta charset="UTF-8"/>' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>' +
    '<title>' + tabela.nome + '</title>' +
    '<style>' +
    '  @page { size: A4 portrait; margin: 8mm; }' +
    '  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }' +
    '  body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #000; background: #e8e8e8; padding: 12px; }' +
    '  table { border-collapse: collapse; width: 100%; }' +
    '  .page { background: #fff; border-radius: 8px; box-shadow: 0 2px 16px rgba(0,0,0,0.15); padding: 20px; width: 100%; max-width: 700px; margin: 0 auto; }' +
    '  .print-btn { display: block; width: 100%; padding: 18px; background: #1a5c34; color: #fff; font-size: 18px; font-weight: bold; border: none; border-radius: 10px; cursor: pointer; margin-bottom: 16px; }' +
    '  .print-btn:active { background: #155228; }' +
    '  @media print {' +
    '    body { padding: 0; background: #fff; font-size: 9px; }' +
    '    .print-btn { display: none !important; }' +
    '    .page { padding: 0; box-shadow: none; border-radius: 0; }' +
    '  }' +
    '</style></head><body>' +
    '<button class="print-btn" onclick="window.print()">&#8595; Salvar como PDF / Imprimir</button>' +
    '<div class="page">' +

    // Header
    '<div style="background:#1a5c34;padding:14px 16px;border-radius:6px 6px 0 0;margin-bottom:0">' +
    '<table><tr>' +
    '<td style="vertical-align:middle;width:70px;padding-right:12px">' +
    '<div style="width:58px;height:58px;background:#fff;border-radius:8px;font-size:32px;text-align:center;line-height:58px">&#127794;</div>' +
    '</td>' +
    '<td style="vertical-align:middle">' +
    '<div style="font-size:16px;font-weight:900;color:#fff;text-transform:uppercase">' + s.companyName + '</div>' +
    '<div style="font-size:10px;color:#a7f3c0;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-top:2px">' + s.companyNeighborhood + '</div>' +
    '<div style="font-size:9px;color:#d1fae5;margin-top:2px">' + s.companyAddress + ' — ' + s.companyCity + ' | CEP: ' + s.companyCEP + '</div>' +
    '<div style="font-size:9px;color:#d1fae5">TEL: ' + s.companyPhone + ' | CNPJ: ' + s.companyCNPJ + ' | ' + s.companyEmail + '</div>' +
    '</td>' +
    '<td style="vertical-align:middle;text-align:right;padding-left:12px;white-space:nowrap">' +
    '<div style="display:inline-block;background:#fff;color:#1a5c34;font-weight:900;font-size:11px;padding:4px 12px;text-transform:uppercase;border-radius:4px;letter-spacing:1px;margin-bottom:4px">TABELA DE PREÇOS</div>' +
    '<div style="color:#a7f3c0;font-size:10px;font-weight:bold">Emitido em: <span style="color:#fff">' + today + '</span></div>' +
    '</td>' +
    '</tr></table></div>' +

    // Table title
    '<div style="background:#f0faf4;border:1px solid #1a5c34;border-top:none;padding:8px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">' +
    '<span style="font-size:13px;font-weight:900;color:#1a5c34;text-transform:uppercase">' + tabela.nome + '</span>' +
    '<span style="font-size:11px;font-weight:bold;color:#555;background:#fff;border:1px solid #ccc;padding:2px 10px;border-radius:4px">Valor m³: <strong style="color:#1a5c34">' + fmt(tabela.valorM3) + '</strong></span>' +
    '</div>' +

    // Price table
    '<table style="margin-bottom:16px">' +
    '<thead><tr>' +
    '<th style="' + TH + '">Bitola (cm)</th>' +
    '<th style="' + TH + '">Largura (cm)</th>' +
    '<th style="' + TH + '">Comprimento</th>' +
    '<th style="' + TH + '">QTD Peças/m³</th>' +
    '<th style="' + TH + '">Preço/Unidade</th>' +
    '<th style="' + TH + '">Metros Lin.</th>' +
    '<th style="' + TH + ';background:#2d7a4f">Valor m³</th>' +
    '<th style="' + TH + ';background:#2d7a4f">M³/Peça</th>' +
    '</tr></thead>' +
    '<tbody>' + tableRows + '</tbody>' +
    '<tfoot><tr style="background:#1a5c34;color:#fff">' +
    '<td colspan="8" style="padding:5px 10px;font-size:9px;text-align:right;font-style:italic;color:#a7f3c0">' +
    'valor em m³: <strong style="color:#fff">' + fmt(tabela.valorM3) + '</strong> | ' + tabela.rows.length + ' itens' +
    '</td></tr></tfoot>' +
    '</table>' +

    // Footer
    '<div style="border-top:1px solid #ccc;padding-top:8px;text-align:center;font-size:8px;color:#aaa">' +
    'EDI – Gestão de Madeiras | ' + s.companyPhone + ' | ' + s.companyEmail + ' | Gerado em ' + today +
    '</div>' +

    '</div></body></html>';
}
