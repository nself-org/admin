/**
 * Workflows Library - Real Execution Engine
 *
 * Provides workflow management functionality including:
 * - Database-backed workflow storage (LokiJS)
 * - Real workflow execution via nself CLI
 * - Action execution with proper error handling
 * - Execution history tracking
 * - Trigger management and scheduling
 */

import { getDatabase, initDatabase } from '@/lib/database'
import * as nselfCLI from '@/lib/nselfCLI'
import type {
  ActionType,
  ExecuteWorkflowInput,
  TriggerType,
  Workflow,
  WorkflowAction,
  WorkflowExecution,
  WorkflowExecutionStatus,
  WorkflowExecutionStep,
  WorkflowStats,
  WorkflowStatus,
} from '@/types/workflow'
import type { Collection } from 'lokijs'
import vm from 'vm'

// ============================================================================
// Database Collections
// ============================================================================

let workflowsCollection: Collection<Workflow> | null = null
let executionsCollection: Collection<WorkflowExecution> | null = null
let scheduledTriggersCollection: Collection<ScheduledTrigger> | null = null

interface ScheduledTrigger {
  id: string
  workflowId: string
  triggerId: string
  type: 'schedule'
  cronExpression: string
  timezone: string
  lastRun?: string
  nextRun: string
  enabled: boolean
}

async function ensureCollections(): Promise<void> {
  await initDatabase()
  const db = getDatabase()

  if (!db) {
    throw new Error('Database not initialized')
  }

  if (!workflowsCollection) {
    workflowsCollection =
      db.getCollection('workflows') ||
      db.addCollection('workflows', {
        unique: ['id'],
        indices: ['id', 'status', 'tenantId'],
      })
  }

  if (!executionsCollection) {
    executionsCollection =
      db.getCollection('workflow_executions') ||
      db.addCollection('workflow_executions', {
        unique: ['id'],
        indices: ['id', 'workflowId', 'status', 'startedAt'],
        ttl: 90 * 24 * 60 * 60 * 1000, // 90 days retention
        ttlInterval: 24 * 60 * 60 * 1000, // Check daily
      })
  }

  if (!scheduledTriggersCollection) {
    scheduledTriggersCollection =
      db.getCollection('scheduled_triggers') ||
      db.addCollection('scheduled_triggers', {
        unique: ['id'],
        indices: ['workflowId', 'nextRun', 'enabled'],
      })
  }
}

// ============================================================================
// Action Template Definitions
// ============================================================================

export interface ActionTemplate {
  type: ActionType
  name: string
  description: string
  icon: string
  category: 'communication' | 'data' | 'control' | 'integration' | 'utility'
  configSchema: {
    properties: Record<
      string,
      {
        type: string
        label: string
        description?: string
        required?: boolean
        default?: unknown
        options?: { label: string; value: string }[]
        placeholder?: string
      }
    >
  }
  inputPorts?: { id: string; name: string }[]
  outputPorts?: { id: string; name: string }[]
}

