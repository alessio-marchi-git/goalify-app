import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { AppProvider } from "@/components/AppProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Goalify - Focus Mode",
  description: "Una app minimalista per completare i tuoi task giornalieri, uno alla volta.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#030712" />
      </head>
      <body className="antialiased bg-gray-950 text-white">
        <AppProvider>
          <Header />
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
