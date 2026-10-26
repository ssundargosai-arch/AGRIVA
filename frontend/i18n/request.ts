import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const supportedLocales = ["mr", "hi", "en"] as const;
type SupportedLocale = (typeof supportedLocales)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("AGRIVA_LOCALE")?.value;
  const locale: SupportedLocale = supportedLocales.includes(cookieLocale as SupportedLocale)
    ? (cookieLocale as SupportedLocale)
    : "mr";

  const messages = (await import(`../locales/${locale}.json`)).default;
  return { locale, messages };
});
