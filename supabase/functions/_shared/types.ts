// What this file does: Zod types for payloads and a small asset registry.
import { z } from "zod";

export const AssetType = z.enum(["crypto", "equity"]);
export type AssetType = z.infer<typeof AssetType>;

export const OrderSchema = z.object({
  assetType: AssetType,
  assetId: z.string(), // CoinGecko id or FMP symbol
  weight: z.number().min(0).max(1)
});
export type Order = z.infer<typeof OrderSchema>;

export const SubmitTurnSchema = z.object({
  gameId: z.string().uuid(),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  orders: z.array(OrderSchema).min(1)
});
export type SubmitTurn = z.infer<typeof SubmitTurnSchema>;

export const StartGameSchema = z.object({
  seasonId: z.string().uuid().optional()
});
export type StartGame = z.infer<typeof StartGameSchema>;

// Minimal asset universe
export const ASSETS: { [k: string]: { assetType: AssetType, assetId: string } } = {
  BTC: { assetType: "crypto", assetId: "bitcoin" },
  ETH: { assetType: "crypto", assetId: "ethereum" },
  AAPL: { assetType: "equity", assetId: "AAPL" },
  SPY: { assetType: "equity", assetId: "SPY" }
};
export const BASE_CCY = "USD";
