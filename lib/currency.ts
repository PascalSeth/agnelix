export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "GHS" | "NGN"

export interface CurrencyConfig {
  code: CurrencyCode
  symbol: string
  name: string
  label: string
  locale: string
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    label: "USD ($) — US Dollar",
    locale: "en-US",
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    label: "EUR (€) — Euro",
    locale: "de-DE",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    label: "GBP (£) — British Pound",
    locale: "en-GB",
  },
  CAD: {
    code: "CAD",
    symbol: "CA$",
    name: "Canadian Dollar",
    label: "CAD (CA$) — Canadian Dollar",
    locale: "en-CA",
  },
  GHS: {
    code: "GHS",
    symbol: "GH₵",
    name: "Ghanaian Cedi",
    label: "GHS (GH₵) — Ghanaian Cedi",
    locale: "en-GH",
  },
  NGN: {
    code: "NGN",
    symbol: "₦",
    name: "Nigerian Naira",
    label: "NGN (₦) — Nigerian Naira",
    locale: "en-NG",
  },
}

export const CURRENCY_OPTIONS = Object.values(SUPPORTED_CURRENCIES)

export function getCurrencySymbol(code?: string | null): string {
  if (!code) return "$"
  const upper = code.toUpperCase() as CurrencyCode
  return SUPPORTED_CURRENCIES[upper]?.symbol || code
}

export function formatCurrency(amount: number | null | undefined, code?: string | null): string {
  if (amount == null) return `${getCurrencySymbol(code)}0`
  const upper = (code ? code.toUpperCase() : "USD") as CurrencyCode
  const config = SUPPORTED_CURRENCIES[upper] || SUPPORTED_CURRENCIES.USD
  return `${config.symbol}${amount.toLocaleString()}`
}
