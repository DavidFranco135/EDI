import { CompensadoItem } from '../types';

export interface DerivedCompensadoItem {
  areaChapa: number;
  areaTotal: number;
  value: number;
}

export function calcDerivedCompensado(item: CompensadoItem): DerivedCompensadoItem {
  const areaChapa = item.comprimento > 0 && item.largura > 0 ? item.comprimento * item.largura : 0;
  const areaTotal = areaChapa * item.qty;
  const value = item.qty * item.pricePerChapa;
  return { areaChapa, areaTotal, value };
}

export function totalAreaCompensado(items: CompensadoItem[]): number {
  return items.reduce((s, i) => s + calcDerivedCompensado(i).areaTotal, 0);
}

export function totalValueCompensado(items: CompensadoItem[]): number {
  return items.reduce((s, i) => s + calcDerivedCompensado(i).value, 0);
}

export function newEmptyCompensadoItem(bitola = 12): CompensadoItem {
  return {
    id: Math.random().toString(36).slice(2, 9),
    bitola,
    comprimento: 2.2,
    largura: 1.1,
    qty: 0,
    pricePerChapa: 0,
  };
}