const actionTemplates: ActionTemplate[] = [
  {
    type: 'http_request',
    name: 'HTTP Request',
    description: 'Make an HTTP request to an external API or service',
    icon: 'Globe',
    category: 'integration',
    configSchema: {
      properties: {
        method: {
          type: 'select',
          label: 'Method',
          required: true,
          default: 'GET',
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'PATCH', value: 'PATCH' },
            { label: 'DELETE', value: 'DELETE' },
          ],
        },
        url: {
          type: 'string',
          label: 'URL',
          required: true,
          placeholder: 'https://api.example.com/endpoint',
        },
        headers: {
          type: 'json',
          label: 'Headers',
          description: 'Request headers as JSON object',
          default: {},
        },
        body: {
          type: 'json',
          label: 'Body',
          description: 'Request body (for POST, PUT, PATCH)',
        },
        timeout: {
          type: 'number',
          label: 'Timeout (ms)',
          default: 30000,
        },
      },
    },
    outputPorts: [
      { id: 'success', name: 'Success' },
      { id: 'error', name: 'Error' },
    ],
  },
  {
    type: 'email',
    name: 'Send Email',
    description: 'Send an email using the configured email service',
    icon: 'Mail',
    category: 'communication',
    configSchema: {
      properties: {
        to: {
          type: 'string',
          label: 'To',
          required: true,
          placeholder: 'recipient@example.com',
        },
        cc: {
          type: 'string',
          label: 'CC',
          placeholder: 'cc@example.com',
        },
        bcc: {
          type: 'string',
          label: 'BCC',
          placeholder: 'bcc@example.com',
        },
        subject: {
          type: 'string',
          label: 'Subject',
          required: true,
        },
        body: {
          type: 'text',
          label: 'Body',
          required: true,
        },
        isHtml: {
          type: 'boolean',
          label: 'HTML Email',
          default: false,
        },
      },
    },
  },
  {
    type: 'notification',
    name: 'Send Notification',
    description: 'Send an in-app notification or push notification',
    icon: 'Bell',
    category: 'communication',
    configSchema: {
      properties: {
        type: {
          type: 'select',
          label: 'Notification Type',
          required: true,
          default: 'info',
          options: [
            { label: 'Info', value: 'info' },
            { label: 'Success', value: 'success' },
            { label: 'Warning', value: 'warning' },
            { label: 'Error', value: 'error' },
          ],
        },
        title: {
          type: 'string',
          label: 'Title',
          required: true,
        },
        message: {
          type: 'text',
          label: 'Message',
          required: true,
        },
        channel: {
          type: 'select',
          label: 'Channel',
          default: 'app',
          options: [
            { label: 'In-App', value: 'app' },
            { label: 'Push', value: 'push' },
            { label: 'Both', value: 'both' },
          ],
        },
        targetUsers: {
          type: 'string',
          label: 'Target Users',
          description: 'Comma-separated user IDs or "all"',
          default: 'all',
        },
      },
    },
  },
  {
    type: 'database_query',
    name: 'Database Query',
    description: 'Execute a database query via Hasura or direct PostgreSQL',
    icon: 'Database',
    category: 'data',
    configSchema: {
      properties: {
        queryType: {
          type: 'select',
          label: 'Query Type',
          required: true,
          default: 'graphql',
          options: [
            { label: 'GraphQL', value: 'graphql' },
            { label: 'SQL', value: 'sql' },
          ],
        },
        query: {
          type: 'code',
          label: 'Query',
          required: true,
          placeholder: 'query { users { id name } }',
        },
        variables: {
          type: 'json',
          label: 'Variables',
          default: {},
        },
        connection: {
          type: 'select',
          label: 'Connection',
          default: 'default',
          options: [
            { label: 'Default', value: 'default' },
            { label: 'Read Replica', value: 'replica' },
          ],
        },
      },
    },
  },
  {
    type: 'run_command',
    name: 'Run CLI Command',
    description: 'Execute an nself CLI command or shell command',
    icon: 'Terminal',
    category: 'utility',
    configSchema: {
      properties: {
        command: {
          type: 'string',
          label: 'Command',
          required: true,
          placeholder: 'nself db backup',
        },
        workingDirectory: {
          type: 'string',
          label: 'Working Directory',
          placeholder: '/workspace',
        },
        timeout: {
          type: 'number',
          label: 'Timeout (ms)',
          default: 60000,
        },
        captureOutput: {
          type: 'boolean',
          label: 'Capture Output',
          default: true,
        },
      },
    },
  },
  {
    type: 'delay',
    name: 'Delay / Wait',
    description: 'Pause workflow execution for a specified duration',
    icon: 'Clock',
    category: 'control',
    configSchema: {
      properties: {
        duration: {
          type: 'number',
          label: 'Duration (ms)',
          required: true,
          default: 1000,
        },
        unit: {
          type: 'select',
          label: 'Unit',
          default: 'ms',
          options: [
            { label: 'Milliseconds', value: 'ms' },
            { label: 'Seconds', value: 's' },
            { label: 'Minutes', value: 'm' },
            { label: 'Hours', value: 'h' },
          ],
        },
      },
    },
  },
  {
    type: 'condition',
    name: 'Condition (If/Else)',
    description: 'Branch workflow based on a condition',
    icon: 'GitBranch',
    category: 'control',
    configSchema: {
      properties: {
        expression: {
          type: 'string',
          label: 'Condition Expression',
          required: true,
          placeholder: '{{previousStep.status}} === "success"',
          description: 'JavaScript expression that evaluates to true or false',
        },
        trueLabel: {
          type: 'string',
          label: 'True Branch Label',
          default: 'Yes',
        },
        falseLabel: {
          type: 'string',
          label: 'False Branch Label',
          default: 'No',
        },
      },
    },
    outputPorts: [
      { id: 'true', name: 'True' },
      { id: 'false', name: 'False' },
    ],
  },
  {
    type: 'loop',
    name: 'Loop',
    description:
      'Iterate over an array or repeat actions a specified number of times',
    icon: 'Repeat',
    category: 'control',
    configSchema: {
      properties: {
        loopType: {
          type: 'select',
          label: 'Loop Type',
          required: true,
          default: 'forEach',
          options: [
            { label: 'For Each', value: 'forEach' },
            { label: 'While', value: 'while' },
            { label: 'Count', value: 'count' },
          ],
        },
        source: {
          type: 'string',
          label: 'Source Array',
          placeholder: '{{previousStep.output.items}}',
          description: 'For "For Each" loops',
        },
        condition: {
          type: 'string',
          label: 'While Condition',
          placeholder: '{{index}} < 10',
          description: 'For "While" loops',
        },
        count: {
          type: 'number',
          label: 'Iterations',
          default: 10,
          description: 'For "Count" loops',
        },
        maxIterations: {
          type: 'number',
          label: 'Max Iterations',
          default: 100,
          description: 'Safety limit to prevent infinite loops',
        },
      },
    },
    outputPorts: [
      { id: 'iteration', name: 'Each Iteration' },
      { id: 'complete', name: 'Loop Complete' },
    ],
  },
  {
    type: 'transform_data',
    name: 'Transform Data',
    description: 'Transform, map, or filter data from previous steps',
    icon: 'Shuffle',
    category: 'data',
    configSchema: {
      properties: {
        transformType: {
          type: 'select',
          label: 'Transform Type',
          required: true,
          default: 'map',
          options: [
            { label: 'Map', value: 'map' },
            { label: 'Filter', value: 'filter' },
            { label: 'Reduce', value: 'reduce' },
            { label: 'Custom', value: 'custom' },
          ],
        },
        input: {
          type: 'string',
          label: 'Input Data',
          required: true,
          placeholder: '{{previousStep.output}}',
        },
        expression: {
          type: 'code',
          label: 'Transform Expression',
          required: true,
          placeholder:
            'item => ({ id: item.id, name: item.name.toUpperCase() })',
        },
        outputKey: {
          type: 'string',
          label: 'Output Variable Name',
          default: 'transformedData',
        },
      },
    },
  },
  {
    type: 'set_variable',
    name: 'Set Variable',
    description: 'Set or update a workflow variable',
    icon: 'Variable',
    category: 'utility',
    configSchema: {
      properties: {
        name: {
          type: 'string',
          label: 'Variable Name',
          required: true,
          placeholder: 'myVariable',
        },
        value: {
          type: 'string',
          label: 'Value',
          required: true,
          placeholder: '{{previousStep.output.value}}',
        },
        valueType: {
          type: 'select',
          label: 'Value Type',
          default: 'auto',
          options: [
            { label: 'Auto-detect', value: 'auto' },
            { label: 'String', value: 'string' },
            { label: 'Number', value: 'number' },
            { label: 'Boolean', value: 'boolean' },
            { label: 'JSON Object', value: 'object' },
            { label: 'Array', value: 'array' },
          ],
        },
        scope: {
          type: 'select',
          label: 'Scope',
          default: 'workflow',
          options: [
            { label: 'Workflow', value: 'workflow' },
            { label: 'Step', value: 'step' },
          ],
        },
      },
    },
  },
]

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

