/**
 * Expected CLI version that this admin release is locked to.
 *
 * This value MUST match:
 *   - `version` in admin/package.json
 *   - `Version` const in cli/internal/version/version.go
 *
 * Enforced by:
 *   - CI: admin/.github/workflows/version-lockstep.yml
 *   - Pre-commit: admin/scripts/check-version-lockstep.sh
 *
 * To update: bump all three files atomically as part of the release process.
 */
export const CLI_VERSION = '1.0.9'
