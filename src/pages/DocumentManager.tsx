import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { Document } from '../types';
import { TimberCalculator } from '../components/TimberCalculator';
import { calcDerived } from '../lib/calc';
import { ArrowLeft, Save, Printer, Plus, Share2 } from 'lucide-react';
import { format } from 'date-fns';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const DocumentManager: React.FC<{ type: 'pedido' | 'romaneio' }> = ({ type }) => {
  const { state, saveDocument } = useApp();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const fromPedidoId = searchParams.get('from');

  const nextNumber = () =>
    (state.documents.filter(d => d.type === type).length + 1)
      .toString()
      .padStart(3, '0');

  const [doc, setDoc] = useState<Partial<Document>>({
    type,
    number: nextNumber(),
    date: new Date().toISOString().split('T')[0],
    clientId: '',
    clientName: '',
    supplier: '',
    items: [],
    subtotal: 0,
    totalM3: 0,
    total: 0,
    freight: 0,
    commissionPct: state.settings.defaultCommissionPct,
    commissionValue: 0,
    settlement: 0,
    paymentTerms: 'À VISTA',
    motorista: '',
    supplier: '',
    status: 'andamento' as const,
    notes:
      type === 'romaneio'
        ? 'O FRETE SERÁ PAGO À VISTA AO TRANSPORTADOR NO ATO DA DESCARGA, DEDUZIDO DO MATERIAL. MANDAR O PAGAMENTO DA MADEIRA PELO MOTORISTA.'
        : '',
  });

  useEffect(() => {
    if (id) {
      const ex = state.documents.find(d => d.id === id);
      if (ex) setDoc(ex);
    }
  }, [id]);

  // Pre-fill romaneio from pedido
  useEffect(() => {
    if (fromPedidoId && type === 'romaneio') {
      const pedido = state.documents.find(d => d.id === fromPedidoId);
      if (pedido) {
        setDoc(prev => ({
          ...prev,
          clientId: pedido.clientId || '',
          clientName: pedido.clientName,
          clientData: pedido.clientData,
          supplier: pedido.supplier || '',
          items: pedido.items.map(i => ({ ...i, id: Math.random().toString(36).slice(2,9) })),
          paymentTerms: pedido.paymentTerms,
        }));
      }
    }
  }, [fromPedidoId]);

  const totals = useMemo(() => {
    return (doc.items || []).reduce(
      (acc, item) => {
        const d = calcDerived(item);
        acc.m3 += d.finalM3;
        acc.subtotal += d.value;
        return acc;
      },
      { m3: 0, subtotal: 0 }
    );
  }, [doc.items]);

  const commission = doc.commissionPct ? totals.subtotal * (doc.commissionPct / 100) : 0;
  // frete e comissão são deduções independentes
  const total =
    type === 'romaneio'
      ? totals.subtotal - (doc.freight || 0) - commission - (doc.settlement || 0)
      : totals.subtotal;

  const selectedClient = state.clients.find(c => c.id === doc.clientId);
  const client = doc.clientData || selectedClient || {};

  const handleClientSelect = (clientId: string) => {
    const c = state.clients.find(x => x.id === clientId);
    setDoc(prev => ({
      ...prev,
      clientId,
      clientName: c?.name || '',
      clientData: c ? { ...c } : undefined,
    }));
  };

  const handleSave = async () => {
    const now = new Date().toISOString();
    const finalDoc: Document = {
      ...doc,
      id: doc.id || Math.random().toString(36).slice(2, 11),
      clientName: doc.clientName || (doc.clientData as any)?.name || '—',
      subtotal: totals.subtotal,
      totalM3: totals.m3,
      commissionValue: commission,
      total,
      createdAt: doc.createdAt || now,
      updatedAt: now,
    } as Document;
    await saveDocument(finalDoc);
    navigate('/relatorios');
  };

  const displayDate =
    doc.date && !isNaN(new Date(doc.date).getTime())
      ? format(new Date(doc.date + 'T12:00:00'), 'dd/MM/yyyy')
      : '—';

  const s = state.settings;
  const rows = (doc.items || []).map(item => ({ item, d: calcDerived(item) }));


  const handleShare = async () => {
    const title = `${type.toUpperCase()} Nº ${doc.number} — ${doc.clientName || ''}`;
    const text = [
      `*${type.toUpperCase()} Nº ${doc.number}*`,
      `Cliente: ${doc.clientName || '—'}`,
      doc.supplier ? `Fornecedor: ${doc.supplier}` : '',
      `Data: ${displayDate}`,
      `Total M³: ${totals.m3.toFixed(4)}`,
      `Total: ${fmt(total)}`,
      type === 'romaneio' ? `Motorista: ${doc.motorista || '—'}` : '',
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title, text });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      alert('Dados copiados! Cole no WhatsApp ou email.');
    }
  };

  // Build complete print HTML - portrait A4, full page
  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) {
      alert('Pop-up bloqueado. Permita pop-ups para este site e tente novamente.');
      return;
    }

    const minEmptyRows = Math.max(0, 10 - rows.length);

    const tableRows = rows.map(({ item, d }, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f2faf5'}">
        <td style="${TD}">${item.espessura}</td>
        <td style="${TD}">${item.largura}</td>
        <td style="${TD};background:#e8f5ee">${item.c3 || ''}</td>
        <td style="${TD};background:#e8f5ee">${item.c4 || ''}</td>
        <td style="${TD};background:#e8f5ee">${item.c5 || ''}</td>
        <td style="${TD};background:#e8f5ee">${item.c6 || ''}</td>
        <td style="${TD};font-weight:bold">${d.qtyTotal || ''}</td>
        <td style="${TD}">${d.linearMeters.toFixed(3)}</td>
        <td style="${TD};font-weight:bold">${item.pricePerM3 ? fmt(item.pricePerM3) : ''}</td>
        <td style="${TD};font-style:italic">${d.avgLength.toFixed(2)}</td>
        <td style="${TD};font-weight:bold;color:#1a5c34">${d.finalM3.toFixed(4)}</td>
        <td style="${TD};font-weight:bold;text-align:right">${fmt(d.value)}</td>
      </tr>
    `).join('');

    const emptyRows = Array.from({ length: minEmptyRows }).map((_, i) => `
      <tr style="background:${(rows.length + i) % 2 === 0 ? '#fff' : '#f2faf5'}">
        ${Array.from({ length: 12 }).map(() => `<td style="${TD};height:22px"></td>`).join('')}
      </tr>
    `).join('');

    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<title>${type.toUpperCase()} Nº ${doc.number}</title>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
    color: #000;
    background: #fff;
  }
  table { border-collapse: collapse; width: 100%; }
  .page {
    display: flex;
    flex-direction: column;
    padding: 16px;
  }
  .content { flex: 1; }

  /* ── TELA (celular e desktop) ── */
  @media screen {
    body {
      background: #e8e8e8;
      padding: 12px;
      font-size: 15px;
    }
    .page {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.15);
      padding: 20px;
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
    }
    .print-btn {
      display: block;
      width: 100%;
      padding: 18px;
      background: #1a5c34;
      color: #fff;
      font-size: 18px;
      font-weight: bold;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      margin-bottom: 16px;
      letter-spacing: 0.5px;
      -webkit-tap-highlight-color: transparent;
    }
    .print-btn:active { background: #155228; transform: scale(0.98); }

    /* Aumenta fontes na tela para ficar legível no celular */
    td, th, div, p, span { font-size: inherit; }
  }

  /* ── IMPRESSÃO / PDF ── */
  @media print {
    body {
      padding: 0;
      background: #fff;
      font-size: 9px;
    }
    .print-btn { display: none !important; }
    .page {
      padding: 0;
      box-shadow: none;
      border-radius: 0;
    }
  }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">⬇️ Salvar como PDF / Imprimir</button>

<div class="page">
<div class="content">

<!-- ═══ LOGO / CABEÇALHO ═══ -->
<div style="background:#1a5c34;padding:14px 16px;border-radius:6px 6px 0 0;margin-bottom:0">
  <table>
    <tr>
      <td style="vertical-align:middle;width:70px;padding-right:12px">
        <div style="width:62px;height:62px;background:#fff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:36px;text-align:center;line-height:62px">🌲</div>
      </td>
      <td style="vertical-align:middle">
        <div style="font-size:clamp(14px,4vw,20px);font-weight:900;color:#fff;letter-spacing:1px;text-transform:uppercase">${s.companyName}</div>
        <div style="font-size:10px;color:#a7f3c0;font-weight:bold;text-transform:uppercase;letter-spacing:2px;margin-top:2px">${s.companyNeighborhood}</div>
        <div style="font-size:9px;color:#d1fae5;margin-top:3px">${s.companyAddress} — ${s.companyCity} | CEP: ${s.companyCEP}</div>
        <div style="font-size:9px;color:#d1fae5">TEL: ${s.companyPhone} | CNPJ: ${s.companyCNPJ} | ${s.companyEmail}</div>
      </td>
      <td style="vertical-align:middle;text-align:right;padding-left:12px;white-space:nowrap">
        <div style="display:inline-block;background:#fff;color:#1a5c34;font-weight:900;font-size:20px;padding:6px 18px;text-transform:uppercase;border-radius:6px;letter-spacing:2px;margin-bottom:6px">${type.toUpperCase()}</div>
        <div style="color:#a7f3c0;font-size:10px;font-weight:bold">DATA: <span style="color:#fff">${displayDate}</span></div>
        <div style="color:#a7f3c0;font-size:10px;font-weight:bold">Nº <span style="color:#fff;font-size:16px;font-weight:900">${doc.number}</span></div>
      </td>
    </tr>
  </table>
</div>

<!-- ═══ DADOS CLIENTE ═══ -->
<div style="border:1px solid #ccc;border-top:none;padding:8px 12px;margin-bottom:6px;background:#fafffe">
  <table>
    <tr>
      <td style="width:58%;vertical-align:top;padding-right:12px">
        <div style="margin-bottom:2px"><strong>CLIENTE:</strong> <span style="text-transform:uppercase;font-weight:900;font-size:12px;color:#1a5c34">${doc.clientName || (client as any).name || '—'}</span></div>
        ${(client as any).address ? `<div><strong>ENDEREÇO:</strong> ${(client as any).address}${(client as any).neighborhood ? ', ' + (client as any).neighborhood : ''}</div>` : ''}
        ${(client as any).city ? `<div><strong>MUNICÍPIO:</strong> ${(client as any).city}${(client as any).state ? ' — ' + (client as any).state : ''}</div>` : ''}
        ${(client as any).cep ? `<div><strong>CEP:</strong> ${(client as any).cep}</div>` : ''}
        ${(client as any).cnpj ? `<div><strong>CNPJ/CPF:</strong> ${(client as any).cnpj}</div>` : ''}
        ${(client as any).ie ? `<div><strong>INS. EST.:</strong> ${(client as any).ie}</div>` : ''}
      </td>
      <td style="vertical-align:top;border-left:1px dashed #ccc;padding-left:12px">
        ${doc.supplier ? `<div><strong>FORNECEDOR:</strong> <span style="font-weight:bold;text-transform:uppercase">${doc.supplier}</span></div>` : ''}
        ${(client as any).phone ? `<div><strong>FONE:</strong> ${(client as any).phone}</div>` : ''}
        <div><strong>COND. PAGTO:</strong> ${doc.paymentTerms || '—'}</div>
        <div><strong>FRETE:</strong> ${type === 'romaneio' ? 'INCLUSO' : 'A COMBINAR'}</div>
      </td>
    </tr>
  </table>
</div>

${doc.notes ? `<div style="background:#fff8f0;border:1px solid #f0a040;border-top:none;padding:4px 10px;font-size:9px;font-weight:bold;color:#b45309;text-transform:uppercase;margin-bottom:6px;text-align:center">${doc.notes}</div>` : ''}

<!-- ═══ TABELA ═══ -->
<table style="margin-bottom:0;font-size:9px">
  <thead>
    <tr style="background:#1a5c34;color:#fff">
      <th style="${TH}" rowspan="2">Bitola<br>(cm)</th>
      <th style="${TH}" rowspan="2">Larg.<br>(cm)</th>
      <th style="${TH};background:#155228;font-size:8px" colspan="4">Comprimento (m) — Qtd de Peças</th>
      <th style="${TH}" rowspan="2">Qtd<br>Pçs</th>
      <th style="${TH}" rowspan="2">Metros<br>Lin.</th>
      <th style="${TH}" rowspan="2">R$/m³</th>
      <th style="${TH}" rowspan="2">Méd.<br>Comp.</th>
      <th style="${TH};background:#2d7a4f" rowspan="2">M³</th>
      <th style="${TH};background:#b45309" rowspan="2">VALOR</th>
    </tr>
    <tr style="background:#2d7a4f;color:#fff">
      <th style="${TH}">3,00</th>
      <th style="${TH}">4,00</th>
      <th style="${TH}">5,00</th>
      <th style="${TH}">6,00</th>
    </tr>
  </thead>
  <tbody>
    ${tableRows}
    ${emptyRows}
  </tbody>
  <tfoot>
    <tr style="background:#1a5c34;color:#fff;font-weight:bold">
      <td colspan="6" style="${TD};text-align:right;color:#a7f3c0;font-style:italic;font-size:9px">Total em m³ →</td>
      <td style="${TD};text-align:center;font-size:11px">${rows.reduce((s, r) => s + r.d.qtyTotal, 0)}</td>
      <td colspan="3" style="${TD}"></td>
      <td style="${TD};color:#86efac;font-weight:900;font-size:12px">${totals.m3.toFixed(4)}</td>
      <td style="${TD};color:#fcd34d;font-weight:900;font-size:12px;text-align:right">${fmt(totals.subtotal)}</td>
    </tr>
  </tfoot>
</table>

<!-- ═══ TOTAIS + OBS ═══ -->
<table style="margin-top:8px;margin-bottom:8px">
  <tr>
    <td style="width:52%;vertical-align:top;padding-right:14px">
      ${doc.notes ? `
      <div style="background:#fff8f0;border:1px solid #f0c080;border-radius:4px;padding:6px 10px;font-size:9px;color:#7c4a00">
        <strong style="display:block;margin-bottom:2px;font-size:9px;text-transform:uppercase;color:#b45309">⚠ Observações:</strong>
        ${doc.notes}
      </div>` : ''}
    </td>
    <td style="vertical-align:top">
      <table style="border:2px solid #1a5c34;border-radius:4px;overflow:hidden;font-size:10px">
        <tr style="background:#f0faf4">
          <td style="${SUMTD}"><strong>Total em M³</strong></td>
          <td style="${SUMTD};font-weight:bold;color:#1a5c34;text-align:right;font-size:12px">${totals.m3.toFixed(4)} m³</td>
        </tr>
        <tr>
          <td style="${SUMTD}">Subtotal Madeira</td>
          <td style="${SUMTD};font-weight:bold;text-align:right">${fmt(totals.subtotal)}</td>
        </tr>
        ${type === 'romaneio' ? `
        ${(doc.freight || 0) > 0 ? `
        <tr style="background:#fff8f0">
          <td style="${SUMTD}">– Frete</td>
          <td style="${SUMTD};font-weight:bold;text-align:right;color:#b45309">${fmt(doc.freight || 0)}</td>
        </tr>` : ''}
        ${commission > 0 ? `
        <tr style="background:#fffbeb">
          <td style="${SUMTD}">– Comissão</td>
          <td style="${SUMTD};font-weight:bold;text-align:right;color:#92400e">${fmt(commission)}</td>
        </tr>` : ''}
        ${(doc.settlement || 0) > 0 ? `
        <tr style="background:#fff0f0">
          <td style="${SUMTD}">– Acerto escritório</td>
          <td style="${SUMTD};font-weight:bold;text-align:right;color:#b91c1c">${fmt(doc.settlement || 0)}</td>
        </tr>` : ''}` : ''}
        <tr style="background:#1a5c34">
          <td style="${SUMTD};color:#fff;font-weight:900;font-size:13px;letter-spacing:0.5px">TOTAL A PAGAR</td>
          <td style="${SUMTD};color:#fcd34d;font-weight:900;font-size:16px;text-align:right">${fmt(total)}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

</div><!-- end content -->

<!-- ═══ RODAPÉ — NOMES ═══ -->
<div style="border-top:2px solid #1a5c34;margin-top:10px;padding-top:8px">
  <table>
    <tr>
      <td style="width:33%;padding:6px 10px">
        <div style="background:#f0faf4;border:1px solid #1a5c34;border-radius:6px;padding:8px 10px">
          <div style="font-size:8px;font-weight:bold;text-transform:uppercase;color:#555;letter-spacing:1px;margin-bottom:3px">Cliente</div>
          <div style="font-weight:900;font-size:11px;text-transform:uppercase;color:#1a5c34">${doc.clientName || (client as any).name || '—'}</div>
          ${(client as any).phone ? `<div style="font-size:9px;color:#666;margin-top:2px">${(client as any).phone}</div>` : ''}
        </div>
      </td>
      <td style="width:34%;padding:6px 10px">
        <div style="background:#f0faf4;border:1px solid #1a5c34;border-radius:6px;padding:8px 10px">
          <div style="font-size:8px;font-weight:bold;text-transform:uppercase;color:#555;letter-spacing:1px;margin-bottom:3px">Fornecedor / Fábrica</div>
          <div style="font-weight:900;font-size:11px;text-transform:uppercase;color:#1a5c34">${type === 'pedido' && doc.supplier ? doc.supplier : (doc.supplier || '—')}</div>
        </div>
      </td>
      <td style="width:33%;padding:6px 10px">
        <div style="background:#f0faf4;border:1px solid #1a5c34;border-radius:6px;padding:8px 10px">
          <div style="font-size:8px;font-weight:bold;text-transform:uppercase;color:#555;letter-spacing:1px;margin-bottom:3px">Motorista</div>
          <div style="font-weight:900;font-size:11px;text-transform:uppercase;color:#1a5c34">${doc.motorista || '—'}</div>
        </div>
      </td>
    </tr>
  </table>
  <div style="text-align:center;margin-top:6px;font-size:8px;color:#aaa">
    EDI – Gestão de Madeiras | Emitido em ${new Date().toLocaleDateString('pt-BR')}
  </div>
</div>

</div><!-- end page -->
</body>
</html>`);

    win.document.close();
  };

  return (
    <div className="space-y-5 pb-32">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/relatorios" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-green-800 capitalize">
              {type === 'pedido' ? 'Pedido' : 'Romaneio'} — Nº {doc.number}
            </h1>
            <p className="text-xs text-gray-400 uppercase tracking-widest">
              {id ? 'Editando' : 'Novo documento'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md transition-all active:scale-95"
          >
            <Share2 className="w-4 h-4" /> Compartilhar
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-green-700 text-white rounded-xl text-sm font-bold hover:bg-green-800 shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-bold hover:bg-gray-900 shadow-md transition-all active:scale-95"
          >
            <Save className="w-4 h-4" /> Salvar
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nº Documento</label>
          <input value={doc.number || ''} onChange={e => setDoc(p => ({ ...p, number: e.target.value }))}
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data</label>
          <input type="date" value={doc.date || ''} onChange={e => setDoc(p => ({ ...p, date: e.target.value }))}
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none" />
        </div>
        <div className="space-y-1 lg:col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {type === 'pedido' ? 'Destinatário' : 'Cliente'}
            </label>
            <Link to="/clientes" className="text-[9px] font-bold text-green-700 hover:underline flex items-center gap-1">
              <Plus className="w-2.5 h-2.5" /> Cadastrar
            </Link>
          </div>
          <select value={doc.clientId || ''} onChange={e => handleClientSelect(e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none">
            <option value="">— Selecionar —</option>
            {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {!doc.clientId && (
            <input value={doc.clientName || ''} onChange={e => setDoc(p => ({ ...p, clientName: e.target.value }))}
              placeholder="Ou digitar nome manualmente..."
              className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none" />
          )}
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fornecedor / Fábrica</label>
          <input value={doc.supplier || ''} onChange={e => setDoc(p => ({ ...p, supplier: e.target.value }))}
            placeholder="Nome da fábrica..."
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none" />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Condição Pagamento</label>
          <input value={doc.paymentTerms || ''} onChange={e => setDoc(p => ({ ...p, paymentTerms: e.target.value }))}
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none" />
        </div>

        {type === 'romaneio' && <>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Frete (R$)</label>
            <input type="number" value={doc.freight || ''} onChange={e => setDoc(p => ({ ...p, freight: parseFloat(e.target.value) || 0 }))}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Comissão (%)</label>
            <input type="number" value={doc.commissionPct ?? ''} onChange={e => setDoc(p => ({ ...p, commissionPct: parseFloat(e.target.value) || 0 }))}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acerto escritório (R$)</label>
            <input type="number" value={doc.settlement || ''} onChange={e => setDoc(p => ({ ...p, settlement: parseFloat(e.target.value) || 0 }))}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none" />
          </div>
        </>}

        <div className="space-y-1 md:col-span-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Observações</label>
          <textarea value={doc.notes || ''} onChange={e => setDoc(p => ({ ...p, notes: e.target.value }))}
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none resize-none" rows={2} />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome do Motorista</label>
          <input value={doc.motorista || ''} onChange={e => setDoc(p => ({ ...p, motorista: e.target.value }))}
            placeholder="Ex: João da Silva"
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none" />
        </div>
      </div>

      {/* Calculator */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm overflow-x-auto">
        <TimberCalculator items={doc.items || []} onChange={items => setDoc(p => ({ ...p, items }))} />
      </div>

      {/* Live totals */}
      <div className="bg-green-700 text-white rounded-xl p-4 shadow-md">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
          <div>
            <p className="text-green-300 text-xs font-bold uppercase tracking-wider">Total M³</p>
            <p className="text-xl font-black">{totals.m3.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-green-300 text-xs font-bold uppercase tracking-wider">Subtotal</p>
            <p className="text-xl font-black">{fmt(totals.subtotal)}</p>
          </div>
          {type === 'romaneio' && (doc.freight || 0) > 0 && (
            <div>
              <p className="text-green-300 text-xs font-bold uppercase tracking-wider">– Frete</p>
              <p className="text-xl font-black text-red-300">{fmt(doc.freight || 0)}</p>
            </div>
          )}
          {type === 'romaneio' && commission > 0 && (
            <div>
              <p className="text-green-300 text-xs font-bold uppercase tracking-wider">– Comissão</p>
              <p className="text-xl font-black text-red-300">{fmt(commission)}</p>
            </div>
          )}
          <div>
            <p className="text-green-300 text-xs font-bold uppercase tracking-wider">Total a Pagar</p>
            <p className="text-2xl font-black text-yellow-300">{fmt(total)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleShare}
            className="py-3 bg-blue-600 text-white rounded-lg font-black text-sm hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" /> Compartilhar
          </button>
          <button onClick={handlePrint}
            className="py-3 bg-white text-green-800 rounded-lg font-black text-sm hover:bg-green-50 active:scale-95 transition-all flex items-center justify-center gap-2">
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </button>
        </div>
      </div>
    </div>
  );
};

const TH = 'border:1px solid #2d7a4f;padding:4px 5px;text-align:center;font-weight:bold;font-size:11px';
const TD = 'border:1px solid #ccc;padding:3px 5px;text-align:center;font-size:11px';
const SUMTD = 'border:1px solid #ddd;padding:6px 12px;font-size:12px';
