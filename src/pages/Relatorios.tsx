import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { Link } from 'react-router-dom';
import { FileText, Truck, Trash2, ExternalLink, Search, Calendar } from 'lucide-react';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const Relatorios: React.FC = () => {
  const { state, deleteDocument } = useApp();

  const [typeFilter, setTypeFilter] = useState<'todos' | 'pedido' | 'romaneio'>('todos');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    return state.documents.filter(d => {
      if (typeFilter !== 'todos' && d.type !== typeFilter) return false;
      if (
        search &&
        !d.clientName.toLowerCase().includes(search.toLowerCase()) &&
        !d.number.includes(search)
      )
        return false;
      if (dateFrom || dateTo) {
        const docDate = parseISO(d.date + 'T12:00:00');
        if (dateFrom && dateTo) {
          if (
            !isWithinInterval(docDate, {
              start: startOfDay(parseISO(dateFrom)),
              end: endOfDay(parseISO(dateTo)),
            })
          )
            return false;
        } else if (dateFrom && docDate < startOfDay(parseISO(dateFrom))) return false;
        else if (dateTo && docDate > endOfDay(parseISO(dateTo))) return false;
      }
      return true;
    });
  }, [state.documents, typeFilter, search, dateFrom, dateTo]);

  const summary = useMemo(() => {
    return filtered.reduce(
      (acc, d) => {
        acc.total += d.total;
        acc.m3 += d.totalM3;
        return acc;
      },
      { total: 0, m3: 0 }
    );
  }, [filtered]);

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este documento?')) return;
    await deleteDocument(id);
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-green-800">Documentos</h1>
          <p className="text-gray-500 text-sm">Histórico de pedidos e romaneios</p>
        </div>
        <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl">
          {(['todos', 'pedido', 'romaneio'] as const).map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={[
                'px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize',
                typeFilter === f
                  ? 'bg-green-700 text-white shadow'
                  : 'text-gray-500 hover:bg-gray-100',
              ].join(' ')}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente ou Nº..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-600"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="flex-1 p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-600"
            title="Data inicial"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 flex-shrink-0">até</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="flex-1 p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-600"
            title="Data final"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-red-500 hover:text-red-700 font-bold whitespace-nowrap"
            >
              limpar
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="bg-green-700 text-white rounded-xl px-5 py-3 flex flex-wrap gap-6 text-sm font-bold">
          <span>{filtered.length} documento{filtered.length !== 1 ? 's' : ''}</span>
          <span>Total M³: {summary.m3.toFixed(4)}</span>
          <span>Valor total: {fmt(summary.total)}</span>
        </div>
      )}

      {/* Document list */}
      <div className="space-y-3">
        {filtered.map(doc => (
          <div
            key={doc.id}
            className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
              <div
                className={[
                  'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                  doc.type === 'pedido'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-blue-50 text-blue-600',
                ].join(' ')}
              >
                {doc.type === 'pedido' ? (
                  <FileText className="w-5 h-5" />
                ) : (
                  <Truck className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {doc.type} Nº {doc.number}
                  </span>
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    {doc.date ? format(parseISO(doc.date + 'T12:00:00'), 'dd/MM/yyyy') : '—'}
                  </span>
                </div>
                <p className="font-black text-gray-900 group-hover:text-green-800 transition-colors">
                  {doc.clientName}
                </p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                  <span>{doc.totalM3.toFixed(4)} m³</span>
                  <span className="font-bold text-green-700">{fmt(doc.total)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/${doc.type === 'pedido' ? 'pedidos' : 'romaneios'}/${doc.id}`}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir
              </Link>
              <button
                onClick={() => handleDelete(doc.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-xl text-gray-400 italic">
            Nenhum documento encontrado.
          </div>
        )}
      </div>
    </div>
  );
};
