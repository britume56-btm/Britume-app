/**
 * A rewarded-ad adapter must report completion from a real SDK and verify the
 * provider receipt on a trusted server. The app ships without an adapter, so
 * no ad can be shown and no local reward can be issued.
 */
export type RewardedAdsAdapter = {
  isConfigured: () => boolean;
  showRewardedAd: (placementId: string) => Promise<{
    completed: boolean;
    completionToken?: string;
  }>;
  verifyCompletionOnServer: (
    completionToken: string,
    placementId: string
  ) => Promise<boolean>;
};

let rewardedAdsAdapter: RewardedAdsAdapter | null = null;

export function installRewardedAdsAdapter(adapter: RewardedAdsAdapter | null): void {
  rewardedAdsAdapter = adapter;
}

export function areRewardedAdsConfigured(): boolean {
  return Boolean(rewardedAdsAdapter?.isConfigured());
}

export async function verifyRewardedThemeCompletion(
  placementId: string
): Promise<boolean> {
  if (!rewardedAdsAdapter?.isConfigured()) {
    return false;
  }
  const result = await rewardedAdsAdapter.showRewardedAd(placementId);
  if (!result.completed || !result.completionToken) {
    return false;
  }
  return rewardedAdsAdapter.verifyCompletionOnServer(
    result.completionToken,
    placementId
  );
}
