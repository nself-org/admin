import { getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { check } = await request.json()

    let result = { success: false, message: 'Unknown check' }

    switch (check) {
      case 'Docker is running':
        try {
          await execAsync('docker info')
          result = {
            success: true,
            message: 'Docker is running and accessible',
          }
        } catch {
          result = {
            success: false,
            message: 'Docker is not running or not accessible',
          }
        }
        break

      case 'Project directory writable':
        try {
          const projectPath = getProjectPath()
          await fs.access(projectPath, fs.constants.W_OK)
          result = { success: true, message: 'Project directory is writable' }
        } catch {
          result = {
            success: false,
            message: 'Cannot write to project directory',
          }
        }
        break

      case 'Network connectivity':
        try {
          // Simple network check
          await execAsync('ping -c 1 8.8.8.8')
          result = { success: true, message: 'Network connectivity confirmed' }
        } catch {
          result = { success: false, message: 'No network connectivity' }
        }
        break

      case 'nself CLI available':
        try {
          const enhancedPath = getEnhancedPath()
          const { stdout } = await execAsync('which nself', {
            env: { ...process.env, PATH: enhancedPath },
          })
          if (stdout.trim()) {
            result = {
              success: true,
              message: `nself CLI found at ${stdout.trim()}`,
            }
          } else {
            throw new Error('nself not found')
          }
        } catch {
          result = { success: false, message: 'nself CLI not found in PATH' }
        }
        break

      default:
        result = { success: false, message: 'Unknown system check' }
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { success: false, message: 'Check failed due to internal error' },
      { status: 500 },
    )
  }
}
