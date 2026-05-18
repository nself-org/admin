/**
 * Shared validation for names that map to nself service / environment identifiers.
 *
 * Pattern: lowercase alphanumeric, with interior hyphens allowed but no
 * leading or trailing hyphen.  A single alphanumeric character is also valid.
 *
 * Rationale: the original /^[a-z0-9-]+$/ admitted leading hyphens (e.g.
 * "--help", "-rf") which the nself CLI would interpret as option flags when
 * placed in a positional argv slot.  The tightened pattern closes that
 * argument-injection vector.  execFile is also called with a literal "--"
 * end-of-options separator before any user-controlled positional (see route
 * files) as defence in depth, but this pattern is the primary gate.
 */
export const SERVICE_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

/**
 * Returns true when `name` is safe to use as an nself service or environment
 * identifier.  An empty string returns false.
 *
 * @param name - The candidate identifier to validate.
 */
export function validateServiceName(name: string): boolean {
  if (!name) return false
  return SERVICE_NAME_PATTERN.test(name)
}