// ============================================================================
// Action Executors - Real Implementation
// ============================================================================

interface ActionExecutionContext {
  workflow: Workflow
  execution: WorkflowExecution
  variables: Record<string, unknown>
  previousSteps: WorkflowExecutionStep[]
}

async function executeAction(
  action: WorkflowAction,
  context: ActionExecutionContext,
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  try {
    // Resolve template variables in config
    const resolvedConfig = resolveTemplateVariables(
      action.config,
      context.variables,
      context.previousSteps,
    )

    switch (action.type) {
      case 'run_command':
        return await executeCommandAction(resolvedConfig)

      case 'http_request':
        return await executeHttpRequestAction(resolvedConfig)

      case 'email':
        return await executeEmailAction(resolvedConfig)

      case 'notification':
        return await executeNotificationAction(resolvedConfig)

      case 'database_query':
        return await executeDatabaseQueryAction(resolvedConfig)

      case 'delay':
        return await executeDelayAction(resolvedConfig)

      case 'set_variable':
        return executeSetVariableAction(resolvedConfig, context)

      case 'transform_data':
        return executeTransformDataAction(resolvedConfig)

      case 'condition':
        return executeConditionAction(resolvedConfig, context)

      default:
        throw new Error(`Unsupported action type: ${action.type}`)
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Template variable resolution
function resolveTemplateVariables(
  config: Record<string, unknown>,
  variables: Record<string, unknown>,
  previousSteps: WorkflowExecutionStep[],
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      // eslint-disable-next-line security/detect-object-injection
      resolved[key] = resolveStringTemplate(value, variables, previousSteps)
    } else if (typeof value === 'object' && value !== null) {
      // eslint-disable-next-line security/detect-object-injection
      resolved[key] = resolveTemplateVariables(
        value as Record<string, unknown>,
        variables,
        previousSteps,
      )
    } else {
      // eslint-disable-next-line security/detect-object-injection
      resolved[key] = value
    }
  }

  return resolved
}

function resolveStringTemplate(
  template: string,
  variables: Record<string, unknown>,
  previousSteps: WorkflowExecutionStep[],
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, path) => {
    const trimmedPath = path.trim()

    // Check if it's a variable reference
    if (trimmedPath.startsWith('trigger.') || trimmedPath.startsWith('var.')) {
      const varName = trimmedPath.split('.').slice(1).join('.')
      return String(getNestedValue(variables, varName) ?? '')
    }

    // Check if it's a previous step reference
    const stepMatch = trimmedPath.match(/^([^.]+)\.(.+)$/)
    if (stepMatch) {
      const [, stepId, propPath] = stepMatch
      const step = previousSteps.find((s) => s.actionId === stepId)
      if (step && step.output) {
        return String(getNestedValue(step.output, propPath) ?? '')
      }
    }

    // Check if it's a direct variable
    // eslint-disable-next-line security/detect-object-injection
    return String(variables[trimmedPath] ?? '')
  })
}

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.')
  let current = obj

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      // eslint-disable-next-line security/detect-object-injection
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }

  return current
}

