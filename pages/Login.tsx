import React, { useState } from 'react';
import { SectorProfile } from '../types';
import { Key, ArrowRight, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface LoginProps {
  profiles: SectorProfile[];
  onSelectProfile: (profileId: string, key?: string) => void;
}

const LoginPage: React.FC<LoginProps> = ({ profiles, onSelectProfile }) => {
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId) {
      setError('Por favor, selecione um setor.');
      return;
    }

    const profile = profiles.find(p => p.id === selectedProfileId);
    if (profile?.accessKey && profile.accessKey !== accessKey) {
      setError('Chave de acesso incorreta para este setor.');
      return;
    }

    onSelectProfile(selectedProfileId, accessKey);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-[420px] w-full bg-[#1e293b] rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-slate-700">
        
        {/* Cabeçalho Azul com Gradiente e Ícone */}
        <div className="relative h-[220px] bg-gradient-to-br from-[#2b64f3] to-[#1e4cd6] flex flex-col items-center justify-center overflow-hidden">
          {/* Círculos decorativos de fundo */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/30 shadow-lg">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Acesso ao Sistema</h1>
            <p className="text-[10px] font-bold text-white/80 uppercase tracking-[0.2em]">Gestão de Ativos Alumasa</p>
          </div>
        </div>

        {/* Formulário */}
        <div className="p-10">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Campo de Setor */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">UNIDADE / ALMOXARIFADO</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
                <select 
                  value={selectedProfileId}
                  onChange={(e) => { setSelectedProfileId(e.target.value); setError(''); }}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-medium text-slate-200 focus:ring-2 focus:ring-[#2b64f3] focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled className="bg-slate-900">Selecione a unidade</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Campo de Senha (Chave de Acesso) */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">CHAVE DE ACESSO</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Key className="w-5 h-5 text-slate-500" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"}
                  value={accessKey}
                  onChange={(e) => { setAccessKey(e.target.value); setError(''); }}
                  placeholder="Sua chave de acesso"
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-medium text-slate-200 focus:ring-2 focus:ring-[#2b64f3] focus:border-transparent outline-none transition-all"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs font-bold text-rose-400 bg-rose-900/20 p-3 rounded-xl border border-rose-800 animate-shake">
                {error}
              </p>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-[#0f172a] hover:bg-slate-900 text-white font-bold text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] group mt-8 border border-slate-700"
            >
              Entrar no Sistema
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>

      {/* Footer Copy */}
      <footer className="mt-8 text-center">
        <p className="text-[10px] text-slate-600 font-medium uppercase tracking-[0.15em]">
          © {new Date().getFullYear()} ALUMASA INDUSTRIAL • SISTEMA DE GESTÃO
        </p>
      </footer>
    </div>
  );
};

export default LoginPage;