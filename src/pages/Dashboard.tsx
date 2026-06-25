import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users, FileText, Truck, ArrowRight, Clock, CheckCircle2, Trash2 } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { motion } from 'motion/react';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Price table row ──────────────────────────────────────────────────────────
interface PrecoRow {
  id: string;
  bitola: number;
  largura: number;
  comprimento: number;
  precoUnidade: number;
  valorM3: number;
}

function calcRow(r: PrecoRow) {
  // m³ por peça = (bitola/100) * (largura/100) * comprimento
  const m3Peca = r.bitola > 0 && r.largura > 0 && r.comprimento > 0
    ? (r.bitola / 100) * (r.largura / 100) * r.comprimento
    : 0;

  // Metros lineares por peça = comprimento
  const ml = r.comprimento;

  // QTD peças por m³ = 1 / m3Peca
  const qtdPorM3 = m3Peca > 0 ? Math.round(1 / m3Peca) : 0;

  // Preço por unidade = valorM3 * m3Peca
  const precoUnidade = r.valorM3 > 0 && m3Peca > 0
    ? r.valorM3 * m3Peca
    : r.precoUnidade;

  // M³ (always 1 when calculated from qtd por m³ perspective = m3 de 1 peça)
  const m3Display = m3Peca;

  return { m3Peca, ml, qtdPorM3, precoUnidade, m3Display };
}

function newRow(): PrecoRow {
  return {
    id: Math.random().toString(36).slice(2, 9),
    bitola: 0,
    largura: 0,
    comprimento: 3,
    precoUnidade: 0,
    valorM3: 1400,
  };
}

const INP = 'w-full text-center text-xs bg-white border border-gray-300 rounded px-1 py-1 focus:border-green-600 outline-none tabular-nums';
const INP_GRAY = 'w-full text-center text-xs bg-gray-100 border border-gray-200 rounded px-1 py-1 focus:bg-white focus:border-green-600 outline-none tabular-nums cursor-pointer';

