import React from 'react';
import { useApp } from '../store/AppContext';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users, FileText, Truck, ArrowRight, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion } from 'motion/react';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const Dashboard: React.FC = () => {
  const { state, saveDocument } = useApp();
  const navigate = useNavigate();

  const pedidosAndamento = state.documents.filter(
    d => d.type === 'pedido' && d.status !== 'concluido'
  );

  const marcarConcluido = async (id: string) => {
    const doc = state.documents.find(d => d.id === id);
    if (!doc) return;
    await saveDocument({ ...doc, status: 'concluido', updatedAt: new Date().toISOString() });
  };

  const criarRomaneio = (pedidoId: string) => {
    navigate(`/romaneios/novo?from=${pedidoId}`);
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div>
        <h1 className="text-2xl font-black text-green-800">Bem-vindo, David!</h1>
        <p className="text-gray-500 text-sm">EDI – Gestão de Madeiras</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { to: '/pedidos/novo', icon: FileText, label: 'Novo Pedido', sub: 'Ordem para a fábrica', color: 'text-amber-600', bg: 'bg-amber-50' },
          { to: '/romaneios/novo', icon: Truck, label: 'Novo Romaneio', sub: 'Dados de descarga', color: 'text-blue-600', bg: 'bg-blue-50' },
          { to: '/clientes', icon: Users, label: 'Clientes', sub: 'Gestão de contatos', color: 'text-green-700', bg: 'bg-green-50' },
        ].map(item => (
          <Link key={item.to} to={item.to}
            className="group flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-green-300 transition-all"
          >
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
            className="flex items-center gap-1 text-xs font-bold text-green-700 hover:underline"
          >
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {pedidosAndamento.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-300 mx-auto mb-2" />
            <p className="text-gray-400 italic text-sm">Nenhum pedido em andamento.</p>
            <Link to="/pedidos/novo"
              className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-green-700 hover:underline"
            >
              <Plus className="w-3 h-3" /> Criar novo pedido
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidosAndamento.slice(0, 5).map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm"
              >
                {/* Header do card */}
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

                {/* Ações */}
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50/50">
                  <Link
                    to={`/pedidos/${doc.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all"
                  >
                    <FileText className="w-3 h-3" /> Ver Pedido
                  </Link>
                  <button
                    onClick={() => criarRomaneio(doc.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all"
                  >
                    <Truck className="w-3 h-3" /> Criar Romaneio
                  </button>
                  <button
                    onClick={() => marcarConcluido(doc.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white rounded-lg text-xs font-bold hover:bg-green-800 transition-all ml-auto"
                  >
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
