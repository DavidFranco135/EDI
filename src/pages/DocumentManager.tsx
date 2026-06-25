import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { Document } from '../types';
import { TimberCalculator } from '../components/TimberCalculator';
import { calcDerived } from '../lib/calc';
import { buildDocHTML } from '../lib/docHTML';
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
      .toString().padStart(3, '0');

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
    motorista: '',
    status: 'andamento',
    paymentTerms: 'À VISTA',
    notes: type === 'romaneio'
      ? 'O FRETE SERÁ PAGO À VISTA AO TRANSPORTADOR NO ATO DA DESCARGA, DEDUZIDO DO MATERIAL. MANDAR O PAGAMENTO DA MADEIRA PELO MOTORISTA.'
      : '',
  });

  useEffect(() => {
    if (id) {
      const ex = state.documents.find(d => d.id === id);
      if (ex) setDoc(ex);
    }
  }, [id]);

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
          items: pedido.items.map(i => ({ ...i, id: Math.random().toString(36).slice(2, 9) })),
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
  const total = type === 'romaneio'
    ? totals.subtotal - (doc.freight || 0) - commission - (doc.settlement || 0)
    : totals.subtotal;

  const selectedClient = state.clients.find(c => c.id === doc.clientId);
  const client = (doc.clientData || selectedClient || {}) as Record<string, any>;

  const displayDate = doc.date && !isNaN(new Date(doc.date).getTime())
    ? format(new Date(doc.date + 'T12:00:00'), 'dd/MM/yyyy')
    : '—';

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
      clientName: doc.clientName || client?.name || '—',
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

  const getHTML = () => buildDocHTML({
    doc,
    type,
    totals,
    commission,
    total,
    displayDate,
    client,
    settings: state.settings,
  });

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) {
      alert('Pop-up bloqueado. Permita pop-ups para este site e tente novamente.');
      return;
    }
    win.document.write(getHTML());
    win.document.close();
  };

  const handleShare = async () => {
    const title = `${type.toUpperCase()} Nº ${doc.number} — ${doc.clientName || ''}`;
    const html = getHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const file = new File([blob], `${type}-${doc.number}.html`, { type: 'text/html' });

    if (navigator.share) {
      try {
        const shareData: ShareData = { title, files: [file] };
        if ((navigator as any).canShare && (navigator as any).canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
        await navigator.share({
          title,
          text: [
            `${type.toUpperCase()} Nº ${doc.number}`,
            `Cliente: ${doc.clientName || '—'}`,
            doc.supplier ? `Fornecedor: ${doc.supplier}` : '',
            `Data: ${displayDate}`,
            `Total M³: ${totals.m3.toFixed(4)}`,
            `Total: ${fmt(total)}`,
            doc.motorista ? `Motorista: ${doc.motorista}` : '',
          ].filter(Boolean).join('\n'),
        });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(title).catch(() => {});
    alert('Para compartilhar o PDF: use o botão Imprimir / PDF, salve como PDF e compartilhe o arquivo.');
  };

  const s = state.settings;

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
          <button onClick={handleShare}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md transition-all active:scale-95">
            <Share2 className="w-4 h-4" /> Compartilhar
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-green-700 text-white rounded-xl text-sm font-bold hover:bg-green-800 shadow-md transition-all active:scale-95">
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </button>
          <button onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-bold hover:bg-gray-900 shadow-md transition-all active:scale-95">
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
