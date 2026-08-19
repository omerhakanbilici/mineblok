import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blok Bahçesi | Minik Kaşifler İçin Oyun",
  description: "Çocuklar için sakin, neşeli ve güvenli bir blok dünyası.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
