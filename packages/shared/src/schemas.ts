import { z } from "zod";

export const OrderSchema = z.object({
  assetType: z.enum(["crypto", "equity"]),
  assetId: z.string(),
  weight: z.number().min(0).max(1)
});
export const SubmitTurnSchema = z.object({
  gameId: z.string().uuid(),
  asOfDate: z.string(),
  orders: z.array(OrderSchema).min(1)
});
export const StartGameSchema = z.object({
  seasonId: z.string().uuid().optional()
});
export type SubmitTurn = z.infer<typeof SubmitTurnSchema>;
export type StartGame = z.infer<typeof StartGameSchema>;
