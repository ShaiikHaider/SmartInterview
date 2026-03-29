import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Interview Coach | FAANG-Level Technical Interviews",
  description:
    "Practice real technical interviews with an AI interviewer that challenges you like a FAANG engineer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[#0a0a0f] text-white font-[var(--font-inter)]">
        {children}
      </body>
    </html>
  );
}
