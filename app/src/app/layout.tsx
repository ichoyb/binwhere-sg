import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";

const GA_ID = "G-R9KJCQTTB0";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#00A651",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "BinWhere — Singapore Recycling Guide",
  description: "Snap a photo or describe an item to find out how to recycle it in Singapore",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BinWhere",
  },
  openGraph: {
    title: "BinWhere — Singapore Recycling Guide",
    description: "Snap a photo or describe an item to find out how to recycle it in Singapore",
    url: "https://binwhere.sg",
    siteName: "BinWhere",
    type: "website",
    images: [{ url: "https://binwhere.sg/icons/icon-512.png", width: 512, height: 512, alt: "BinWhere" }],
  },
  twitter: {
    card: "summary",
    title: "BinWhere — Singapore Recycling Guide",
    description: "Snap a photo or describe an item to find out how to recycle it in Singapore",
    images: ["https://binwhere.sg/icons/icon-512.png"],
  },
  alternates: {
    canonical: "https://binwhere.sg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="antialiased">
        {children}
        <nav className="absolute overflow-hidden w-px h-px" aria-label="Site">
          <Link href="/blog">Blog</Link>
        </nav>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}')`}
        </Script>
      </body>
    </html>
  );
}
