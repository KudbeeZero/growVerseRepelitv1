import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "GROWv2 — GrowPod Empire",
  description:
    "Grow, breed, and trade real-genetics cannabis strains in real time. A research instrument crossed with a grow dashboard.",
};

// viewport-fit=cover lets the layout extend under notches/home indicators so
// safe-area-inset-* env() values resolve to real numbers on mobile.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#070a0e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
