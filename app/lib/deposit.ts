/**
 * NOWPayments per-coin deposit minimums (USD).
 *
 * NOWPayments enforces a minimum per pay-coin that our global minDeposit
 * setting doesn't cover (measured against the provider: the lowest amount it
 * accepts). BTC/ETH minimums are specified in crypto units, so market drift
 * can raise the USD equivalent over time — the "less than minimal" error
 * mapping in app/api/deposit/create is the backstop for that; this table
 * turns the common case into a clear rejection before an invoice is created.
 */
export const COIN_MIN_USD: Record<string, number> = {
  btc: 25,
  eth: 10,
  usdttrc20: 17,
  usdterc20: 16,
};

export const COIN_LABEL: Record<string, string> = {
  btc: "BTC",
  eth: "ETH",
  usdttrc20: "USDT (TRC20)",
  usdterc20: "USDT (ERC20)",
};

/**
 * Hard cap per deposit invoice, enforced by POST /api/deposit/create and
 * displayed on the deposit page's Rules card — one source so the promise
 * and the enforcement can't drift apart.
 */
export const MAX_DEPOSIT_USD = 100000;
