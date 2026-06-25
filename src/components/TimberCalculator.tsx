import React, { useMemo, useState } from 'react';
import { TimberItem, CalcMode } from '../types';
import { calcDerived, newEmptyItem, m3ToQty } from '../lib/calc';
import { Trash2, Plus, ArrowRightLeft, Info } from 'lucide-react';
import { useApp } from '../store/AppContext';

interface Props {
  items: TimberItem[];
  onChange: (items: TimberItem[]) => void;
  readOnly?: boolean;
}

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

const NUM_CLS =
  'w-full p-2 bg-transparent text-center focus:bg-green-50 focus:outline-none transition-colors tabular-nums text-sm';

export const TimberCalculator: React.FC<Props> = ({
  items,
  onChange,
  readOnly,
}) => {
  const { state } = useApp();
  const [targetM3, setTargetM3] = useState<Record<string, string>>({});

  const update = (id: string, field: keyof TimberItem, val: any) => {
    onChange(items.map(it => (it.id === id ? { ...it, [field]: val } : it)));
  };

  const toggleMode = (id: string) => {
    onChange(
      items.map(it =>
        it.id === id
          ? {
              ...it,
              calcMode: it.calcMode === 'qty_to_m3' ? 'm3_to_qty' : 'qty_to_m3',
            }
          : it
      )
    );
  };

  // When user sets target M³ in m3_to_qty mode and a single comprimento
  const applyM3toQty = (id: string, item: TimberItem) => {
    const target = parseFloat(targetM3[id] || '0');
    if (!target) return;

    // Determine active comprimento (user should have one length selected)
    const lengths: Array<[keyof TimberItem, number]> = [
      ['c3', 3],
      ['c4', 4],
      ['c5', 5],
      ['c6', 6],
    ];

    // Distribute proportionally to existing non-zero lengths,
    // or equally if none set
    const active = lengths.filter(([k]) => (item[k] as number) > 0);
    const targets = active.length > 0 ? active : [lengths[0]]; // default to 3m

    const totalExisting = targets.reduce(
      (s, [k]) => s + (item[k] as number) * 0,
      0
    );

    // Simple: fill the first active or 3m length only
    const [key, comp] = targets[0];
    const qty = m3ToQty(target, item.espessura, item.largura, comp);
    const updated = { ...item, [key]: qty, customM3: target };
    onChange(items.map(it => (it.id === id ? updated : it)));
  };

  const addItem = () => onChange([...items, newEmptyItem()]);
  const remove = (id: string) => onChange(items.filter(it => it.id !== id));

  const totals = useMemo(() => {
    return items.reduce(
      (acc, it) => {
        const d = calcDerived(it);
        acc.m3 += d.finalM3;
        acc.value += d.value;
        acc.qty += d.qtyTotal;
        return acc;
      },
      { m3: 0, value: 0, qty: 0 }
    );
  }, [items]);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border border-gray-300 rounded bg-white shadow-sm">
        <table className="w-full border-collapse text-xs" style={{ minWidth: 900 }}>
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th
                rowSpan={2}
                className="border border-gray-300 px-2 py-1 text-center font-bold text-[10px] uppercase tracking-wider bg-gray-200"
              >
                Modo
              </th>
              <th
                rowSpan={2}
                className="border border-gray-300 px-2 py-1 text-center font-bold text-[10px] uppercase tracking-wider"
              >
                Bitola<br />(cm)
              </th>
              <th
                rowSpan={2}
                className="border border-gray-300 px-2 py-1 text-center font-bold text-[10px] uppercase tracking-wider"
              >
                Largura<br />(cm)
              </th>
              <th
                colSpan={4}
                className="border border-gray-300 px-2 py-1 text-center font-bold text-[10px] uppercase tracking-wider bg-green-50"
              >
                Comprimento (m) — Quantidade de Peças
              </th>
              <th
                rowSpan={2}
                className="border border-gray-300 px-2 py-1 text-center font-bold text-[10px] uppercase tracking-wider"
              >
                Quant.<br />Peças
              </th>
              <th
                rowSpan={2}
                className="border border-gray-300 px-2 py-1 text-center font-bold text-[10px] uppercase tracking-wider"
              >
                Metros<br />Lineares
              </th>
              <th
                rowSpan={2}
                className="border border-gray-300 px-2 py-1 text-center font-bold text-[10px] uppercase tracking-wider"
              >
                Valor<br />M³ (R$)
              </th>
              <th
                rowSpan={2}
                className="border border-gray-300 px-2 py-1 text-center font-bold text-[10px] uppercase tracking-wider"
              >
                Média<br />Comp.
              </th>
              <th
                rowSpan={2}
                className="border border-gray-300 px-2 py-1 text-center font-bold text-[10px] uppercase tracking-wider bg-green-100"
              >
                M³
              </th>
              <th
                rowSpan={2}
                className="border border-gray-300 px-2 py-1 text-center font-bold text-[10px] uppercase tracking-wider bg-yellow-50"
              >
                VALOR
              </th>
              {!readOnly && <th rowSpan={2} className="w-8 border border-gray-300" />}
            </tr>
            <tr className="bg-green-50">
              {['3,00', '4,00', '5,00', '6,00'].map(l => (
                <th
                  key={l}
                  className="border border-gray-300 px-2 py-0.5 text-center font-bold text-[10px]"
                >
                  {l}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {items.map(item => {
              const d = calcDerived(item);
              const isM3Mode = item.calcMode === 'm3_to_qty';

              return (
                <React.Fragment key={item.id}>
                  <tr className={cn('hover:bg-gray-50', isM3Mode && 'bg-blue-50/30')}>
                    {/* Mode Toggle */}
                    <td className="border border-gray-300 text-center p-1">
                      {!readOnly && (
                        <button
                          onClick={() => toggleMode(item.id)}
                          title={
                            isM3Mode
                              ? 'Modo: M³ → Quantidade (clique para inverter)'
                              : 'Modo: Quantidade → M³ (clique para inverter)'
                          }
                          className={cn(
                            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all',
                            isM3Mode
                              ? 'bg-blue-600 text-white'
                              : 'bg-green-700 text-white'
                          )}
                        >
                          <ArrowRightLeft className="w-2.5 h-2.5" />
                          {isM3Mode ? 'M³→QTD' : 'QTD→M³'}
                        </button>
                      )}
                    </td>

                    {/* Bitola */}
                    <td className="border border-gray-300">
                      <input
                        type="number"
                        step="0.1"
                        value={item.espessura || ''}
                        onChange={e => update(item.id, 'espessura', parseFloat(e.target.value) || 0)}
                        disabled={readOnly}
                        className={NUM_CLS}
                        placeholder="ex: 1.8"
                      />
                    </td>

                    {/* Largura */}
                    <td className="border border-gray-300">
                      <input
                        type="number"
                        step="0.1"
                        value={item.largura || ''}
                        onChange={e => update(item.id, 'largura', parseFloat(e.target.value) || 0)}
                        disabled={readOnly}
                        className={NUM_CLS}
                        placeholder="ex: 30"
                      />
                    </td>

                    {/* C3 C4 C5 C6 */}
                    {(['c3', 'c4', 'c5', 'c6'] as const).map(ck => (
                      <td key={ck} className="border border-gray-300 bg-green-50/40">
                        <input
                          type="number"
                          value={item[ck] || ''}
                          onChange={e => update(item.id, ck, parseInt(e.target.value) || 0)}
                          disabled={readOnly}
                          className={NUM_CLS}
                        />
                      </td>
                    ))}

                    {/* Qty */}
                    <td className="border border-gray-300 text-center font-bold text-gray-700 bg-gray-50">
                      {d.qtyTotal || '–'}
                    </td>

                    {/* Linear meters */}
                    <td className="border border-gray-300 text-center text-gray-600">
                      {d.linearMeters.toFixed(3)}
                    </td>

                    {/* Price per M³ */}
                    <td className="border border-gray-300 bg-yellow-50/50">
                      <input
                        type="number"
                        value={item.pricePerM3 || ''}
                        onChange={e => update(item.id, 'pricePerM3', parseFloat(e.target.value) || 0)}
                        disabled={readOnly}
                        className={cn(NUM_CLS, 'font-bold text-green-800')}
                        placeholder="R$/m³"
                      />
                    </td>

                    {/* Avg */}
                    <td className="border border-gray-300 text-center text-gray-500 italic">
                      {d.avgLength.toFixed(2)}
                    </td>

                    {/* M³ – editable in qty_to_m3, shows auto in m3 mode */}
                    <td className="border border-gray-300 bg-green-50">
                      <input
                        type="number"
                        step="0.0001"
                        value={item.customM3 !== null && item.customM3 !== undefined ? item.customM3 : ''}
                        placeholder={d.m3Auto.toFixed(4)}
                        onChange={e =>
                          update(
                            item.id,
                            'customM3',
                            e.target.value === '' ? null : parseFloat(e.target.value)
                          )
                        }
                        disabled={readOnly}
                        className={cn(NUM_CLS, 'font-bold text-green-700 placeholder:opacity-40')}
                      />
                    </td>

                    {/* Value */}
                    <td className="border border-gray-300 text-right px-2 font-bold text-gray-900 bg-yellow-50/60 tabular-nums">
                      {d.value.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>

                    {!readOnly && (
                      <td className="border border-gray-300 text-center p-1">
                        <button
                          onClick={() => remove(item.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>

                  {/* M³ → QTD mode: extra input row */}
                  {isM3Mode && !readOnly && (
                    <tr className="bg-blue-50/60">
                      <td
                        colSpan={3}
                        className="border border-gray-300 px-2 py-1 text-[10px] text-blue-700 font-bold text-right"
                      >
                        <Info className="w-3 h-3 inline mr-1" />
                        Informe o M³ desejado e o comprimento acima → calcula qtd:
                      </td>
                      <td colSpan={4} className="border border-gray-300 px-2 py-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.001"
                            placeholder="M³ desejado"
                            value={targetM3[item.id] || ''}
                            onChange={e =>
                              setTargetM3(prev => ({ ...prev, [item.id]: e.target.value }))
                            }
                            className="w-28 p-1 border border-blue-300 rounded text-xs text-center"
                          />
                          <button
                            onClick={() => applyM3toQty(item.id, item)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700 transition-colors"
                          >
                            Calcular QTD
                          </button>
                        </div>
                      </td>
                      <td colSpan={100} className="border border-gray-300 px-2 text-[10px] text-blue-600">
                        Resultado em M³: <strong>{d.finalM3.toFixed(4)}</strong> | Qtd calculada nas colunas acima
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {items.length === 0 && (
              <tr>
                <td
                  colSpan={14}
                  className="text-center py-6 text-gray-400 italic text-sm border border-gray-300"
                >
                  Nenhuma peça adicionada. Clique em "Adicionar Peça" abaixo.
                </td>
              </tr>
            )}
          </tbody>

          <tfoot>
            <tr className="bg-gray-800 text-white font-bold">
              <td
                colSpan={6}
                className="border border-gray-600 px-3 py-2 text-right text-xs uppercase tracking-wider"
              >
                Total em m³ →
              </td>
              <td className="border border-gray-600 px-2 py-2 text-center tabular-nums">
                {totals.qty}
              </td>
              <td colSpan={3} className="border border-gray-600" />
              <td className="border border-gray-600 px-2 py-2 text-center text-green-300 tabular-nums">
                {totals.m3.toFixed(4)}
              </td>
              <td className="border border-gray-600 px-2 py-2 text-right tabular-nums text-yellow-300">
                {totals.value.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </td>
              {!readOnly && <td className="border border-gray-600" />}
            </tr>
          </tfoot>
        </table>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-4">
          <button
            onClick={addItem}
            className="flex items-center gap-2 px-4 py-2 border border-green-700 text-green-800 rounded-lg text-xs font-bold hover:bg-green-50 transition-colors"
          >
            <Plus className="w-4 h-4" /> Adicionar Peça
          </button>
          {state.settings.priceRefs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                Ref. preços:
              </span>
              {state.settings.priceRefs.map(ref => (
                <button
                  key={ref.id}
                  onClick={() => {
                    const ni = newEmptyItem();
                    onChange([
                      ...items,
                      {
                        ...ni,
                        espessura: ref.espessura,
                        largura: ref.largura,
                        pricePerM3: ref.price,
                      },
                    ]);
                  }}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded text-[10px] font-medium transition-colors"
                >
                  {ref.desc}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
