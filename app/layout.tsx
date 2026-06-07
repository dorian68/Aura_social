import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura Superfan",
  description: "Your creator fan club — earn points, unlock rewards, become a VIP.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#060A08] text-[#FFF7E8] min-h-screen antialiased">{children}</body>
    </html>
  );
}