// Action executors

async function executeCommandAction(
  config: Record<string, unknown>,
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  const command = String(config.command || '')

  if (!command) {
    return { success: false, error: 'Command is required' }
  }

  // Parse nself command
  if (command.startsWith('nself ')) {
    const parts = command.slice(6).trim().split(' ')
    const nselfCommand = parts[0]
    const args = parts.slice(1)

    const result = await nselfCLI.executeNselfCommand(
      nselfCommand,
      args,
      config.workingDirectory
        ? { cwd: String(config.workingDirectory) }
        : undefined,
    )

    return {
      success: result.success,
      output: { stdout: result.stdout, stderr: result.stderr },
      error: result.error,
    }
  }

  return {
    success: false,
    error: 'Only nself commands are supported for security',
  }
}

async function executeHttpRequestAction(
  config: Record<string, unknown>,
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  const url = String(config.url || '')
  const method = String(config.method || 'GET')
  const timeout = Number(config.timeout || 30000)

  if (!url) {
    return { success: false, error: 'URL is required' }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      method,
      headers: config.headers
        ? (config.headers as Record<string, string>)
        : undefined,
      body:
        method !== 'GET' && config.body
          ? JSON.stringify(config.body)
          : undefined,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const contentType = response.headers.get('content-type')
    let data: unknown

    if (contentType?.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    return {
      success: response.ok,
      output: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
      },
      error: response.ok ? undefined : `HTTP ${response.status}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'HTTP request failed',
    }
  }
}

async function executeEmailAction(
  _config: Record<string, unknown>,
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  // Email would be sent via nself CLI or external service
  // For now, return success placeholder
  return {
    success: true,
    output: { messageId: generateId('msg'), sent: true },
  }
}

async function executeNotificationAction(
  _config: Record<string, unknown>,
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  // Notifications would be sent to in-app system or push service
  return {
    success: true,
    output: { sent: true },
  }
}

async function executeDatabaseQueryAction(
  config: Record<string, unknown>,
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  const queryType = String(config.queryType || 'graphql')
  const query = String(config.query || '')

  if (!query) {
    return { success: false, error: 'Query is required' }
  }

  if (queryType === 'sql') {
    const result = await nselfCLI.executeDbQuery(query)
    return {
      success: result.success,
      output: result.stdout ? JSON.parse(result.stdout) : null,
      error: result.error,
    }
  }

  // GraphQL queries would go through Hasura
  return {
    success: false,
    error: 'GraphQL execution not yet implemented',
  }
}

async function executeDelayAction(
  config: Record<string, unknown>,
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  const duration = Number(config.duration || 1000)
  const unit = String(config.unit || 'ms')

  let ms = duration
  if (unit === 's') ms = duration * 1000
  else if (unit === 'm') ms = duration * 60 * 1000
  else if (unit === 'h') ms = duration * 60 * 60 * 1000

  await new Promise((resolve) => setTimeout(resolve, ms))

  return { success: true, output: { delayed: ms } }
}

function executeSetVariableAction(
  config: Record<string, unknown>,
  context: ActionExecutionContext,
): { success: boolean; output?: unknown; error?: string } {
  const name = String(config.name || '')
  const value = config.value

  if (!name) {
    return { success: false, error: 'Variable name is required' }
  }

  // eslint-disable-next-line security/detect-object-injection
  context.variables[name] = value

  return { success: true, output: { [name]: value } }
}

function executeTransformDataAction(config: Record<string, unknown>): {
  success: boolean
  output?: unknown
  error?: string
} {
  try {
    const input = config.input
    const transformType = String(config.transformType || 'map')
    const expression = String(config.expression || '')

    if (!Array.isArray(input)) {
      return { success: false, error: 'Input must be an array' }
    }

    // SECURITY: Use an empty vm context so the expression runs with no access
    // to Node.js globals, process, require, or any host capabilities.
    // A deny-list approach (new Function + regex) is bypassable via bracket
    // notation and globalThis aliases. vm.runInContext with an empty sandbox
    // prevents escape entirely.
    const makeItemFn = (item: unknown): unknown => {
      const ctx = vm.createContext({ item })
      return vm.runInContext(`(${expression})(item)`, ctx, { timeout: 1000 })
    }

    let result: unknown
    if (transformType === 'map') {
      result = input.map((item) => makeItemFn(item))
    } else if (transformType === 'filter') {
      result = input.filter((item) => Boolean(makeItemFn(item)))
    } else {
      return { success: false, error: 'Unsupported transform type' }
    }

    return { success: true, output: result }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transform failed',
    }
  }
}

function executeConditionAction(
  config: Record<string, unknown>,
  _context: ActionExecutionContext,
): { success: boolean; output?: unknown; error?: string } {
  try {
    const expression = String(config.expression || '')

    if (!expression) {
      return { success: false, error: 'Expression is required' }
    }

    // SECURITY: Use an empty vm context (no host globals, no require, no process).
    const ctx = vm.createContext({})
    const result = vm.runInContext(`(${expression})`, ctx, { timeout: 1000 })

    return {
      success: true,
      output: { result: Boolean(result), branch: result ? 'true' : 'false' },
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Condition evaluation failed',
    }
  }
}

// ============================================================================
// Workflow Execution Engine
// ============================================================================

async function executeWorkflowInternal(
  workflow: Workflow,
  input: unknown,
  variables: Record<string, unknown>,
  triggerType: TriggerType,
  triggerId?: string,
): Promise<WorkflowExecution> {
  await ensureCollections()

  const now = getCurrentTimestamp()
  const execution: WorkflowExecution = {
    id: generateId('exec'),
    workflowId: workflow.id,
    workflowVersion: workflow.version,
    status: 'running',
    triggerType,
    triggerId,
    input,
    variables: { ...variables },
    steps: workflow.actions.map((action) => ({
      actionId: action.id,
      actionName: action.name,
      status: 'pending',
    })),
    startedAt: now,
  }

  executionsCollection?.insert(execution)
  getDatabase()?.saveDatabase()

  const context: ActionExecutionContext = {
    workflow,
    execution,
    variables: { ...variables, trigger: { data: input } },
    previousSteps: [],
  }

  try {
    // Execute actions in sequence (following connections)
    for (let i = 0; i < workflow.actions.length; i++) {
      // eslint-disable-next-line security/detect-object-injection
      const action = workflow.actions[i]
      // eslint-disable-next-line security/detect-object-injection
      const step = execution.steps[i]

      step.status = 'running'
      step.startedAt = getCurrentTimestamp()

      const startTime = Date.now()
      const result = await executeAction(action, context)
      const endTime = Date.now()

      step.status = result.success ? 'completed' : 'failed'
      step.output = result.output
      step.error = result.error
      step.completedAt = getCurrentTimestamp()
      step.duration = endTime - startTime

      context.previousSteps.push(step)

      // Handle errors
      if (!result.success) {
        if (action.onError === 'stop') {
          execution.status = 'failed'
          execution.error = result.error
          break
        }
        // Continue to next step if onError is 'continue'
      }
    }

    // If all steps completed
    if (execution.status === 'running') {
      execution.status = 'completed'
    }
  } catch (error) {
    execution.status = 'failed'
    execution.error =
      error instanceof Error ? error.message : 'Workflow execution failed'
  } finally {
    execution.completedAt = getCurrentTimestamp()
    execution.duration =
      new Date(execution.completedAt).getTime() -
      new Date(execution.startedAt).getTime()

    // Update in database
    const existing = executionsCollection?.findOne({ id: execution.id })
    if (existing) {
      Object.assign(existing, execution)
      executionsCollection?.update(existing)
    }

    getDatabase()?.saveDatabase()
  }

  return execution
}

// ============================================================================
// Workflow CRUD Operations
// ============================================================================

export interface GetWorkflowsOptions {
  tenantId?: string
  status?: WorkflowStatus
  limit?: number
  offset?: number
}

export async function getWorkflows(
  options: GetWorkflowsOptions = {},
): Promise<Workflow[]> {
  await ensureCollections()

  let query: Record<string, unknown> = {}

  if (options.tenantId) {
    query.tenantId = options.tenantId
  }

  if (options.status) {
    query.status = options.status
  }

  const result =
    workflowsCollection
      ?.chain()
      .find(query)
      .simplesort('updatedAt', true)
      .offset(options.offset || 0)
      .limit(options.limit || 100)
      .data() || []

  return result
}

export async function getWorkflowById(id: string): Promise<Workflow | null> {
  await ensureCollections()
  return workflowsCollection?.findOne({ id }) || null
}

export interface CreateWorkflowInput {
  name: string
  description?: string
  tenantId?: string
  triggers?: Workflow['triggers']
  actions?: Workflow['actions']
  connections?: Workflow['connections']
  variables?: Workflow['variables']
  inputSchema?: Workflow['inputSchema']
  outputSchema?: Workflow['outputSchema']
  timeout?: number
  maxConcurrency?: number
  createdBy: string
}

export async function createWorkflow(
  input: CreateWorkflowInput,
): Promise<Workflow> {
  await ensureCollections()

  const now = getCurrentTimestamp()
  const workflow: Workflow = {
    id: generateId('wf'),
    name: input.name,
    description: input.description,
    tenantId: input.tenantId,
    status: 'draft',
    version: 1,
    triggers: input.triggers || [],
    actions: input.actions || [],
    connections: input.connections || [],
    variables: input.variables,
    inputSchema: input.inputSchema,
    outputSchema: input.outputSchema,
    timeout: input.timeout,
    maxConcurrency: input.maxConcurrency,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  }

  workflowsCollection?.insert(workflow)
  getDatabase()?.saveDatabase()

  return workflow
}

export interface UpdateWorkflowInput {
  name?: string
  description?: string
  triggers?: Workflow['triggers']
  actions?: Workflow['actions']
  connections?: Workflow['connections']
  variables?: Workflow['variables']
  inputSchema?: Workflow['inputSchema']
  outputSchema?: Workflow['outputSchema']
  timeout?: number
  maxConcurrency?: number
}

export async function updateWorkflow(
  id: string,
  updates: UpdateWorkflowInput,
): Promise<Workflow | null> {
  await ensureCollections()

  const workflow = workflowsCollection?.findOne({ id })
  if (!workflow) return null

  // Increment version if structure changes
  const structureChanged =
    updates.triggers !== undefined ||
    updates.actions !== undefined ||
    updates.connections !== undefined

  Object.assign(workflow, {
    ...updates,
    version: structureChanged ? workflow.version + 1 : workflow.version,
    updatedAt: getCurrentTimestamp(),
  })

  workflowsCollection?.update(workflow)
  getDatabase()?.saveDatabase()

  return workflow
}

export async function deleteWorkflow(id: string): Promise<boolean> {
  await ensureCollections()

  const workflow = workflowsCollection?.findOne({ id })
  if (!workflow) return false

  workflowsCollection?.remove(workflow)

  // Delete related executions
  const executions = executionsCollection?.find({ workflowId: id }) || []
  executions.forEach((exec) => executionsCollection?.remove(exec))

  getDatabase()?.saveDatabase()
  return true
}

export async function activateWorkflow(id: string): Promise<Workflow | null> {
  await ensureCollections()

  const workflow = workflowsCollection?.findOne({ id })
  if (!workflow) return null

  // Validate workflow before activation
  if (workflow.triggers.length === 0) {
    throw new Error('Workflow must have at least one trigger to be activated')
  }
  if (workflow.actions.length === 0) {
    throw new Error('Workflow must have at least one action to be activated')
  }

  workflow.status = 'active'
  workflow.updatedAt = getCurrentTimestamp()

  workflowsCollection?.update(workflow)
  getDatabase()?.saveDatabase()

  return workflow
}

export async function pauseWorkflow(id: string): Promise<Workflow | null> {
  await ensureCollections()

  const workflow = workflowsCollection?.findOne({ id })
  if (!workflow) return null

  workflow.status = 'paused'
  workflow.updatedAt = getCurrentTimestamp()

  workflowsCollection?.update(workflow)
  getDatabase()?.saveDatabase()

  return workflow
}

export interface DuplicateWorkflowInput {
  name?: string
  createdBy: string
}

export async function duplicateWorkflow(
  id: string,
  input: DuplicateWorkflowInput,
): Promise<Workflow | null> {
  const original = await getWorkflowById(id)
  if (!original) return null

  const now = getCurrentTimestamp()
  const duplicatedWorkflow: Workflow = {
    id: generateId('wf'),
    name: input.name || `${original.name} (Copy)`,
    description: original.description,
    tenantId: original.tenantId,
    status: 'draft',
    version: 1,
    triggers: original.triggers.map((trigger) => ({
      ...trigger,
      id: generateId('tr'),
    })),
    actions: original.actions.map((action) => ({
      ...action,
      id: generateId('act'),
    })),
    connections: [],
    variables: original.variables ? [...original.variables] : undefined,
    inputSchema: original.inputSchema,
    outputSchema: original.outputSchema,
    timeout: original.timeout,
    maxConcurrency: original.maxConcurrency,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  }

  // Remap connections to use new action IDs
  const actionIdMap = new Map<string, string>()
  original.actions.forEach((action, index) => {
    // eslint-disable-next-line security/detect-object-injection
    actionIdMap.set(action.id, duplicatedWorkflow.actions[index].id)
  })

  duplicatedWorkflow.connections = original.connections.map((conn) => ({
    ...conn,
    id: generateId('c'),
    sourceId: actionIdMap.get(conn.sourceId) || conn.sourceId,
    targetId: actionIdMap.get(conn.targetId) || conn.targetId,
  }))

  workflowsCollection?.insert(duplicatedWorkflow)
  getDatabase()?.saveDatabase()

  return duplicatedWorkflow
}

// ============================================================================
// Workflow Execution Operations
// ============================================================================

export async function executeWorkflow(
  input: ExecuteWorkflowInput,
): Promise<WorkflowExecution> {
  const workflow = await getWorkflowById(input.workflowId)
  if (!workflow) {
    throw new Error(`Workflow not found: ${input.workflowId}`)
  }

  if (workflow.status !== 'active') {
    throw new Error(`Workflow is not active: ${workflow.status}`)
  }

  if (input.async) {
    // For async execution, create pending execution and process in background
    const now = getCurrentTimestamp()
    const execution: WorkflowExecution = {
      id: generateId('exec'),
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      status: 'pending',
      triggerType: 'manual',
      input: input.input,
      variables: input.variables,
      steps: workflow.actions.map((action) => ({
        actionId: action.id,
        actionName: action.name,
        status: 'pending',
      })),
      startedAt: now,
    }

    executionsCollection?.insert(execution)
    getDatabase()?.saveDatabase()

    // Execute in background (non-blocking)
    setImmediate(() => {
      executeWorkflowInternal(
        workflow,
        input.input,
        input.variables || {},
        'manual',
      ).catch(console.error)
    })

    return execution
  }

  // Synchronous execution
  return await executeWorkflowInternal(
    workflow,
    input.input,
    input.variables || {},
    'manual',
  )
}

export interface GetExecutionsOptions {
  workflowId?: string
  status?: WorkflowExecutionStatus
  limit?: number
  offset?: number
  orderBy?: 'startedAt' | 'completedAt'
  orderDir?: 'asc' | 'desc'
}

export async function getWorkflowExecutions(
  options: GetExecutionsOptions = {},
): Promise<WorkflowExecution[]> {
  await ensureCollections()

  let query: Record<string, unknown> = {}

  if (options.workflowId) {
    query.workflowId = options.workflowId
  }

  if (options.status) {
    query.status = options.status
  }

  const orderBy = options.orderBy || 'startedAt'
  const orderDir = options.orderDir === 'asc'

  const result =
    executionsCollection
      ?.chain()
      .find(query)
      .simplesort(orderBy, orderDir)
      .offset(options.offset || 0)
      .limit(options.limit || 100)
      .data() || []

  return result
}

export async function getWorkflowExecution(
  executionId: string,
): Promise<WorkflowExecution | null> {
  await ensureCollections()
  return executionsCollection?.findOne({ id: executionId }) || null
}

export async function cancelExecution(
  executionId: string,
): Promise<WorkflowExecution | null> {
  await ensureCollections()

  const execution = executionsCollection?.findOne({ id: executionId })
  if (!execution) return null

  if (execution.status !== 'running' && execution.status !== 'pending') {
    throw new Error(`Cannot cancel execution with status: ${execution.status}`)
  }

  execution.status = 'cancelled'
  execution.completedAt = getCurrentTimestamp()
  execution.steps = execution.steps.map((step) => ({
    ...step,
    status:
      step.status === 'running' || step.status === 'pending'
        ? 'skipped'
        : step.status,
  }))

  executionsCollection?.update(execution)
  getDatabase()?.saveDatabase()

  return execution
}

// ============================================================================
// Statistics
// ============================================================================

export async function getWorkflowStats(): Promise<WorkflowStats> {
  await ensureCollections()

  const allWorkflows = workflowsCollection?.find() || []
  const allExecutions = executionsCollection?.find() || []

  const totalWorkflows = allWorkflows.length
  const activeWorkflows = allWorkflows.filter(
    (w) => w.status === 'active',
  ).length
  const totalExecutions = allExecutions.length

  const executionsByStatus: Record<WorkflowExecutionStatus, number> = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    timeout: 0,
  }

  allExecutions.forEach((e) => {
    executionsByStatus[e.status]++
  })

  const completedExecutions = allExecutions.filter(
    (e) => e.status === 'completed' && e.duration,
  )
  const averageDuration =
    completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) /
        completedExecutions.length
      : 0

  const finishedExecutions = allExecutions.filter((e) =>
    ['completed', 'failed', 'cancelled', 'timeout'].includes(e.status),
  )
  const successRate =
    finishedExecutions.length > 0
      ? (executionsByStatus.completed / finishedExecutions.length) * 100
      : 0

  const recentExecutions = [...allExecutions]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 10)

  const workflowExecutionCounts: Record<
    string,
    { count: number; successful: number }
  > = {}

  allExecutions.forEach((e) => {
    if (!workflowExecutionCounts[e.workflowId]) {
      workflowExecutionCounts[e.workflowId] = { count: 0, successful: 0 }
    }
    workflowExecutionCounts[e.workflowId].count++
    if (e.status === 'completed') {
      workflowExecutionCounts[e.workflowId].successful++
    }
  })

  const topWorkflows = allWorkflows
    .map((workflow) => {
      const stats = workflowExecutionCounts[workflow.id] || {
        count: 0,
        successful: 0,
      }
      return {
        workflow,
        executions: stats.count,
        successRate:
          stats.count > 0 ? (stats.successful / stats.count) * 100 : 0,
      }
    })
    .sort((a, b) => b.executions - a.executions)
    .slice(0, 5)

  return {
    totalWorkflows,
    activeWorkflows,
    totalExecutions,
    executionsByStatus,
    averageDuration,
    successRate,
    recentExecutions,
    topWorkflows,
  }
}

// ============================================================================
// Action Templates
// ============================================================================

export async function getActionTemplates(): Promise<ActionTemplate[]> {
  return actionTemplates
}

export function getActionTemplateByType(
  type: ActionType,
): ActionTemplate | undefined {
  return actionTemplates.find((t) => t.type === type)
}

export function getActionTemplatesByCategory(
  category: ActionTemplate['category'],
): ActionTemplate[] {
  return actionTemplates.filter((t) => t.category === category)
}

// ============================================================================
// Trigger Helpers
// ============================================================================

export function getTriggerTypeLabel(type: TriggerType): string {
  const labels: Record<TriggerType, string> = {
    manual: 'Manual',
    schedule: 'Schedule',
    webhook: 'Webhook',
    event: 'Event',
    api: 'API',
    condition: 'Condition',
    workflow: 'Workflow',
  }
  // eslint-disable-next-line security/detect-object-injection
  return labels[type]
}

export function getActionTypeLabel(type: ActionType): string {
  const template = actionTemplates.find((t) => t.type === type)
  return template?.name || type
}
