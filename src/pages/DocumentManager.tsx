import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { Document, Bloco, TimberItem } from '../types';
import { TimberCalculator } from '../components/TimberCalculator';
import { ChequeTable } from '../components/ChequeTable';
import { PaymentTracker } from '../components/PaymentTracker';
import { Cheque } from '../lib/cheques';
import { calcDerived } from '../lib/calc';
import { buildDocHTML } from '../lib/docHTML';
import { buildPaymentReportHTML } from '../lib/paymentReportHTML';
import { ArrowLeft, Save, Printer, Plus, Share2, Trash2, ChevronDown, ChevronUp, Building2, Leaf, Upload, CheckCircle2, AlertCircle, Users, FileCheck } from 'lucide-react';
import { importFromExcel, ImportResult } from '../lib/importExcel';
import { ImportReview } from '../components/ImportReview';
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
    extras: [],
    partnerName: '',
    partnerSharePct: 0,
    payments: [],
    commissionPaid: false,
    partnerPaid: false,
    notes: type === 'romaneio'
      ? 'O FRETE SERÁ PAGO À VISTA AO TRANSPORTADOR NO ATO DA DESCARGA, DEDUZIDO DO MATERIAL. MANDAR O PAGAMENTO DA MADEIRA PELO MOTORISTA.'
      : '',
  });

  const [collapsedBlocos, setCollapsedBlocos] = useState<Record<string, boolean>>({});
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{type: 'ok'|'err'|'warn', text: string, warnings?: any[]} | null>(null);
  const [importReview, setImportReview] = useState<ImportResult | null>(null);
  const [clientMatch, setClientMatch] = useState<{client: any, importResult: ImportResult, items: TimberItem[]} | null>(null);
  const importRef = React.useRef<HTMLInputElement>(null);

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

  // Extras (créditos/descontos — aplicados DEPOIS da comissão)
  const extrasTotal = (doc.extras || []).reduce((s, e) => e.op === '+' ? s + e.valor : s - e.valor, 0);

  // 1. Base da comissão = subtotal − frete − acerto
  const baseComissao = totals.subtotal - (doc.freight || 0) - (doc.settlement || 0);
  const commission = doc.commissionPct ? Math.max(0, baseComissao) * (doc.commissionPct / 100) : 0;

  // Divisão de comissão com vendedor parceiro
  const partnerSharePct = doc.partnerSharePct || 0;
  const partnerShareValue = partnerSharePct > 0 ? commission * (partnerSharePct / 100) : 0;
  const myShareValue = commission - partnerShareValue;
  // 2. Total = subtotal − frete − acerto − comissão ± extras
  const total = type === 'romaneio'
    ? totals.subtotal - (doc.freight || 0) - (doc.settlement || 0) - commission + extrasTotal
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

  // ── Import from Excel ────────────────────────────────────────────────────
  // Find best matching client from cadastro
  const findClientMatch = (name: string) => {
    if (!name) return null;
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normName = norm(name);
    // Exact match first
    let match = state.clients.find(c => norm(c.name) === normName);
    if (match) return match;
    // Partial match — name contains or is contained
    match = state.clients.find(c =>
      norm(c.name).includes(normName) || normName.includes(norm(c.name))
    );
    return match || null;
  };

  const applyImport = (result: ImportResult, items: typeof result.items) => {
    setDoc(prev => {
      const blocos = [...(prev.blocos || [])];
      if (blocos.length === 0) blocos.push({ id: Math.random().toString(36).slice(2,9), label: 'Principal', clientName: '', items: [] });
      blocos[0] = { ...blocos[0], items };
      return {
        ...prev,
        blocos,
        supplier: result.supplier || prev.supplier || '',
        motorista: result.motorista || prev.motorista || '',
        freight: result.freight ?? prev.freight,
        clientName: result.clientName || prev.clientName || '',
      };
    });
    const calcM3 = items.reduce((s, i) => {
      const d = i.customM3 ?? 0;
      return s + (d || 0);
    }, 0);
    // Check for client match in cadastro
    if (result.clientName) {
      const match = findClientMatch(result.clientName);
      if (match) {
        setClientMatch({ client: match, importResult: result, items });
        return;
      }
    }
    setImportMsg({
      type: 'ok',
      text: `✓ ${items.length} itens importados${result.clientName ? ` — ${result.clientName}` : ''}`,
    });
  };

  const handleImportClick = () => importRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImporting(true);
    setImportMsg(null);
    try {
      const result = await importFromExcel(file);

      if (result.warnings && result.warnings.length > 0) {
        // Show review modal for user to choose
        setImportReview(result);
      } else {
        // No warnings — apply directly
        applyImport(result, result.items);
      }
    } catch (err: any) {
      setImportMsg({ type: 'err', text: (err as any).message || 'Erro ao importar arquivo.' });
    } finally {
      setImporting(false);
    }
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
      partnerShareValue,
      myShareValue,
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
    extras: doc.extras || [],
    extrasTotal,
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

  const handlePrintPaymentReport = () => {
    if (!doc.id) {
      alert('Salve o romaneio primeiro para gerar o relatório de pagamento.');
      return;
    }
    const win = window.open('', '_blank');
    if (!win) { alert('Pop-up bloqueado. Permita pop-ups para este site e tente novamente.'); return; }
    const finalDoc: Document = {
      ...doc,
      subtotal: totals.subtotal,
      totalM3: totals.m3,
      commissionValue: commission,
      total,
    } as Document;
    win.document.write(buildPaymentReportHTML(finalDoc, state.settings));
    win.document.close();
  };

  const handleShare = async () => {
    // Open document in new tab — user saves as PDF then shares
    handlePrint();
  };

  const s = state.settings;
  const blocos = doc.blocos || [];

  return (
    <>
      {/* Client match confirmation */}
      {clientMatch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-base">Cliente encontrado!</h3>
                <p className="text-xs text-gray-500">O Excel menciona um cliente parecido com o seu cadastro</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider">No Excel</span>
                <span className="font-bold text-gray-600">{clientMatch.importResult.clientName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider">No Cadastro</span>
                <span className="font-black text-green-700">{clientMatch.client.name}</span>
              </div>
              {clientMatch.client.city && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-bold uppercase tracking-wider">Cidade</span>
                  <span className="text-gray-600">{clientMatch.client.city}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 text-center">Vincular ao cliente cadastrado?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  // Apply with client linked
                  setDoc(prev => {
                    const blocos = [...(prev.blocos || [])];
                    if (blocos.length === 0) blocos.push({ id: Math.random().toString(36).slice(2,9), label: 'Principal', clientName: '', items: [] });
                    blocos[0] = { ...blocos[0], items: clientMatch.items, clientId: clientMatch.client.id, clientName: clientMatch.client.name, clientData: { ...clientMatch.client } };
                    return { ...prev, blocos, supplier: clientMatch.importResult.supplier || prev.supplier || '', motorista: clientMatch.importResult.motorista || prev.motorista || '', freight: clientMatch.importResult.freight ?? prev.freight };
                  });
                  setImportMsg({ type: 'ok', text: `✓ ${clientMatch.items.length} itens importados — ${clientMatch.client.name} vinculado` });
                  setClientMatch(null);
                }}
                className="py-2.5 bg-green-700 text-white rounded-xl text-sm font-bold hover:bg-green-800 transition-all"
              >
                ✓ Sim, vincular
              </button>
              <button
                onClick={() => {
                  // Apply without linking
                  setImportMsg({ type: 'ok', text: `✓ ${clientMatch.items.length} itens importados` });
                  setClientMatch(null);
                }}
                className="py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
              >
                Não, manual
              </button>
            </div>
          </div>
        </div>
      )}

      {importReview && (
        <ImportReview
          warnings={importReview.warnings}
          items={importReview.items}
          freight={importReview.freight}
          commissionValue={importReview.commissionValue}
          totalMadeira={importReview.totalMadeira}
          totalAPagar={importReview.totalAPagar}
          onConfirm={(chosenItems) => {
            applyImport(importReview, chosenItems);
            setImportReview(null);
          }}
          onCancel={() => setImportReview(null)}
        />
      )}
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
        {/* Row 2: action buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={handleImportClick} disabled={importing}
            className="flex items-center justify-center gap-1 py-2.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-60">
            <Upload className="w-3.5 h-3.5 flex-shrink-0" /> {importing ? 'Importando...' : 'Importar Excel'}
          </button>
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
        {/* Hidden file input */}
        <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
        {/* Import feedback */}
        {importMsg && (
          <div className="space-y-1.5">
            <div className={['flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold',
              importMsg.type === 'ok' ? 'bg-green-50 border border-green-200 text-green-800'
              : importMsg.type === 'warn' ? 'bg-amber-50 border border-amber-300 text-amber-800'
              : 'bg-red-50 border border-red-200 text-red-700'].join(' ')}>
              {importMsg.type === 'ok' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-600" />
               : importMsg.type === 'warn' ? <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
               : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{importMsg.text}</span>
              {importMsg.warnings && importMsg.warnings.length > 0 && (
                <span className="ml-1 text-amber-700 font-black">⚠ {importMsg.warnings.length} aviso{importMsg.warnings.length > 1 ? 's' : ''}</span>
              )}
            </div>
            {importMsg.warnings && importMsg.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider">⚠ Divergências encontradas no arquivo da serraria:</p>
                {importMsg.warnings.map((w: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-amber-800">
                    <span className="font-bold flex-shrink-0 text-amber-600">[{w.field}]</span>
                    <span>{w.message}</span>
                  </div>
                ))}
                <p className="text-[10px] text-amber-600 italic pt-1">Revise os valores antes de salvar.</p>
              </div>
            )}
          </div>
        )}
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
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vendedor Parceiro (opcional)</label>
            <input value={doc.partnerName || ''} onChange={e => setDoc(p => ({ ...p, partnerName: e.target.value }))}
              placeholder="Nome do parceiro..."
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">% Comissão p/ Parceiro</label>
            <input type="number" min="0" max="100" value={doc.partnerSharePct || ''} onChange={e => setDoc(p => ({ ...p, partnerSharePct: parseFloat(e.target.value) || 0 }))}
              placeholder="ex: 50"
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acerto escritório (R$)</label>
            <input type="number" value={doc.settlement || ''} onChange={e => setDoc(p => ({ ...p, settlement: parseFloat(e.target.value) || 0 }))}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none" />
          </div>
          {/* Extras */}
          <div className="space-y-2 md:col-span-2 lg:col-span-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Créditos / Descontos Extras</label>
              <button type="button"
                onClick={() => setDoc(p => ({ ...p, extras: [...(p.extras||[]), { id: Math.random().toString(36).slice(2,9), desc: '', valor: 0, op: '-' as const }] }))}
                className="flex items-center gap-1 text-[10px] font-bold text-green-700 hover:text-green-900">
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
            {(doc.extras || []).map(extra => (
              <div key={extra.id} className="flex items-center gap-2">
                <select value={extra.op}
                  onChange={e => setDoc(p => ({ ...p, extras: (p.extras||[]).map(x => x.id===extra.id ? {...x, op: e.target.value as '+' | '-'} : x) }))}
                  className="w-16 p-2 border border-gray-300 rounded-lg text-sm font-bold focus:border-green-600 outline-none text-center">
                  <option value="-">− Sub</option>
                  <option value="+">+ Add</option>
                </select>
                <input value={extra.desc}
                  onChange={e => setDoc(p => ({ ...p, extras: (p.extras||[]).map(x => x.id===extra.id ? {...x, desc: e.target.value} : x) }))}
                  placeholder="Descrição (ex: desconto qualidade)"
                  className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none" />
                <input type="number" value={extra.valor || ''}
                  onChange={e => setDoc(p => ({ ...p, extras: (p.extras||[]).map(x => x.id===extra.id ? {...x, valor: parseFloat(e.target.value)||0} : x) }))}
                  placeholder="R$ 0,00"
                  className="w-32 p-2 border border-gray-300 rounded-lg text-sm focus:border-green-600 outline-none text-right" />
                <button onClick={() => setDoc(p => ({ ...p, extras: (p.extras||[]).filter(x => x.id !== extra.id) }))}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
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
                        {[...state.clients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

      {/* Payment tracking — only for saved romaneios */}
      {type === 'romaneio' && id && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider">
              💰 Controle de Recebimento
            </h2>
            <button onClick={handlePrintPaymentReport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all">
              <FileCheck className="w-3.5 h-3.5" /> Relatório de Pagamento
            </button>
          </div>
          <PaymentTracker
            total={total}
            payments={doc.payments || []}
            onChangePayments={payments => setDoc(p => ({ ...p, payments }))}
            commission={commission}
            commissionPaid={doc.commissionPaid || false}
            onChangeCommissionPaid={paid => setDoc(p => ({ ...p, commissionPaid: paid, commissionPaidDate: paid ? new Date().toISOString() : undefined }))}
            partnerName={doc.partnerName}
            partnerShareValue={partnerShareValue}
            partnerPaid={doc.partnerPaid || false}
            onChangePartnerPaid={paid => setDoc(p => ({ ...p, partnerPaid: paid, partnerPaidDate: paid ? new Date().toISOString() : undefined }))}
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
            <p className="text-xl font-black">{totals.m3.toFixed(3)}</p>
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
              {partnerSharePct > 0 && (
                <p className="text-[10px] text-green-200 mt-0.5">
                  Você: {fmt(myShareValue)} · {doc.partnerName || 'Parceiro'}: {fmt(partnerShareValue)}
                </p>
              )}
            </div>
          )}
          {type === 'romaneio' && extrasTotal !== 0 && (
            <div>
              <p className="text-green-300 text-xs font-bold uppercase tracking-wider">{extrasTotal > 0 ? '+ Extras' : '– Extras'}</p>
              <p className={`text-xl font-black ${extrasTotal > 0 ? 'text-green-200' : 'text-red-300'}`}>{fmt(Math.abs(extrasTotal))}</p>
            </div>
          )}
          <div>
            <p className="text-green-300 text-xs font-bold uppercase tracking-wider">Total a Pagar</p>
            <p className="text-2xl font-black text-yellow-300">{fmt(total)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handlePrint}
            className="py-3 bg-white text-green-800 rounded-lg font-black text-sm hover:bg-green-50 active:scale-95 transition-all flex items-center justify-center gap-2">
            <Printer className="w-4 h-4" /> PDF / Compartilhar
          </button>
          <button onClick={handlePrintEco}
            className="py-3 bg-green-600 text-white rounded-lg font-black text-sm hover:bg-green-500 active:scale-95 transition-all flex items-center justify-center gap-2">
            <Leaf className="w-4 h-4" /> PDF Econômico
          </button>
        </div>
      </div>
    </div>
    </>
  );
};
