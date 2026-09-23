import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { lightingScript } from "@/components/lighting";
import { profile } from "@/content/profile";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });
const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const title = "Mohamed Hefny · mapping in progress";

export const metadata: Metadata = {
  metadataBase: new URL(profile.site),
  title: { default: title, template: "%s · Mohamed Hefny" },
  description: profile.description,
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description: profile.description,
    url: "/",
    siteName: "Mohamed Hefny",
    locale: "en_US",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description: profile.description },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#06080b" },
    { media: "(prefers-color-scheme: light)", color: "#efeee9" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="night"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable} ${display.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: lightingScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
