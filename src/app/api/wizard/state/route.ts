import { getDatabase } from '@/lib/database'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthPreSetup, requireWizardNotComplete } from '@/lib/require-auth'

// GET wizard state
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const db = await getDatabase()
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not initialized' },
        { status: 500 },
      )
    }
    let config = db.getCollection('config')
    if (!config) {
      config = db.addCollection('config')
    }

    // Get wizard state from config collection
    const wizardState = config.findOne({ key: 'wizard_state' })
    const wizardStep = config.findOne({ key: 'wizard_step' })

    return NextResponse.json({
      success: true,
      state: wizardState?.value || null,
      step: wizardStep?.value || 'initial',
    })
  } catch (error) {
    console.error('Error getting wizard state:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get wizard state' },
      { status: 500 },
    )
  }
}

// POST wizard state
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuthPreSetup(request)
  if (authError) return authError
  const wizardError = await requireWizardNotComplete(request)
  if (wizardError) return wizardError

  try {
    const { state, step } = await request.json()
    const db = await getDatabase()
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not initialized' },
        { status: 500 },
      )
    }
    let config = db.getCollection('config')
    if (!config) {
      config = db.addCollection('config')
    }

    // Save wizard state
    if (state !== undefined) {
      const existingState = config.findOne({ key: 'wizard_state' })
      if (existingState) {
        existingState.value = state
        existingState.updatedAt = new Date().toISOString()
        config.update(existingState)
      } else {
        config.insert({
          key: 'wizard_state',
          value: state,
          updatedAt: new Date().toISOString(),
        })
      }
    }

    // Save wizard step
    if (step !== undefined) {
      const existingStep = config.findOne({ key: 'wizard_step' })
      if (existingStep) {
        existingStep.value = step
        existingStep.updatedAt = new Date().toISOString()
        config.update(existingStep)
      } else {
        config.insert({
          key: 'wizard_step',
          value: step,
          updatedAt: new Date().toISOString(),
        })
      }
    }

    // Save database
    await db.saveDatabase()

    return NextResponse.json({
      success: true,
      message: 'Wizard state saved',
    })
  } catch (error) {
    console.error('Error saving wizard state:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save wizard state' },
      { status: 500 },
    )
  }
}

// DELETE wizard state (clear)
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuthPreSetup(request)
  if (authError) return authError
  const wizardError = await requireWizardNotComplete(request)
  if (wizardError) return wizardError

  try {
    const db = await getDatabase()
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not initialized' },
        { status: 500 },
      )
    }
    let config = db.getCollection('config')
    if (!config) {
      config = db.addCollection('config')
    }

    // Remove wizard state entries
    const wizardState = config.findOne({ key: 'wizard_state' })
    const wizardStep = config.findOne({ key: 'wizard_step' })

    if (wizardState) {
      config.remove(wizardState)
    }
    if (wizardStep) {
      config.remove(wizardStep)
    }

    // Save database
    await db.saveDatabase()

    return NextResponse.json({
      success: true,
      message: 'Wizard state cleared',
    })
  } catch (error) {
    console.error('Error clearing wizard state:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to clear wizard state' },
      { status: 500 },
    )
  }
}
