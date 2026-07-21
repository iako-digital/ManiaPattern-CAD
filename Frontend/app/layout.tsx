import type { Metadata } from "next";
import I18nProvider from "@/components/I18nProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ManiaPattern CAD",
  description: "Browser-based CAD drafting for apparel pattern design",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