// ── Component ────────────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const { state, saveDocument } = useApp();
  const navigate = useNavigate();

  // Load price rows from localStorage
  const [precoRows, setPrecoRows] = useState<PrecoRow[]>(() => {
    try {
      const saved = localStorage.getItem('edi_preco_rows');
      return saved ? JSON.parse(saved) : [
        { id: '1', bitola: 0.017, largura: 0.30, comprimento: 3, precoUnidade: 0, valorM3: 1400 },
        { id: '2', bitola: 0.017, largura: 0.28, comprimento: 3, precoUnidade: 0, valorM3: 1400 },
        { id: '3', bitola: 0.017, largura: 0.20, comprimento: 3, precoUnidade: 0, valorM3: 1200 },
        { id: '4', bitola: 0.018, largura: 0.30, comprimento: 3, precoUnidade: 0, valorM3: 1400 },
        { id: '5', bitola: 0.018, largura: 0.28, comprimento: 3, precoUnidade: 0, valorM3: 1400 },
      ];
    } catch { return []; }
  });

  const saveRows = (rows: PrecoRow[]) => {
    setPrecoRows(rows);
    localStorage.setItem('edi_preco_rows', JSON.stringify(rows));
  };

  const updateRow = (id: string, field: keyof PrecoRow, val: number) => {
    saveRows(precoRows.map(r => r.id === id ? { ...r, [field]: val } : r));
  };

  const addRow = () => saveRows([...precoRows, newRow()]);
  const removeRow = (id: string) => saveRows(precoRows.filter(r => r.id !== id));

  // Pedidos em andamento
  const pedidosAndamento = state.documents.filter(
    d => d.type === 'pedido' && d.status !== 'concluido'
  );

  // Monthly commission
  const now = new Date();
  const romaneiosMes = state.documents.filter(d => {
    if (d.type !== 'romaneio') return false;
    try {
      return isWithinInterval(parseISO(d.date + 'T12:00:00'), {
        start: startOfMonth(now), end: endOfMonth(now),
      });
    } catch { return false; }
  });
  const comissaoMes = romaneiosMes.reduce((s, d) => s + (d.commissionValue || 0), 0);

  const marcarConcluido = async (id: string) => {
    const doc = state.documents.find(d => d.id === id);
    if (!doc) return;
    await saveDocument({ ...doc, status: 'concluido', updatedAt: new Date().toISOString() });
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div>
        <h1 className="text-2xl font-black text-green-800">Bem-vindo, David!</h1>
        <p className="text-gray-500 text-sm">EDI – Gestão de Madeiras</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Romaneios no Mês</p>
          <p className="text-2xl font-black text-gray-900">{romaneiosMes.length}</p>
          <p className="text-[10px] text-gray-400">documentos</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">Comissão do Mês</p>
          <p className="text-2xl font-black text-amber-700">{fmt(comissaoMes)}</p>
          <p className="text-[10px] text-amber-500">{romaneiosMes.length} romaneios</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm col-span-2 md:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Pedidos em Andamento</p>
          <p className="text-2xl font-black text-gray-900">{pedidosAndamento.length}</p>
          <p className="text-[10px] text-gray-400">aguardando</p>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { to: '/pedidos/novo', icon: FileText, label: 'Novo Pedido', sub: 'Ordem para a fábrica', color: 'text-amber-600', bg: 'bg-amber-50' },
          { to: '/romaneios/novo', icon: Truck, label: 'Novo Romaneio', sub: 'Dados de descarga', color: 'text-blue-600', bg: 'bg-blue-50' },
          { to: '/clientes', icon: Users, label: 'Clientes', sub: 'Gestão de contatos', color: 'text-green-700', bg: 'bg-green-50' },
        ].map(item => (
          <Link key={item.to} to={item.to}
            className="group flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-green-300 transition-all">
            <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0`}>
              <item.icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-400">{item.sub}</p>
            </div>
            <Plus className="w-4 h-4 text-gray-300 group-hover:text-green-600 transition-colors" />
          </Link>
        ))}
      </div>

      {/* ── TABELA DE PREÇOS ──────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-green-700 flex items-center justify-between">
          <div>
            <h2 className="font-black text-white text-base">Tabela de Preço do Pinus</h2>
            <p className="text-green-200 text-[10px]">Edite bitola, largura, comprimento e valor m³ → restante calculado automaticamente</p>
          </div>
          <button onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-green-800 rounded-lg text-xs font-black hover:bg-green-50 transition-all">
            <Plus className="w-3.5 h-3.5" /> Linha
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs" style={{ minWidth: 700 }}>
            <thead>
              <tr className="bg-yellow-50 border-b-2 border-yellow-300">
                <th className="border border-gray-300 px-2 py-2 text-center font-black text-[11px] text-gray-700 bg-gray-100">Bitola (cm)</th>
                <th className="border border-gray-300 px-2 py-2 text-center font-black text-[11px] text-gray-700 bg-gray-100">Largura (cm)</th>
                <th className="border border-gray-300 px-2 py-2 text-center font-black text-[11px] text-gray-700 bg-gray-100">Comprimento</th>
                <th className="border border-gray-300 px-2 py-2 text-center font-black text-[11px] text-gray-700">QTD Peças por m³</th>
                <th className="border border-gray-300 px-2 py-2 text-center font-black text-[11px] text-gray-700">Preço por Unidade</th>
                <th className="border border-gray-300 px-2 py-2 text-center font-black text-[11px] text-gray-700">Metros Lineares</th>
                <th className="border border-gray-300 px-2 py-2 text-center font-black text-[11px] text-green-700 bg-green-50">Valor m³</th>
                <th className="border border-gray-300 px-2 py-2 text-center font-black text-[11px] text-green-700 bg-green-50">M³</th>
                <th className="border border-gray-300 w-7 bg-gray-50"></th>
              </tr>
            </thead>
            <tbody>
              {precoRows.map((row, i) => {
                const c = calcRow(row);
                return (
                  <tr key={row.id} className={i % 2 === 0 ? 'bg-white hover:bg-green-50/30' : 'bg-gray-50/60 hover:bg-green-50/30'}>
                    {/* Bitola — editable, gray */}
                    <td className="border border-gray-200 p-1">
                      <input type="number" step="0.001"
                        value={row.bitola || ''}
                        onChange={e => updateRow(row.id, 'bitola', parseFloat(e.target.value) || 0)}
                        className={INP_GRAY} placeholder="0.017" />
                    </td>
                    {/* Largura — editable, gray */}
                    <td className="border border-gray-200 p-1">
                      <input type="number" step="0.01"
                        value={row.largura || ''}
                        onChange={e => updateRow(row.id, 'largura', parseFloat(e.target.value) || 0)}
                        className={INP_GRAY} placeholder="0.30" />
                    </td>
                    {/* Comprimento — editable, gray */}
                    <td className="border border-gray-200 p-1">
                      <select
                        value={row.comprimento}
                        onChange={e => updateRow(row.id, 'comprimento', parseFloat(e.target.value))}
                        className={INP_GRAY + ' cursor-pointer'}>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                        <option value={6}>6</option>
                      </select>
                    </td>
                    {/* QTD por m³ — calculated */}
                    <td className="border border-gray-200 p-1 text-center font-bold text-gray-800">
                      {c.qtdPorM3 || '—'}
                    </td>
                    {/* Preço unidade — calculated */}
                    <td className="border border-gray-200 p-1 text-center font-bold text-gray-800">
                      {c.precoUnidade > 0 ? fmt(c.precoUnidade) : '—'}
                    </td>
                    {/* Metros Lineares — calculated */}
                    <td className="border border-gray-200 p-1 text-center text-gray-600">
                      {c.ml.toFixed(2)}
                    </td>
                    {/* Valor m³ — editable */}
                    <td className="border border-gray-200 p-1 bg-green-50">
                      <input type="number"
                        value={row.valorM3 || ''}
                        onChange={e => updateRow(row.id, 'valorM3', parseFloat(e.target.value) || 0)}
                        className={INP + ' font-bold text-green-800 bg-green-50 border-green-200'} />
                    </td>
                    {/* M³ — calculated */}
                    <td className="border border-gray-200 p-1 text-center font-bold text-green-700 bg-green-50/60">
                      {c.m3Display > 0 ? c.m3Display.toFixed(4) : '—'}
                    </td>
                    {/* Delete */}
                    <td className="border border-gray-200 p-1 text-center">
                      <button onClick={() => removeRow(row.id)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {precoRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-gray-400 italic text-sm">
                    Nenhuma linha. Clique em "+ Linha" para adicionar.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-yellow-50 border-t-2 border-yellow-300">
                <td colSpan={6} className="px-3 py-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider italic">
                  valor em m³ R$1.400/1200
                </td>
                <td colSpan={3} className="px-3 py-2 text-[10px] text-gray-400">
                  Clique nos campos cinzas para editar
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Pedidos em andamento */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-gray-800">Pedidos em Andamento</h2>
            {pedidosAndamento.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-black px-2 py-0.5 rounded-full">
                {pedidosAndamento.length}
              </span>
            )}
          </div>
          <Link to="/relatorios?status=andamento"
            className="flex items-center gap-1 text-xs font-bold text-green-700 hover:underline">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {pedidosAndamento.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-300 mx-auto mb-2" />
            <p className="text-gray-400 italic text-sm">Nenhum pedido em andamento.</p>
            <Link to="/pedidos/novo"
              className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-green-700 hover:underline">
              <Plus className="w-3 h-3" /> Criar novo pedido
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidosAndamento.slice(0, 5).map((doc, i) => (
              <motion.div key={doc.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-4 border-b border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900 text-sm">{doc.clientName || '—'}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                        Pedido Nº {doc.number} •{' '}
                        {doc.date ? format(parseISO(doc.date + 'T12:00:00'), 'dd/MM/yyyy') : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-700 text-sm">{fmt(doc.total)}</p>
                    <p className="text-[10px] text-gray-400">{doc.totalM3.toFixed(4)} m³</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50/50">
                  <Link to={`/pedidos/${doc.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all">
                    <FileText className="w-3 h-3" /> Ver Pedido
                  </Link>
                  <Link to={`/romaneios/novo?from=${doc.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all">
                    <Truck className="w-3 h-3" /> Criar Romaneio
                  </Link>
                  <button onClick={() => marcarConcluido(doc.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white rounded-lg text-xs font-bold hover:bg-green-800 transition-all ml-auto">
                    <CheckCircle2 className="w-3 h-3" /> Concluído
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
