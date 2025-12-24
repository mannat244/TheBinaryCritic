import { Montserrat } from "next/font/google";
import "./globals.css";
import { SessionProviderWrapper } from "@/components/providers/SessionProviderWrapper";
import { Toaster } from "@/components/ui/sonner";

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
});



export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://thebinarycritic.in"),
  title: {
    default: "The Binary Critic",
    template: "%s | The Binary Critic",
  },
  description: "Discover, review, and discuss movies and TV shows with a community of enthusiasts. Real reviews, real people.",
  keywords: ["movies", "tv shows", "reviews", "ratings", "community", "cinema", "entertainment", "social network"],
  authors: [{ name: "The Binary Critic Team" }],
  creator: "The Binary Critic",
  publisher: "The Binary Critic",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://thebinarycritic.in",
    siteName: "The Binary Critic",
    title: "The Binary Critic",
    description: "Discover, review, and discuss movies and TV shows.",
    images: [
      {
        url: "https://s6.imgcdn.dev/YU9XB9.png",
        width: 1200,
        height: 630,
        alt: "The Binary Critic",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Binary Critic",
    description: "Discover, review, and discuss movies and TV shows.",
    images: ["https://s6.imgcdn.dev/YU9XB9.png"],
    creator: "@thebinarycritic", // Placeholder
  },
  icons: {
    icon: "/favicon.ico", // Standard ICO
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png", // For Apple devices
    other: {
      rel: "icon",
      url: "/icon1.png", // High-res PNG for Google (ensure this is 48x48, 96x96, etc.)
    },
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-title" content="The Binary Critic" />
      </head>
      <body className={`bg-background dark`}>
        <SessionProviderWrapper>
          {children}
          <Toaster />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
