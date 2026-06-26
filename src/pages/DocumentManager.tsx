import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { Document, Bloco, TimberItem } from '../types';
import { TimberCalculator } from '../components/TimberCalculator';
import { ChequeTable } from '../components/ChequeTable';
import { Cheque } from '../lib/cheques';
import { calcDerived } from '../lib/calc';
import { buildDocHTML } from '../lib/docHTML';
import { ArrowLeft, Save, Printer, Plus, Share2, Trash2, ChevronDown, ChevronUp, Building2, Leaf } from 'lucide-react';
import { format } from 'date-fns';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function newBloco(label = ''): Bloco {
  return {
    id: Math.random().toString(36).slice(2, 9),
    label,
    clientName: '',
    clientId: '',
    items: [],
  };
}

function calcBlocoTotals(bloco: Bloco) {
  return bloco.items.reduce(
    (acc, item) => {
      const d = calcDerived(item);
      acc.m3 += d.finalM3;
      acc.subtotal += d.value;
      return acc;
    },
    { m3: 0, subtotal: 0 }
  );
}

export const DocumentManager: React.FC<{ type: 'pedido' | 'romaneio' }> = ({ type }) => {
  const { state, saveDocument } = useApp();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const fromPedidoId = searchParams.get('from');

  const nextNumber = () =>
    (state.documents.filter(d => d.type === type).length + 1)
      .toString().padStart(3, '0');

  const [doc, setDoc] = useState<Partial<Document>>({
    type,
    number: nextNumber(),
    date: new Date().toISOString().split('T')[0],
    clientId: '',
    clientName: '',
    supplier: '',
    blocos: [newBloco('Principal')],
    items: [],
    subtotal: 0,
    totalM3: 0,
    total: 0,
    freight: 0,
    commissionPct: state.settings.defaultCommissionPct,
    commissionValue: 0,
    settlement: 0,
    motorista: '',
    status: 'andamento',
    paymentTerms: 'À VISTA',
    cheques: [],
    notes: type === 'romaneio'
      ? 'O FRETE SERÁ PAGO À VISTA AO TRANSPORTADOR NO ATO DA DESCARGA, DEDUZIDO DO MATERIAL. MANDAR O PAGAMENTO DA MADEIRA PELO MOTORISTA.'
      : '',
  });

  const [collapsedBlocos, setCollapsedBlocos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (id) {
      const ex = state.documents.find(d => d.id === id);
      if (ex) {
        // Migrate legacy doc (no blocos) to bloco format
        if (!ex.blocos || ex.blocos.length === 0) {
          setDoc({
            ...ex,
            blocos: [{
              id: 'main',
              label: 'Principal',
              clientId: ex.clientId,
              clientName: ex.clientName,
              clientData: ex.clientData,
              items: ex.items || [],
            }],
          });
        } else {
          setDoc(ex);
        }
      }
    }
  }, [id]);

  useEffect(() => {
    if (fromPedidoId && type === 'romaneio') {
      const pedido = state.documents.find(d => d.id === fromPedidoId);
      if (pedido) {
        const blocos = pedido.blocos && pedido.blocos.length > 0
          ? pedido.blocos.map(b => ({
              ...b,
              id: Math.random().toString(36).slice(2, 9),
              items: b.items.map(i => ({ ...i, id: Math.random().toString(36).slice(2, 9) })),
            }))
          : [{
              id: Math.random().toString(36).slice(2, 9),
              label: 'Principal',
              clientId: pedido.clientId,
              clientName: pedido.clientName,
              clientData: pedido.clientData,
              items: pedido.items.map(i => ({ ...i, id: Math.random().toString(36).slice(2, 9) })),
            }];
        setDoc(prev => ({
          ...prev,
          supplier: pedido.supplier || '',
          paymentTerms: pedido.paymentTerms,
          blocos,
        }));
      }
    }
  }, [fromPedidoId]);

  // ── Totals across ALL blocos ──────────────────────────────────────────────
  const totals = useMemo(() => {
    return (doc.blocos || []).reduce(
      (acc, bloco) => {
        const bt = calcBlocoTotals(bloco);
        acc.m3 += bt.m3;
        acc.subtotal += bt.subtotal;
        return acc;
      },
      { m3: 0, subtotal: 0 }
    );
  }, [doc.blocos]);

  const commission = doc.commissionPct ? totals.subtotal * (doc.commissionPct / 100) : 0;
  const total = type === 'romaneio'
    ? totals.subtotal - (doc.freight || 0) - commission - (doc.settlement || 0)
    : totals.subtotal;

  const displayDate = doc.date && !isNaN(new Date(doc.date).getTime())
    ? format(new Date(doc.date + 'T12:00:00'), 'dd/MM/yyyy')
    : '—';

  // ── Bloco helpers ─────────────────────────────────────────────────────────
  const updateBloco = (blocoId: string, patch: Partial<Bloco>) =>
    setDoc(p => ({ ...p, blocos: (p.blocos || []).map(b => b.id === blocoId ? { ...b, ...patch } : b) }));

  const addBloco = () =>
    setDoc(p => ({ ...p, blocos: [...(p.blocos || []), newBloco(`Loja ${(p.blocos || []).length + 1}`)] }));

  const removeBloco = (blocoId: string) =>
    setDoc(p => ({ ...p, blocos: (p.blocos || []).filter(b => b.id !== blocoId) }));

  const toggleBloco = (blocoId: string) =>
    setCollapsedBlocos(prev => ({ ...prev, [blocoId]: !prev[blocoId] }));

  const handleBlocoClientSelect = (blocoId: string, clientId: string) => {
    const c = state.clients.find(x => x.id === clientId);
    updateBloco(blocoId, {
      clientId,
      clientName: c?.name || '',
      clientData: c ? { ...c } : undefined,
    });
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const now = new Date().toISOString();
    const finalDoc: Document = {
      ...doc,
      id: doc.id || Math.random().toString(36).slice(2, 11),
      clientName: doc.blocos?.[0]?.clientName || doc.clientName || '—',
      items: doc.blocos?.flatMap(b => b.items) || [],
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

  const getHTML = (eco = false) => buildDocHTML({
    doc,
    type,
    totals,
    commission,
    total,
    displayDate,
    client: (doc.blocos?.[0]?.clientData || state.clients.find(c => c.id === doc.blocos?.[0]?.clientId) || {}) as Record<string, any>,
    settings: state.settings,
    cheques: doc.cheques || [],
    blocos: doc.blocos || [],
    eco,
  });

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) { alert('Pop-up bloqueado. Permita pop-ups para este site e tente novamente.'); return; }
    win.document.write(getHTML(false));
    win.document.close();
  };

  const handlePrintEco = () => {
    const win = window.open('', '_blank');
    if (!win) { alert('Pop-up bloqueado. Permita pop-ups para este site e tente novamente.'); return; }
    win.document.write(getHTML(true));
    win.document.close();
  };

  const handleShare = async () => {
    const title = `${type.toUpperCase()} Nº ${doc.number} — ${doc.blocos?.[0]?.clientName || doc.clientName || ''}`;
    const filename = `${type}-${doc.number}.pdf`;
    const html = getHTML();

    // On mobile: open the document in a new tab with a prominent
    // "Save as PDF" button. The user taps Share → Print → Save PDF.
    // This is the only reliable cross-browser way to generate a real PDF on mobile.
    const win = window.open('', '_blank');
    if (!win) {
      alert('Pop-up bloqueado. Permita pop-ups para este site e tente novamente.');
      return;
    }

    // Inject an extra prominent share/save instruction banner for mobile
    const shareHTML = html.replace(
      '<div class="btn-wrap"><button class="print-btn" onclick="window.print()">&#8595; Salvar como PDF / Imprimir</button></div>',
      '<div class="btn-wrap"><button class="print-btn" onclick="window.print()">&#8595; Salvar como PDF / Imprimir</button></div>' +
      '<div style="background:#1B4332;color:#fff;border-radius:10px;padding:14px 16px;margin-bottom:12px;font-size:14px;font-family:Arial,sans-serif">' +
      '<strong style="display:block;margin-bottom:6px;font-size:15px">&#128247; Como salvar e compartilhar o PDF:</strong>' +
      '<ol style="margin:0;padding-left:20px;line-height:2">' +
      '<li>Toque em <strong>"Salvar como PDF / Imprimir"</strong> acima</li>' +
      '<li>Selecione <strong>Salvar como PDF</strong> (ou impressora PDF)</li>' +
      '<li>Toque em <strong>Salvar</strong> — o arquivo fica na sua galeria/arquivos</li>' +
      '<li>Compartilhe o PDF pelo <strong>WhatsApp, e-mail</strong> ou outro app</li>' +
      '</ol>' +
      '</div>'
    );

    win.document.write(shareHTML);
    win.document.close();

    // On iOS Safari, trigger print dialog automatically after a short delay
    setTimeout(() => {
      try { win.print(); } catch {}
    }, 600);
  };

  const s = state.settings;
  const blocos = doc.blocos || [];

  return (
    <div className="space-y-5 pb-32 max-w-full overflow-x-hidden">
      {/* Toolbar */}
      <div className="space-y-2">
        {/* Row 1: back + title + save */}
        <div className="flex items-center gap-2">
          <Link to="/relatorios" className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-green-800 capitalize leading-tight truncate">
              {type === 'pedido' ? 'Pedido' : 'Romaneio'} Nº {doc.number}
            </h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest leading-tight">
              {id ? 'Editando' : 'Novo documento'}
            </p>
          </div>
          <button onClick={handleSave}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-900 active:scale-95 transition-all">
            <Save className="w-3.5 h-3.5" /> Salvar
          </button>
        </div>
        {/* Row 2: action buttons — full width grid */}
        <div className="grid grid-cols-3 gap-1.5">
          <button onClick={handleShare}
            className="flex items-center justify-center gap-1 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all">
            <Share2 className="w-3.5 h-3.5 flex-shrink-0" /> Compartilhar
          </button>
          <button onClick={handlePrint}
            className="flex items-center justify-center gap-1 py-2.5 bg-green-700 text-white rounded-lg text-xs font-bold hover:bg-green-800 active:scale-95 transition-all">
            <Printer className="w-3.5 h-3.5 flex-shrink-0" /> PDF Colorido
          </button>
          <button onClick={handlePrintEco}
            className="flex items-center justify-center gap-1 py-2.5 bg-white border border-green-700 text-green-800 rounded-lg text-xs font-bold hover:bg-green-50 active:scale-95 transition-all">
            <Leaf className="w-3.5 h-3.5 flex-shrink-0" /> Econômico
          </button>
        </div>
      </div>

      {/* Doc-level fields */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome do Motorista</label>
          <input value={doc.motorista || ''} onChange={e => setDoc(p => ({ ...p, motorista: e.target.value }))}
            placeholder="Ex: João da Silva"
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

      {/* ── BLOCOS ── */}
      <div className="space-y-4">
        {blocos.map((bloco, bi) => {
          const bt = calcBlocoTotals(bloco);
          const isCollapsed = collapsedBlocos[bloco.id];
          return (
            <div key={bloco.id} className="bg-white border-2 border-green-200 rounded-xl shadow-sm overflow-hidden">
              {/* Bloco header */}
              <div className="flex items-center justify-between px-4 py-3 bg-green-50 border-b border-green-200 gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-green-700 text-white rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0">
                    {bi + 1}
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Building2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <input
                      value={bloco.label}
                      onChange={e => updateBloco(bloco.id, { label: e.target.value })}
                      placeholder="Nome da loja / local..."
                      className="font-black text-green-800 bg-transparent border-b-2 border-dashed border-green-300 focus:border-green-600 outline-none text-sm min-w-0 py-0.5 w-full"
                    />
                  </div>
                  {bt.m3 > 0 && (
                    <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {bt.m3.toFixed(3)} m³ · {fmt(bt.subtotal)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleBloco(bloco.id)}
                    className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-all">
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  {blocos.length > 1 && (
                    <button onClick={() => removeBloco(bloco.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {!isCollapsed && (
                <div className="p-4 space-y-4">
                  {/* Bloco client */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {type === 'pedido' ? 'Destinatário' : 'Cliente'}
                        </label>
                        <Link to="/clientes" className="text-[9px] font-bold text-green-700 hover:underline flex items-center gap-1">
                          <Plus className="w-2.5 h-2.5" /> Cadastrar
                        </Link>
                      </div>
                      <select value={bloco.clientId || ''}
                        onChange={e => handleBlocoClientSelect(bloco.id, e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none">
                        <option value="">— Selecionar —</option>
                        {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {!bloco.clientId && (
                        <input value={bloco.clientName || ''}
                          onChange={e => updateBloco(bloco.id, { clientName: e.target.value })}
                          placeholder="Ou digitar nome manualmente..."
                          className="w-full mt-1 p-2.5 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none" />
                      )}
                    </div>
                    {bloco.clientData && (
                      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-0.5">
                        {(bloco.clientData as any).address && <p>📍 {(bloco.clientData as any).address}</p>}
                        {(bloco.clientData as any).city && <p>🏙 {(bloco.clientData as any).city}</p>}
                        {(bloco.clientData as any).phone && <p>📞 {(bloco.clientData as any).phone}</p>}
                      </div>
                    )}
                  </div>

                  {/* Bloco calculator */}
                  <TimberCalculator
                    items={bloco.items}
                    onChange={items => updateBloco(bloco.id, { items })}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Add bloco button */}
        <button onClick={addBloco}
          className="w-full py-3 border-2 border-dashed border-green-300 text-green-700 rounded-xl font-bold text-sm hover:border-green-500 hover:bg-green-50 transition-all flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Adicionar Loja / Bloco
        </button>
      </div>

      {/* Cheques — romaneio only */}
      {type === 'romaneio' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <ChequeTable
            cheques={doc.cheques || []}
            onChange={cheques => setDoc(p => ({ ...p, cheques }))}
            total={total}
            paymentTerms={doc.paymentTerms || ''}
            docDate={doc.date || ''}
          />
        </div>
      )}

      {/* Live totals */}
      <div className="bg-green-700 text-white rounded-xl p-4 shadow-md">
        {blocos.length > 1 && (
          <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b border-green-600">
            {blocos.map((b, i) => {
              const bt = calcBlocoTotals(b);
              return (
                <div key={b.id} className="bg-green-600 rounded-lg p-2">
                  <p className="text-green-300 text-[10px] font-bold truncate">{b.label || `Bloco ${i + 1}`}</p>
                  <p className="text-white text-xs font-black">{bt.m3.toFixed(3)} m³</p>
                  <p className="text-green-200 text-[10px]">{fmt(bt.subtotal)}</p>
                </div>
              );
            })}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
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
        <div className="grid grid-cols-3 gap-2">
          <button onClick={handleShare}
            className="py-3 bg-blue-600 text-white rounded-lg font-black text-sm hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" /> Compartilhar
          </button>
          <button onClick={handlePrint}
            className="py-2.5 bg-white text-green-800 rounded-lg font-black text-sm hover:bg-green-50 active:scale-95 transition-all flex items-center justify-center gap-1.5">
            <Printer className="w-4 h-4" /> PDF Colorido
          </button>
          <button onClick={handlePrintEco}
            className="py-2.5 bg-green-600 text-white rounded-lg font-black text-sm hover:bg-green-500 active:scale-95 transition-all flex items-center justify-center gap-1.5">
            <Leaf className="w-4 h-4" /> PDF Econômico
          </button>
        </div>
      </div>
    </div>
  );
};