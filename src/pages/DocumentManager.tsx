import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { Document, TimberItem } from '../types';
import { TimberCalculator } from '../components/TimberCalculator';
import { exportToPDF } from '../lib/pdf';
import { calcDerived } from '../lib/calc';
import { ArrowLeft, Save, Printer, Download, Plus, Calendar } from 'lucide-react';
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
        ? 'O FRETE SERÁ PAGO À VISTA AO TRANSPORTADOR NO ATO DA DESCARGA, DEDUZIDO DO MATERIAL.\nMANDAR O PAGAMENTO DA MADEIRA PELO MOTORISTA.'
        : '',
  });

  useEffect(() => {
    if (id) {
      const ex = state.documents.find(d => d.id === id);
      if (ex) setDoc(ex);
    }
  }, [id]);

  // ── Computed totals ──────────────────────────────────────────────────────
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

  const commission =
    doc.commissionPct ? totals.subtotal * (doc.commissionPct / 100) : 0;

  const total =
    type === 'romaneio'
      ? totals.subtotal + (doc.freight || 0) - commission - (doc.settlement || 0)
      : totals.subtotal;

  // ── Client data ──────────────────────────────────────────────────────────
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

  // ── Save ─────────────────────────────────────────────────────────────────
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

  const displayDate =
    doc.date && !isNaN(new Date(doc.date).getTime())
      ? format(new Date(doc.date + 'T12:00:00'), 'dd/MM/yyyy')
      : '—';

  const s = state.settings;

  return (
    <div className="space-y-6 pb-32">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <Link
            to="/relatorios"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
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
            onClick={() => exportToPDF('print-document', `${type}-${doc.number}.pdf`)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 bg-white rounded-lg text-xs font-bold hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 bg-white rounded-lg text-xs font-bold hover:bg-gray-50"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 bg-green-700 text-white rounded-lg text-xs font-bold hover:bg-green-800 shadow-md transition-all"
          >
            <Save className="w-3.5 h-3.5" /> Salvar
          </button>
        </div>
      </div>

      {/* ── Form controls (no-print) ── */}
      <div className="no-print bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shadow-sm">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Nº Documento
          </label>
          <input
            value={doc.number || ''}
            onChange={e => setDoc(p => ({ ...p, number: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Data
          </label>
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
              {type === 'pedido' ? 'Fornecedor / Destinatário' : 'Cliente'}
            </label>
            <Link
              to="/clientes"
              className="text-[9px] font-bold text-green-700 hover:underline flex items-center gap-1"
            >
              <Plus className="w-2.5 h-2.5" /> Cadastrar
            </Link>
          </div>
          <select
            value={doc.clientId || ''}
            onChange={e => handleClientSelect(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none"
          >
            <option value="">— Selecionar cadastrado —</option>
            {state.clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
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
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Fornecedor / Fábrica
            </label>
            <input
              value={doc.supplier || ''}
              onChange={e => setDoc(p => ({ ...p, supplier: e.target.value }))}
              placeholder="Nome da fábrica/fornecedor..."
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none"
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Condição Pagamento
          </label>
          <input
            value={doc.paymentTerms || ''}
            onChange={e => setDoc(p => ({ ...p, paymentTerms: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none"
          />
        </div>
      </div>

      {/* ── PRINTABLE DOCUMENT ── */}
      <div
        id="print-document"
        className="doc-container bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="border-b-2 border-gray-300 p-4 flex items-start justify-between gap-4" style={{ background: '#f9f9f9' }}>
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl border-2 border-gray-300 bg-white flex-shrink-0"
            >
              🌲
            </div>
            <div className="text-[11px] leading-snug">
              <p className="text-base font-black text-green-800 uppercase">{s.companyName}</p>
              <p className="font-bold text-gray-600 uppercase">{s.companyNeighborhood}</p>
              <p className="text-gray-600">{s.companyAddress}, {s.companyCity}</p>
              <p className="text-gray-600">TEL: {s.companyPhone} | CEP: {s.companyCEP}</p>
              <p className="text-gray-600">CNPJ: {s.companyCNPJ}</p>
              <p className="text-gray-600">EMAIL: {s.companyEmail}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div
              className="inline-block px-4 py-1 text-white text-sm font-black uppercase rounded mb-2"
              style={{ background: '#1a5c34' }}
            >
              {type}
            </div>
            <p className="text-xs font-bold text-gray-600">
              DATA DE EMISSÃO: <span className="text-gray-900">{displayDate}</span>
            </p>
            <p className="text-xs font-bold text-gray-600">
              DOCUMENTO Nº: <span className="text-green-800 text-sm">{doc.number}</span>
            </p>
          </div>
        </div>

        {/* Client data */}
        <div className="border-b border-gray-300 px-4 py-3 grid grid-cols-2 gap-4 text-[11px]" style={{ background: '#fefefe' }}>
          <div className="space-y-0.5">
            <p>
              <span className="font-bold">CLIENTE: </span>
              <span className="uppercase font-bold text-gray-900">
                {doc.clientData?.name || doc.clientName || '—'}
              </span>
            </p>
            {(doc.clientData?.address || selectedClient?.address) && (
              <p>
                <span className="font-bold">ENDEREÇO: </span>
                {doc.clientData?.address || selectedClient?.address}
              </p>
            )}
            {(doc.clientData?.neighborhood || selectedClient?.neighborhood) && (
              <p>
                <span className="font-bold">BAIRRO: </span>
                {doc.clientData?.neighborhood || selectedClient?.neighborhood}
              </p>
            )}
            {(doc.clientData?.city || selectedClient?.city) && (
              <p>
                <span className="font-bold">MUNICÍPIO: </span>
                {doc.clientData?.city || selectedClient?.city}
              </p>
            )}
            {(doc.clientData?.state || selectedClient?.state) && (
              <p>
                <span className="font-bold">ESTADO: </span>
                {doc.clientData?.state || selectedClient?.state}
              </p>
            )}
            {(doc.clientData?.cep || selectedClient?.cep) && (
              <p>
                <span className="font-bold">CEP: </span>
                {doc.clientData?.cep || selectedClient?.cep}
              </p>
            )}
            {(doc.clientData?.cnpj || selectedClient?.cnpj) && (
              <p>
                <span className="font-bold">CNPJ/CPF: </span>
                {doc.clientData?.cnpj || selectedClient?.cnpj}
              </p>
            )}
            {(doc.clientData?.ie || selectedClient?.ie) && (
              <p>
                <span className="font-bold">INS. ESTADUAL: </span>
                {doc.clientData?.ie || selectedClient?.ie}
              </p>
            )}
          </div>
          <div className="space-y-0.5">
            {type === 'pedido' && doc.supplier && (
              <p>
                <span className="font-bold">FORNECEDOR/PINUS: </span>
                {doc.supplier}
              </p>
            )}
            <p>
              <span className="font-bold">COND. DE PGT: </span>
              {doc.paymentTerms || '—'}
            </p>
            {(doc.clientData?.phone || selectedClient?.phone) && (
              <p>
                <span className="font-bold">FONE: </span>
                {doc.clientData?.phone || selectedClient?.phone}
              </p>
            )}
            <p>
              <span className="font-bold">FRETE: </span>
              {type === 'romaneio' ? 'INCLUSO' : 'A COMBINAR'}
            </p>
          </div>
        </div>

        {/* Notes top */}
        {doc.notes && (
          <div
            className="px-4 py-2 border-b border-gray-300 text-[10px] text-center font-bold text-red-700 uppercase"
            style={{ background: '#fff8f8' }}
          >
            OBS.: {doc.notes.split('\n').map((line, i) => (
              <span key={i}>{line}<br /></span>
            ))}
          </div>
        )}

        {/* Payment terms label */}
        {doc.paymentTerms && (
          <div className="px-4 py-1 border-b border-gray-300 text-[10px] text-gray-600">
            <span className="font-bold">Condição de pagamento:</span> {doc.paymentTerms}
          </div>
        )}

        {/* Table */}
        <div className="px-4 py-4">
          <TimberCalculator
            items={doc.items || []}
            onChange={items => setDoc(p => ({ ...p, items }))}
          />
        </div>

        {/* Totals footer */}
        <div className="border-t-2 border-gray-300 px-4 py-4 flex flex-col md:flex-row justify-between gap-6">
          {/* Notes (editable) */}
          <div className="flex-1 no-print">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
              Observações
            </label>
            <textarea
              value={doc.notes || ''}
              onChange={e => setDoc(p => ({ ...p, notes: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg text-xs leading-relaxed outline-none focus:border-green-600 min-h-[80px] resize-none"
            />
          </div>

          {/* Romaneio extra fields */}
          {type === 'romaneio' && (
            <div className="no-print grid grid-cols-2 gap-3 self-start">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  Frete (R$)
                </label>
                <input
                  type="number"
                  value={doc.freight || ''}
                  onChange={e => setDoc(p => ({ ...p, freight: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  Comissão (%)
                </label>
                <input
                  type="number"
                  value={doc.commissionPct ?? ''}
                  onChange={e => setDoc(p => ({ ...p, commissionPct: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  Acerto escritório (R$)
                </label>
                <input
                  type="number"
                  value={doc.settlement || ''}
                  onChange={e => setDoc(p => ({ ...p, settlement: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          )}

          {/* Summary box */}
          <div className="w-full md:w-72 border-2 border-gray-300 rounded-xl overflow-hidden text-sm">
            <div className="px-4 py-2 bg-gray-100 flex justify-between font-bold text-gray-700 border-b border-gray-300">
              <span>Total em M³</span>
              <span className="text-green-800">{totals.m3.toFixed(4)} m³</span>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="px-4 py-2 flex justify-between text-gray-700">
                <span>Subtotal Madeira</span>
                <span className="font-bold">{fmt(totals.subtotal)}</span>
              </div>
              {type === 'romaneio' && (
                <>
                  <div className="px-4 py-2 flex justify-between text-blue-700">
                    <span>+ Frete</span>
                    <span className="font-bold">{fmt(doc.freight || 0)}</span>
                  </div>
                  <div className="px-4 py-2 flex justify-between text-amber-700">
                    <span>– Comissão ({doc.commissionPct}%)</span>
                    <span className="font-bold">{fmt(commission)}</span>
                  </div>
                  <div className="px-4 py-2 flex justify-between text-red-700">
                    <span>– Acerto escritório</span>
                    <span className="font-bold">{fmt(doc.settlement || 0)}</span>
                  </div>
                </>
              )}
              <div
                className="px-4 py-3 flex justify-between font-black text-white text-base"
                style={{ background: '#1a5c34' }}
              >
                <span>TOTAL A PAGAR</span>
                <span>{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
