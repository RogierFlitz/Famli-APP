import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { famliBrand, famliColor } from "@/lib/brand/tokens";
import "./globals.css";

/** Open Runde — rounded Inter, matching the Famli “Inter Rounded” brand sheet. */
const sans = localFont({
  src: [
    { path: "./fonts/OpenRunde-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/OpenRunde-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/OpenRunde-Semibold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/OpenRunde-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-famli",
  display: "swap",
});

export const metadata: Metadata = {
  title: famliBrand.metadata.title,
  description: famliBrand.metadata.description,
  applicationName: famliBrand.name,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/famli-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/famli-icon.svg" }],
  },
  appleWebApp: {
    capable: true,
    title: famliBrand.name,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: famliColor.blue,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className={`${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
