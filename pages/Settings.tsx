
import React, { useState } from 'react';
// Added TrendingUp to the lucide-react imports to fix the "Cannot find name 'TrendingUp'" error
import { Save, Plus, Trash2, Shield, Settings, Layout, ClipboardList, Link as LinkIcon, Calendar, Hash, ExternalLink, Copy, Upload, Download, AlertCircle, Wrench, ShieldCheck, MapPin, History, Package, TrendingUp } from 'lucide-react';
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
      isProduction: false,
      isMaintenance: false,
      isWarehouse: false,
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
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome da Unidade / Setor</label>
                  <input 
                    type="text" 
                    value={currentProfile.name}
                    onChange={(e) => updateProfileField(currentProfile.id, 'name', e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                {/* Toggles de Ativação de Módulos */}
                <div className="col-span-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div>
                            <h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase">Perfil</h4>
                            <p className="text-[9px] text-slate-500 font-medium uppercase mt-0.5">Almox. Perfil</p>
                        </div>
                        <button 
                            onClick={() => updateProfileField(currentProfile.id, 'isCentral', !currentProfile.isCentral)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${currentProfile.isCentral ? 'bg-primary' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${currentProfile.isCentral ? 'left-5.5' : 'left-0.5'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div>
                            <h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase">Produção</h4>
                            <p className="text-[9px] text-slate-500 font-medium uppercase mt-0.5">Indicadores</p>
                        </div>
                        <button 
                            onClick={() => updateProfileField(currentProfile.id, 'isProduction', !currentProfile.isProduction)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${currentProfile.isProduction ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${currentProfile.isProduction ? 'left-5.5' : 'left-0.5'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div>
                            <h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase">Manutenção</h4>
                            <p className="text-[9px] text-slate-500 font-medium uppercase mt-0.5">Módulo PCM</p>
                        </div>
                        <button 
                            onClick={() => updateProfileField(currentProfile.id, 'isMaintenance', !currentProfile.isMaintenance)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${currentProfile.isMaintenance ? 'bg-indigo-500' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${currentProfile.isMaintenance ? 'left-5.5' : 'left-0.5'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div>
                            <h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase">WMS</h4>
                            <p className="text-[9px] text-slate-500 font-medium uppercase mt-0.5">Almox. Geral</p>
                        </div>
                        <button 
                            onClick={() => updateProfileField(currentProfile.id, 'isWarehouse', !currentProfile.isWarehouse)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${currentProfile.isWarehouse ? 'bg-rose-500' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${currentProfile.isWarehouse ? 'left-5.5' : 'left-0.5'}`} />
                        </button>
                    </div>
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

                {/* Seção de Fontes de Dados Condicional */}
                <div className="md:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">Fontes de Dados (CSV / Google Sheets)</h4>
                   <div className="space-y-4">
                      
                      {currentProfile.isWarehouse ? (
                         <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="grid grid-cols-1 gap-4">
                               <div className="p-4 rounded-2xl border bg-rose-50/30 dark:bg-rose-900/5 border-rose-100 dark:border-rose-900/20 space-y-3">
                                  <label className="block text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                                     <Package className="w-3 h-3" /> Aba Estoque Atual / Cadastro
                                  </label>
                                  <input type="text" value={currentProfile.inventoryUrl} onChange={(e) => updateProfileField(currentProfile.id, 'inventoryUrl', e.target.value)} className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-mono shadow-sm" />
                               </div>

                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="p-4 rounded-2xl border bg-emerald-50/30 dark:bg-emerald-900/5 border-emerald-100 dark:border-emerald-900/20 space-y-3">
                                     <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp className="w-3 h-3" /> Aba Entradas
                                     </label>
                                     <input type="text" value={currentProfile.inUrl} onChange={(e) => updateProfileField(currentProfile.id, 'inUrl', e.target.value)} className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-mono shadow-sm" />
                                  </div>
                                  <div className="p-4 rounded-2xl border bg-purple-50/30 dark:bg-purple-900/5 border-purple-100 dark:border-purple-900/20 space-y-3">
                                     <label className="block text-[10px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-2">
                                        <History className="w-3 h-3" /> Aba Saídas
                                     </label>
                                     <input type="text" value={currentProfile.outUrl} onChange={(e) => updateProfileField(currentProfile.id, 'outUrl', e.target.value)} className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-mono shadow-sm" />
                                  </div>
                               </div>

                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="p-4 rounded-2xl border bg-blue-50/30 dark:bg-blue-900/5 border-blue-100 dark:border-blue-900/20 space-y-3">
                                     <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                                        <History className="w-3 h-3" /> Aba Movimentação Interna
                                     </label>
                                     <input type="text" value={currentProfile.moveUrl || ''} onChange={(e) => updateProfileField(currentProfile.id, 'moveUrl', e.target.value)} className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-mono shadow-sm" />
                                  </div>
                                  <div className="p-4 rounded-2xl border bg-amber-50/30 dark:bg-amber-900/5 border-amber-100 dark:border-amber-900/20 space-y-3">
                                     <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                        <MapPin className="w-3 h-3" /> Aba Endereços
                                     </label>
                                     <input type="text" value={currentProfile.addressUrl || ''} onChange={(e) => updateProfileField(currentProfile.id, 'addressUrl', e.target.value)} className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-mono shadow-sm" />
                                  </div>
                               </div>
                            </div>
                         </div>
                      ) : currentProfile.isMaintenance ? (
                         <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-5 rounded-2xl border bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/50 space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                   <Wrench className="w-4 h-4 text-indigo-500" />
                                   <h5 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Planilha de Manutenções (Aba OS)</h5>
                                </div>
                                <input 
                                   type="text" 
                                   value={currentProfile.osUrl} 
                                   onChange={(e) => updateProfileField(currentProfile.id, 'osUrl', e.target.value)} 
                                   className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-mono shadow-sm" 
                                   placeholder="Link CSV da aba OS" 
                                />
                            </div>

                            <div className="p-5 rounded-2xl border bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/50 space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                   <ShieldCheck className="w-4 h-4 text-blue-500" />
                                   <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-600">Planilha de Preventivas</h5>
                                </div>
                                <input 
                                   type="text" 
                                   value={currentProfile.preventiveUrl || ''} 
                                   onChange={(e) => updateProfileField(currentProfile.id, 'preventiveUrl', e.target.value)} 
                                   className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-mono shadow-sm" 
                                   placeholder="Link CSV da planilha de preventivas" 
                                />
                            </div>
                         </div>
                      ) : (currentProfile.isCentral || currentProfile.isProduction) ? (
                          <div className={`p-5 rounded-2xl border ${currentProfile.isCentral ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/50' : 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50'} space-y-4`}>
                              <div className="flex justify-between items-center">
                                  <h5 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${currentProfile.isCentral ? 'text-blue-600' : 'text-emerald-600'}`}>
                                      <LinkIcon className="w-3 h-3" /> {currentProfile.isCentral ? 'Planilhas de Perfil' : 'Planilhas de Produção'}
                                  </h5>
                                  <button 
                                    onClick={() => addSource(currentProfile.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-[10px] font-black uppercase rounded-lg transition-all ${currentProfile.isCentral ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                  >
                                      <Plus className="w-3 h-3" /> Adicionar Planilha
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
                                                    placeholder="Ex: Escadas ou Plástico"
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
                                                placeholder="Link CSV da aba da planilha"
                                                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-mono"
                                              />
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ) : (
                          <div className="space-y-4 animate-in fade-in duration-200">
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Planilha de Estoque</label>
                              <input type="text" value={currentProfile.inventoryUrl} onChange={(e) => updateProfileField(currentProfile.id, 'inventoryUrl', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-mono" placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Entradas (In)</label>
                                <input type="text" value={currentProfile.inUrl} onChange={(e) => updateProfileField(currentProfile.id, 'inUrl', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-mono" />
                                </div>
                                <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Saídas (Out)</label>
                                <input type="text" value={currentProfile.outUrl} onChange={(e) => updateProfileField(currentProfile.id, 'outUrl', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-mono" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                                <ClipboardList className="w-3 h-3 text-blue-500" /> Ordens de Serviço (PCM)
                                </label>
                                <input type="text" value={currentProfile.osUrl} onChange={(e) => updateProfileField(currentProfile.id, 'osUrl', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-mono" />
                            </div>
                          </div>
                      )}
                   </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-dark-card rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-slate-400">
               <Layout className="w-12 h-12 mb-4 opacity-20" />
               <p className="font-bold text-sm uppercase tracking-widest text-center">Selecione uma unidade para configurar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
