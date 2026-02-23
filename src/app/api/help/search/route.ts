import {
  helpArticlesArray,
  helpSearchIndex,
  type HelpArticle,
} from '@/data/help-content'
import { NextRequest, NextResponse } from 'next/server'

interface SearchResult extends HelpArticle {
  relevance: number
  highlight: string
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query parameter "q" is required',
        },
        { status: 400 },
      )
    }

    // Search using simple text matching on searchIndex
    const lowerQuery = query.toLowerCase()
    let results = helpSearchIndex.filter(
      (article) =>
        article.title.toLowerCase().includes(lowerQuery) ||
        article.content.toLowerCase().includes(lowerQuery) ||
        article.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
    )

    // Filter by category if specified
    if (category) {
      results = results.filter((article) => article.category === category)
    }

    // Limit results
    results = results.slice(0, limit)

    // Calculate relevance scores and add highlights
    const enhancedResults: SearchResult[] = results.map((article) => {
      const fullArticle = helpArticlesArray.find((a) => a.id === article.id)
      const titleMatch = article.title.toLowerCase().includes(lowerQuery)

      let relevance = 0
      if (titleMatch) relevance += 50
      if (article.content.toLowerCase().includes(lowerQuery)) relevance += 25

      return {
        ...article,
        content: fullArticle?.content || article.content,
        relevance,
        highlight: getHighlight(fullArticle?.content || article.content, query),
      }
    })

    // Sort by relevance
    enhancedResults.sort((a, b) => b.relevance - a.relevance)

    // Generate "Did you mean?" suggestions
    const suggestions = generateSuggestions(query, enhancedResults)

    return NextResponse.json({
      success: true,
      query,
      results: enhancedResults,
      total: enhancedResults.length,
      suggestions,
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

function getHighlight(content: string, query: string, length = 200): string {
  const lowerContent = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerContent.indexOf(lowerQuery)

  if (index === -1) {
    return content.slice(0, length) + '...'
  }

  const start = Math.max(0, index - 50)
  const end = Math.min(content.length, index + query.length + length - 50)

  let highlight = content.slice(start, end)
  if (start > 0) highlight = '...' + highlight
  if (end < content.length) highlight = highlight + '...'

  return highlight
}

function generateSuggestions(query: string, results: SearchResult[]): string[] {
  if (results.length > 0) return []

  const commonMisspellings: Record<string, string> = {
    postgress: 'postgres',
    hasurra: 'hasura',
    deployement: 'deployment',
    databse: 'database',
    backp: 'backup',
    migratoin: 'migration',
  }

  const lowerQuery = query.toLowerCase()
  const suggestions: string[] = []

  // Check for common misspellings
  for (const [wrong, correct] of Object.entries(commonMisspellings)) {
    if (lowerQuery.includes(wrong)) {
      suggestions.push(lowerQuery.replace(wrong, correct))
    }
  }

  // Check for partial matches in article titles
  const partialMatches = helpArticlesArray
    .filter((article: HelpArticle) => {
      const title = article.title.toLowerCase()
      const words = lowerQuery.split(' ')
      return words.some((word) => title.includes(word))
    })
    .slice(0, 3)

  partialMatches.forEach((article: HelpArticle) => {
    const title = article.title.toLowerCase()
    if (!suggestions.includes(title)) {
      suggestions.push(title)
    }
  })

  return suggestions.slice(0, 3)
}
