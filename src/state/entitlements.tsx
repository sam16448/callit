import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { loadJson, saveJson } from '@/lib/storage';
import {
  PURCHASE_MODE,
  buy,
  configurePurchases,
  currentCustomerInfo,
  isPro,
  linkUser,
  loadPackages,
  onCustomerInfo,
  planKind,
  proExpiry,
  restore,
  type PlanKind,
  type PurchaseMode,
} from '@/services/purchases';
import { ONLINE, ensureSession } from '@/services/supabase';

const LOCAL_PRO_KEY = 'callit.localPro.v1';

/** A plan shown on the paywall. `pkg` is present only when RevenueCat is live. */
export type PlanOption = { id: string; kind: PlanKind; priceString: string; price: number; currencySymbol: string; pkg?: PurchasesPackage };

/** Prices shown in Expo Go / demo mode, matching the RevenueCat products. */
const PREVIEW_PLANS: PlanOption[] = [
  { id: 'preview_annual', kind: 'annual', priceString: '$14.99', price: 14.99, currencySymbol: '$' },
  { id: 'preview_monthly', kind: 'monthly', priceString: '$2.99', price: 2.99, currencySymbol: '$' },
];

type EntitlementsState = {
  ready: boolean;
  mode: PurchaseMode;
  pro: boolean;
  /** ISO date the subscription renews or ends (live mode only). */
  renews: string | null;
  plans: PlanOption[];
  purchase: (plan: PlanOption) => Promise<'unlocked' | 'cancelled' | 'error'>;
  restorePurchases: () => Promise<'restored' | 'nothing' | 'unavailable'>;
  /** Preview/demo only: turn local Pro off again (for trying the paywall twice). */
  resetPreview: () => void;
};

const Ctx = createContext<EntitlementsState | null>(null);

function symbolOf(priceString: string): string {
  return priceString.replace(/[\d.,\s]/g, '') || '$';
}

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(PURCHASE_MODE !== 'live');
  const [info, setInfo] = useState<CustomerInfo>();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  /** Pro unlocked in preview / demo mode (no store available). */
  const [localPro, setLocalPro] = useState(false);

  useEffect(() => {
    loadJson<boolean>(LOCAL_PRO_KEY).then((v) => setLocalPro(v === true));
    if (!configurePurchases()) return;
    const off = onCustomerInfo(setInfo);
    Promise.all([currentCustomerInfo(), loadPackages().catch(() => [] as PurchasesPackage[])])
      .then(([ci, pkgs]) => {
        if (ci) setInfo(ci);
        setPackages(pkgs);
      })
      .finally(() => setReady(true));
    // Same id as the Supabase player, so the RevenueCat webhook can mark them Pro on the server.
    if (ONLINE) {
      ensureSession()
        .then((id) => linkUser(id))
        .then((ci) => ci && setInfo(ci))
        .catch(() => {});
    }
    return off;
  }, []);

  const pro = PURCHASE_MODE === 'live' ? isPro(info) : localPro;

  const plans = useMemo<PlanOption[]>(() => {
    if (PURCHASE_MODE !== 'live') return PREVIEW_PLANS;
    return packages
      .map((p) => ({
        id: p.identifier,
        kind: planKind(p),
        priceString: p.product.priceString,
        price: p.product.price,
        currencySymbol: symbolOf(p.product.priceString),
        pkg: p,
      }))
      .sort((a, b) => (a.kind === 'annual' ? -1 : b.kind === 'annual' ? 1 : 0));
  }, [packages]);

  const purchase = useCallback<EntitlementsState['purchase']>(async (plan) => {
    if (PURCHASE_MODE !== 'live' || !plan.pkg) {
      // Expo Go / demo: no store available, unlock locally (the paywall says so).
      setLocalPro(true);
      saveJson(LOCAL_PRO_KEY, true);
      return 'unlocked';
    }
    const result = await buy(plan.pkg);
    if (!result.ok) return result.cancelled ? 'cancelled' : 'error';
    setInfo(result.info);
    return isPro(result.info) ? 'unlocked' : 'error';
  }, []);

  const restorePurchases = useCallback<EntitlementsState['restorePurchases']>(async () => {
    if (PURCHASE_MODE !== 'live') return 'unavailable';
    const ci = await restore();
    if (!ci) return 'nothing';
    setInfo(ci);
    return isPro(ci) ? 'restored' : 'nothing';
  }, []);

  const resetPreview = useCallback(() => {
    setLocalPro(false);
    saveJson(LOCAL_PRO_KEY, false);
  }, []);

  const value = useMemo<EntitlementsState>(
    () => ({ ready, mode: PURCHASE_MODE, pro, renews: proExpiry(info), plans, purchase, restorePurchases, resetPreview }),
    [ready, pro, info, plans, purchase, restorePurchases, resetPreview],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements(): EntitlementsState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEntitlements must be used inside EntitlementsProvider');
  return ctx;
}
