'use client';

import { useContext } from 'react';
import { I18nContext } from './i18n-context';
import { getDashboardStrings, type DashboardStrings } from './dashboard-translations';

export function useDashboardI18n(): DashboardStrings {
  const { locale } = useContext(I18nContext);
  return getDashboardStrings(locale);
}
