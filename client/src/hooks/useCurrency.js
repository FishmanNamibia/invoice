import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatCurrencyWithSymbol, getCurrencySymbol } from '../utils/currency';

/**
 * Custom hook to format currency based on company settings
 * Usage: const { formatCurrency, currency, currencySymbol } = useCurrency();
 */
export const useCurrency = () => {
  const { company } = useAuth();
  const currency = company?.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);

  return {
    currency,
    currencySymbol,
    formatCurrency: (amount) => formatCurrency(amount, currency),
    formatCurrencyWithSymbol: (amount) => formatCurrencyWithSymbol(amount, currencySymbol)
  };
};

