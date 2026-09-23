import React, { useState } from 'react';
import { X, Lock, Mail, User, Phone, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, register } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await login(formData.email, formData.password);
        if (res.success) {
          onClose();
          if (onSuccess) onSuccess();
        } else {
          setError(res.error);
        }
      } else {
        const res = await register(formData.name, formData.email, formData.password, formData.phone);
        if (res.success) {
          onClose();
          if (onSuccess) onSuccess();
        } else {
          setError(res.error);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (email, password) => {
    setError('');
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.success) {
      onClose();
      if (onSuccess) onSuccess();
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF7F2] w-full max-w-md rounded-2xl shadow-2xl border border-[#EAE2D7] overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-[#6E6467] hover:text-[#1F1A1C] hover:bg-[#F4EFEB] transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 bg-[#F4EFEB] border-b border-[#EAE2D7] text-center">
          <div className="font-cinzel text-2xl font-bold tracking-[0.2em] text-[#5B1425] flex items-center justify-center gap-1">
            <span>PALLUVO</span>
            <span className="text-[#C5A059] text-base -mt-2">✦</span>
          </div>
          <p className="text-xs font-serif italic text-[#6E6467] mt-1">
            Every drape, a little magic.
          </p>

          {/* Tab Switcher */}
          <div className="flex bg-[#FAF7F2] p-1 rounded-xl mt-4 border border-[#EAE2D7]">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                isLogin ? 'bg-[#5B1425] text-[#FAF7F2] shadow-sm' : 'text-[#6E6467] hover:text-[#1F1A1C]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                !isLogin ? 'bg-[#5B1425] text-[#FAF7F2] shadow-sm' : 'text-[#6E6467] hover:text-[#1F1A1C]'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-[#1F1A1C] mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#6E6467] absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Priya Sharma"
                  className="w-full bg-white border border-[#EAE2D7] rounded-xl pl-9 pr-3 py-2 text-sm text-[#1F1A1C] focus:outline-none focus:border-[#5B1425]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#1F1A1C] mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#6E6467] absolute left-3 top-3" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@example.com"
                className="w-full bg-white border border-[#EAE2D7] rounded-xl pl-9 pr-3 py-2 text-sm text-[#1F1A1C] focus:outline-none focus:border-[#5B1425]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1F1A1C] mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#6E6467] absolute left-3 top-3" />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-white border border-[#EAE2D7] rounded-xl pl-9 pr-3 py-2 text-sm text-[#1F1A1C] focus:outline-none focus:border-[#5B1425]"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-[#1F1A1C] mb-1">Mobile Number (Optional)</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#6E6467] absolute left-3 top-3" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full bg-white border border-[#EAE2D7] rounded-xl pl-9 pr-3 py-2 text-sm text-[#1F1A1C] focus:outline-none focus:border-[#5B1425]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#5B1425] text-[#FAF7F2] font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#7E1E34] transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>{isLogin ? 'Sign In to PALLUVO' : 'Complete Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Quick Demo Access Bar */}
          <div className="pt-3 border-t border-[#EAE2D7] text-center">
            <div className="text-[11px] text-[#6E6467] font-semibold uppercase tracking-wider mb-2">
              ⚡ Quick 1-Click Demo Accounts
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('priya@example.com', 'password123')}
                className="px-2 py-1.5 bg-[#F4EFEB] hover:bg-[#EAE2D7] text-[#1F1A1C] rounded-lg text-xs font-medium transition text-left"
              >
                <div className="font-bold text-[#5B1425]">Customer Demo</div>
                <div className="text-[10px] text-[#6E6467]">Priya Sharma</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin@palluvo.com', 'admin123')}
                className="px-2 py-1.5 bg-[#5B1425]/10 hover:bg-[#5B1425]/20 text-[#5B1425] rounded-lg text-xs font-medium transition text-left"
              >
                <div className="font-bold">Admin Demo ⚙️</div>
                <div className="text-[10px] text-[#6E6467]">Concierge Admin</div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
