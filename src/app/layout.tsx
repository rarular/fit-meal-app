import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitMeal",
  description: "Personalised 7-day meal plans for people who exercise.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="page">{children}</div>
        <footer className="footer">© 2026 FitMeal. Built with Claude Code.</footer>
      </body>
    </html>
  );
}
