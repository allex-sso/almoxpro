
import React, { useState, useEffect, useRef } from 'react';
import { Save, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

const SettingsPage: React.FC<SettingsProps> = ({ settings, onUpdateSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Uso de ReturnType<typeof setTimeout> para compatibilidade universal (Node/Browser)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincroniza estado local se as props mudarem externamente
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Limpeza do timer ao desmontar o componente
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (key: keyof AppSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setShowSuccess(true);
    
    // Limpa timer anterior se houver cliques rápidos
    if (timerRef.current) clearTimeout(timerRef.current);

    // Esconde a mensagem após 3 segundos
    timerRef.current = setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300 relative">
      
      {/* Success Toast Notification */}
      {showSuccess && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white px-6 py-4 rounded-lg shadow-xl flex items-center animate-in slide-in-from-right-5 fade-in duration-300 border border-emerald-400">
            <div className="bg-white/20 p-2 rounded-full mr-3">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
                <h4 className="font-bold text-lg">Sucesso!</h4>
                <p className="text-sm text-emerald-50 font-medium">Configurações salvas com sucesso.</p>
            </div>
        </div>
      )}

      <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center">
          <Database className="w-5 h-5 mr-2 text-primary" />
          Conexão com Google Sheets
        </h3>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6 text-sm text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800 flex items-start">
           <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
           <div>
             <p className="font-bold mb-2">Como configurar:</p>
             <ul className="list-disc pl-5 space-y-1">
               <li>No Google Sheets, vá em <strong>Arquivo {'>'} Compartilhar {'>'} Publicar na web</strong>.</li>
               <li>Para cada aba abaixo (Estoque, Entrada, Saída), selecione a aba específica no menu suspenso.</li>
               <li>Escolha o formato <strong>Valores separados por vírgula (.csv)</strong>.</li>
               <li>Copie o link gerado e cole no campo correspondente abaixo.</li>
             </ul>
           </div>
        </div>

        <div className="space-y-6">
          {/* ESTOQUE ATUAL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              1. Link da aba "Estoque Atual" (Principal)
            </label>
            <input 
              type="text"
              value={localSettings.inventoryUrl || ''}
              onChange={(e) => handleChange('inventoryUrl', e.target.value)}
              className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none text-sm transition-shadow"
              placeholder="https://docs.google.com...output=csv"
            />
          </div>

          {/* ENTRADAS */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              2. Link da aba "Entrada de Itens" (Histórico)
            </label>
            <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-gray-500">Necessário para recuperar o <strong>Fornecedor</strong> e histórico de entradas.</p>
            </div>
            <input 
              type="text"
              value={localSettings.inUrl || ''}
              onChange={(e) => handleChange('inUrl', e.target.value)}
              className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none text-sm transition-shadow"
              placeholder="https://docs.google.com...output=csv"
            />
          </div>

          {/* SAIDAS */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              3. Link da aba "Saída de Itens" (Histórico)
            </label>
            <input 
              type="text"
              value={localSettings.outUrl || ''}
              onChange={(e) => handleChange('outUrl', e.target.value)}
              className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none text-sm transition-shadow"
              placeholder="https://docs.google.com...output=csv"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Taxa de Atualização Automática
            </label>
            <select 
              value={localSettings.refreshRate}
              onChange={(e) => handleChange('refreshRate', Number(e.target.value))}
              className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value={15}>A cada 15 segundos</option>
              <option value={30}>A cada 30 segundos</option>
              <option value={60}>A cada 1 minuto</option>
              <option value={300}>A cada 5 minutos</option>
            </select>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button 
            onClick={handleSave}
            className="flex items-center px-6 py-3 bg-primary hover:bg-blue-700 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <Save className="w-5 h-5 mr-2" />
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
