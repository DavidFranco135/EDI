import React, { useState, useEffect, useMemo, useRef } from 'react';
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

// Pure inline-style print component — zero Tailwind, zero oklch
const PrintDocument: React.FC<{
  doc: Partial<Document>;
  totals: { m3: number; subtotal: number };
  commission: number;
  total: number;
  type: 'pedido' | 'romaneio';
  settings: any;
  selectedClient: any;
}> = ({ doc, totals, commission, total, type, settings: s, selectedClient }) => {
  const displayDate =
    doc.date && !isNaN(new Date(doc.date).getTime())
      ? format(new Date(doc.date + 'T12:00:00'), 'dd/MM/yyyy')
      : '—';

  const client = doc.clientData || selectedClient || {};

  const rows = (doc.items || []).map(item => {
    const d = calcDerived(item);
    return { item, d };
  });

  return (
    <div style={{
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '10px',
      color: '#000',
      background: '#fff',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      {/* ── HEADER ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'top', width: '60%' }}>
              <div style={{ fontSize: '13px', fontWeight: '900', color: '#1a5c34', textTransform: 'uppercase' }}>
                {s.companyName}
              </div>
              <div style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#555' }}>{s.companyNeighborhood}</div>
              <div style={{ color: '#444' }}>{s.companyAddress} — {s.companyCity}</div>
              <div style={{ color: '#444' }}>TEL: {s.companyPhone} | CEP: {s.companyCEP}</div>
              <div style={{ color: '#444' }}>CNPJ: {s.companyCNPJ} | EMAIL: {s.companyEmail}</div>
            </td>
            <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
              <div style={{
                display: 'inline-block',
                background: '#1a5c34',
                color: '#fff',
                fontWeight: '900',
                fontSize: '14px',
                padding: '3px 12px',
                textTransform: 'uppercase',
                borderRadius: '4px',
                marginBottom: '4px',
              }}>
                {type}
              </div>
              <div style={{ color: '#555', fontWeight: 'bold' }}>DATA: {displayDate}</div>
              <div style={{ color: '#555', fontWeight: 'bold' }}>Nº <span style={{ color: '#1a5c34', fontSize: '12px' }}>{doc.number}</span></div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── DIVIDER ── */}
      <div style={{ borderTop: '2px solid #1a5c34', marginBottom: '4px' }} />

      {/* ── CLIENT DATA ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px', fontSize: '10px' }}>
        <tbody>
          <tr>
            <td style={{ width: '55%', verticalAlign: 'top', paddingRight: '8px' }}>
              <div><strong>CLIENTE:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{doc.clientName || client.name || '—'}</span></div>
              {client.address && <div><strong>ENDEREÇO:</strong> {client.address}{client.neighborhood ? `, ${client.neighborhood}` : ''}</div>}
              {client.city && <div><strong>MUNICÍPIO:</strong> {client.city}{client.state ? ` — ${client.state}` : ''}</div>}
              {client.cep && <div><strong>CEP:</strong> {client.cep}</div>}
              {client.cnpj && <div><strong>CNPJ/CPF:</strong> {client.cnpj}</div>}
              {client.ie && <div><strong>I.E.:</strong> {client.ie}</div>}
            </td>
            <td style={{ verticalAlign: 'top' }}>
              {type === 'pedido' && doc.supplier && <div><strong>FORNECEDOR/PINUS:</strong> {doc.supplier}</div>}
              {client.phone && <div><strong>FONE:</strong> {client.phone}</div>}
              <div><strong>COND. PAGTO:</strong> {doc.paymentTerms || '—'}</div>
              <div><strong>FRETE:</strong> {type === 'romaneio' ? 'INCLUSO' : 'A COMBINAR'}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── NOTES ── */}
      {doc.notes && (
        <div style={{
          background: '#fff8f0',
          border: '1px solid #f0a040',
          padding: '3px 6px',
          fontSize: '9px',
          fontWeight: 'bold',
          color: '#c00',
          textTransform: 'uppercase',
          marginBottom: '4px',
          textAlign: 'center',
        }}>
          {doc.notes.split('\n').map((l, i) => <span key={i}>{l}{i < doc.notes!.split('\n').length - 1 ? ' — ' : ''}</span>)}
        </div>
      )}

      {/* ── TABLE ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', fontSize: '9.5px' }}>
        <thead>
          <tr style={{ background: '#1a5c34', color: '#fff' }}>
            <th style={TH} rowSpan={2}>Bitola<br />(cm)</th>
            <th style={TH} rowSpan={2}>Largura<br />(cm)</th>
            <th style={{ ...TH, background: '#155228' }} colSpan={4}>Comprimento (m)</th>
            <th style={TH} rowSpan={2}>Quant<br />Pçs</th>
            <th style={TH} rowSpan={2}>Metros<br />Lineares</th>
            <th style={TH} rowSpan={2}>Valor<br />m³ (R$)</th>
            <th style={TH} rowSpan={2}>Média<br />Comp.</th>
            <th style={{ ...TH, background: '#2d7a4f' }} rowSpan={2}>M³</th>
            <th style={{ ...TH, background: '#f59e0b', color: '#000' }} rowSpan={2}>VALOR</th>
          </tr>
          <tr style={{ background: '#2d7a4f', color: '#fff' }}>
            {['3,00', '4,00', '5,00', '6,00'].map(l => (
              <th key={l} style={TH}>{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ item, d }, i) => (
            <tr key={item.id} style={{ background: i % 2 === 0 ? '#fff' : '#f7faf8' }}>
              <td style={TD}>{item.espessura}</td>
              <td style={TD}>{item.largura}</td>
              <td style={{ ...TD, background: '#f0faf4' }}>{item.c3 || ''}</td>
              <td style={{ ...TD, background: '#f0faf4' }}>{item.c4 || ''}</td>
              <td style={{ ...TD, background: '#f0faf4' }}>{item.c5 || ''}</td>
              <td style={{ ...TD, background: '#f0faf4' }}>{item.c6 || ''}</td>
              <td style={{ ...TD, fontWeight: 'bold' }}>{d.qtyTotal || ''}</td>
              <td style={TD}>{d.linearMeters.toFixed(3)}</td>
              <td style={{ ...TD, fontWeight: 'bold' }}>{item.pricePerM3 ? fmt(item.pricePerM3) : ''}</td>
              <td style={{ ...TD, fontStyle: 'italic' }}>{d.avgLength.toFixed(2)}</td>
              <td style={{ ...TD, fontWeight: 'bold', color: '#1a5c34' }}>{d.finalM3.toFixed(4)}</td>
              <td style={{ ...TD, fontWeight: 'bold', textAlign: 'right' }}>{fmt(d.value)}</td>
            </tr>
          ))}
          {/* Empty rows to fill space */}
          {rows.length < 8 && Array.from({ length: 8 - rows.length }).map((_, i) => (
            <tr key={`empty-${i}`} style={{ background: i % 2 === 0 ? '#fff' : '#f7faf8' }}>
              {Array.from({ length: 12 }).map((_, j) => (
                <td key={j} style={{ ...TD, height: '18px' }}></td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#1a5c34', color: '#fff', fontWeight: 'bold' }}>
            <td colSpan={6} style={{ ...TD, textAlign: 'right', fontStyle: 'italic', color: '#ccc' }}>Total em m³ →</td>
            <td style={{ ...TD, textAlign: 'center' }}>{rows.reduce((s, r) => s + r.d.qtyTotal, 0)}</td>
            <td colSpan={3} style={TD}></td>
            <td style={{ ...TD, color: '#90ee90', fontWeight: 'bold', fontSize: '11px' }}>{totals.m3.toFixed(4)}</td>
            <td style={{ ...TD, color: '#ffd700', fontWeight: 'bold', fontSize: '11px', textAlign: 'right' }}>{fmt(totals.subtotal)}</td>
          </tr>
        </tfoot>
      </table>

      {/* ── TOTALS BOX ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
        <tbody>
          <tr>
            {/* Left: empty or notes reprint */}
            <td style={{ verticalAlign: 'top', width: '55%', paddingRight: '12px', fontSize: '9px', color: '#555' }}>
              {doc.notes && (
                <div style={{ marginTop: '4px' }}>
                  <strong>Obs.:</strong> {doc.notes}
                </div>
              )}
            </td>
            {/* Right: financial summary */}
            <td style={{ verticalAlign: 'top' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
                <tbody>
                  <tr style={{ background: '#f5f5f5' }}>
                    <td style={SUMTD}>Total em M³</td>
                    <td style={{ ...SUMTD, fontWeight: 'bold', color: '#1a5c34', textAlign: 'right' }}>{totals.m3.toFixed(4)} m³</td>
                  </tr>
                  <tr>
                    <td style={SUMTD}>Subtotal Madeira</td>
                    <td style={{ ...SUMTD, fontWeight: 'bold', textAlign: 'right' }}>{fmt(totals.subtotal)}</td>
                  </tr>
                  {type === 'romaneio' && (
                    <>
                      <tr style={{ background: '#fff8f0' }}>
                        <td style={SUMTD}>– Frete</td>
                        <td style={{ ...SUMTD, fontWeight: 'bold', textAlign: 'right', color: '#b45309' }}>{fmt(doc.freight || 0)}</td>
                      </tr>
                      <tr style={{ background: '#fffbeb' }}>
                        <td style={SUMTD}>– Comissão ({doc.commissionPct}%)</td>
                        <td style={{ ...SUMTD, fontWeight: 'bold', textAlign: 'right', color: '#92400e' }}>{fmt(commission)}</td>
                      </tr>
                      {(doc.settlement || 0) > 0 && (
                        <tr style={{ background: '#fff0f0' }}>
                          <td style={SUMTD}>– Acerto escritório</td>
                          <td style={{ ...SUMTD, fontWeight: 'bold', textAlign: 'right', color: '#b91c1c' }}>{fmt(doc.settlement || 0)}</td>
                        </tr>
                      )}
                    </>
                  )}
                  <tr style={{ background: '#1a5c34' }}>
                    <td style={{ ...SUMTD, color: '#fff', fontWeight: '900', fontSize: '12px' }}>TOTAL A PAGAR</td>
                    <td style={{ ...SUMTD, color: '#fff', fontWeight: '900', fontSize: '13px', textAlign: 'right' }}>{fmt(total)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const TH: React.CSSProperties = {
  border: '1px solid #2d7a4f',
  padding: '3px 4px',
  textAlign: 'center',
  fontWeight: 'bold',
  fontSize: '9px',
};

const TD: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '2px 4px',
  textAlign: 'center',
};

const SUMTD: React.CSSProperties = {
  border: '1px solid #ddd',
  padding: '4px 8px',
  fontSize: '10px',
};

// ── Main Component ──────────────────────────────────────────────────────────

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
      clientName: doc.clientName || doc.clientData?.name || '—',
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) return;

    const content = document.getElementById('print-area')?.innerHTML || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8"/>
        <title>${type.toUpperCase()} Nº ${doc.number}</title>
        <style>
          @page { size: A4 landscape; margin: 8mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 10px; background: #fff; color: #000; }
          table { border-collapse: collapse; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        ${content}
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const s = state.settings;

  return (
    <div className="space-y-6 pb-32">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <Link to="/relatorios" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-green-800 capitalize">
              {type === 'pedido' ? 'Pedido' : 'Romaneio'} — Nº {doc.number}
            </h1>
            <p className="text-xs text-gray-400 uppercase tracking-widest">
              {id ? 'Editando documento existente' : 'Novo documento'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-700 text-white rounded-lg text-xs font-bold hover:bg-green-800 shadow"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-900 shadow"
          >
            <Save className="w-3.5 h-3.5" /> Salvar
          </button>
        </div>
      </div>

      {/* ── Form controls ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shadow-sm">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nº Documento</label>
          <input
            value={doc.number || ''}
            onChange={e => setDoc(p => ({ ...p, number: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data</label>
          <input
            type="date"
            value={doc.date || ''}
            onChange={e => setDoc(p => ({ ...p, date: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none"
          />
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
          <select
            value={doc.clientId || ''}
            onChange={e => handleClientSelect(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none"
          >
            <option value="">— Selecionar —</option>
            {state.clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {!doc.clientId && (
            <input
              value={doc.clientName || ''}
              onChange={e => setDoc(p => ({ ...p, clientName: e.target.value }))}
              placeholder="Ou digitar nome manualmente..."
              className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none"
            />
          )}
        </div>

        {type === 'pedido' && (
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fornecedor / Fábrica</label>
            <input
              value={doc.supplier || ''}
              onChange={e => setDoc(p => ({ ...p, supplier: e.target.value }))}
              placeholder="Nome da fábrica..."
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none"
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Condição Pagamento</label>
          <input
            value={doc.paymentTerms || ''}
            onChange={e => setDoc(p => ({ ...p, paymentTerms: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none"
          />
        </div>

        {type === 'romaneio' && (
          <>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Frete (R$)</label>
              <input
                type="number"
                value={doc.freight || ''}
                onChange={e => setDoc(p => ({ ...p, freight: parseFloat(e.target.value) || 0 }))}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Comissão (%)</label>
              <input
                type="number"
                value={doc.commissionPct ?? ''}
                onChange={e => setDoc(p => ({ ...p, commissionPct: parseFloat(e.target.value) || 0 }))}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acerto escritório (R$)</label>
              <input
                type="number"
                value={doc.settlement || ''}
                onChange={e => setDoc(p => ({ ...p, settlement: parseFloat(e.target.value) || 0 }))}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none"
              />
            </div>
          </>
        )}

        <div className="space-y-1 md:col-span-2 lg:col-span-4">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Observações</label>
          <textarea
            value={doc.notes || ''}
            onChange={e => setDoc(p => ({ ...p, notes: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none resize-none"
            rows={2}
          />
        </div>
      </div>

      {/* ── Calculator ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <TimberCalculator
          items={doc.items || []}
          onChange={items => setDoc(p => ({ ...p, items }))}
        />
      </div>

      {/* ── Live totals preview ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-center justify-end text-sm">
          <span className="text-gray-500">Total M³: <strong className="text-green-700">{totals.m3.toFixed(4)}</strong></span>
          <span className="text-gray-500">Subtotal: <strong>{fmt(totals.subtotal)}</strong></span>
          {type === 'romaneio' && <>
            <span className="text-gray-500">– Frete: <strong className="text-orange-600">{fmt(doc.freight || 0)}</strong></span>
            <span className="text-gray-500">– Comissão: <strong className="text-amber-600">{fmt(commission)}</strong></span>
          </>}
          <span className="bg-green-700 text-white font-black px-4 py-2 rounded-lg text-base">
            Total: {fmt(total)}
          </span>
        </div>
      </div>

      {/* ── Hidden print area ── */}
      <div id="print-area" style={{ display: 'none' }}>
        <PrintDocument
          doc={doc}
          totals={totals}
          commission={commission}
          total={total}
          type={type}
          settings={s}
          selectedClient={selectedClient}
        />
      </div>
    </div>
  );
};
