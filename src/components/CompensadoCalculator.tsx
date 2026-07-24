import React, { useMemo } from 'react';
import { CompensadoItem } from '../types';
import { calcDerivedCompensado, newEmptyCompensadoItem } from '../lib/calcCompensado';
import { Trash2, Plus } from 'lucide-react';

interface Props {
  items: CompensadoItem[];
  onChange: (items: CompensadoItem[]) => void;
  readOnly?: boolean;
}

const NUM = 'w-full p-2 bg-transparent text-center focus:bg-amber-50 focus:outline-none transition-colors tabular-nums text-sm';

const BITOLAS_COMUNS = [9, 10, 12, 14, 15, 17, 18, 20];

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const CompensadoCalculator: React.FC<Props> = ({ items, onChange, readOnly }) => {
  const update = (id: string, field: keyof CompensadoItem, val: any) =>
    onChange(items.map(it => (it.id === id ? { ...it, [field]: val } : it)));

  const remove = (id: string) => onChange(items.filter(it => it.id !== id));

  const totals = useMemo(() =>
    items.reduce((acc, it) => {
      const d = calcDerivedCompensado(it);
      acc.qty += it.qty;
      acc.area += d.areaTotal;
      acc.value += d.value;
      return acc;
    }, { qty: 0, area: 0, value: 0 }),
    [items]
  );

  return (
    <div className="space-y-3 max-w-full">
      <div className="overflow-x-auto rounded border border-gray-300 bg-white shadow-sm" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table className="w-full border-collapse text-xs" style={{ minWidth: 720 }}>
          <thead>
            <tr className="bg-amber-700 text-white">
              <th className="border border-amber-600 px-2 py-2 text-center font-bold text-[11px] uppercase w-24">Bitola<br />(mm)</th>
              <th className="border border-amber-600 px-2 py-2 text-center font-bold text-[11px] uppercase w-24">Compr.<br />(m)</th>
              <th className="border border-amber-600 px-2 py-2 text-center font-bold text-[11px] uppercase w-24">Larg.<br />(m)</th>
              <th className="border border-amber-600 px-2 py-2 text-center font-bold text-[11px] uppercase w-20">Qtd<br />Chapas</th>
              <th className="border border-amber-600 px-2 py-2 text-center font-bold text-[11px] uppercase w-24">Área/Chapa<br />(m²)</th>
              <th className="border border-amber-600 px-2 py-2 text-center font-bold text-[11px] uppercase w-24">Área Total<br />(m²)</th>
              <th className="border border-amber-600 px-2 py-2 text-center font-bold text-[11px] uppercase w-28">Preço/Chapa<br />(R$)</th>
              <th className="border border-amber-600 px-2 py-2 text-right font-bold text-[11px] uppercase bg-yellow-600 w-32">VALOR</th>
              {!readOnly && <th className="w-8 border border-amber-600" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, i) => {
              const d = calcDerivedCompensado(item);
              return (
                <tr key={item.id} className={i % 2 === 0 ? 'bg-white hover:bg-amber-50/20' : 'bg-gray-50/50 hover:bg-amber-50/20'}>
                  <td className="border border-gray-200">
                    <input type="number" step="1" value={item.bitola || ''}
                      onChange={e => update(item.id, 'bitola', parseFloat(e.target.value) || 0)}
                      disabled={readOnly} className={NUM} placeholder="9 a 20" />
                  </td>
                  <td className="border border-gray-200">
                    <input type="number" step="0.01" value={item.comprimento || ''}
                      onChange={e => update(item.id, 'comprimento', parseFloat(e.target.value) || 0)}
                      disabled={readOnly} className={NUM} placeholder="2,20" />
                  </td>
                  <td className="border border-gray-200">
                    <input type="number" step="0.01" value={item.largura || ''}
                      onChange={e => update(item.id, 'largura', parseFloat(e.target.value) || 0)}
                      disabled={readOnly} className={NUM} placeholder="1,10" />
                  </td>
                  <td className="border border-gray-200">
                    <input type="number" value={item.qty || ''}
                      onChange={e => update(item.id, 'qty', parseInt(e.target.value) || 0)}
                      disabled={readOnly} className={NUM} placeholder="0" />
                  </td>
                  <td className="border border-gray-200 text-center text-gray-600 bg-gray-50">
                    {d.areaChapa > 0 ? d.areaChapa.toFixed(2) : '—'}
                  </td>
                  <td className="border border-gray-200 text-center font-bold text-amber-800 bg-amber-50/50">
                    {d.areaTotal > 0 ? d.areaTotal.toFixed(2) : '—'}
                  </td>
                  <td className="border border-gray-200 bg-yellow-50/40">
                    <input type="number" step="0.01" value={item.pricePerChapa || ''}
                      onChange={e => update(item.id, 'pricePerChapa', parseFloat(e.target.value) || 0)}
                      disabled={readOnly} className={NUM + ' font-bold text-amber-800'} placeholder="0,00" />
                  </td>
                  <td className="border border-gray-200 text-right px-3 font-bold text-gray-900 bg-yellow-50/60 tabular-nums">
                    {fmt(d.value)}
                  </td>
                  {!readOnly && (
                    <td className="border border-gray-200 text-center p-1">
                      <button onClick={() => remove(item.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400 italic text-sm border border-gray-200">
                  Nenhuma chapa adicionada. Clique em "Adicionar Chapa" abaixo.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-800 text-white font-bold">
              <td colSpan={3} className="border border-gray-600 px-3 py-2 text-right text-xs uppercase tracking-wider opacity-70">
                Totais →
              </td>
              <td className="border border-gray-600 px-2 py-2 text-center tabular-nums">{totals.qty}</td>
              <td className="border border-gray-600" />
              <td className="border border-gray-600 px-2 py-2 text-center text-amber-300 tabular-nums font-bold">
                {totals.area.toFixed(2)} m²
              </td>
              <td className="border border-gray-600" />
              <td className="border border-gray-600 px-3 py-2 text-right tabular-nums text-yellow-300">
                {fmt(totals.value)}
              </td>
              {!readOnly && <td className="border border-gray-600" />}
            </tr>
          </tfoot>
        </table>
      </div>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => onChange([...items, newEmptyCompensadoItem()])}
            className="flex items-center gap-2 px-4 py-2 border border-amber-700 text-amber-800 rounded-lg text-xs font-bold hover:bg-amber-50 transition-colors">
            <Plus className="w-4 h-4" /> Adicionar Chapa
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Bitolas rápidas:</span>
            {BITOLAS_COMUNS.map(b => (
              <button key={b}
                onClick={() => onChange([...items, newEmptyCompensadoItem(b)])}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-[10px] font-medium transition-colors">
                {b}mm
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
