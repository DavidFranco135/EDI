import React, { useState } from 'react';
import { Plus, Trash2, Printer, Share2, ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { buildTabelaHTML } from '../lib/tabelaHTML';

// ── Types ────────────────────────────────────────────────────────────────────
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
  collapsed: boolean;
}

function calcRow(r: PrecoRow) {
  const m3Peca = r.bitola > 0 && r.largura > 0 && r.comprimento > 0
    ? (r.bitola / 100) * (r.largura / 100) * r.comprimento
    : 0;
  const qtdPorM3 = m3Peca > 0 ? Math.round(1 / m3Peca) : 0;
  const precoUnidade = r.valorM3 > 0 && m3Peca > 0 ? r.valorM3 * m3Peca : 0;
  const ml = r.comprimento;
  return { m3Peca, qtdPorM3, precoUnidade, ml };
}

function newRow(valorM3 = 1400): PrecoRow {
  return { id: Math.random().toString(36).slice(2, 9), bitola: 0, largura: 0, comprimento: 3, valorM3 };
}

function newTabela(valorM3 = 1400): TabelaPreco {
  return {
    id: Math.random().toString(36).slice(2, 9),
    nome: `Tabela R$ ${valorM3.toLocaleString('pt-BR')}/m³`,
    valorM3,
    collapsed: false,
    rows: [
      { id: '1', bitola: 1.7, largura: 30, comprimento: 3, valorM3 },
      { id: '2', bitola: 1.7, largura: 28, comprimento: 3, valorM3 },
      { id: '3', bitola: 1.8, largura: 30, comprimento: 3, valorM3 },
    ],
  };
}

const LS_KEY = 'edi_tabelas_preco_v2';

function loadTabelasFromLS(): TabelaPreco[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [newTabela(1400), newTabela(1200)];
}

const INP_GRAY = 'w-full text-center text-xs bg-gray-100 border border-gray-200 rounded px-1 py-1.5 focus:bg-white focus:border-green-600 outline-none tabular-nums';
const INP_GREEN = 'w-full text-center text-xs bg-green-50 border border-green-200 rounded px-1 py-1.5 focus:bg-white focus:border-green-600 outline-none tabular-nums font-bold text-green-800';

