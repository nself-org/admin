import { exec } from 'child_process'
import { NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(): Promise<NextResponse> {
  try {
    // Check if Docker daemon is running
    await execAsync('docker info', {
      timeout: 5000,
    })

    return NextResponse.json({
      running: true,
      message: 'Docker daemon is running',
    })
  } catch {
    return NextResponse.json({
      running: false,
      message: 'Docker daemon is not running',
    })
  }
}
