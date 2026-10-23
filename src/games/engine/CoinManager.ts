export const CoinManager = {
  rewardCoins: async (amount: number): Promise<number> => {
    console.log(`[CoinManager] Rewarded ${amount} coins to session profile.`);
    return amount;
  }
};
