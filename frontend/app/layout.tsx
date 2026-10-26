import type {
  Metadata,
} from "next";

import {
  NextIntlClientProvider,
} from "next-intl";

import {
  getLocale,
  getMessages,
} from "next-intl/server";

import ThemeToggle from "./components/ThemeToggle";

import {
  ThemeProvider,
} from "./components/ThemeProvider";

import "./globals.css";


export const metadata: Metadata = {
  title: "AGRIVA",
  description:
    "AI-powered agriculture platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  const locale =
    await getLocale();

  const messages =
    await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
    >
      <head>
        
      </head>

      <body>
        <ThemeProvider>
          <NextIntlClientProvider
            messages={messages}
          >
            {children}

            <ThemeToggle />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
