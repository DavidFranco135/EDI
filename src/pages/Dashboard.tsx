import React from 'react';
import { useApp } from '../store/AppContext';
import { Link } from 'react-router-dom';
import { Plus, Users, FileText, Truck, TrendingUp, ArrowRight, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion } from 'motion/react';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const Dashboard: React.FC = () => {
  const { state } = useApp();

  const totalM3 = state.documents.reduce((s, d) => s + d.totalM3, 0);
  const totalValue = state.documents.reduce((s, d) => s + d.total, 0);
  const recentDocs = state.documents.slice(0, 6);

  const stats = [
    {
      label: 'Cubicagem Total',
      value: `${totalM3.toFixed(2)} m³`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Volume Financeiro',
      value: fmt(totalValue),
      icon: FileText,
      color: 'text-green-700',
      bg: 'bg-green-50',
    },
    {
      label: 'Clientes',
      value: state.clients.length,
      icon: Users,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Documentos',
      value: state.documents.length,
      icon: Truck,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-8 pb-24 md:pb-0">
      <div>
        <h1 className="text-2xl font-black text-green-800">Bem-vindo, David!</h1>
        <p className="text-gray-500 text-sm">EDI – Gestão de Madeiras</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            to: '/pedidos/novo',
            icon: FileText,
            label: 'Novo Pedido',
            sub: 'Ordem para a fábrica',
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
          {
            to: '/romaneios/novo',
            icon: Truck,
            label: 'Novo Romaneio',
            sub: 'Dados de descarga',
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            to: '/clientes',
            icon: Users,
            label: 'Clientes',
            sub: 'Gestão de contatos',
            color: 'text-green-700',
            bg: 'bg-green-50',
          },
        ].map(item => (
          <Link
            key={item.to}
            to={item.to}
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
          >
            <div className={`w-9 h-9 ${s.bg} ${s.color} rounded-lg flex items-center justify-center mb-3`}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
            <p className="text-xl font-black text-gray-900 mt-0.5">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent docs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-800">Documentos Recentes</h2>
          <Link
            to="/relatorios"
            className="flex items-center gap-1 text-xs font-bold text-green-700 hover:underline"
          >
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {recentDocs.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentDocs.map(doc => (
                <Link
                  key={doc.id}
                  to={`/${doc.type === 'pedido' ? 'pedidos' : 'romaneios'}/${doc.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${doc.type === 'pedido' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{doc.clientName}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                        {doc.type} Nº {doc.number} •{' '}
                        {doc.date
                          ? format(parseISO(doc.date + 'T12:00:00'), 'dd/MM/yyyy')
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-700">{fmt(doc.total)}</p>
                    <p className="text-[10px] text-gray-400">{doc.totalM3.toFixed(4)} m³</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center py-10 text-gray-400 italic text-sm">
              Nenhum documento ainda.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
