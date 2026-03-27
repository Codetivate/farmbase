'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useI18n } from '@/lib/i18n/i18n-context';

const FALLBACK_RATE = 34.5;
const CACHE_KEY = 'farmbase-usd-thb';
const CACHE_DURATION_MS = 4 * 60 * 60 * 1000;

interface CachedRate {
  rate: number;
  fetchedAt: number;
}

interface CurrencyContextType {
  rate: number;
  loading: boolean;
  formatCurrency: (amountUsd: number) => string;
  formatCurrencyValue: (amountUsd: number) => number;
  currencySymbol: string;
  currencyCode: string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  rate: FALLBACK_RATE,
  loading: false,
  formatCurrency: (v) => `$${v.toLocaleString()}`,
  formatCurrencyValue: (v) => v,
  currencySymbol: '$',
  currencyCode: 'USD',
});

function getCachedRate(): CachedRate | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedRate = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt < CACHE_DURATION_MS) return parsed;
    return null;
  } catch {
    return null;
  }
}

function setCachedRate(rate: number) {
  if (typeof window === 'undefined') return;
  try {
    const data: CachedRate = { rate, fetchedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const [rate, setRate] = useState<number>(FALLBACK_RATE);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (locale !== 'th') return;

    const cached = getCachedRate();
    if (cached) {
      setRate(cached.rate);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch('https://open.er-api.com/v6/latest/USD')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const thbRate = data?.rates?.THB;
        if (thbRate && typeof thbRate === 'number') {
          setRate(thbRate);
          setCachedRate(thbRate);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const isThai = locale === 'th';

  const formatCurrencyValue = useCallback(
    (amountUsd: number): number => {
      if (!isThai) return amountUsd;
      return Math.round(amountUsd * rate);
    },
    [isThai, rate]
  );

  const formatCurrency = useCallback(
    (amountUsd: number | undefined | null): string => {
      if (amountUsd === undefined || amountUsd === null || isNaN(amountUsd)) return '-';
      if (!isThai) return `$${amountUsd.toLocaleString('en-US')}`;
      const thbAmount = Math.round(amountUsd * rate);
      return `฿${thbAmount.toLocaleString('th-TH')}`;
    },
    [isThai, rate]
  );

  const currencySymbol = isThai ? '฿' : '$';
  const currencyCode = isThai ? 'THB' : 'USD';

  return (
    <CurrencyContext.Provider
      value={{ rate, loading, formatCurrency, formatCurrencyValue, currencySymbol, currencyCode }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
