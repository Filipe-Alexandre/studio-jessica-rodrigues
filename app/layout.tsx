import type { Metadata } from "next";
import { Cormorant_Garamond, Questrial } from "next/font/google";
import '@fortawesome/fontawesome-free/css/all.min.css';
import "./styles/globals.scss";
import "./styles/queries.scss";
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import type { Viewport } from "next";
config.autoAddCss = false;

export const viewport: Viewport = {
  themeColor: "#7c638d", 
};

export const metadata = {
  title: "Studio Jessica Rodrigues",
  description: "Estética Facial",
  manifest: "/manifest.json", // Aponta para o arquivo que você criou
};

const displayFont = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bodyFont = Questrial({
  variable: "--font-body",
  subsets: ["latin"],
  weight: "400",
});

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
