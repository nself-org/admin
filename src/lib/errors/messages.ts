/**
 * Error code to user-friendly message mapping
 */

import { ErrorCode } from './codes'

export interface ErrorMessage {
  userMessage: string
  action?: string
  retryable: boolean
}

export const ERROR_MESSAGES: Record<ErrorCode, ErrorMessage> = {
  // ===== NETWORK ERRORS =====
  [ErrorCode.NETWORK_ERROR]: {
    userMessage: 'Network connection failed. Please check your internet connection.',
    action: 'Check your network connection and try again.',
    retryable: true,
  },
  [ErrorCode.TIMEOUT]: {
    userMessage: 'Request timed out. The server took too long to respond.',
    action: 'Try again in a moment.',
    retryable: true,
  },
  [ErrorCode.OFFLINE]: {
    userMessage: "You're offline. Please connect to the internet.",
    action: 'Restore your internet connection.',
    retryable: true,
  },
  [ErrorCode.CONNECTION_REFUSED]: {
    userMessage: 'Cannot connect to the server.',
    action: 'Make sure nself-admin is running and accessible.',
    retryable: true,
  },
  [ErrorCode.DNS_LOOKUP_FAILED]: {
    userMessage: 'Could not resolve server address.',
    action: 'Check your DNS settings or internet connection.',
    retryable: true,
  },
  [ErrorCode.SSL_ERROR]: {
    userMessage: 'SSL certificate error.',
    action: 'Check your SSL configuration or trust the certificate.',
    retryable: false,
  },
  [ErrorCode.REQUEST_ABORTED]: {
    userMessage: 'Request was cancelled.',
    action: 'Try the operation again.',
    retryable: true,
  },
  [ErrorCode.RATE_LIMITED]: {
    userMessage: 'Too many requests. Please slow down.',
    action: 'Wait a moment before trying again.',
    retryable: true,
  },

  // ===== AUTH ERRORS =====
  [ErrorCode.UNAUTHORIZED]: {
    userMessage: 'You are not authorized to perform this action.',
    action: 'Log in and try again.',
    retryable: false,
  },
  [ErrorCode.SESSION_EXPIRED]: {
    userMessage: 'Your session has expired.',
    action: 'Please log in again.',
    retryable: false,
  },
  [ErrorCode.INVALID_CREDENTIALS]: {
    userMessage: 'Invalid password.',
    action: 'Check your password and try again.',
    retryable: true,
  },
  [ErrorCode.PASSWORD_TOO_WEAK]: {
    userMessage: 'Password does not meet security requirements.',
    action: 'Use a stronger password with uppercase, lowercase, numbers, and special characters.',
    retryable: true,
  },
  [ErrorCode.PASSWORD_MISMATCH]: {
    userMessage: 'Passwords do not match.',
    action: 'Make sure both password fields match.',
    retryable: true,
  },
  [ErrorCode.CSRF_TOKEN_INVALID]: {
    userMessage: 'Security token is invalid.',
    action: 'Refresh the page and try again.',
    retryable: false,
  },
  [ErrorCode.CSRF_TOKEN_MISSING]: {
    userMessage: 'Security token is missing.',
    action: 'Refresh the page and try again.',
    retryable: false,
  },
  [ErrorCode.SESSION_NOT_FOUND]: {
    userMessage: 'Session not found.',
    action: 'Please log in again.',
    retryable: false,
  },
  [ErrorCode.AUTHENTICATION_REQUIRED]: {
    userMessage: 'Authentication required.',
    action: 'Please log in to continue.',
    retryable: false,
  },
  [ErrorCode.FORBIDDEN]: {
    userMessage: 'You do not have permission to access this resource.',
    action: 'Contact your administrator for access.',
    retryable: false,
  },
  [ErrorCode.TOO_MANY_LOGIN_ATTEMPTS]: {
    userMessage: 'Too many login attempts.',
    action: 'Wait a few minutes before trying again.',
    retryable: true,
  },

  // ===== CLI ERRORS =====
  [ErrorCode.CLI_NOT_FOUND]: {
    userMessage: 'nself CLI is not installed or not in PATH.',
    action: 'Install the nself CLI or check your PATH configuration.',
    retryable: false,
  },
  [ErrorCode.CLI_EXECUTION_FAILED]: {
    userMessage: 'CLI command failed to execute.',
    action: 'Check the logs for details.',
    retryable: true,
  },
  [ErrorCode.CLI_TIMEOUT]: {
    userMessage: 'CLI command timed out.',
    action: 'The command took too long. Try again or check the service status.',
    retryable: true,
  },
  [ErrorCode.CLI_INVALID_COMMAND]: {
    userMessage: 'Invalid CLI command.',
    action: 'Check the command syntax.',
    retryable: false,
  },
  [ErrorCode.CLI_PERMISSION_DENIED]: {
    userMessage: 'Permission denied when executing CLI command.',
    action: 'Check file permissions or run with appropriate privileges.',
    retryable: false,
  },
  [ErrorCode.CLI_OUTPUT_PARSE_ERROR]: {
    userMessage: 'Could not parse CLI output.',
    action: 'The CLI output format may have changed. Update nself-admin.',
    retryable: false,
  },
  [ErrorCode.CLI_VERSION_MISMATCH]: {
    userMessage: 'nself CLI version is incompatible.',
    action: 'Update the nself CLI to a compatible version.',
    retryable: false,
  },
  [ErrorCode.CLI_NOT_INSTALLED]: {
    userMessage: 'nself CLI is not installed.',
    action: 'Install the nself CLI first.',
    retryable: false,
  },
  [ErrorCode.CLI_COMMAND_NOT_FOUND]: {
    userMessage: 'CLI command not found.',
    action: 'Update the nself CLI to the latest version.',
    retryable: false,
  },
  [ErrorCode.CLI_INSUFFICIENT_PERMISSIONS]: {
    userMessage: 'Insufficient permissions to run CLI command.',
    action: 'Run with appropriate privileges.',
    retryable: false,
  },

  // ===== DOCKER ERRORS =====
  [ErrorCode.DOCKER_NOT_RUNNING]: {
    userMessage: 'Docker is not running.',
    action: 'Start Docker Desktop and try again.',
    retryable: true,
  },
  [ErrorCode.CONTAINER_NOT_FOUND]: {
    userMessage: 'Container not found.',
    action: 'The container may have been removed. Rebuild your project.',
    retryable: false,
  },
  [ErrorCode.CONTAINER_START_FAILED]: {
    userMessage: 'Failed to start container.',
    action: 'Check the logs for details.',
    retryable: true,
  },
  [ErrorCode.CONTAINER_STOP_FAILED]: {
    userMessage: 'Failed to stop container.',
    action: 'Try force-stopping the container.',
    retryable: true,
  },
  [ErrorCode.CONTAINER_RESTART_FAILED]: {
    userMessage: 'Failed to restart container.',
    action: 'Try stopping and starting the container manually.',
    retryable: true,
  },
  [ErrorCode.CONTAINER_REMOVE_FAILED]: {
    userMessage: 'Failed to remove container.',
    action: 'Stop the container first, then try removing it.',
    retryable: true,
  },
  [ErrorCode.IMAGE_NOT_FOUND]: {
    userMessage: 'Docker image not found.',
    action: 'Pull the image or rebuild your project.',
    retryable: true,
  },
  [ErrorCode.IMAGE_PULL_FAILED]: {
    userMessage: 'Failed to pull Docker image.',
    action: 'Check your internet connection and Docker Hub status.',
    retryable: true,
  },
  [ErrorCode.DOCKER_NETWORK_ERROR]: {
    userMessage: 'Docker network error.',
    action: 'Check your Docker network configuration.',
    retryable: true,
  },
  [ErrorCode.DOCKER_VOLUME_ERROR]: {
    userMessage: 'Docker volume error.',
    action: 'Check your volume configuration and disk space.',
    retryable: true,
  },
  [ErrorCode.DOCKER_COMPOSE_ERROR]: {
    userMessage: 'Docker Compose error.',
    action: 'Check your docker-compose.yml file.',
    retryable: false,
  },
  [ErrorCode.DOCKER_PERMISSION_DENIED]: {
    userMessage: 'Permission denied accessing Docker.',
    action: 'Make sure your user has permission to access Docker.',
    retryable: false,
  },
  [ErrorCode.DOCKER_OUT_OF_MEMORY]: {
    userMessage: 'Docker ran out of memory.',
    action: 'Increase Docker memory limit in Docker Desktop settings.',
    retryable: false,
  },
  [ErrorCode.DOCKER_OUT_OF_DISK_SPACE]: {
    userMessage: 'Docker ran out of disk space.',
    action: 'Free up disk space or prune Docker resources.',
    retryable: false,
  },

  // ===== DATABASE ERRORS =====
  [ErrorCode.DB_CONNECTION_FAILED]: {
    userMessage: 'Cannot connect to database.',
    action: 'Make sure the database service is running.',
    retryable: true,
  },
  [ErrorCode.QUERY_ERROR]: {
    userMessage: 'Database query failed.',
    action: 'Check your query syntax and try again.',
    retryable: true,
  },
  [ErrorCode.DB_NOT_INITIALIZED]: {
    userMessage: 'Database not initialized.',
    action: 'Run migrations to initialize the database.',
    retryable: false,
  },
  [ErrorCode.DB_TIMEOUT]: {
    userMessage: 'Database query timed out.',
    action: 'The query took too long. Try simplifying it or increase timeout.',
    retryable: true,
  },
  [ErrorCode.DB_SYNTAX_ERROR]: {
    userMessage: 'SQL syntax error.',
    action: 'Check your SQL syntax.',
    retryable: true,
  },
  [ErrorCode.DB_CONSTRAINT_VIOLATION]: {
    userMessage: 'Database constraint violation.',
    action: 'The operation violates a database constraint.',
    retryable: false,
  },
  [ErrorCode.DB_TABLE_NOT_FOUND]: {
    userMessage: 'Database table not found.',
    action: 'Run migrations to create the table.',
    retryable: false,
  },
  [ErrorCode.DB_COLUMN_NOT_FOUND]: {
    userMessage: 'Database column not found.',
    action: 'Check your query or run migrations.',
    retryable: false,
  },
  [ErrorCode.DB_MIGRATION_FAILED]: {
    userMessage: 'Database migration failed.',
    action: 'Check the migration logs for details.',
    retryable: true,
  },
  [ErrorCode.DB_SEED_FAILED]: {
    userMessage: 'Database seeding failed.',
    action: 'Check the seed data and try again.',
    retryable: true,
  },
  [ErrorCode.DB_BACKUP_FAILED]: {
    userMessage: 'Database backup failed.',
    action: 'Check disk space and database permissions.',
    retryable: true,
  },
  [ErrorCode.DB_RESTORE_FAILED]: {
    userMessage: 'Database restore failed.',
    action: 'Check the backup file and try again.',
    retryable: true,
  },
  [ErrorCode.DB_PERMISSION_DENIED]: {
    userMessage: 'Database permission denied.',
    action: 'Check your database user permissions.',
    retryable: false,
  },
  [ErrorCode.DB_TRANSACTION_FAILED]: {
    userMessage: 'Database transaction failed.',
    action: 'The transaction was rolled back. Try again.',
    retryable: true,
  },

  // ===== VALIDATION ERRORS =====
  [ErrorCode.VALIDATION_ERROR]: {
    userMessage: 'Validation failed.',
    action: 'Check the form for errors.',
    retryable: true,
  },
  [ErrorCode.INVALID_INPUT]: {
    userMessage: 'Invalid input.',
    action: 'Check your input and try again.',
    retryable: true,
  },
  [ErrorCode.REQUIRED_FIELD_MISSING]: {
    userMessage: 'Required field is missing.',
    action: 'Fill in all required fields.',
    retryable: true,
  },
  [ErrorCode.INVALID_FORMAT]: {
    userMessage: 'Invalid format.',
    action: 'Check the format and try again.',
    retryable: true,
  },
  [ErrorCode.VALUE_OUT_OF_RANGE]: {
    userMessage: 'Value is out of range.',
    action: 'Enter a value within the allowed range.',
    retryable: true,
  },
  [ErrorCode.INVALID_EMAIL]: {
    userMessage: 'Invalid email address.',
    action: 'Enter a valid email address.',
    retryable: true,
  },
  [ErrorCode.INVALID_URL]: {
    userMessage: 'Invalid URL.',
    action: 'Enter a valid URL.',
    retryable: true,
  },
  [ErrorCode.INVALID_PORT]: {
    userMessage: 'Invalid port number.',
    action: 'Enter a valid port number (1-65535).',
    retryable: true,
  },
  [ErrorCode.INVALID_PATH]: {
    userMessage: 'Invalid file path.',
    action: 'Enter a valid file path.',
    retryable: true,
  },
  [ErrorCode.INVALID_JSON]: {
    userMessage: 'Invalid JSON.',
    action: 'Check your JSON syntax.',
    retryable: true,
  },
  [ErrorCode.INVALID_ENV_VAR_NAME]: {
    userMessage: 'Invalid environment variable name.',
    action: 'Use only A-Z, 0-9, and underscores.',
    retryable: true,
  },
  [ErrorCode.INVALID_SERVICE_NAME]: {
    userMessage: 'Invalid service name.',
    action: 'Use only lowercase letters, numbers, and hyphens.',
    retryable: true,
  },
  [ErrorCode.DUPLICATE_KEY]: {
    userMessage: 'Duplicate key.',
    action: 'This key already exists. Use a different name.',
    retryable: true,
  },
  [ErrorCode.INVALID_FILE_TYPE]: {
    userMessage: 'Invalid file type.',
    action: 'Upload a file with an allowed type.',
    retryable: true,
  },
  [ErrorCode.FILE_TOO_LARGE]: {
    userMessage: 'File is too large.',
    action: 'Upload a smaller file.',
    retryable: true,
  },

  // ===== FILE SYSTEM ERRORS =====
  [ErrorCode.FILE_NOT_FOUND]: {
    userMessage: 'File not found.',
    action: 'Check the file path and try again.',
    retryable: false,
  },
  [ErrorCode.FILE_READ_ERROR]: {
    userMessage: 'Cannot read file.',
    action: 'Check file permissions.',
    retryable: true,
  },
  [ErrorCode.FILE_WRITE_ERROR]: {
    userMessage: 'Cannot write to file.',
    action: 'Check file permissions and disk space.',
    retryable: true,
  },
  [ErrorCode.FILE_DELETE_ERROR]: {
    userMessage: 'Cannot delete file.',
    action: 'Check file permissions.',
    retryable: true,
  },
  [ErrorCode.DIRECTORY_NOT_FOUND]: {
    userMessage: 'Directory not found.',
    action: 'Check the directory path.',
    retryable: false,
  },
  [ErrorCode.DIRECTORY_CREATE_ERROR]: {
    userMessage: 'Cannot create directory.',
    action: 'Check permissions and disk space.',
    retryable: true,
  },
  [ErrorCode.PERMISSION_DENIED]: {
    userMessage: 'Permission denied.',
    action: 'Check file or directory permissions.',
    retryable: false,
  },
  [ErrorCode.PATH_TRAVERSAL_DETECTED]: {
    userMessage: 'Invalid path detected.',
    action: 'Do not use .. or absolute paths.',
    retryable: false,
  },
  [ErrorCode.DISK_FULL]: {
    userMessage: 'Disk is full.',
    action: 'Free up disk space and try again.',
    retryable: false,
  },
  [ErrorCode.FILE_ALREADY_EXISTS]: {
    userMessage: 'File already exists.',
    action: 'Use a different filename or delete the existing file.',
    retryable: false,
  },

  // ===== SERVICE ERRORS =====
  [ErrorCode.SERVICE_NOT_FOUND]: {
    userMessage: 'Service not found.',
    action: 'Check the service name.',
    retryable: false,
  },
  [ErrorCode.SERVICE_START_FAILED]: {
    userMessage: 'Failed to start service.',
    action: 'Check the service logs for details.',
    retryable: true,
  },
  [ErrorCode.SERVICE_STOP_FAILED]: {
    userMessage: 'Failed to stop service.',
    action: 'Try force-stopping the service.',
    retryable: true,
  },
  [ErrorCode.SERVICE_RESTART_FAILED]: {
    userMessage: 'Failed to restart service.',
    action: 'Check the service status and logs.',
    retryable: true,
  },
  [ErrorCode.SERVICE_HEALTH_CHECK_FAILED]: {
    userMessage: 'Service health check failed.',
    action: 'The service is unhealthy. Check the logs.',
    retryable: false,
  },
  [ErrorCode.SERVICE_DEPENDENCY_FAILED]: {
    userMessage: 'Service dependency failed.',
    action: 'Start the dependent services first.',
    retryable: true,
  },
  [ErrorCode.SERVICE_ALREADY_RUNNING]: {
    userMessage: 'Service is already running.',
    action: 'Stop the service first.',
    retryable: false,
  },
  [ErrorCode.SERVICE_ALREADY_STOPPED]: {
    userMessage: 'Service is already stopped.',
    action: 'Start the service first.',
    retryable: false,
  },
  [ErrorCode.SERVICE_CONFIG_INVALID]: {
    userMessage: 'Service configuration is invalid.',
    action: 'Check the service configuration.',
    retryable: false,
  },
  [ErrorCode.SERVICE_PORT_CONFLICT]: {
    userMessage: 'Port conflict detected.',
    action: 'Change the service port or stop the conflicting service.',
    retryable: false,
  },

  // ===== PROJECT ERRORS =====
  [ErrorCode.PROJECT_NOT_INITIALIZED]: {
    userMessage: 'Project is not initialized.',
    action: 'Run "nself init" to initialize the project.',
    retryable: false,
  },
  [ErrorCode.PROJECT_INITIALIZATION_FAILED]: {
    userMessage: 'Project initialization failed.',
    action: 'Check the error logs and try again.',
    retryable: true,
  },
  [ErrorCode.PROJECT_BUILD_FAILED]: {
    userMessage: 'Project build failed.',
    action: 'Check the build logs for details.',
    retryable: true,
  },
  [ErrorCode.PROJECT_VALIDATION_FAILED]: {
    userMessage: 'Project validation failed.',
    action: 'Fix the validation errors and try again.',
    retryable: true,
  },
  [ErrorCode.PROJECT_CONFIG_NOT_FOUND]: {
    userMessage: 'Project configuration not found.',
    action: 'Run "nself init" or restore the configuration.',
    retryable: false,
  },
  [ErrorCode.PROJECT_CONFIG_INVALID]: {
    userMessage: 'Project configuration is invalid.',
    action: 'Check your configuration files.',
    retryable: false,
  },
  [ErrorCode.PROJECT_PATH_INVALID]: {
    userMessage: 'Project path is invalid.',
    action: 'Check the project path configuration.',
    retryable: false,
  },
  [ErrorCode.PROJECT_ALREADY_INITIALIZED]: {
    userMessage: 'Project is already initialized.',
    action: 'Skip initialization or reset the project.',
    retryable: false,
  },

  // ===== DEPLOYMENT ERRORS =====
  [ErrorCode.DEPLOYMENT_FAILED]: {
    userMessage: 'Deployment failed.',
    action: 'Check the deployment logs for details.',
    retryable: true,
  },
  [ErrorCode.DEPLOYMENT_VALIDATION_FAILED]: {
    userMessage: 'Deployment validation failed.',
    action: 'Fix the validation errors before deploying.',
    retryable: true,
  },
  [ErrorCode.DEPLOYMENT_ROLLBACK_FAILED]: {
    userMessage: 'Deployment rollback failed.',
    action: 'Manual intervention may be required.',
    retryable: false,
  },
  [ErrorCode.ENVIRONMENT_NOT_FOUND]: {
    userMessage: 'Environment not found.',
    action: 'Check the environment name.',
    retryable: false,
  },
  [ErrorCode.ENVIRONMENT_CONFIG_INVALID]: {
    userMessage: 'Environment configuration is invalid.',
    action: 'Check the environment configuration.',
    retryable: false,
  },
  [ErrorCode.DEPLOYMENT_TIMEOUT]: {
    userMessage: 'Deployment timed out.',
    action: 'The deployment took too long. Check the status.',
    retryable: true,
  },
  [ErrorCode.DEPLOYMENT_HEALTH_CHECK_FAILED]: {
    userMessage: 'Deployment health check failed.',
    action: 'The deployed version is unhealthy. Rolling back.',
    retryable: false,
  },

  // ===== PLUGIN ERRORS =====
  [ErrorCode.PLUGIN_NOT_FOUND]: {
    userMessage: 'Plugin not found.',
    action: 'Check the plugin name.',
    retryable: false,
  },
  [ErrorCode.PLUGIN_INSTALL_FAILED]: {
    userMessage: 'Plugin installation failed.',
    action: 'Check the logs and try again.',
    retryable: true,
  },
  [ErrorCode.PLUGIN_UNINSTALL_FAILED]: {
    userMessage: 'Plugin uninstallation failed.',
    action: 'Check the logs and try again.',
    retryable: true,
  },
  [ErrorCode.PLUGIN_ACTIVATION_FAILED]: {
    userMessage: 'Plugin activation failed.',
    action: 'Check the plugin configuration.',
    retryable: true,
  },
  [ErrorCode.PLUGIN_DEACTIVATION_FAILED]: {
    userMessage: 'Plugin deactivation failed.',
    action: 'Check the logs and try again.',
    retryable: true,
  },
  [ErrorCode.PLUGIN_CONFIG_INVALID]: {
    userMessage: 'Plugin configuration is invalid.',
    action: 'Check the plugin configuration.',
    retryable: false,
  },
  [ErrorCode.PLUGIN_VERSION_INCOMPATIBLE]: {
    userMessage: 'Plugin version is incompatible.',
    action: 'Update the plugin or nself-admin.',
    retryable: false,
  },
  [ErrorCode.PLUGIN_DEPENDENCY_MISSING]: {
    userMessage: 'Plugin dependency is missing.',
    action: 'Install the required dependencies.',
    retryable: false,
  },

  // ===== BACKUP/RESTORE ERRORS =====
  [ErrorCode.BACKUP_CREATE_FAILED]: {
    userMessage: 'Backup creation failed.',
    action: 'Check disk space and permissions.',
    retryable: true,
  },
  [ErrorCode.BACKUP_NOT_FOUND]: {
    userMessage: 'Backup not found.',
    action: 'Check the backup name.',
    retryable: false,
  },
  [ErrorCode.BACKUP_RESTORE_FAILED]: {
    userMessage: 'Backup restore failed.',
    action: 'Check the backup file and try again.',
    retryable: true,
  },
  [ErrorCode.BACKUP_VERIFY_FAILED]: {
    userMessage: 'Backup verification failed.',
    action: 'The backup may be corrupted.',
    retryable: false,
  },
  [ErrorCode.BACKUP_CORRUPTED]: {
    userMessage: 'Backup is corrupted.',
    action: 'Use a different backup file.',
    retryable: false,
  },
  [ErrorCode.BACKUP_DELETE_FAILED]: {
    userMessage: 'Backup deletion failed.',
    action: 'Check permissions and try again.',
    retryable: true,
  },

  // ===== UNKNOWN/GENERIC ERRORS =====
  [ErrorCode.UNKNOWN_ERROR]: {
    userMessage: 'An unknown error occurred.',
    action: 'Try again or contact support.',
    retryable: true,
  },
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    userMessage: 'Internal server error.',
    action: 'Try again later or contact support.',
    retryable: true,
  },
  [ErrorCode.NOT_IMPLEMENTED]: {
    userMessage: 'This feature is not yet implemented.',
    action: 'Check back in a future release.',
    retryable: false,
  },
  [ErrorCode.OPERATION_CANCELLED]: {
    userMessage: 'Operation was cancelled.',
    action: 'Try the operation again if needed.',
    retryable: true,
  },
  [ErrorCode.OPERATION_TIMEOUT]: {
    userMessage: 'Operation timed out.',
    action: 'Try again or increase the timeout.',
    retryable: true,
  },
}

/**
 * Get user-friendly error message for an error code
 */
export function getErrorMessageForCode(code: ErrorCode): ErrorMessage {
  return (
    ERROR_MESSAGES[code] || {
      userMessage: 'An unexpected error occurred.',
      action: 'Try again or contact support.',
      retryable: true,
    }
  )
}
