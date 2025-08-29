// What this file does: Server-only price helpers with simple caching.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&no-check";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FMP_API_KEY = Deno.env.get("FMP_API_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const toDate = (d: Date) => d.toISOString().slice(0,10);

// Get last available close <= asOfDate
export async function getClose(assetType: "crypto"|"equity", assetId: string, asOfDate: string): Promise<number> {
  // 1) try cache
  const { data: hit } = await admin
    .from("price_cache")
    .select("*")
    .eq("asset_type", assetType)
    .eq("asset_id", assetId)
    .lte("px_date", asOfDate)
    .order("px_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (hit) return Number(hit.close);

  // 2) fetch external
  let px = 0, pxDate = asOfDate, source = "";

  if (assetType === "crypto") {
    // use market_chart/range to get last close <= date
    // CoinGecko expects unix seconds
    const end = Math.floor(new Date(asOfDate + "T23:59:59Z").getTime() / 1000);
    const start = end - 7 * 86400; // small window
    const url = `https://api.coingecko.com/api/v3/coins/${assetId}/market_chart/range?vs_currency=usd&from=${start}&to=${end}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("CoinGecko error");
    const j = await r.json();
    const prices: [number, number][] = j.prices || [];
    if (!prices.length) throw new Error("No crypto prices");
    const last = prices[prices.length - 1];
    px = last[1];
    pxDate = toDate(new Date(last[0]));
    source = "coingecko";
  } else {
    // FMP historical-price-full: pick last <= asOfDate
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${assetId}?from=${asOfDate}&to=${asOfDate}&apikey=${FMP_API_KEY}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("FMP error");
    const j = await r.json();
    const rows = (j.historical ?? j.historicalStockList?.[0]?.historical) || [];
    if (!rows.length) {
      // try a small lookback window
      const d = new Date(asOfDate + "T00:00:00Z");
      const from = toDate(new Date(d.getTime() - 14*86400*1000));
      const url2 = `https://financialmodelingprep.com/api/v3/historical-price-full/${assetId}?from=${from}&to=${asOfDate}&apikey=${FMP_API_KEY}`;
      const r2 = await fetch(url2);
      const j2 = await r2.json();
      const rows2 = j2.historical || [];
      if (!rows2.length) throw new Error("No equity prices");
      const last = rows2[0]; // FMP returns desc by date
      px = last.close;
      pxDate = last.date;
    } else {
      const last = rows[0]; // usually latest first
      px = last.close;
      pxDate = last.date;
    }
    source = "fmp";
  }

  // 3) insert cache
  await admin.from("price_cache").insert({
    asset_type: assetType,
    asset_id: assetId,
    px_date: pxDate,
    close: px,
    source
  });
  return Number(px);
}
