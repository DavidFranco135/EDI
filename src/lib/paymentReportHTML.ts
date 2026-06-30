import { Document } from '../types';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const METHOD_LABELS: Record<string, string> = {
  dinheiro: 'Dinheiro',
  cheque: 'Cheque',
  pix: 'PIX',
  deposito: 'Depósito',
  cartao: 'Cartão',
  outro: 'Outro',
};

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

export function buildPaymentReportHTML(doc: Document, s: Settings): string {
  const C_DARK = '#1B4332';
  const C_GOLD = '#D4A017';
  const C_MED = '#2D6A4F';
  const C_SAGE = '#F0F7F4';

  const payments = doc.payments || [];
  const totalPaid = payments.reduce((s, p) => s + p.valor, 0);
  const remaining = doc.total - totalPaid;
  const isQuitado = remaining <= 0.01;
  const today = new Date().toLocaleDateString('pt-BR');
  const clientName = doc.clientName || (doc.blocos?.[0]?.clientName) || '—';

  const paymentRows = payments
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p, i) => {
      const dateFmt = p.date ? new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
      return (
        '<tr style="background:' + (i % 2 === 0 ? '#fff' : C_SAGE) + '">' +
        '<td style="border:1px solid #ddd;padding:6px 10px;text-align:center;font-size:11px">' + (i + 1) + '</td>' +
        '<td style="border:1px solid #ddd;padding:6px 10px;text-align:center;font-size:11px;font-weight:bold">' + dateFmt + '</td>' +
        '<td style="border:1px solid #ddd;padding:6px 10px;text-align:center;font-size:11px">' + (METHOD_LABELS[p.method] || p.method) + '</td>' +
        '<td style="border:1px solid #ddd;padding:6px 10px;font-size:10px;color:#666">' + (p.notes || '—') + '</td>' +
        '<td style="border:1px solid #ddd;padding:6px 10px;text-align:right;font-size:12px;font-weight:bold;color:' + C_DARK + '">' + fmt(p.valor) + '</td>' +
        '</tr>'
      );
    }).join('');

  return '<!DOCTYPE html>' +
    '<html lang="pt-BR"><head>' +
    '<meta charset="UTF-8"/>' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>' +
    '<title>Relatório de Pagamento — Romaneio ' + doc.number + '</title>' +
    '<style>' +
    '  @page { size: A4 portrait; margin: 8mm; }' +
    '  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }' +
    '  body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #000; background: #e8e8e8; padding: 12px; }' +
    '  table { border-collapse: collapse; width: 100%; }' +
    '  .page { background: #fff; border-radius: 8px; box-shadow: 0 2px 16px rgba(0,0,0,0.15); padding: 20px; width: 100%; max-width: 700px; margin: 0 auto; }' +
    '  .print-btn { display: block; width: 100%; padding: 16px; background: ' + C_DARK + '; color: #fff; font-size: 16px; font-weight: bold; border: none; border-radius: 10px; cursor: pointer; margin-bottom: 16px; }' +
    '  @media print {' +
    '    body { padding: 0; background: #fff; font-size: 9px; }' +
    '    .print-btn { display: none !important; }' +
    '    .page { padding: 0; box-shadow: none; }' +
    '  }' +
    '</style></head><body>' +
    '<button class="print-btn" onclick="window.print()">&#8595; Salvar como PDF / Imprimir</button>' +
    '<div class="page">' +

    // Header
    '<div style="background:' + C_DARK + ';padding:16px 18px;border-radius:8px 8px 0 0;border-bottom:3px solid ' + C_GOLD + '">' +
    '<table><tr>' +
    '<td style="vertical-align:middle;width:70px;padding-right:12px">' +
    '<div style="width:58px;height:58px;background:#fff;border-radius:8px;font-size:32px;text-align:center;line-height:58px">&#127794;</div>' +
    '</td>' +
    '<td style="vertical-align:middle">' +
    '<div style="font-size:16px;font-weight:900;color:#fff;text-transform:uppercase">' + s.companyName + '</div>' +
    '<div style="font-size:9px;color:#d1fae5;margin-top:3px">' + s.companyPhone + ' | ' + s.companyEmail + '</div>' +
    '</td>' +
    '<td style="vertical-align:middle;text-align:right;padding-left:12px;white-space:nowrap">' +
    '<div style="display:inline-block;background:' + C_GOLD + ';color:' + C_DARK + ';font-weight:900;font-size:13px;padding:5px 14px;text-transform:uppercase;border-radius:6px;letter-spacing:1px">RELATÓRIO DE PAGAMENTO</div>' +
    '<div style="color:#a7f3c0;font-size:10px;font-weight:bold;margin-top:4px">ROMANEIO Nº <span style="color:#fff;font-size:13px">' + doc.number + '</span></div>' +
    '</td>' +
    '</tr></table></div>' +

    // Client + status
    '<div style="border:1px solid #ddd;border-top:none;padding:12px 16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">' +
    '<div>' +
    '<div style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:1px;font-weight:bold">Cliente</div>' +
    '<div style="font-size:14px;font-weight:900;color:' + C_DARK + ';text-transform:uppercase">' + clientName + '</div>' +
    '</div>' +
    '<div style="text-align:right">' +
    '<div style="display:inline-block;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:900;background:' +
    (isQuitado ? '#dcfce7;color:#15803d' : '#fef3c7;color:#a16207') +
    '">' + (isQuitado ? '✓ QUITADO' : 'EM ABERTO') + '</div>' +
    '</div>' +
    '</div>' +

    // Summary cards
    '<table style="margin-bottom:16px"><tr>' +
    '<td style="width:33%;padding:4px"><div style="background:' + C_SAGE + ';border-radius:8px;padding:12px;text-align:center">' +
    '<div style="font-size:9px;color:#666;text-transform:uppercase;font-weight:bold">Valor Total</div>' +
    '<div style="font-size:16px;font-weight:900;color:' + C_DARK + ';margin-top:2px">' + fmt(doc.total) + '</div>' +
    '</div></td>' +
    '<td style="width:33%;padding:4px"><div style="background:#dcfce7;border-radius:8px;padding:12px;text-align:center">' +
    '<div style="font-size:9px;color:#15803d;text-transform:uppercase;font-weight:bold">Recebido</div>' +
    '<div style="font-size:16px;font-weight:900;color:#15803d;margin-top:2px">' + fmt(totalPaid) + '</div>' +
    '</div></td>' +
    '<td style="width:33%;padding:4px"><div style="background:' + (isQuitado ? '#dcfce7' : '#fee2e2') + ';border-radius:8px;padding:12px;text-align:center">' +
    '<div style="font-size:9px;color:' + (isQuitado ? '#15803d' : '#b91c1c') + ';text-transform:uppercase;font-weight:bold">Saldo</div>' +
    '<div style="font-size:16px;font-weight:900;color:' + (isQuitado ? '#15803d' : '#b91c1c') + ';margin-top:2px">' + fmt(Math.max(0, remaining)) + '</div>' +
    '</div></td>' +
    '</tr></table>' +

    // Payments table
    '<div style="font-size:11px;font-weight:900;color:' + C_DARK + ';text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Histórico de Recebimentos</div>' +
    (payments.length > 0 ?
      '<table style="margin-bottom:16px">' +
      '<thead><tr style="background:' + C_DARK + ';color:#fff">' +
      '<th style="padding:7px;text-align:center;font-size:10px">Nº</th>' +
      '<th style="padding:7px;text-align:center;font-size:10px">Data</th>' +
      '<th style="padding:7px;text-align:center;font-size:10px">Forma</th>' +
      '<th style="padding:7px;text-align:left;font-size:10px">Observação</th>' +
      '<th style="padding:7px;text-align:right;font-size:10px">Valor</th>' +
      '</tr></thead>' +
      '<tbody>' + paymentRows + '</tbody>' +
      '<tfoot><tr style="background:' + C_DARK + ';color:#fff;font-weight:900">' +
      '<td colspan="4" style="padding:8px;font-size:12px">TOTAL RECEBIDO</td>' +
      '<td style="padding:8px;text-align:right;font-size:13px;background:' + C_GOLD + ';color:' + C_DARK + '">' + fmt(totalPaid) + '</td>' +
      '</tr></tfoot></table>'
      : '<p style="font-size:11px;color:#999;font-style:italic;padding:12px 0">Nenhum pagamento registrado ainda.</p>'
    ) +

    // Footer
    '<div style="border-top:2px solid ' + C_GOLD + ';margin-top:16px;padding-top:10px;text-align:center;font-size:9px;color:#999">' +
    s.companyName + ' | ' + s.companyPhone + ' | ' + s.companyEmail + ' | Relatório gerado em ' + today +
    '</div>' +

    '</div></body></html>';
}
