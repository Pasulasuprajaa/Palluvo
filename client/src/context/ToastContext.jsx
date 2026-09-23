import React, { createContext, useContext, useState, useEffect } from 'react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success', duration = 3500) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-3 max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border backdrop-blur-md transform transition-all duration-300 animate-slide-up text-sm font-medium ${
              t.type === 'error'
                ? 'bg-[#3F0D19] text-[#FAF7F2] border-[#7E1E34]'
                : t.type === 'info'
                ? 'bg-[#1F1A1C] text-[#FAF7F2] border-[#C5A059]'
                : 'bg-[#5B1425] text-[#FAF7F2] border-[#C5A059]/40'
            }`}
          >
            <span className="text-[#C5A059] text-base">✦</span>
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="text-[#FAF7F2]/60 hover:text-[#FAF7F2] text-xs font-bold ml-2"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
