import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calcu — Your everyday calculator",
  description: "A simple calculator with a saved calculation history.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
