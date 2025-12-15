import { Montserrat } from "next/font/google";
import "./globals.css";
import { SessionProviderWrapper } from "@/components/providers/SessionProviderWrapper";
import { Toaster } from "@/components/ui/sonner";

const montserrat = Montserrat({
  
});



export const metadata = {
  title: "The Binary Critic",
  description: "The Binary Critic - Discover, review, and discuss movies and TV shows.",
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
