/**
 * User Presence API
 * Handles real-time user presence tracking
 */

import type { UserPresenceItem } from '@/lib/database'
import {
  getOnlineUsers,
  removeUserPresence,
  updateUserPresence,
} from '@/lib/database'
import { emitUserPresence } from '@/lib/websocket/emitters'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

/**
 * GET /api/collaboration/presence - Get online users
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const onlineUsers = await getOnlineUsers()

    return NextResponse.json({
      success: true,
      data: onlineUsers,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get online users',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/collaboration/presence - Update user presence
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId, userName, status, currentPage, currentDocument, metadata } =
      body

    if (!userId || !userName || !status) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId, userName, and status are required',
        },
        { status: 400 },
      )
    }

    const presenceData: UserPresenceItem = {
      userId,
      userName,
      status,
      currentPage,
      currentDocument,
      lastSeen: new Date(),
      metadata,
    }

    await updateUserPresence(presenceData)

    // Broadcast to all connected clients
    emitUserPresence({
      userId,
      userName,
      status,
      currentPage,
      currentDocument,
      timestamp: new Date().toISOString(),
      metadata,
    })

    return NextResponse.json({
      success: true,
      message: 'Presence updated',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update presence',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/collaboration/presence - Remove user presence
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId, userName } = body

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId is required',
        },
        { status: 400 },
      )
    }

    await removeUserPresence(userId)

    // Broadcast offline status
    emitUserPresence({
      userId,
      userName: userName || 'Unknown',
      status: 'offline',
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: 'Presence removed',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove presence',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
