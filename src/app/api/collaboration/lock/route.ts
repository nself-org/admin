/**
 * Document Lock API
 * Handles document locking for exclusive editing
 */

import { getSession, lockDocument, unlockDocument } from '@/lib/database'
import { emitDocumentLock } from '@/lib/websocket/emitters'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/collaboration/lock - Lock or unlock document
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get user from session
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value

    let effectiveUserId = 'admin'
    let effectiveUserName = 'Admin User'

    if (sessionToken) {
      const session = await getSession(sessionToken)
      if (session) {
        effectiveUserId = session.userId
        effectiveUserName = session.userId // Can be enhanced with user profile lookup
      }
    }

    const body = await request.json()
    const { documentId, action, userId, userName } = body

    if (!documentId || !action) {
      return NextResponse.json(
        {
          success: false,
          error: 'documentId and action are required',
        },
        { status: 400 },
      )
    }

    // Allow override from request body (for API clients that manage their own user context)
    if (userId) effectiveUserId = userId
    if (userName) effectiveUserName = userName

    let success = false

    if (action === 'lock') {
      success = await lockDocument(documentId, effectiveUserId)

      if (success) {
        // Broadcast lock event
        emitDocumentLock(
          {
            userId: effectiveUserId,
            userName: effectiveUserName,
            documentId,
            locked: true,
            timestamp: new Date().toISOString(),
          },
          `document-${documentId}`,
        )
      }
    } else if (action === 'unlock') {
      success = await unlockDocument(documentId, effectiveUserId)

      if (success) {
        // Broadcast unlock event
        emitDocumentLock(
          {
            userId: effectiveUserId,
            userName: effectiveUserName,
            documentId,
            locked: false,
            timestamp: new Date().toISOString(),
          },
          `document-${documentId}`,
        )
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Must be "lock" or "unlock"',
        },
        { status: 400 },
      )
    }

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error:
            action === 'lock'
              ? 'Document is already locked by another user'
              : 'Failed to unlock document',
        },
        { status: 409 },
      )
    }

    return NextResponse.json({
      success: true,
      message: `Document ${action}ed successfully`,
      userId: effectiveUserId,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to lock/unlock document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
