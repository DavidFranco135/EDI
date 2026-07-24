export interface Client {
  id: string;
  name: string;
  cnpj?: string;
  ie?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  phone?: string;
  email?: string;
  paymentTerms?: string;
  notes?: string;
  createdAt: string;
}

export type CalcMode = 'qty_to_m3' | 'm3_to_qty';

export interface TimberItem {
  id: string;
  espessura: number;   // cm
  largura: number;     // cm
  c3: number;
  c4: number;
  c5: number;
  c6: number;
  pricePerM3: number;
  customM3?: number | null;
  calcMode: CalcMode;
}

export interface ProductItem {
  id: string;
  qty: number;
  unit: string;       // un, pc, m², par, etc.
  desc: string;
  priceUnit: number;
}

export interface CompensadoItem {
  id: string;
  desc: string;            // descrição do produto (ex: "Madeirite Plastificado 12mm")
  bitola: number;         // mm — espessura da chapa (ex: 9 a 20)
  comprimento: number;    // m — padrão 2,20
  largura: number;        // m — padrão 1,10
  qty: number;             // qtd de chapas
  pricePerChapa: number;  // R$ por chapa
}

export interface Bloco {
  id: string;
  label: string;        // ex: "Loja Centro", "Loja Norte"
  clientId?: string;
  clientName: string;
  clientData?: Partial<Client>;
  items: TimberItem[];  // legacy / single-block
  blocos?: Bloco[];     // multi-block mode
  docMode?: 'madeira' | 'produtos' | 'compensado';  // table mode
  productItems?: ProductItem[];          // used when docMode === 'produtos'
  compensadoItems?: CompensadoItem[];    // used when docMode === 'compensado'
}

export interface Document {
  id: string;
  type: 'pedido' | 'romaneio';
  number: string;
  date: string;
  clientId?: string;
  clientName: string;
  clientData?: Partial<Client>;       // fornecedor (pedido)
  items: TimberItem[];  // legacy / single-block
  blocos?: Bloco[];     // multi-block mode
  docPurpose?: 'cliente' | 'serraria';
  docMode?: 'madeira' | 'produtos' | 'compensado';  // table mode
  productItems?: ProductItem[];          // used when docMode === 'produtos'
  compensadoItems?: CompensadoItem[];    // used when docMode === 'compensado'
  subtotal: number;
  totalM3: number;
  total: number;
  freight?: number;
  freightIcms?: number;   // ICMS do frete — soma ao total, não deduz
  paymentMethod?: 'cheque' | 'dinheiro';  // forma das parcelas — cheque real ou dinheiro parcelado
  commissionPct: number;
  commissionValue: number;
  settlement?: number;
  paymentTerms?: string;
  notes: string;
  motorista?: string;
  supplier?: string;
  woodType?: 'pinus' | 'eucalipto' | 'compensado' | 'outro';
  status?: 'andamento' | 'concluido';
  extras?: Array<{ id: string; desc: string; valor: number; op: '+' | '-' }>;
  serrariaBaseValue?: number;
  settlementInfoOnly?: boolean;
  partnerCommissionShare?: number;
  partnerMarkup?: number;
  partnerName?: string;        // vendedor parceiro (se houver divisão)
  partnerSharePct?: number;    // % da comissão que vai para o parceiro (0-100)
  partnerShareMode?: 'percent' | 'fixed';  // modo de repasse: porcentagem ou valor fixo
  partnerShareFixed?: number;  // valor fixo em R$ do repasse (quando partnerShareMode === 'fixed')
  partnerShareValue?: number;  // valor calculado que vai para o parceiro
  myShareValue?: number;       // valor líquido que fica comigo

  // Controle de pagamentos do cliente
  payments?: Array<{
    id: string;
    date: string;          // YYYY-MM-DD
    valor: number;
    method: 'dinheiro' | 'cheque' | 'pix' | 'deposito' | 'cartao' | 'outro';
    notes?: string;
  }>;
  commissionPaid?: boolean;       // comissão já foi paga (a você)
  commissionPaidDate?: string;
  partnerPaid?: boolean;          // repasse ao parceiro já foi feito
  partnerPaidDate?: string;
  cheques?: Array<{ id: string; dias: number; vencimento: string; valor: number }>;
  romaneioId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PriceRef {
  id: string;
  desc: string;
  espessura: number;
  largura: number;
  price: number;
}

export interface AppSettings {
  companyName: string;
  companyAddress: string;
  companyNeighborhood: string;
  companyCity: string;
  companyCEP: string;
  companyCNPJ: string;
  companyPhone: string;
  companyEmail: string;
  defaultCommissionPct: number;
  priceRefs: PriceRef[];
}

export interface BouncedCheck {
  id: string;
  clientId?: string;
  clientName: string;
  romaneioId?: string;     // referência ao romaneio de origem, se houver
  numero?: string;         // número do cheque
  banco?: string;
  valor: number;
  dataEmissao?: string;
  dataDevolucao?: string;
  motivo: string;          // motivo da devolução (sem fundos, divergência assinatura, etc.)
  status: 'aguardando' | 'pago';
  dataPagamento?: string;
  notes?: string;
  photoData?: string;      // legacy — single photo (kept for backward compat)
  photos?: Array<{ id: string; data: string; label?: string }>;  // multiple photos
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  clients: Client[];
  documents: Document[];
  bouncedChecks?: BouncedCheck[];
  settings: AppSettings;
}
