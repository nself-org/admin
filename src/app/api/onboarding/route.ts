import fs from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'

interface OnboardingState {
  completed: boolean
  step: number
}

function dataFilePath(): string {
  return path.join(process.cwd(), 'data', 'onboarding.json')
}

function readState(): OnboardingState {
  try {
    const raw = fs.readFileSync(dataFilePath(), 'utf-8')
    return JSON.parse(raw) as OnboardingState
  } catch {
    return { completed: false, step: 0 }
  }
}

function writeState(state: OnboardingState): void {
  fs.writeFileSync(dataFilePath(), JSON.stringify(state, null, 2), 'utf-8')
}

export async function GET() {
  const state = readState()
  return NextResponse.json({ success: true, ...state })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { step?: number }
    const step = typeof body.step === 'number' ? body.step : 0
    const completed = step >= 4
    writeState({ completed, step })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save onboarding state',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
