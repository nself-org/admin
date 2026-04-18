import { NextRequest, NextResponse } from 'next/server'

interface ErrorCode {
  code: string
  category: string
  summary: string
  why: string
  fix: string
  docsPath: string
}

interface SuccessAllResponse {
  success: true
  codes: ErrorCode[]
  categories: string[]
}

interface SuccessOneResponse {
  success: true
  code: ErrorCode
}

interface SuccessManyResponse {
  success: true
  codes: ErrorCode[]
}

interface ErrorResponse {
  success: false
  error: string
}

// ERROR_CATALOG mirrors cli/internal/errs/codes.go.
// Keep in sync when new error codes are added to the Go registry.
const ERROR_CATALOG: ErrorCode[] = [
  // Docker (E001-E049)
  {
    code: 'E001',
    category: 'docker',
    summary: 'Docker not installed',
    why: 'The docker binary was not found in PATH.',
    fix: 'Install Docker: https://docs.docker.com/get-docker/',
    docsPath: 'reference/error-codes#e001',
  },
  {
    code: 'E002',
    category: 'docker',
    summary: 'Docker daemon not running',
    why: 'The Docker daemon is not responding to commands.',
    fix: 'Start Docker Desktop or run: sudo systemctl start docker',
    docsPath: 'reference/error-codes#e002',
  },
  {
    code: 'E003',
    category: 'docker',
    summary: 'Docker Compose not available',
    why: 'docker compose v2 plugin is not installed.',
    fix: 'Update Docker Desktop or install the compose plugin manually.',
    docsPath: 'reference/error-codes#e003',
  },
  {
    code: 'E004',
    category: 'docker',
    summary: 'docker-compose.yml not found',
    why: 'No docker-compose.yml exists in the project directory.',
    fix: "Run 'nself build' to generate the compose file.",
    docsPath: 'reference/error-codes#e004',
  },
  {
    code: 'E005',
    category: 'docker',
    summary: 'Port conflict',
    why: 'A required port is already in use by another process.',
    fix: "Run 'nself doctor' to identify the conflict, then stop the conflicting process or change the port in .env.",
    docsPath: 'reference/error-codes#e005',
  },

  // Config (E050-E099)
  {
    code: 'E050',
    category: 'config',
    summary: 'No .env file found',
    why: 'No .env or .env.dev file exists in the project directory.',
    fix: "Run 'nself init' to generate a configuration file.",
    docsPath: 'reference/error-codes#e050',
  },
  {
    code: 'E051',
    category: 'config',
    summary: 'Invalid config key',
    why: 'The configuration key contains invalid characters.',
    fix: 'Config keys must contain only A-Z, 0-9, and underscores.',
    docsPath: 'reference/error-codes#e051',
  },
  {
    code: 'E052',
    category: 'config',
    summary: 'Config validation failed',
    why: 'One or more configuration values are invalid.',
    fix: "Run 'nself config validate' to see all issues, then fix the reported values.",
    docsPath: 'reference/error-codes#e052',
  },
  {
    code: 'E053',
    category: 'config',
    summary: 'Weak password detected',
    why: 'A password field does not meet minimum length or contains insecure patterns.',
    fix: 'Use a strong, randomly generated password of at least 16 characters.',
    docsPath: 'reference/error-codes#e053',
  },
  {
    code: 'E054',
    category: 'config',
    summary: 'Invalid project name',
    why: 'Project name contains characters not allowed in Docker and DNS contexts.',
    fix: 'Use only lowercase letters, numbers, and hyphens. Must start with a letter.',
    docsPath: 'reference/error-codes#e054',
  },
  {
    code: 'E055',
    category: 'config',
    summary: 'Duplicate route detected',
    why: 'Two or more services are configured with the same nginx route.',
    fix: 'Check ROUTE values in .env and ensure each service has a unique route.',
    docsPath: 'reference/error-codes#e055',
  },
  {
    code: 'E056',
    category: 'config',
    summary: 'Unknown config key',
    why: 'The key is not recognized by nself.',
    fix: "Check for typos. Run 'nself config list' to see all valid keys.",
    docsPath: 'reference/error-codes#e056',
  },
  {
    code: 'E057',
    category: 'config',
    summary: 'CORS wildcard not allowed in production',
    why: "CORS_ORIGINS is set to '*' while NSELF_ENV=production.",
    fix: 'Set CORS_ORIGINS to an explicit list of allowed origins in .env.prod.',
    docsPath: 'reference/error-codes#e057',
  },

  // Plugin / License (E100-E149)
  {
    code: 'E100',
    category: 'plugin',
    summary: 'Plugin not found',
    why: 'The requested plugin does not exist in the registry.',
    fix: "Run 'nself plugin list' to see available plugins.",
    docsPath: 'reference/error-codes#e100',
  },
  {
    code: 'E101',
    category: 'plugin',
    summary: 'Invalid license key',
    why: 'The license key format is invalid.',
    fix: "License keys start with 'nself_pro_' followed by 32+ characters. Check your key.",
    docsPath: 'reference/error-codes#e101',
  },
  {
    code: 'E102',
    category: 'plugin',
    summary: 'License tier insufficient',
    why: 'Your license tier does not include this plugin.',
    fix: 'Upgrade your plan at https://nself.org/pricing',
    docsPath: 'reference/error-codes#e102',
  },
  {
    code: 'E103',
    category: 'plugin',
    summary: 'License expired',
    why: 'The license key has expired.',
    fix: 'Renew your license at https://nself.org/account',
    docsPath: 'reference/error-codes#e103',
  },
  {
    code: 'E104',
    category: 'plugin',
    summary: 'License validation failed (network)',
    why: 'Cannot reach the license server and no valid local cache exists.',
    fix: 'Check your internet connection. Previously validated licenses work offline for 7 days.',
    docsPath: 'reference/error-codes#e104',
  },
  {
    code: 'E105',
    category: 'plugin',
    summary: 'Circular plugin dependency',
    why: 'Plugin dependency graph contains a cycle.',
    fix: 'Report this as a bug at https://github.com/nself-org/cli/issues',
    docsPath: 'reference/error-codes#e105',
  },
  {
    code: 'E106',
    category: 'plugin',
    summary: 'Invalid plugin manifest',
    why: 'The plugin manifest (plugin.json) is malformed or missing required fields.',
    fix: 'Check the plugin manifest for syntax errors. Required fields: name, version, type.',
    docsPath: 'reference/error-codes#e106',
  },
  {
    code: 'E107',
    category: 'plugin',
    summary: 'Plugin already installed',
    why: 'The plugin is already installed in this project.',
    fix: "Run 'nself plugin update <name>' to update to the latest version.",
    docsPath: 'reference/error-codes#e107',
  },
  {
    code: 'E108',
    category: 'plugin',
    summary: 'Plugin checksum mismatch',
    why: 'The downloaded plugin archive does not match the expected checksum.',
    fix: 'Retry the install. If the error persists, report it at https://github.com/nself-org/cli/issues',
    docsPath: 'reference/error-codes#e108',
  },

  // SSL / Network (E150-E199)
  {
    code: 'E150',
    category: 'ssl',
    summary: 'mkcert not installed',
    why: 'mkcert is not installed; falling back to OpenSSL self-signed certs.',
    fix: 'Install mkcert: brew install mkcert (macOS) or see https://github.com/FiloSottile/mkcert',
    docsPath: 'reference/error-codes#e150',
  },
  {
    code: 'E151',
    category: 'ssl',
    summary: 'SSL certificate generation failed',
    why: 'Could not generate SSL certificates for the configured domain.',
    fix: 'Check domain configuration and ensure openssl is available.',
    docsPath: 'reference/error-codes#e151',
  },
  {
    code: 'E152',
    category: 'network',
    summary: 'DNS resolution failed',
    why: 'The configured domain could not be resolved.',
    fix: 'Check your DNS settings and ensure the domain points to this server.',
    docsPath: 'reference/error-codes#e152',
  },
  {
    code: 'E153',
    category: 'network',
    summary: 'Network request failed',
    why: 'An outbound network request could not be completed.',
    fix: 'Check your internet connection and firewall rules.',
    docsPath: 'reference/error-codes#e153',
  },
  {
    code: 'E154',
    category: 'network',
    summary: 'Connection refused',
    why: 'The target service is not accepting connections on the expected port.',
    fix: "Ensure the service is running. Check port bindings with 'nself status'.",
    docsPath: 'reference/error-codes#e154',
  },

  // Database (E200-E249)
  {
    code: 'E200',
    category: 'database',
    summary: 'Database not running',
    why: 'PostgreSQL container is not running or not accepting connections.',
    fix: "Run 'nself start' to start all services, or 'nself doctor' to diagnose.",
    docsPath: 'reference/error-codes#e200',
  },
  {
    code: 'E201',
    category: 'database',
    summary: 'Migration failed',
    why: 'A database migration could not be applied.',
    fix: "Check the migration SQL for errors. Run 'nself db migrate --status' to see pending migrations.",
    docsPath: 'reference/error-codes#e201',
  },
  {
    code: 'E202',
    category: 'database',
    summary: 'Backup failed',
    why: 'Database backup operation failed.',
    fix: 'Ensure sufficient disk space and that the database is running.',
    docsPath: 'reference/error-codes#e202',
  },
  {
    code: 'E203',
    category: 'database',
    summary: 'Backup not found',
    why: 'The requested backup file does not exist.',
    fix: "Run 'nself db backup list' to see available backups.",
    docsPath: 'reference/error-codes#e203',
  },
  {
    code: 'E204',
    category: 'database',
    summary: 'Backup verification failed',
    why: 'The backup file failed integrity verification.',
    fix: "The backup may be corrupt. Take a new backup with 'nself db backup'.",
    docsPath: 'reference/error-codes#e204',
  },
  {
    code: 'E205',
    category: 'database',
    summary: 'Backup restore failed',
    why: 'The database restore operation did not complete successfully.',
    fix: "Check disk space and database connectivity. Review logs with 'nself logs postgres'.",
    docsPath: 'reference/error-codes#e205',
  },
  {
    code: 'E206',
    category: 'database',
    summary: 'Backup encryption failed',
    why: 'Could not encrypt the backup archive.',
    fix: 'Ensure the backup encryption key is set in NSELF_BACKUP_ENCRYPTION_KEY.',
    docsPath: 'reference/error-codes#e206',
  },
  {
    code: 'E207',
    category: 'database',
    summary: 'Backup decryption failed',
    why: 'Could not decrypt the backup archive.',
    fix: 'Verify NSELF_BACKUP_ENCRYPTION_KEY matches the key used when the backup was created.',
    docsPath: 'reference/error-codes#e207',
  },
  {
    code: 'E208',
    category: 'database',
    summary: 'Remote backup operation failed',
    why: 'Could not transfer backup to or from the remote storage target.',
    fix: 'Check remote storage credentials (S3/GCS/R2) and network connectivity.',
    docsPath: 'reference/error-codes#e208',
  },
  {
    code: 'E209',
    category: 'database',
    summary: 'Backup pruning failed',
    why: 'Could not remove old backup files during the retention cleanup.',
    fix: 'Check write permissions on the backup directory.',
    docsPath: 'reference/error-codes#e209',
  },
  {
    code: 'E210',
    category: 'database',
    summary: 'WAL archive failed',
    why: 'PostgreSQL WAL segment archiving did not complete.',
    fix: 'Check the WAL archive destination path and permissions.',
    docsPath: 'reference/error-codes#e210',
  },

  // Health (E250-E299)
  {
    code: 'E250',
    category: 'health',
    summary: 'Service unhealthy',
    why: 'A service health check returned an unhealthy status.',
    fix: "Run 'nself doctor --verbose' for detailed diagnostics.",
    docsPath: 'reference/error-codes#e250',
  },
  {
    code: 'E251',
    category: 'health',
    summary: 'Health check timeout',
    why: 'The health check did not complete within the timeout period.',
    fix: "The service may be starting slowly. Wait and retry, or check logs with 'nself logs'.",
    docsPath: 'reference/error-codes#e251',
  },
  {
    code: 'E252',
    category: 'health',
    summary: 'Service not found',
    why: 'The requested service name is not defined in the current stack.',
    fix: "Run 'nself status' to list all configured services.",
    docsPath: 'reference/error-codes#e252',
  },

  // Init / Project (E300-E349)
  {
    code: 'E300',
    category: 'init',
    summary: 'Project already initialized',
    why: 'A .env file already exists in this directory.',
    fix: "Use 'nself config set' to modify existing config, or delete .env to reinitialize.",
    docsPath: 'reference/error-codes#e300',
  },
  {
    code: 'E301',
    category: 'init',
    summary: 'Source directory detected',
    why: 'You are running nself inside the CLI source repository.',
    fix: 'Change to your project directory first: cd /path/to/your/project',
    docsPath: 'reference/error-codes#e301',
  },

  // Domain (E350-E399)
  {
    code: 'E350',
    category: 'domain',
    summary: 'Invalid domain name',
    why: 'The configured domain name is not valid.',
    fix: "Use a valid domain like 'example.com' or 'localhost'.",
    docsPath: 'reference/error-codes#e350',
  },
  {
    code: 'E351',
    category: 'domain',
    summary: 'Invalid port number',
    why: 'Port number is outside the valid range (1-65535).',
    fix: 'Use a port number between 1024 and 65535 for non-privileged ports.',
    docsPath: 'reference/error-codes#e351',
  },

  // Auth (E400-E449)
  {
    code: 'E400',
    category: 'auth',
    summary: 'Auth service not running',
    why: 'The authentication service container is not running or not accepting requests.',
    fix: "Run 'nself start' to start all services, or 'nself doctor' to diagnose.",
    docsPath: 'reference/error-codes#e400',
  },
  {
    code: 'E401',
    category: 'auth',
    summary: 'Auth configuration invalid',
    why: 'One or more auth-related configuration values are missing or invalid.',
    fix: "Check AUTH_* values in .env. Run 'nself config validate' for a full report.",
    docsPath: 'reference/error-codes#e401',
  },

  // Build (E450-E499)
  {
    code: 'E450',
    category: 'build',
    summary: 'Build failed',
    why: 'nself build could not generate the stack configuration.',
    fix: "Run 'nself config validate' to check for config errors, then retry 'nself build'.",
    docsPath: 'reference/error-codes#e450',
  },
  {
    code: 'E451',
    category: 'build',
    summary: 'Template render failed',
    why: 'A configuration template could not be rendered due to missing variables.',
    fix: "Run 'nself config validate' and ensure all required variables are set.",
    docsPath: 'reference/error-codes#e451',
  },

  // Disaster Recovery (E500-E549)
  {
    code: 'E500',
    category: 'dr',
    summary: 'DR drill failed',
    why: 'The disaster recovery drill did not complete successfully.',
    fix: 'Check DR configuration and review logs from the failed step.',
    docsPath: 'reference/error-codes#e500',
  },
  {
    code: 'E501',
    category: 'dr',
    summary: 'Standby promotion failed',
    why: 'Could not promote the standby replica to primary.',
    fix: 'Check replica connectivity and replication lag before promoting.',
    docsPath: 'reference/error-codes#e501',
  },
  {
    code: 'E502',
    category: 'dr',
    summary: 'DR rollback failed',
    why: 'The rollback operation did not complete successfully.',
    fix: 'Check the rollback target state and review DR logs.',
    docsPath: 'reference/error-codes#e502',
  },
  {
    code: 'E503',
    category: 'dr',
    summary: 'Split-brain fence failed',
    why: 'Could not fence the old primary after promotion.',
    fix: 'Manually stop the old primary to prevent split-brain. Then retry the fence.',
    docsPath: 'reference/error-codes#e503',
  },

  // Upgrade / Migration (E550-E599)
  {
    code: 'E550',
    category: 'upgrade',
    summary: 'Unsupported source version',
    why: 'The installed nself version cannot be upgraded directly to the target version.',
    fix: 'Upgrade incrementally through supported intermediate versions. See https://docs.nself.org/guides/upgrading',
    docsPath: 'reference/error-codes#e550',
  },
  {
    code: 'E551',
    category: 'upgrade',
    summary: 'Pre-upgrade backup missing',
    why: 'No recent backup exists before attempting an upgrade that modifies data.',
    fix: "Run 'nself db backup' before 'nself upgrade'. Override with --skip-backup only if you have an external backup.",
    docsPath: 'reference/error-codes#e551',
  },
  {
    code: 'E552',
    category: 'upgrade',
    summary: 'Schema migration incompatible',
    why: 'A required schema migration cannot apply cleanly to the existing database.',
    fix: 'Review the conflicting migration in the upgrade report. Resolve manually or restore from backup.',
    docsPath: 'reference/error-codes#e552',
  },
  {
    code: 'E553',
    category: 'upgrade',
    summary: 'Config migration failed',
    why: 'The .env or generated config could not be transformed for the new version.',
    fix: "Run 'nself upgrade --dry-run' to see the transformation plan and fix any reported keys manually.",
    docsPath: 'reference/error-codes#e553',
  },
  {
    code: 'E554',
    category: 'upgrade',
    summary: 'Plugin incompatible with target version',
    why: 'An installed plugin does not support the target CLI version.',
    fix: "Run 'nself plugin update --all' before upgrading, or remove the incompatible plugin.",
    docsPath: 'reference/error-codes#e554',
  },

  // Onboarding / Import (E600-E699)
  {
    code: 'E600',
    category: 'onboarding',
    summary: 'Onboarding step failed',
    why: 'A step in the first-run onboarding flow could not complete.',
    fix: "Run 'nself init --resume-onboarding' to retry from the last successful step.",
    docsPath: 'reference/error-codes#e600',
  },
  {
    code: 'E601',
    category: 'import',
    summary: 'Import source not recognized',
    why: 'The import file is not a recognized ChatGPT, Claude, or nself export.',
    fix: "Supported formats: ChatGPT export .zip, Claude .json, nself export .tar.gz. See 'nself import --help'.",
    docsPath: 'reference/error-codes#e601',
  },
  {
    code: 'E602',
    category: 'import',
    summary: 'Import partial',
    why: 'Some items in the import archive could not be converted.',
    fix: "Check the import report for skipped items. Retry with '--strict' to fail fast instead.",
    docsPath: 'reference/error-codes#e602',
  },
]

