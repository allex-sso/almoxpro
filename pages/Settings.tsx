
import React, { useState } from 'react';
import { Save, Plus, Trash2, Shield, Settings, Layout, ClipboardList, Link as LinkIcon, Calendar, Hash, ExternalLink, Copy, Upload, Download, AlertCircle } from 'lucide-react';
import { AppSettings, SectorProfile, CentralSource } from '../types';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
  isMasterAccount: boolean;
}

const SettingsPage: React.FC<SettingsProps> = ({ settings, onUpdateSettings, isMasterAccount }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(settings.activeProfileId);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const addProfile = () => {
    if (!isMasterAccount) return;
    
    // Define a chave automática: (total de perfis + 1) * 10
    const nextKey = (localSettings.profiles.length + 1) * 10;
    
    const newProfile: SectorProfile = {
      id: `setor-${Date.now()}`,
      name: 'Novo Setor',
      accessKey: String(nextKey),
      inventoryUrl: '',
      inUrl: '',
      outUrl: '',
      osUrl: '',
      isCentral: false,
      sources: []
    };
    setLocalSettings(prev => ({ ...prev, profiles: [...prev.profiles, newProfile] }));
    setEditingProfileId(newProfile.id);
  };

  const removeProfile = (id: string) => {
    if (!isMasterAccount) return;
    if (id === 'almox-pecas') return alert('Não é possível remover o perfil mestre.');
    if (localSettings.profiles.length <= 1) return alert('O sistema deve ter pelo menos um setor cadastrado.');
    if (confirm('Tem certeza que deseja excluir este setor?')) {
      setLocalSettings(prev => ({ 
        ...prev, 
        profiles: prev.profiles.filter(p => p.id !== id),
        activeProfileId: prev.activeProfileId === id ? prev.profiles[0].id : prev.activeProfileId
      }));
    }
  };

  const updateProfileField = (id: string, field: keyof SectorProfile, value: any) => {
    if (!isMasterAccount) return;
    setLocalSettings(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const addSource = (profileId: string) => {
    const profile = localSettings.profiles.find(p => p.id === profileId);
    if (!profile) return;
    const newSource: CentralSource = { label: 'Nova Fonte', url: '' };
    const updatedSources = [...(profile.sources || []), newSource];
    updateProfileField(profileId, 'sources', updatedSources);
  };

  const removeSource = (profileId: string, index: number) => {
    const profile = localSettings.profiles.find(p => p.id === profileId);
    if (!profile || !profile.sources) return;
    const updatedSources = profile.sources.filter((_, i) => i !== index);
    updateProfileField(profileId, 'sources', updatedSources);
  };

  const updateSource = (profileId: string, index: number, field: keyof CentralSource, value: string) => {
    const profile = localSettings.profiles.find(p => p.id === profileId);
    if (!profile || !profile.sources) return;
    const updatedSources = [...profile.sources];
    updatedSources[index] = { ...updatedSources[index], [field]: value };
    updateProfileField(profileId, 'sources', updatedSources);
  };

  const currentProfile = localSettings.profiles.find(p => p.id === editingProfileId);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white font-sans tracking-tight">Configurações Administrativas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Controle central de acesso e integração de dados.</p>
        </div>
        <button onClick={handleSave} className="flex items-center px-6 py-3 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg active:scale-95 transition-all">
          <Save className="w-4 h-4 mr-2" /> Salvar Alterações
        </button>
      </div>

      {showSuccess && (
        <div className="bg-emerald-500 text-white px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest animate-in slide-in-from-top-4 shadow-lg shadow-emerald-500/20">
           Configurações atualizadas com sucesso!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unidades Alumasa</h3>
              {isMasterAccount && (
                <button onClick={addProfile} className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="p-2 space-y-1">
              {localSettings.profiles.map(p => (
                <div 
                  key={p.id}
                  onClick={() => setEditingProfileId(p.id)}
                  className={`flex justify-between items-center p-3 rounded-xl cursor-pointer transition-all ${editingProfileId === p.id ? 'bg-primary text-white shadow-md' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                >
                  <span className="text-sm font-bold">{p.name}</span>
                  {editingProfileId !== p.id && p.id !== 'almox-pecas' && (
                    <button onClick={(e) => { e.stopPropagation(); removeProfile(p.id); }} className="p-1 hover:text-rose-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {currentProfile ? (
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                 <div className="p-2 bg-primary/10 text-primary rounded-lg"><Settings className="w-5 h-5" /></div>
                 <h3 className="font-black uppercase tracking-widest text-slate-800 dark:text-white">Parâmetros: {currentProfile.name}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-full">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome do Almoxarifado</label>
                  <input 
                    type="text" 
                    value={currentProfile.name}
                    onChange={(e) => updateProfileField(currentProfile.id, 'name', e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div className="col-span-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white">Perfil Almoxarifado de Perfil</h4>
                        <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Ativa indicadores de consumo e múltiplas fontes de dados</p>
                    </div>
                    <button 
                        onClick={() => updateProfileField(currentProfile.id, 'isCentral', !currentProfile.isCentral)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${currentProfile.isCentral ? 'bg-primary' : 'bg-slate-300'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${currentProfile.isCentral ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                <div className="col-span-full">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1 text-primary">
                    <Shield className="w-3 h-3" /> Chave de Acesso Exclusiva
                  </label>
                  <input 
                    type="text" 
                    value={currentProfile.accessKey || ''}
                    placeholder="Senha numérica ou alfanumérica"
                    onChange={(e) => updateProfileField(currentProfile.id, 'accessKey', e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>

                <div className="md:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">Fontes de Dados (CSV / Google Sheets)</h4>
                   <div className="space-y-4">
                      {currentProfile.isCentral ? (
                          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-800/50 space-y-4">
                              <div className="flex justify-between items-center">
                                  <h5 className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-2">
                                      <LinkIcon className="w-3 h-3" /> Fontes de Dados de Perfil
                                  </h5>
                                  <button 
                                    onClick={() => addSource(currentProfile.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-blue-700 transition-all"
                                  >
                                      <Plus className="w-3 h-3" /> Adicionar Fonte
                                  </button>
                              </div>
                              
                              <div className="space-y-3">
                                  {currentProfile.sources?.map((s, idx) => (
                                      <div key={idx} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3 animate-in slide-in-from-right-2">
                                          <div className="flex gap-2">
                                              <div className="flex-1 relative">
                                                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><ExternalLink className="w-3.5 h-3.5" /></div>
                                                  <input 
                                                    type="text" 
                                                    value={s.label} 
                                                    onChange={(e) => updateSource(currentProfile.id, idx, 'label', e.target.value)}
                                                    placeholder="Ex: Dezembro/2024"
                                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                                                  />
                                              </div>
                                              <button 
                                                onClick={() => removeSource(currentProfile.id, idx)}
                                                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                              >
                                                  <Trash2 className="w-4 h-4" />
                                              </button>
                                          </div>
                                          <div className="relative">
                                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><LinkIcon className="w-3.5 h-3.5" /></div>
                                              <input 
                                                type="text" 
                                                value={s.url} 
                                                onChange={(e) => updateSource(currentProfile.id, idx, 'url', e.target.value)}
                                                placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                                                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-mono"
                                              />
                                          </div>
                                      </div>
                                  ))}
                                  {(!currentProfile.sources || currentProfile.sources.length === 0) && (
                                      <div className="text-center py-6 border-2 border-dashed border-blue-200 dark:border-blue-800/50 rounded-xl">
                                          <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Nenhuma fonte cadastrada</p>
                                      </div>
                                  )}
                              </div>
                          </div>
                      ) : (
                          <>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Planilha de Estoque</label>
                              <input type="text" value={currentProfile.inventoryUrl} onChange={(e) => updateProfileField(currentProfile.id, 'inventoryUrl', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono" placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Entradas (In)</label>
                                <input type="text" value={currentProfile.inUrl} onChange={(e) => updateProfileField(currentProfile.id, 'inUrl', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono" />
                                </div>
                                <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Saídas (Out)</label>
                                <input type="text" value={currentProfile.outUrl} onChange={(e) => updateProfileField(currentProfile.id, 'outUrl', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                                <ClipboardList className="w-3 h-3 text-blue-500" /> Ordens de Serviço (PCM)
                                </label>
                                <input type="text" value={currentProfile.osUrl} onChange={(e) => updateProfileField(currentProfile.id, 'osUrl', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono" />
                            </div>
                          </>
                      )}
                   </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-dark-card rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-slate-400">
               <Layout className="w-12 h-12 mb-4 opacity-20" />
               <p className="font-bold text-sm uppercase tracking-widest text-center">Acesso restrito ao Administrador</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
