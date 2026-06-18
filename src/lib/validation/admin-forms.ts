/**
 * Admin form validation schemas (Zod).
 *
 * Purpose: Validate user input in admin panels before sending to API.
 * Inputs: raw string values from form fields
 * Outputs: Zod parse results (success/error)
 * Constraints:
 *   - SQL console: only validates non-empty; does NOT restrict query types.
 *     Admin intentionally has full SQL access (no query-type filtering here).
 *   - Backup name: alphanumeric + hyphens/underscores, max 50 chars.
 * SPORT: REGISTRY-WEB-SURFACES.md — admin: Zod validation
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// SQL console
// ---------------------------------------------------------------------------

/**
 * SQL input schema — non-empty only.
 * Admin has full, unrestricted SQL access; we only prevent empty submissions.
 */
export const sqlInputSchema = z.object({
  query: z
    .string()
    .min(1, 'SQL query cannot be empty — enter a statement above.')
    .trim(),
})

export type SqlInput = z.infer<typeof sqlInputSchema>

// ---------------------------------------------------------------------------
// Backup name
// ---------------------------------------------------------------------------

/**
 * Backup name schema.
 * Allowed: alphanumeric, hyphens, underscores. 1–50 chars.
 * Rationale: names map to filesystem paths; spaces and special chars break
 *   backup archive filenames on case-sensitive FS.
 */
export const backupNameSchema = z.object({
  name: z
    .string()
    .min(1, 'Backup name cannot be empty.')
    .max(50, 'Backup name must be 50 characters or fewer.')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Backup name may only contain letters, numbers, hyphens, and underscores.'
    ),
})

export type BackupNameInput = z.infer<typeof backupNameSchema>
