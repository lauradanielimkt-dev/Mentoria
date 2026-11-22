import type { Metadata, Viewport } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";

/* Outfit: geométrica, próxima da Gilroy usada no site da Marmaris. */
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://metodo.marmarisviagens.com.br"),
  title: { default: "Método Marmaris", template: "%s · Método Marmaris" },
  description: "Gestão da Mentoria Marmaris: vender, entregar e acompanhar.",
  icons: { icon: "/logo-marmaris.svg" },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${outfit.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
