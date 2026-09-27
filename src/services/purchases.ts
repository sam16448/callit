/**
 * RevenueCat integration.
 *
 * Call It Pro is a subscription: callit_pro_monthly ($2.99) or
 * callit_pro_annual ($14.99), both granting the "pro" entitlement, sold from
 * the "default" offering. Pro never gives points: it unlocks unlimited
 * practice, creating leagues, stats, the streak shield and cosmetics.
 *
 * When Supabase is on, the RevenueCat customer is logged in with the same id
 * as the Supabase player, so the RevenueCat webhook can mark them Pro on the
 * server too (supabase/functions/revenuecat-webhook).
 */
import { isRunningInExpoGo } from 'expo';
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

export const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';

/**
 * How purchases behave in this run:
 *  - live:    native RevenueCat SDK (development or store build with a key)
 *  - preview: Expo Go, where store purchases can't run; unlocks locally and says so
 *  - demo:    no RevenueCat key (e.g. someone running the open-source repo)
 */
export type PurchaseMode = 'live' | 'preview' | 'demo';
export const PURCHASE_MODE: PurchaseMode = !API_KEY ? 'demo' : isRunningInExpoGo() ? 'preview' : 'live';

export const PRO_ENTITLEMENT = 'pro';
export const PRODUCTS = { monthly: 'callit_pro_monthly', annual: 'callit_pro_annual' } as const;

let configured = false;

export function configurePurchases(appUserId?: string): boolean {
  if (configured) return true;
  if (PURCHASE_MODE !== 'live') return false;
  try {
    Purchases.setLogLevel(LOG_LEVEL.WARN).catch(() => {});
    Purchases.configure({ apiKey: API_KEY, appUserID: appUserId });
    configured = true;
  } catch {
    configured = false;
  }
  return configured;
}

/** Links purchases to the Supabase player id (so the server knows who is Pro). */
export async function linkUser(appUserId: string): Promise<CustomerInfo | undefined> {
  if (!configured) return undefined;
  try {
    const { customerInfo } = await Purchases.logIn(appUserId);
    return customerInfo;
  } catch {
    return undefined;
  }
}

export function isPro(info: CustomerInfo | undefined): boolean {
  return Boolean(info?.entitlements.active[PRO_ENTITLEMENT]);
}

/** When the active Pro entitlement renews or ends, for the You tab. */
export function proExpiry(info: CustomerInfo | undefined): string | null {
  return info?.entitlements.active[PRO_ENTITLEMENT]?.expirationDate ?? null;
}

export type PlanKind = 'monthly' | 'annual';

export function planKind(pkg: Pick<PurchasesPackage, 'packageType' | 'product'>): PlanKind {
  const id = pkg.product.identifier;
  if (pkg.packageType === 'ANNUAL' || id.startsWith(PRODUCTS.annual)) return 'annual';
  return 'monthly';
}

export async function loadPackages(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export type PurchaseOutcome = { ok: true; info: CustomerInfo } | { ok: false; cancelled: boolean; message?: string };

export async function buy(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { ok: true, info: customerInfo };
  } catch (e) {
    const err = e as { userCancelled?: boolean | null; message?: string };
    return { ok: false, cancelled: Boolean(err.userCancelled), message: err.message };
  }
}

export async function restore(): Promise<CustomerInfo | undefined> {
  try {
    return await Purchases.restorePurchases();
  } catch {
    return undefined;
  }
}

export async function currentCustomerInfo(): Promise<CustomerInfo | undefined> {
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return undefined;
  }
}

export function onCustomerInfo(listener: (info: CustomerInfo) => void): () => void {
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
