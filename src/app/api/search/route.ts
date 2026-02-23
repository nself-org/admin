import { getSearchFilters, getSuggestions, search } from '@/lib/search-index'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const action = searchParams.get('action')

    // Handle suggestions request
    if (action === 'suggestions') {
      const limit = parseInt(searchParams.get('limit') || '5', 10)
      const suggestions = await getSuggestions(query, limit)
      return NextResponse.json({ suggestions })
    }

    // Handle filters request
    if (action === 'filters') {
      const filters = await getSearchFilters()
      return NextResponse.json({ filters })
    }

    // Handle main search
    const types = searchParams.get('types')?.split(',').filter(Boolean)
    const services = searchParams.get('services')?.split(',').filter(Boolean)
    const levels = searchParams.get('levels')?.split(',').filter(Boolean)
    const dateFrom = searchParams.get('dateFrom')
      ? new Date(searchParams.get('dateFrom')!)
      : undefined
    const dateTo = searchParams.get('dateTo')
      ? new Date(searchParams.get('dateTo')!)
      : undefined
    const regex = searchParams.get('regex') === 'true'
    const caseSensitive = searchParams.get('caseSensitive') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const results = await search(query, {
      types: types as any,
      services,
      levels,
      dateFrom,
      dateTo,
      regex,
      caseSensitive,
      limit,
      offset,
    })

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
