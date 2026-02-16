import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fit Tracker",
  description: "Progresivní overload tréninková appka",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fit Tracker"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
