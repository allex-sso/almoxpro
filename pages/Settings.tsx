import React, { useState, useEffect, useRef } from 'react';
import { Save, Database, CheckCircle, AlertCircle, ClipboardList } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

const SettingsPage: React.FC<SettingsProps> = ({ settings, onUpdateSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [showSuccess, setShowSuccess] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleChange = (key: keyof AppSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setShowSuccess(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Configurações</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Ajuste as conexões e preferências do sistema.</p>
      </div>

      {showSuccess && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white px-6 py-4 rounded-lg shadow-xl flex items-center border border-emerald-400">
            <CheckCircle className="w-6 h-6 mr-3" />
            <div><h4 className="font-bold">Sucesso!</h4><p className="text-sm">Configurações salvas.</p></div>
        </div>
      )}

      <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <h3 className="text-lg font-semibold mb-6 flex items-center">
          <Database className="w-5 h-5 mr-2 text-primary" />
          Conexão com Google Sheets
        </h3>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1 italic opacity-70">1. Estoque Atual</label>
            <input type="text" value={localSettings.inventoryUrl || ''} onChange={(e) => handleChange('inventoryUrl', e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-slate-800 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 italic opacity-70">2. Entrada de Itens</label>
            <input type="text" value={localSettings.inUrl || ''} onChange={(e) => handleChange('inUrl', e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-slate-800 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 italic opacity-70">3. Saída de Itens</label>
            <input type="text" value={localSettings.outUrl || ''} onChange={(e) => handleChange('outUrl', e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-slate-800 text-sm" />
          </div>

          {/* NOVO CAMPO OS */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <label className="flex items-center text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">
                <ClipboardList className="w-4 h-4 mr-1" />
                4. Link da Planilha de Ordens de Serviço (OS)
            </label>
            <input 
              type="text" 
              value={localSettings.osUrl || ''} 
              onChange={(e) => handleChange('osUrl', e.target.value)} 
              className="w-full p-2.5 rounded-lg border-2 border-blue-100 dark:border-blue-900 bg-white dark:bg-slate-800 text-sm shadow-sm"
              placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <label className="block text-sm font-medium mb-1">Taxa de Atualização Automática</label>
            <select value={localSettings.refreshRate} onChange={(e) => handleChange('refreshRate', Number(e.target.value))} className="w-full p-2.5 rounded-lg border dark:border-gray-600 dark:bg-slate-800">
              <option value={15}>A cada 15 segundos</option>
              <option value={30}>A cada 30 segundos</option>
              <option value={60}>A cada 1 minuto</option>
            </select>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button onClick={handleSave} className="flex items-center px-6 py-3 bg-primary text-white font-medium rounded-lg shadow-md">
            <Save className="w-5 h-5 mr-2" /> Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;