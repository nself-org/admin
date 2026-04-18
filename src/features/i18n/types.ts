/**
 * Types for the i18n scaffolding.
 *
 * P93 ships English only. The scaffolding is in place so future locales can
 * drop translated JSON files into src/locales/ without refactoring callers.
 */

export type Locale = 'en'

export const SUPPORTED_LOCALES: Locale[] = ['en']
export const DEFAULT_LOCALE: Locale = 'en'

/** Shape of every locale bundle. Nested objects form dotted key paths. */
export interface Messages {
  [key: string]: string | Messages
}

export interface LocaleBundle {
  locale: Locale
  messages: Messages
}
