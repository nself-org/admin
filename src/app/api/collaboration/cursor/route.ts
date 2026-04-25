/**
 * Cursor Synchronization API
 * Handles real-time cursor position and selection tracking
 */

import type { CollaborationCursorItem } from '@/lib/database'
import {
  getDocumentCursors,
  removeCursor,
  updateCursorPosition,
} from '@/lib/database'
import { requireAuth } from '@/lib/require-auth'
import { emitCursorPosition, emitTextSelection } from '@/lib/websocket/emitters'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/collaboration/cursor - Get cursors for document
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'documentId is required',
        },
        { status: 400 },
      )
    }

    const cursors = await getDocumentCursors(documentId)

    return NextResponse.json({
      success: true,
      data: cursors,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get cursors',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/collaboration/cursor - Update cursor position
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId, userName, documentId, position, selection, color } = body

    if (!userId || !userName || !documentId || !position) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId, userName, documentId, and position are required',
        },
        { status: 400 },
      )
    }

    const cursorData: CollaborationCursorItem = {
      userId,
      userName,
      documentId,
      position,
      selection,
      color,
      lastUpdated: new Date(),
    }

    await updateCursorPosition(cursorData)

    // Broadcast cursor position
    emitCursorPosition(
      {
        userId,
        userName,
        documentId,
        position,
        color,
        timestamp: new Date().toISOString(),
      },
      `document-${documentId}`,
    )

    // Broadcast selection if present
    if (selection) {
      emitTextSelection(
        {
          userId,
          userName,
          documentId,
          selection,
          color,
          timestamp: new Date().toISOString(),
        },
        `document-${documentId}`,
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cursor position updated',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update cursor position',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/collaboration/cursor - Remove cursor
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId, documentId } = body

    if (!userId || !documentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId and documentId are required',
        },
        { status: 400 },
      )
    }

    await removeCursor(userId, documentId)

    return NextResponse.json({
      success: true,
      message: 'Cursor removed',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove cursor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
