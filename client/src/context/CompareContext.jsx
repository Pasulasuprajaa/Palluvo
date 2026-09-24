import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';

const CompareContext = createContext();

export function CompareProvider({ children }) {
  const [compareItems, setCompareItems] = useState(() => {
    try {
      const saved = localStorage.getItem('palluvo_compare');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    try {
      localStorage.setItem('palluvo_compare', JSON.stringify(compareItems));
    } catch (e) {}
  }, [compareItems]);

  const addToCompare = (product) => {
    if (compareItems.some(item => item.id === product.id)) {
      setCompareItems(prev => prev.filter(item => item.id !== product.id));
      showToast(`Removed "${product.name.substring(0, 24)}..." from comparison.`, 'info');
      return;
    }

    if (compareItems.length >= 4) {
      showToast('You can compare up to 4 sarees at a time. Remove an item first.', 'warning');
      setIsCompareOpen(true);
      return;
    }

    setCompareItems(prev => [...prev, product]);
    showToast(`Added "${product.name.substring(0, 24)}..." to comparison!`, 'success');
  };

  const removeFromCompare = (id) => {
    setCompareItems(prev => prev.filter(item => item.id !== id));
  };

  const clearCompare = () => {
    setCompareItems([]);
    setIsCompareOpen(false);
    showToast('Comparison list cleared.', 'info');
  };

  const isInCompare = (id) => {
    return compareItems.some(item => item.id === id);
  };

  return (
    <CompareContext.Provider
      value={{
        compareItems,
        isCompareOpen,
        setIsCompareOpen,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
}
