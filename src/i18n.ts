import { getRequestConfig } from 'next-intl/server'

// RTL locale codes — when adding a new locale, also add it here so dir="rtl"
// is applied automatically on the html element.
const RTL_LOCALES = ['ar', 'he', 'fa', 'ur']

export function isRTL(locale: string): boolean {
  return RTL_LOCALES.includes(locale)
}

export default getRequestConfig(async () => {
  const locale = 'en'
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
