import { getProjectPath } from '@/lib/paths'
import {
  requireAuthPreSetup,
  requireWizardNotComplete,
} from '@/lib/require-auth'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authError = await requireAuthPreSetup(req)
  if (authError) return authError
  const wizardError = await requireWizardNotComplete(req)
  if (wizardError) return wizardError

  try {
    const { key, value, remove = false, environment } = await req.json()

    if (!key) {
      return NextResponse.json(
        { error: 'Environment variable key is required' },
        { status: 400 },
      )
    }

    // Get project path using centralized resolution
    const absoluteProjectPath = getProjectPath()

    // Determine which env file to write to based on environment
    // For initial setup, write to .env.{environment} (team settings)
    // For personal overrides, write to .env.local
    const envFileName = environment ? `.env.${environment}` : '.env.local'
    const envPath = path.join(absoluteProjectPath, envFileName)

    // Read existing .env.local or create if doesn't exist
    let envContent = ''
    try {
      envContent = await fs.readFile(envPath, 'utf-8')
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      if (err.code !== 'ENOENT') {
        throw error
      }
      // File doesn't exist, will create it
    }

    // Parse existing content into lines
    const lines = envContent.split('\n')
    let found = false

    // Update or remove the variable
    const newLines = lines
      .map((line) => {
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || line.trim() === '') {
          return line
        }

        // Check if this line contains our key
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match && match[1].trim() === key) {
          found = true
          if (remove) {
            return null // Remove this line
          } else {
            return `${key}=${value}`
          }
        }

        return line
      })
      .filter((line) => line !== null)

    // If not found and not removing, add the variable
    if (!found && !remove) {
      // Add a newline if file doesn't end with one
      if (newLines.length > 0 && newLines[newLines.length - 1] !== '') {
        newLines.push('')
      }
      newLines.push(`${key}=${value}`)
    }

    // Write back to file
    await fs.writeFile(envPath, newLines.join('\n'))

    return NextResponse.json({
      success: true,
      message: remove ? `Removed ${key}` : `Updated ${key}`,
      key,
      value: remove ? undefined : value,
    })
  } catch (error) {
    console.error('Error updating environment variable:', error)
    return NextResponse.json(
      { error: 'Failed to update environment variable' },
      { status: 500 },
    )
  }
}

// Batch update multiple variables
export async function PUT(req: NextRequest): Promise<NextResponse> {
  const authError = await requireAuthPreSetup(req)
  if (authError) return authError
  const wizardError = await requireWizardNotComplete(req)
  if (wizardError) return wizardError

  try {
    const { variables, environment } = await req.json()

    if (!variables || !Array.isArray(variables)) {
      return NextResponse.json(
        { error: 'Variables array is required' },
        { status: 400 },
      )
    }

    // Get project path using centralized resolution
    const absoluteProjectPath = getProjectPath()

    // Determine which env file to write to based on environment
    const envFileName = environment ? `.env.${environment}` : '.env.local'
    const envPath = path.join(absoluteProjectPath, envFileName)

    // Read existing .env.local
    let envContent = ''
    try {
      envContent = await fs.readFile(envPath, 'utf-8')
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      if (err.code !== 'ENOENT') {
        throw error
      }
    }

    // Parse into key-value pairs
    const envVars: Record<string, string> = {}
    const lines = envContent.split('\n')

    lines.forEach((line) => {
      if (!line.trim().startsWith('#') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=')
        envVars[key.trim()] = valueParts.join('=').trim()
      }
    })

    // Apply updates
    variables.forEach(({ key, value, remove }) => {
      if (remove) {
        delete envVars[key]
      } else {
        envVars[key] = value
      }
    })

    // Rebuild content
    const newContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    // Write back
    await fs.writeFile(envPath, newContent)

    return NextResponse.json({
      success: true,
      message: `Updated ${variables.length} variables`,
      count: variables.length,
    })
  } catch (error) {
    console.error('Error updating environment variables:', error)
    return NextResponse.json(
      { error: 'Failed to update environment variables' },
      { status: 500 },
    )
  }
}
