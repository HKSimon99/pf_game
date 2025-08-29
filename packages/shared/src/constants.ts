export const ASSETS = [
  { label: "BTC", assetType: "crypto", assetId: "bitcoin" },
  { label: "ETH", assetType: "crypto", assetId: "ethereum" },
  { label: "AAPL", assetType: "equity", assetId: "AAPL" },
  { label: "SPY", assetType: "equity", assetId: "SPY" }
] as const;

export const KEYMAP = { NEXT: "KeyN" };
export const COLORS = { up: "#16a34a", down: "#dc2626" };
export const BASE = "USD";
