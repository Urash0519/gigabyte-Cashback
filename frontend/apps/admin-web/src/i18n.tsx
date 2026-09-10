import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import campaigns from "./locales/campaigns";
import campaignConfiguration from "./locales/campaign-configuration";
import { translations as claimsFinance } from "./locales/claims-finance";
import { translations as reportsNotifications } from "./locales/reports-notifications";
import { translations as common } from "./locales/common";

export type Locale = "en" | "zh-TW";
const translations: Record<string, string> = {
  ...common,
  ...campaigns,
  ...campaignConfiguration,
  ...claimsFinance,
  ...reportsNotifications,
};
type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;
type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
};
const Context = createContext<LocaleContextValue | undefined>(undefined);
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    try {
      return localStorage.getItem("cashback.admin.locale") === "zh-TW"
        ? "zh-TW"
        : "en";
    } catch {
      return "en";
    }
  });
  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem("cashback.admin.locale", locale);
    } catch {
      /* Optional preference storage. */
    }
  }, [locale]);
  const t = useCallback<Translate>(
    (key, values) => {
      const template = locale === "zh-TW" ? (translations[key] ?? key) : key;
      return template.replace(/\{(\w+)\}/g, (token, name: string) =>
        String(values?.[name] ?? token),
      );
    },
    [locale],
  );
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLocale() {
  const context = useContext(Context);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}
