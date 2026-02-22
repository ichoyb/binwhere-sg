import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#00A651",
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
      </body>
    </html>
  );
}
