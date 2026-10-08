/**
 * Store adapters must validate purchase/restore tokens with a trusted server
 * and wait for that server to update premium_entitlements. Client callbacks
 * must never set an entitlement directly.
 */
export type BillingProviderAdapter = {
  id: 'google-play' | 'app-store' | string;
  isConfigured: () => boolean;
  getPremiumProduct: () => {
    id: string;
    title: string;
    formattedPrice: string;
  } | null;
  /** Resolve "verified" only after trusted receipt validation updated the server entitlement. */
  purchaseAndVerify: (productId: string) => Promise<'verified' | 'cancelled'>;
  restoreAndVerify: () => Promise<void>;
};

let billingProvider: BillingProviderAdapter | null = null;

export function installBillingProvider(provider: BillingProviderAdapter | null): void {
  billingProvider = provider;
}

export function getBillingProviderStatus(): {
  configured: boolean;
  providerId: string | null;
  product: ReturnType<BillingProviderAdapter['getPremiumProduct']>;
} {
  const providerConfigured = Boolean(billingProvider?.isConfigured());
  const product = providerConfigured ? billingProvider?.getPremiumProduct() ?? null : null;
  const configured = Boolean(providerConfigured && product);
  return {
    configured,
    providerId: configured ? billingProvider?.id ?? null : null,
    product: configured ? product : null,
  };
}

export async function purchasePremium(productId: string): Promise<'verified' | 'cancelled'> {
  const status = getBillingProviderStatus();
  if (!productId.trim() || !status.configured || status.product?.id !== productId || !billingProvider) {
    throw new Error('Purchases require a configured production billing provider.');
  }
  return billingProvider.purchaseAndVerify(productId);
}

export async function restorePremiumPurchases(): Promise<boolean> {
  if (!billingProvider?.isConfigured()) {
    return false;
  }
  await billingProvider.restoreAndVerify();
  return true;
}