// ── Component ────────────────────────────────────────────────────────────────
export const TabelaPrecos: React.FC = () => {
  const { state } = useApp();
  const [tabelas, setTabelas] = useState<TabelaPreco[]>(loadTabelasFromLS);
  const [editingNome, setEditingNome] = useState<string | null>(null);
  const [nomeTemp, setNomeTemp] = useState('');

  const save = (t: TabelaPreco[]) => {
    setTabelas(t);
    localStorage.setItem(LS_KEY, JSON.stringify(t));
  };

  const updateTabela = (id: string, patch: Partial<TabelaPreco>) =>
    save(tabelas.map(t => t.id === id ? { ...t, ...patch } : t));

  const deleteTabela = (id: string) => {
    if (!confirm('Excluir esta tabela?')) return;
    save(tabelas.filter(t => t.id !== id));
  };

  const addTabela = () => {
    const valorM3 = parseInt(prompt('Valor do m³ para a nova tabela (ex: 1400):') || '1400') || 1400;
    save([...tabelas, newTabela(valorM3)]);
  };

  const updateRow = (tabelaId: string, rowId: string, field: keyof PrecoRow, val: number) =>
    save(tabelas.map(t => t.id === tabelaId
      ? { ...t, rows: t.rows.map(r => r.id === rowId ? { ...r, [field]: val, valorM3: field === 'valorM3' ? val : r.valorM3 } : r) }
      : t
    ));

  const addRow = (tabelaId: string) =>
    save(tabelas.map(t => t.id === tabelaId
      ? { ...t, rows: [...t.rows, newRow(t.valorM3)] }
      : t
    ));

  const removeRow = (tabelaId: string, rowId: string) =>
    save(tabelas.map(t => t.id === tabelaId
      ? { ...t, rows: t.rows.filter(r => r.id !== rowId) }
      : t
    ));

  const applyValorM3ToAll = (tabelaId: string, valorM3: number) =>
    save(tabelas.map(t => t.id === tabelaId
      ? { ...t, valorM3, nome: `Tabela R$ ${valorM3.toLocaleString('pt-BR')}/m³`, rows: t.rows.map(r => ({ ...r, valorM3 })) }
      : t
    ));

  const handlePrint = (tabela: TabelaPreco) => {
    const win = window.open('', '_blank');
    if (!win) { alert('Permita pop-ups e tente novamente.'); return; }
    win.document.write(buildTabelaHTML(tabela, state.settings));
    win.document.close();
  };

  const handleShare = async (tabela: TabelaPreco) => {
    const html = buildTabelaHTML(tabela, state.settings);
    const blob = new Blob([html], { type: 'text/html' });
    const file = new File([blob], `tabela-preco-${tabela.valorM3}.html`, { type: 'text/html' });
    if (navigator.share) {
      try {
        const shareData: ShareData = { title: tabela.nome, files: [file] };
        if ((navigator as any).canShare?.(shareData)) { await navigator.share(shareData); return; }
        await navigator.share({ title: tabela.nome, text: tabela.nome });
        return;
      } catch {}
    }
    handlePrint(tabela);
  };

  return (
    <div className="space-y-5 pb-24 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-green-800">Tabelas de Preço</h1>
          <p className="text-gray-500 text-sm">Tabelas separadas por valor do m³ — salvas automaticamente</p>
        </div>
        <button onClick={addTabela}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-green-700 text-white rounded-xl font-bold shadow-md hover:bg-green-800 transition-all active:scale-95">
          <Plus className="w-4 h-4" /> Nova Tabela
        </button>
      </div>

      {/* Tables */}
      {tabelas.map(tabela => (
        <div key={tabela.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="flex items-center justify-between px-4 py-3 bg-green-700 gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {editingNome === tabela.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    value={nomeTemp}
                    onChange={e => setNomeTemp(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { updateTabela(tabela.id, { nome: nomeTemp }); setEditingNome(null); }
                      if (e.key === 'Escape') setEditingNome(null);
                    }}
                    autoFocus
                    className="flex-1 px-2 py-1 rounded text-sm font-bold text-gray-900 outline-none border-2 border-white"
                  />
                  <button onClick={() => { updateTabela(tabela.id, { nome: nomeTemp }); setEditingNome(null); }}
                    className="p-1 bg-white text-green-700 rounded hover:bg-green-50"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditingNome(null)}
                    className="p-1 bg-white/20 text-white rounded hover:bg-white/30"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <h2 className="font-black text-white text-base truncate">{tabela.nome}</h2>
                  <button onClick={() => { setEditingNome(tabela.id); setNomeTemp(tabela.nome); }}
                    className="p-1 text-green-200 hover:text-white transition-colors flex-shrink-0">
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => handleShare(tabela)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-all">
                <Share2 className="w-3 h-3" /> Compartilhar
              </button>
              <button onClick={() => handlePrint(tabela)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white text-green-800 rounded-lg text-xs font-bold hover:bg-green-50 transition-all">
                <Printer className="w-3 h-3" /> PDF
              </button>
              <button onClick={() => updateTabela(tabela.id, { collapsed: !tabela.collapsed })}
                className="p-1.5 text-white hover:bg-green-600 rounded-lg transition-all">
                {tabela.collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <button onClick={() => deleteTabela(tabela.id)}
                className="p-1.5 text-red-300 hover:text-white hover:bg-red-500 rounded-lg transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Valor m³ global control */}
          {!tabela.collapsed && (
            <div className="flex items-center gap-3 px-4 py-2 bg-green-50 border-b border-green-100">
              <span className="text-xs font-bold text-green-700 uppercase tracking-wider whitespace-nowrap">Valor m³ desta tabela:</span>
              <input type="number"
                value={tabela.valorM3 || ''}
                onChange={e => applyValorM3ToAll(tabela.id, parseFloat(e.target.value) || 0)}
                className="w-28 px-2 py-1 text-sm font-black text-green-800 bg-white border-2 border-green-300 rounded-lg outline-none focus:border-green-600 text-center"
              />
              <span className="text-xs text-green-600">R$/m³ — aplicado a todas as linhas</span>
            </div>
          )}

          {/* Table body */}
          {!tabela.collapsed && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs" style={{ minWidth: 680 }}>
                <thead>
                  <tr className="bg-yellow-50 border-b-2 border-yellow-200">
                    <th className="border border-gray-200 px-2 py-2 text-center text-[11px] font-black text-gray-600 bg-gray-100">Bitola (cm)</th>
                    <th className="border border-gray-200 px-2 py-2 text-center text-[11px] font-black text-gray-600 bg-gray-100">Largura (cm)</th>
                    <th className="border border-gray-200 px-2 py-2 text-center text-[11px] font-black text-gray-600 bg-gray-100">Compr.</th>
                    <th className="border border-gray-200 px-2 py-2 text-center text-[11px] font-black text-gray-700">QTD Peças/m³</th>
                    <th className="border border-gray-200 px-2 py-2 text-center text-[11px] font-black text-gray-700">Preço/Unidade</th>
                    <th className="border border-gray-200 px-2 py-2 text-center text-[11px] font-black text-gray-700">Metros Lin.</th>
                    <th className="border border-gray-200 px-2 py-2 text-center text-[11px] font-black text-green-700 bg-green-50">Valor m³</th>
                    <th className="border border-gray-200 px-2 py-2 text-center text-[11px] font-black text-green-700 bg-green-50">M³/peça</th>
                    <th className="border border-gray-200 w-7 bg-gray-50"></th>
                  </tr>
                </thead>
                <tbody>
                  {tabela.rows.map((row, i) => {
                    const c = calcRow(row);
                    return (
                      <tr key={row.id} className={i % 2 === 0 ? 'bg-white hover:bg-green-50/20' : 'bg-gray-50/50 hover:bg-green-50/20'}>
                        <td className="border border-gray-200 p-1">
                          <input type="number" step="0.1" value={row.bitola || ''}
                            onChange={e => updateRow(tabela.id, row.id, 'bitola', parseFloat(e.target.value) || 0)}
                            className={INP_GRAY} placeholder="1.8" />
                        </td>
                        <td className="border border-gray-200 p-1">
                          <input type="number" step="0.1" value={row.largura || ''}
                            onChange={e => updateRow(tabela.id, row.id, 'largura', parseFloat(e.target.value) || 0)}
                            className={INP_GRAY} placeholder="30" />
                        </td>
                        <td className="border border-gray-200 p-1">
                          <select value={row.comprimento}
                            onChange={e => updateRow(tabela.id, row.id, 'comprimento', parseFloat(e.target.value))}
                            className={INP_GRAY + ' cursor-pointer'}>
                            <option value={3}>3m</option>
                            <option value={4}>4m</option>
                            <option value={5}>5m</option>
                            <option value={6}>6m</option>
                          </select>
                        </td>
                        <td className="border border-gray-200 p-1.5 text-center font-bold text-gray-800">{c.qtdPorM3 || '—'}</td>
                        <td className="border border-gray-200 p-1.5 text-center font-bold text-gray-700">
                          {c.precoUnidade > 0 ? c.precoUnidade.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                        </td>
                        <td className="border border-gray-200 p-1.5 text-center text-gray-500">{c.ml.toFixed(2)}</td>
                        <td className="border border-gray-200 p-1 bg-green-50">
                          <input type="number" value={row.valorM3 || ''}
                            onChange={e => updateRow(tabela.id, row.id, 'valorM3', parseFloat(e.target.value) || 0)}
                            className={INP_GREEN} />
                        </td>
                        <td className="border border-gray-200 p-1.5 text-center font-bold text-green-700 bg-green-50/50">
                          {c.m3Peca > 0 ? c.m3Peca.toFixed(4) : '—'}
                        </td>
                        <td className="border border-gray-200 p-1 text-center">
                          <button onClick={() => removeRow(tabela.id, row.id)}
                            className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {tabela.rows.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-6 text-gray-400 italic text-sm">Nenhuma linha.</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-yellow-50 border-t-2 border-yellow-200">
                    <td colSpan={9} className="px-3 py-2">
                      <button onClick={() => addRow(tabela.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-green-700 hover:text-green-900 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Adicionar linha
                      </button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      ))}

      {tabelas.length === 0 && (
        <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 italic text-sm mb-3">Nenhuma tabela criada ainda.</p>
          <button onClick={addTabela}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-xl text-sm font-bold hover:bg-green-800">
            <Plus className="w-4 h-4" /> Nova Tabela
          </button>
        </div>
      )}
    </div>
  );
};
