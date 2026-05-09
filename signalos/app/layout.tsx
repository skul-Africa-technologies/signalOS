import type { Metadata, Viewport } from "next";
import "./globals.css";
import UpdateNotification from "./update-notification";
import { AuthProvider } from "@/src/context/AuthContext";

export const metadata: Metadata = {
  title: "Signal OS",
  description: "Turn your daily trade into financial power",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head />
      <body className="min-h-full bg-bg text-text-1 font-sans antialiased">
        <AuthProvider>
          <UpdateNotification />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}