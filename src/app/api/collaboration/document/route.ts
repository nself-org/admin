/**
 * Collaborative Document API
 * Handles document state, operations, and synchronization
 */

import {
  applyDocumentOperation,
  createDocumentState,
  getDocumentState,
} from '@/lib/database'
import { emitDocumentEdit } from '@/lib/websocket/emitters'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/collaboration/document - Get document state
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

    let docState = await getDocumentState(documentId)

    // Create new document state if it doesn't exist
    if (!docState) {
      docState = await createDocumentState(documentId, '')
    }

    return NextResponse.json({
      success: true,
      data: docState,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get document state',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/collaboration/document - Apply operation to document
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const {
      documentId,
      userId,
      userName,
      operationId,
      operation,
      version,
      parentVersion,
    } = body

    if (!documentId || !userId || !operation || version === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'documentId, userId, operation, and version are required',
        },
        { status: 400 },
      )
    }

    // Apply operation to document
    const updatedDoc = await applyDocumentOperation(documentId, {
      operationId,
      userId,
      type: operation.type,
      position: operation.position,
      text: operation.text,
      length: operation.length,
      version,
    })

    if (!updatedDoc) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 },
      )
    }

    // Broadcast edit to all clients
    emitDocumentEdit(
      {
        userId,
        userName: userName || 'Unknown',
        documentId,
        operationId,
        operation,
        version: updatedDoc.version,
        timestamp: new Date().toISOString(),
        parentVersion,
      },
      `document-${documentId}`, // Room ID for this document
    )

    return NextResponse.json({
      success: true,
      data: updatedDoc,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to apply operation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
