import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Users,
  FileText,
  Truck,
  BarChart3,
  Settings,
  Cloud,
  CloudOff,
  RefreshCw,
  Menu,
  X,
  Home,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { motion, AnimatePresence } from 'motion/react';

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

const nav = [
  { path: '/', icon: Home, label: 'Dashboard', exact: true },
  { path: '/clientes', icon: Users, label: 'Clientes' },
  { path: '/pedidos/novo', icon: FileText, label: 'Novo Pedido' },
  { path: '/romaneios/novo', icon: Truck, label: 'Novo Romaneio' },
  { path: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { path: '/configuracoes', icon: Settings, label: 'Configurações' },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, syncFromFirebase } = useApp();
  const [mobile, setMobile] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100">
      {/* ── Sidebar Desktop ── */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-200 sticky top-0 h-screen no-print">
        <div className="p-5 border-b border-gray-200">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl">🌲</span>
            <div>
              <p className="text-sm font-black text-green-800 leading-tight tracking-tight">EDI Madeiras</p>
              <p className="text-[9px] text-gray-400 uppercase tracking-widest">Gestão Comercial</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-green-700 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <div className="flex items-center gap-1.5">
              {state.isFirebaseReady ? (
                <Cloud className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <CloudOff className="w-3.5 h-3.5 text-red-400" />
              )}
              {state.isFirebaseReady ? 'Firebase ativo' : 'Local apenas'}
            </div>
            <button
              onClick={syncFromFirebase}
              disabled={state.isSyncing}
              className="p-1 hover:text-green-700 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={cn('w-3 h-3', state.isSyncing && 'animate-spin')} />
            </button>
          </div>
          {state.lastSync && (
            <p className="text-[9px] text-gray-300 text-center">
              Sync: {new Date(state.lastSync).toLocaleTimeString('pt-BR')}
            </p>
          )}
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50 no-print">
        <Link to="/" className="flex items-center gap-2">
          <span>🌲</span>
          <span className="font-black text-green-800 text-sm">EDI Madeiras</span>
        </Link>
        <button onClick={() => setMobile(!mobile)}>
          {mobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      <AnimatePresence>
        {mobile && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="fixed inset-0 bg-white z-40 md:hidden flex flex-col no-print pt-16"
          >
            <nav className="flex-1 px-4 py-4 space-y-1">
              {nav.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  onClick={() => setMobile(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-4 px-4 py-3 rounded-xl text-base font-semibold transition-all',
                      isActive
                        ? 'bg-green-700 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    )
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main ── */}
      <main className="flex-1 min-w-0">
        <div className="p-4 md:p-6 lg:p-8 pb-24 md:pb-8">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 grid grid-cols-5 no-print z-30">
        {nav.slice(0, 5).map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 py-2 transition-colors',
                isActive ? 'text-green-700' : 'text-gray-400'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[9px] font-bold">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
