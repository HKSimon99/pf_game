import "./globals.css";
import { ThemeProvider } from "next-themes";

export const metadata = { title: "Portfolio Time-Traveler" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="min-h-screen flex flex-col">
            <header className="p-4 border-b">Portfolio Time-Traveler</header>
            <main className="flex-1">{children}</main>
            <footer className="p-4 text-xs text-center border-t">
              Powered by CoinGecko API • Stock/ETF data by Financial Modeling Prep (FMP)
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
