import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { Document } from '../types';
import { TimberCalculator } from '../components/TimberCalculator';
import { calcDerived } from '../lib/calc';
import { ArrowLeft, Save, Printer, Plus } from 'lucide-react';
import { format } from 'date-fns';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const DocumentManager: React.FC<{ type: 'pedido' | 'romaneio' }> = ({ type }) => {
  const { state, saveDocument } = useApp();
  const navigate = useNavigate();
  const { id } = useParams();

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

  // Build complete print HTML with portrait A4, pure hex styles
  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) {
      alert('Pop-up bloqueado. Permita pop-ups para este site e tente novamente.');
      return;
    }

    const tableRows = rows.map(({ item, d }, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f7faf8'}">
        <td style="${TD}">${item.espessura}</td>
        <td style="${TD}">${item.largura}</td>
        <td style="${TD};background:#f0faf4">${item.c3 || ''}</td>
        <td style="${TD};background:#f0faf4">${item.c4 || ''}</td>
        <td style="${TD};background:#f0faf4">${item.c5 || ''}</td>
        <td style="${TD};background:#f0faf4">${item.c6 || ''}</td>
        <td style="${TD};font-weight:bold">${d.qtyTotal || ''}</td>
        <td style="${TD}">${d.linearMeters.toFixed(3)}</td>
        <td style="${TD};font-weight:bold">${item.pricePerM3 ? fmt(item.pricePerM3) : ''}</td>
        <td style="${TD};font-style:italic">${d.avgLength.toFixed(2)}</td>
        <td style="${TD};font-weight:bold;color:#1a5c34">${d.finalM3.toFixed(4)}</td>
        <td style="${TD};font-weight:bold;text-align:right">${fmt(d.value)}</td>
      </tr>
    `).join('');

    const emptyRows = rows.length < 6
      ? Array.from({ length: 6 - rows.length }).map((_, i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f7faf8'}">
          ${Array.from({ length: 12 }).map(() => `<td style="${TD};height:20px"></td>`).join('')}
        </tr>
      `).join('')
      : '';

    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${type.toUpperCase()} Nº ${doc.number}</title>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #000; background: #fff; padding: 0; }
  table { border-collapse: collapse; width: 100%; }
  @media screen {
    body { padding: 16px; max-width: 800px; margin: 0 auto; }
    .print-btn {
      display: block; width: 100%; padding: 14px;
      background: #1a5c34; color: #fff; font-size: 16px; font-weight: bold;
      border: none; border-radius: 8px; cursor: pointer; margin-bottom: 16px;
    }
  }
  @media print {
    .print-btn { display: none !important; }
    body { padding: 0; font-size: 9px; }
  }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">⬇️ Salvar como PDF / Imprimir</button>

<!-- HEADER -->
<table style="margin-bottom:6px">
  <tr>
    <td style="width:65%;vertical-align:top;padding-right:8px">
      <div style="font-size:14px;font-weight:900;color:#1a5c34;text-transform:uppercase">${s.companyName}</div>
      <div style="font-weight:bold;color:#555;text-transform:uppercase;font-size:10px">${s.companyNeighborhood}</div>
      <div style="color:#444;font-size:10px">${s.companyAddress} — ${s.companyCity}</div>
      <div style="color:#444;font-size:10px">TEL: ${s.companyPhone} | CEP: ${s.companyCEP}</div>
      <div style="color:#444;font-size:10px">CNPJ: ${s.companyCNPJ} | EMAIL: ${s.companyEmail}</div>
    </td>
    <td style="vertical-align:top;text-align:right">
      <div style="display:inline-block;background:#1a5c34;color:#fff;font-weight:900;font-size:16px;padding:4px 14px;text-transform:uppercase;border-radius:4px;margin-bottom:4px">${type.toUpperCase()}</div>
      <div style="color:#555;font-weight:bold;font-size:11px">DATA: ${displayDate}</div>
      <div style="color:#555;font-weight:bold;font-size:11px">Nº <span style="color:#1a5c34;font-size:14px">${doc.number}</span></div>
    </td>
  </tr>
</table>

<div style="border-top:2px solid #1a5c34;margin-bottom:6px"></div>

<!-- CLIENT -->
<table style="margin-bottom:6px;font-size:10px">
  <tr>
    <td style="width:55%;vertical-align:top;padding-right:8px">
      <div><strong>CLIENTE:</strong> <span style="text-transform:uppercase;font-weight:bold;font-size:11px">${doc.clientName || (client as any).name || '—'}</span></div>
      ${(client as any).address ? `<div><strong>ENDEREÇO:</strong> ${(client as any).address}${(client as any).neighborhood ? ', ' + (client as any).neighborhood : ''}</div>` : ''}
      ${(client as any).city ? `<div><strong>MUNICÍPIO:</strong> ${(client as any).city}${(client as any).state ? ' — ' + (client as any).state : ''}</div>` : ''}
      ${(client as any).cep ? `<div><strong>CEP:</strong> ${(client as any).cep}</div>` : ''}
      ${(client as any).cnpj ? `<div><strong>CNPJ/CPF:</strong> ${(client as any).cnpj}</div>` : ''}
      ${(client as any).ie ? `<div><strong>I.E.:</strong> ${(client as any).ie}</div>` : ''}
    </td>
    <td style="vertical-align:top">
      ${type === 'pedido' && doc.supplier ? `<div><strong>FORNECEDOR:</strong> ${doc.supplier}</div>` : ''}
      ${(client as any).phone ? `<div><strong>FONE:</strong> ${(client as any).phone}</div>` : ''}
      <div><strong>COND. PAGTO:</strong> ${doc.paymentTerms || '—'}</div>
      <div><strong>FRETE:</strong> ${type === 'romaneio' ? 'INCLUSO' : 'A COMBINAR'}</div>
    </td>
  </tr>
</table>

${doc.notes ? `<div style="background:#fff8f0;border:1px solid #f0a040;padding:4px 8px;font-size:9px;font-weight:bold;color:#c00;text-transform:uppercase;margin-bottom:6px;text-align:center">${doc.notes}</div>` : ''}

<!-- TABLE -->
<table style="margin-bottom:8px;font-size:9px">
  <thead>
    <tr style="background:#1a5c34;color:#fff">
      <th style="${TH}" rowspan="2">Bitola<br>(cm)</th>
      <th style="${TH}" rowspan="2">Larg.<br>(cm)</th>
      <th style="${TH};background:#155228" colspan="4">Comprimento (m)</th>
      <th style="${TH}" rowspan="2">Qtd<br>Pçs</th>
      <th style="${TH}" rowspan="2">Metros<br>Lin.</th>
      <th style="${TH}" rowspan="2">R$/m³</th>
      <th style="${TH}" rowspan="2">Méd.<br>Comp.</th>
      <th style="${TH};background:#2d7a4f" rowspan="2">M³</th>
      <th style="${TH};background:#b45309;color:#fff" rowspan="2">VALOR</th>
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
      <td colspan="6" style="${TD};text-align:right;color:#ccc;font-style:italic">Total em m³ →</td>
      <td style="${TD};text-align:center">${rows.reduce((s, r) => s + r.d.qtyTotal, 0)}</td>
      <td colspan="3" style="${TD}"></td>
      <td style="${TD};color:#90ee90;font-weight:bold;font-size:11px">${totals.m3.toFixed(4)}</td>
      <td style="${TD};color:#ffd700;font-weight:bold;font-size:11px;text-align:right">${fmt(totals.subtotal)}</td>
    </tr>
  </tfoot>
</table>

<!-- TOTALS -->
<table>
  <tr>
    <td style="width:50%;vertical-align:top;padding-right:12px;font-size:9px;color:#555">
      ${doc.notes ? `<strong>Obs.:</strong> ${doc.notes}` : ''}
    </td>
    <td style="vertical-align:top">
      <table style="border:1px solid #ccc;font-size:10px">
        <tr style="background:#f5f5f5">
          <td style="${SUMTD}">Total em M³</td>
          <td style="${SUMTD};font-weight:bold;color:#1a5c34;text-align:right">${totals.m3.toFixed(4)} m³</td>
        </tr>
        <tr>
          <td style="${SUMTD}">Subtotal Madeira</td>
          <td style="${SUMTD};font-weight:bold;text-align:right">${fmt(totals.subtotal)}</td>
        </tr>
        ${type === 'romaneio' ? `
        <tr style="background:#fff8f0">
          <td style="${SUMTD}">– Frete</td>
          <td style="${SUMTD};font-weight:bold;text-align:right;color:#b45309">${fmt(doc.freight || 0)}</td>
        </tr>
        <tr style="background:#fffbeb">
          <td style="${SUMTD}">– Comissão (${doc.commissionPct}%)</td>
          <td style="${SUMTD};font-weight:bold;text-align:right;color:#92400e">${fmt(commission)}</td>
        </tr>
        ${(doc.settlement || 0) > 0 ? `
        <tr style="background:#fff0f0">
          <td style="${SUMTD}">– Acerto escritório</td>
          <td style="${SUMTD};font-weight:bold;text-align:right;color:#b91c1c">${fmt(doc.settlement || 0)}</td>
        </tr>` : ''}` : ''}
        <tr style="background:#1a5c34">
          <td style="${SUMTD};color:#fff;font-weight:900;font-size:13px">TOTAL A PAGAR</td>
          <td style="${SUMTD};color:#fff;font-weight:900;font-size:14px;text-align:right">${fmt(total)}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
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

        {type === 'pedido' && (
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fornecedor / Fábrica</label>
            <input value={doc.supplier || ''} onChange={e => setDoc(p => ({ ...p, supplier: e.target.value }))}
              placeholder="Nome da fábrica..." className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none" />
          </div>
        )}

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

        <div className="space-y-1 md:col-span-2 lg:col-span-4">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Observações</label>
          <textarea value={doc.notes || ''} onChange={e => setDoc(p => ({ ...p, notes: e.target.value }))}
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none resize-none" rows={2} />
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
          {type === 'romaneio' && <>
            <div>
              <p className="text-green-300 text-xs font-bold uppercase tracking-wider">– Frete + Comissão</p>
              <p className="text-xl font-black text-red-300">{fmt((doc.freight || 0) + commission)}</p>
            </div>
          </>}
          <div>
            <p className="text-green-300 text-xs font-bold uppercase tracking-wider">Total a Pagar</p>
            <p className="text-2xl font-black text-yellow-300">{fmt(total)}</p>
          </div>
        </div>
        <button onClick={handlePrint}
          className="w-full py-3 bg-white text-green-800 rounded-lg font-black text-base hover:bg-green-50 active:scale-95 transition-all flex items-center justify-center gap-2">
          <Printer className="w-5 h-5" /> Imprimir / Salvar PDF
        </button>
      </div>
    </div>
  );
};

const TH = 'border:1px solid #2d7a4f;padding:3px 4px;text-align:center;font-weight:bold;font-size:9px';
const TD = 'border:1px solid #ccc;padding:2px 4px;text-align:center;font-size:9px';
const SUMTD = 'border:1px solid #ddd;padding:5px 10px;font-size:10px';
