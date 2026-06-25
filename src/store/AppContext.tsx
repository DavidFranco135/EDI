import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';
import { AppData, Client, Document, AppSettings } from '../types';
import {
  initFirebase,
  isFirebaseConfigured,
  fbSaveClient,
  fbDeleteClient,
  fbLoadClients,
  fbSaveDocument,
  fbDeleteDocument,
  fbLoadDocuments,
  fbSaveSettings,
  fbLoadSettings,
} from '../lib/firebase';

// ─── State ───────────────────────────────────────────────────────────────────

interface AppState extends AppData {
  isFirebaseReady: boolean;
  isSyncing: boolean;
  lastSync?: string;
}

const defaultSettings: AppSettings = {
  companyName: 'EDI – REPRESENTAÇÕES COMERCIAIS LTDA',
  companyAddress: 'RUA ESTRADA DO CHALET N.18',
  companyNeighborhood: 'MADEIRA EM GERAL',
  companyCity: 'ITABORAÍ-RJ',
  companyCEP: '24855-312',
  companyCNPJ: '24.519.547/0001-66',
  companyPhone: '(021) 96421-7462',
  companyEmail: 'EJLIMA801@GMAIL.COM',
  defaultCommissionPct: 5,
  priceRefs: [
    { id: '1', desc: 'TÁBUA PINUS 30×1,8', espessura: 1.8, largura: 30, price: 1380 },
    { id: '2', desc: 'SARRAFO PINUS 5×3', espessura: 3, largura: 5, price: 1380 },
    { id: '3', desc: 'EUCALIPTO 7×7', espessura: 7, largura: 7, price: 1600 },
  ],
};

const initialState: AppState = {
  clients: [],
  documents: [],
  settings: defaultSettings,
  isFirebaseReady: false,
  isSyncing: false,
};

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOAD_LOCAL'; payload: Partial<AppData> }
  | { type: 'SET_FIREBASE_READY'; payload: boolean }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_LAST_SYNC'; payload: string }
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'UPDATE_CLIENT'; payload: Client }
  | { type: 'DELETE_CLIENT'; payload: string }
  | { type: 'ADD_DOCUMENT'; payload: Document }
  | { type: 'UPDATE_DOCUMENT'; payload: Document }
  | { type: 'DELETE_DOCUMENT'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: AppSettings }
  | { type: 'SET_CLIENTS'; payload: Client[] }
  | { type: 'SET_DOCUMENTS'; payload: Document[] };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_LOCAL':
      return { ...state, ...action.payload };
    case 'SET_FIREBASE_READY':
      return { ...state, isFirebaseReady: action.payload };
    case 'SET_SYNCING':
      return { ...state, isSyncing: action.payload };
    case 'SET_LAST_SYNC':
      return { ...state, lastSync: action.payload };
    case 'SET_CLIENTS':
      return { ...state, clients: action.payload };
    case 'SET_DOCUMENTS':
      return { ...state, documents: action.payload };
    case 'ADD_CLIENT':
      return { ...state, clients: [action.payload, ...state.clients] };
    case 'UPDATE_CLIENT':
      return {
        ...state,
        clients: state.clients.map(c =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case 'DELETE_CLIENT':
      return {
        ...state,
        clients: state.clients.filter(c => c.id !== action.payload),
      };
    case 'ADD_DOCUMENT':
      return {
        ...state,
        documents: [action.payload, ...state.documents.filter(d => d.id !== action.payload.id)],
      };
    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.map(d =>
          d.id === action.payload.id ? action.payload : d
        ),
      };
    case 'DELETE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.filter(d => d.id !== action.payload),
      };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: action.payload };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface ContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  saveClient: (c: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  saveDocument: (d: Document) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  saveSettings: (s: AppSettings) => Promise<void>;
  syncFromFirebase: () => Promise<void>;
}

const AppContext = createContext<ContextValue | undefined>(undefined);

const LS_KEY = 'edi_timber_v2';

function loadFromLS(): Partial<AppData> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToLS(data: Partial<AppData>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {}
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Load from localStorage immediately
    const local = loadFromLS();
    if (local.clients || local.documents || local.settings) {
      dispatch({ type: 'LOAD_LOCAL', payload: local });
    }

    // 2. Try Firebase
    const ok = initFirebase();
    dispatch({ type: 'SET_FIREBASE_READY', payload: ok });

    if (ok) {
      syncFromFirebase();
    }
  }, []);

  // ── Persist to localStorage ────────────────────────────────────────────────
  useEffect(() => {
    saveToLS({
      clients: state.clients,
      documents: state.documents,
      settings: state.settings,
    });
  }, [state.clients, state.documents, state.settings]);

  // ── Firebase sync ─────────────────────────────────────────────────────────
  const syncFromFirebase = useCallback(async () => {
    if (!isFirebaseConfigured()) return;
    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      const [clients, documents, settings] = await Promise.all([
        fbLoadClients(),
        fbLoadDocuments(),
        fbLoadSettings(),
      ]);
      dispatch({ type: 'SET_CLIENTS', payload: clients });
      dispatch({ type: 'SET_DOCUMENTS', payload: documents });
      if (settings) dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
      dispatch({ type: 'SET_LAST_SYNC', payload: new Date().toISOString() });
    } catch (e) {
      console.error('Firebase sync failed', e);
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  }, []);

  // ── CRUD helpers ──────────────────────────────────────────────────────────
  const saveClient = useCallback(async (client: Client) => {
    dispatch({
      type: client.id && state.clients.find(c => c.id === client.id)
        ? 'UPDATE_CLIENT'
        : 'ADD_CLIENT',
      payload: client,
    });
    if (isFirebaseConfigured()) await fbSaveClient(client);
  }, [state.clients]);

  const deleteClient = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_CLIENT', payload: id });
    if (isFirebaseConfigured()) await fbDeleteClient(id);
  }, []);

  const saveDocument = useCallback(async (document: Document) => {
    dispatch({ type: 'ADD_DOCUMENT', payload: document });
    if (isFirebaseConfigured()) await fbSaveDocument(document);
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_DOCUMENT', payload: id });
    if (isFirebaseConfigured()) await fbDeleteDocument(id);
  }, []);

  const saveSettings = useCallback(async (settings: AppSettings) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    if (isFirebaseConfigured()) await fbSaveSettings(settings);
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        saveClient,
        deleteClient,
        saveDocument,
        deleteDocument,
        saveSettings,
        syncFromFirebase,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
