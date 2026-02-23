import {
  envFileExists,
  envToWizardConfig,
  readEnvFile,
} from '@/lib/env-handler'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const projectPath = getProjectPath()

    // Check if .env.local already exists
    const hasEnv = await envFileExists()

    if (hasEnv) {
      // Read existing env file and return config
      const env = await readEnvFile()
      if (env) {
        const wizardConfig = envToWizardConfig(env)
        // Merge the wizard config with raw env values so validation can check for existing keys
        const config = { ...wizardConfig, ...env }
        return NextResponse.json({
          success: true,
          hasEnvFile: true,
          config,
          message: 'Loaded existing configuration from .env.local',
        })
      }
    }

    // No env file exists, run nself init --full to create one

    // Find nself CLI using the centralized utility
    const nselfPath = await findNselfPath()

    // Run nself init --full to create all env files
    const { stdout, stderr } = await execAsync(`${nselfPath} init --full`, {
      cwd: projectPath,
      env: {
        ...process.env,
        PATH: getEnhancedPath(),
      },
      timeout: 30000,
    })

    if (stderr && !stderr.includes('warning')) {
      console.error('nself init stderr:', stderr)
    }

    // Now read the generated .env.local
    const env = await readEnvFile()
    if (env) {
      const wizardConfig = envToWizardConfig(env)
      // Merge the wizard config with raw env values so validation can check for existing keys
      const config = { ...wizardConfig, ...env }
      return NextResponse.json({
        success: true,
        hasEnvFile: true,
        config,
        message: 'Initialized new project with nself init',
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to read .env.local after init',
      },
      { status: 500 },
    )
  } catch (error) {
    console.error('Error in wizard init:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize wizard',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
