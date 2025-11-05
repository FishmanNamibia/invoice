import countriesData from '../data/countries-currencies.json';

// Get currency symbol from currency code
export const getCurrencySymbol = (currencyCode) => {
  if (!currencyCode) return '$';
  
  const country = countriesData.countries.find(c => c.currency === currencyCode);
  return country ? country.currencySymbol : '$';
};

// Format currency based on company currency setting
export const formatCurrency = (amount, currency = 'NAD', locale = 'en-US') => {
  if (amount === null || amount === undefined) {
    amount = 0;
  }
  
  // Try to format with the currency
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'NAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(amount));
  } catch (error) {
    // Fallback to NAD if currency is invalid
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${parseFloat(amount || 0).toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
};

// Format currency with custom symbol (for cases where Intl doesn't support the currency)
export const formatCurrencyWithSymbol = (amount, currencySymbol = '$', locale = 'en-US') => {
  if (amount === null || amount === undefined) {
    amount = 0;
  }
  
  return `${currencySymbol}${parseFloat(amount || 0).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

// Get company currency hook helper
export const useCompanyCurrency = (company) => {
  const currency = company?.currency || 'NAD';
  const currencySymbol = getCurrencySymbol(currency);
  
  return {
    currency,
    currencySymbol,
    formatCurrency: (amount) => formatCurrency(amount, currency),
    formatCurrencyWithSymbol: (amount) => formatCurrencyWithSymbol(amount, currencySymbol)
  };
};

