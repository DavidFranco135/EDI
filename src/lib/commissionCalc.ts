import { Document, Bloco } from '../types';
import { calcDerived } from './calc';

/**
 * Calcula subtotal, comissão e divisão com parceiro de um documento,
 * SEMPRE a partir dos dados brutos (itens, %, valor negociado etc) — não
 * depende dos campos já salvos (commissionValue/myShareValue), que podem
 * ficar desatualizados se o documento só passou por atualizações rápidas
 * (ex: marcar como pago) sem um "Salvar" completo depois de editado.
 *
 * Usado tanto pela tela de edição (pra manter uma fórmula única, sem
 * duplicar lógica) quanto pelo Dashboard/Relatórios, garantindo que a
 * soma de "Comissão a Receber" sempre bate com a realidade, mesmo pra
 * romaneios antigos com dados salvos desatualizados.
 */
export function calcDocumentFinancials(doc: Partial<Document>) {
  // ── Subtotal (madeira, produtos ou compensado) ──────────────────────────
  let subtotal = 0;
  let m3 = 0;
  if (doc.docMode === 'produtos') {
    subtotal = (doc.productItems || []).reduce((s, it) => s + it.qty * it.priceUnit, 0);
  } else if (doc.docMode === 'compensado') {
    subtotal = (doc.compensadoItems || []).reduce((s: number, it: any) => s + it.qty * it.pricePerChapa, 0);
  } else {
    (doc.blocos || []).forEach((bloco: Bloco) => {
      (bloco.items || []).forEach(item => {
        const d = calcDerived(item);
        m3 += d.finalM3;
        subtotal += d.value;
      });
    });
  }

  const freight = doc.freight || 0;
  const serrariaBaseValue = doc.serrariaBaseValue || 0;
  const usaValorServaria = serrariaBaseValue > 0;
  const temParceiro = !!(doc.partnerName && doc.partnerName.trim());

  const totalAPagarBruto = subtotal - freight;
  const diferencaVenda = usaValorServaria ? Math.max(0, totalAPagarBruto - serrariaBaseValue) : 0;
  const partnerMarkup = (usaValorServaria && temParceiro) ? diferencaVenda : 0;
  const ownerMarkup = (usaValorServaria && !temParceiro) ? diferencaVenda : 0;

  const acertoDeduzDoTotal = usaValorServaria ? 0 : (doc.settlement || 0);

  const baseComissao = usaValorServaria
    ? serrariaBaseValue
    : subtotal - freight - acertoDeduzDoTotal;
  const commission = doc.commissionPct ? Math.max(0, baseComissao) * (doc.commissionPct / 100) : 0;

  const acertoDisplay = usaValorServaria
    ? (temParceiro ? (partnerMarkup + commission) : ownerMarkup)
    : (doc.settlement || 0);

  const partnerSharePct = doc.partnerSharePct || 0;
  const partnerShareMode = doc.partnerShareMode || 'percent';
  const partnerCommissionShare = temParceiro
    ? (partnerShareMode === 'fixed'
        ? Math.min(doc.partnerShareFixed || 0, commission)
        : (partnerSharePct > 0 ? commission * (partnerSharePct / 100) : 0))
    : 0;

  const partnerShareValue = partnerCommissionShare + partnerMarkup;
  const myShareValue = commission - partnerCommissionShare + ownerMarkup;

  const extrasTotal = (doc.extras || []).reduce((s, e) => e.op === '+' ? s + e.valor : s - e.valor, 0);

  const total = usaValorServaria
    ? (temParceiro
        ? subtotal - freight - acertoDisplay + extrasTotal
        : subtotal - freight - commission - acertoDisplay + extrasTotal)
    : subtotal - freight - acertoDeduzDoTotal - commission + extrasTotal;

  return {
    subtotal, m3, commission, myShareValue, partnerShareValue,
    acertoDisplay, total, usaValorServaria, temParceiro,
  };
}
