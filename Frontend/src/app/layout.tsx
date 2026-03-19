import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Inter,
  Merriweather,
  Space_Grotesk,
} from "next/font/google";

import { Providers } from "@/app/providers";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

export const metadata: Metadata = {
  title: "Reading the reader",
  description: "An app which knows what the reader is reading.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${spaceGrotesk.variable} ${merriweather.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const palette = localStorage.getItem("app-palette") || "default";
                const font = localStorage.getItem("app-font") || "geist";
                document.documentElement.setAttribute("data-palette", palette);
                document.documentElement.setAttribute("data-font", font);
              } catch (_) {
                document.documentElement.setAttribute("data-palette", "default");
                document.documentElement.setAttribute("data-font", "geist");
              }
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
