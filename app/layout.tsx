import type { Metadata } from "next";
import "./world.css";

export const metadata: Metadata = {
  title: "Mineblok | Minik Kaşifler İçin Oyun",
  description: "Çocuklar için sakin, neşeli ve güvenli bir Mineblok dünyası.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
