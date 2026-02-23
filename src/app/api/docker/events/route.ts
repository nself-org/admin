import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  // For WebSocket support in Next.js App Router, we'd need to use a separate WebSocket server
  // or use Server-Sent Events (SSE) as an alternative

  // This endpoint documents how to connect to Docker events stream
  return NextResponse.json({
    message: 'Docker events stream requires WebSocket or SSE support',
    alternatives: {
      polling: '/api/docker/stats - Fast polling endpoint (< 1s response)',
      sse: 'Could implement Server-Sent Events for real-time updates',
      websocket: 'Requires separate WebSocket server (e.g., using ws package)',
    },
    dockerAPI: {
      events: 'Docker provides /events endpoint for real-time container events',
      stats: 'Docker provides /containers/{id}/stats for streaming stats',
      example:
        'curl --unix-socket /var/run/docker.sock http://localhost/v1.43/events',
    },
    recommendation:
      'Current polling approach with 1-2s interval is efficient enough for dashboard',
  })
}
