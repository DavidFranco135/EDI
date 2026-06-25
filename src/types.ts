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

export interface Document {
  id: string;
  type: 'pedido' | 'romaneio';
  number: string;
  date: string;
  clientId?: string;
  clientName: string;
  clientData?: Partial<Client>;
  supplier?: string;       // fornecedor (pedido)
  items: TimberItem[];
  subtotal: number;
  totalM3: number;
  total: number;
  freight?: number;
  commissionPct: number;
  commissionValue: number;
  settlement?: number;
  paymentTerms?: string;
  notes: string;
  motorista?: string;
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

export interface AppData {
  clients: Client[];
  documents: Document[];
  settings: AppSettings;
}