function getCategories(): string[] {
  const seen = new Set<string>()
  const categories: string[] = []
  for (const entry of ERROR_CATALOG) {
    if (!seen.has(entry.category)) {
      seen.add(entry.category)
      categories.push(entry.category)
    }
  }
  return categories.sort()
}

export async function GET(
  request: NextRequest,
): Promise<
  NextResponse<
    | SuccessAllResponse
    | SuccessOneResponse
    | SuccessManyResponse
    | ErrorResponse
  >
> {
  const { searchParams } = new URL(request.url)
  const codeParam = searchParams.get('code')
  const categoryParam = searchParams.get('category')

  if (codeParam !== null) {
    const upper = codeParam.toUpperCase()
    const found = ERROR_CATALOG.find((e) => e.code === upper)
    if (!found) {
      return NextResponse.json(
        { success: false, error: `Error code ${upper} not found` },
        { status: 404 },
      )
    }
    return NextResponse.json({ success: true, code: found })
  }

  if (categoryParam !== null) {
    const lower = categoryParam.toLowerCase()
    const filtered = ERROR_CATALOG.filter((e) => e.category === lower)
    return NextResponse.json({ success: true, codes: filtered })
  }

  return NextResponse.json({
    success: true,
    codes: ERROR_CATALOG,
    categories: getCategories(),
  })
}
