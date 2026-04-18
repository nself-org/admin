/**
 * Minimal i18n runtime. English-only for P93, but structured to accept
 * additional locales by dropping `src/locales/<locale>.json` files.
 *
 * Usage (client):
 *   const t = useTranslations('projects')
 *   t('title') // "Projects Dashboard"
 *
 * Usage (server/static):
 *   const msg = translate('en', 'projects.title')
 */

import en from '../../locales/en.json'
import {
  DEFAULT_LOCALE,
  type Locale,
  type Messages,
  SUPPORTED_LOCALES,
} from './types'

const BUNDLES: Record<Locale, Messages> = {
  en: en as Messages,
}

/**
 * Resolve a dotted key path like "projects.title" against a messages tree.
 * Returns the key itself when the path is missing so missing translations
 * are visually obvious in-app rather than silently producing undefined.
 */
function resolveKey(messages: Messages, keyPath: string): string {
  const parts = keyPath.split('.')
  let cursor: string | Messages = messages
  for (const part of parts) {
    if (typeof cursor === 'string' || cursor === null || cursor === undefined) {
      return keyPath
    }
    const next: string | Messages | undefined = (cursor as Messages)[part]
    if (next === undefined) return keyPath
    cursor = next
  }
  return typeof cursor === 'string' ? cursor : keyPath
}

/** Interpolate {placeholder} tokens from a params record. */
function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const val = params[name]
    return val === undefined ? `{${name}}` : String(val)
  })
}

/**
 * Translate a dotted key for a specific locale. Falls back to DEFAULT_LOCALE
 * when the locale does not have a bundle.
 */
export function translate(
  locale: Locale,
  keyPath: string,
  params?: Record<string, string | number>,
): string {
  const bundle = BUNDLES[locale] ?? BUNDLES[DEFAULT_LOCALE]
  const raw = resolveKey(bundle, keyPath)
  return interpolate(raw, params)
}

export function listSupportedLocales(): Locale[] {
  return [...SUPPORTED_LOCALES]
}

/**
 * Shorthand factory that scopes translate() to a namespace.
 * Mirrors the next-intl useTranslations() API so future migration is easy.
 */
export function createScopedTranslator(locale: Locale, namespace: string) {
  return (key: string, params?: Record<string, string | number>): string =>
    translate(locale, `${namespace}.${key}`, params)
}
