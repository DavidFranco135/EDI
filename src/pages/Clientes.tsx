import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { Client } from '../types';
import { Plus, Search, Trash2, Edit2, Phone, Mail, MapPin, Building2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

const EMPTY: Partial<Client> = {};

export const Clientes: React.FC = () => {
  const { state, saveClient, deleteClient } = useApp();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Client>>(EMPTY);

  const filtered = useMemo(
    () =>
      state.clients.filter(
        c =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.cnpj?.includes(search) ||
          c.city?.toLowerCase().includes(search.toLowerCase())
      ),
    [state.clients, search]
  );

  const openNew = () => {
    setForm(EMPTY);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (c: Client) => {
    setForm({ ...c });
    setEditId(c.id);
    setShowForm(true);
  };

  const close = () => {
    setShowForm(false);
    setForm(EMPTY);
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    const now = new Date().toISOString();
    const client: Client = {
      ...form,
      id: editId || Math.random().toString(36).slice(2, 11),
      name: form.name!,
      createdAt: editId
        ? state.clients.find(c => c.id === editId)?.createdAt || now
        : now,
    };
    await saveClient(client);
    close();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este cliente?')) return;
    await deleteClient(id);
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-green-800">Clientes</h1>
          <p className="text-gray-500 text-sm">
            {state.clients.length} cliente{state.clients.length !== 1 ? 's' : ''} cadastrado{state.clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-green-700 text-white rounded-xl font-bold shadow-md hover:bg-green-800 transition-all"
        >
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, CNPJ ou cidade..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-green-600 shadow-sm text-sm"
        />
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-black text-green-800">
                  {editId ? 'Editar Cliente' : 'Cadastro de Cliente'}
                </h2>
                <button onClick={close} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Razão Social / Nome *" span={2}>
                    <input
                      required
                      value={form.name || ''}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      className={INPUT}
                      placeholder="Nome completo ou Razão Social"
                    />
                  </Field>
                  <Field label="CNPJ / CPF">
                    <input
                      value={form.cnpj || ''}
                      onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))}
                      className={INPUT}
                      placeholder="00.000.000/0000-00"
                    />
                  </Field>
                  <Field label="Inscrição Estadual">
                    <input
                      value={form.ie || ''}
                      onChange={e => setForm(p => ({ ...p, ie: e.target.value }))}
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Telefone">
                    <input
                      value={form.phone || ''}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      className={INPUT}
                      placeholder="(21) 99999-9999"
                    />
                  </Field>
                  <Field label="E-mail">
                    <input
                      type="email"
                      value={form.email || ''}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Endereço" span={2}>
                    <input
                      value={form.address || ''}
                      onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Bairro">
                    <input
                      value={form.neighborhood || ''}
                      onChange={e => setForm(p => ({ ...p, neighborhood: e.target.value }))}
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Cidade">
                    <input
                      value={form.city || ''}
                      onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Estado (UF)">
                    <input
                      value={form.state || ''}
                      onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                      className={INPUT}
                      placeholder="RJ"
                      maxLength={2}
                    />
                  </Field>
                  <Field label="CEP">
                    <input
                      value={form.cep || ''}
                      onChange={e => setForm(p => ({ ...p, cep: e.target.value }))}
                      className={INPUT}
                      placeholder="00000-000"
                    />
                  </Field>
                  <Field label="Condição de Pagamento" span={2}>
                    <input
                      value={form.paymentTerms || ''}
                      onChange={e => setForm(p => ({ ...p, paymentTerms: e.target.value }))}
                      className={INPUT}
                      placeholder="À vista, 30/60 dias..."
                    />
                  </Field>
                  <Field label="Observações" span={2}>
                    <textarea
                      value={form.notes || ''}
                      onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                      className={INPUT + ' min-h-[60px] resize-none'}
                    />
                  </Field>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-green-700 text-white py-2.5 rounded-xl font-bold hover:bg-green-800 transition-colors"
                  >
                    {editId ? 'Atualizar Cliente' : 'Salvar Cliente'}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(c => (
          <div
            key={c.id}
            className="group bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-black text-gray-900 group-hover:text-green-800 transition-colors">
                  {c.name}
                </h3>
                {c.cnpj && (
                  <span className="text-[10px] text-gray-400 font-mono">{c.cnpj}</span>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openEdit(c)}
                  className="p-1.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
              {c.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> {c.phone}
                </div>
              )}
              {c.email && (
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>
              )}
              {c.city && (
                <div className="flex items-center gap-1.5 col-span-2">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {[c.address, c.neighborhood, c.city, c.state].filter(Boolean).join(', ')}
                </div>
              )}
              {c.paymentTerms && (
                <div className="flex items-center gap-1.5 col-span-2">
                  <Building2 className="w-3 h-3 flex-shrink-0" />
                  Pgto: {c.paymentTerms}
                </div>
              )}
            </div>
            <p className="text-[9px] text-gray-300 mt-2 text-right">
              Cadastrado em {format(new Date(c.createdAt), 'dd/MM/yyyy')}
            </p>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-16 text-gray-400 italic border border-dashed border-gray-200 rounded-xl bg-white">
            Nenhum cliente encontrado.
          </div>
        )}
      </div>
    </div>
  );
};

const INPUT = 'w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-600 text-sm transition-colors';

const Field: React.FC<{
  label: string;
  span?: number;
  children: React.ReactNode;
}> = ({ label, span, children }) => (
  <div className={span === 2 ? 'md:col-span-2 space-y-1' : 'space-y-1'}>
    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
      {label}
    </label>
    {children}
  </div>
);
