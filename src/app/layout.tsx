import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

const SITE_URL = process.env.PUBLIC_URL?.trim() || "https://jspix.onrender.com";
const DESCRIPTION = "Gateway de cobranças Pix especializada em Pagar.me. Gere cobranças em segundos, acompanhe os pagamentos em tempo real e saque para a sua conta quando quiser.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "JSPix · Pagamentos Pix", template: "%s · JSPix" },
  description: DESCRIPTION,
  applicationName: "JSPix",
  keywords: ["pix", "cobrança pix", "gateway de pagamento", "pagar.me", "qr code pix", "receber por pix"],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "JSPix",
    url: "/",
    title: "JSPix — Gateway Pix especializada em Pagar.me",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "JSPix — Gateway Pix especializada em Pagar.me",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, title: "JSPix", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#080b14" },
  ],
};

const themeScript = `(function(){try{var t=localStorage.getItem('jspix-theme')||localStorage.getItem('jpix-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${mono.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
