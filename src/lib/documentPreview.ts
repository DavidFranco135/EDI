import { Document, AppSettings, Client } from '../types';
import { buildDocHTML } from './docHTML';
import { format } from 'date-fns';

/**
 * Abre a pré-visualização do documento EXATAMENTE como ele sai no PDF —
 * usa os valores já salvos no documento (subtotal, comissão, total etc,
 * calculados e persistidos no momento do "Salvar"), sem recalcular nada.
 * Usado tanto no botão de olho da lista (Relatórios) quanto dentro da
 * própria tela do Pedido/Romaneio.
 */
export function openDocumentPreview(doc: Document, settings: AppSettings, clients: Client[]) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Pop-up bloqueado. Permita pop-ups para este site e tente novamente.');
    return;
  }

  const displayDate = doc.date && !isNaN(new Date(doc.date).getTime())
    ? format(new Date(doc.date + 'T12:00:00'), 'dd/MM/yyyy')
    : '—';

  const client = (doc.blocos?.[0]?.clientData
    || clients.find(c => c.id === doc.blocos?.[0]?.clientId)
    || {}) as Record<string, any>;

  const extrasTotal = (doc.extras || []).reduce(
    (s, e) => e.op === '+' ? s + e.valor : s - e.valor, 0
  );

  const html = buildDocHTML({
    doc,
    type: doc.type as 'pedido' | 'romaneio',
    totals: { subtotal: doc.subtotal || 0, m3: doc.totalM3 || 0 },
    commission: doc.commissionValue || 0,
    total: doc.total || 0,
    displayDate,
    client,
    settings,
    cheques: doc.cheques || [],
    blocos: doc.blocos || [],
    eco: true,
    extras: doc.extras || [],
    extrasTotal,
    productItems: doc.productItems || [],
    compensadoItems: doc.compensadoItems || [],
  });

  win.document.write(html);
  win.document.close();
}
