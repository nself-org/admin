// Help content data structure
export interface HelpArticle {
  id: string
  title: string
  category: string
  content: string
  description?: string
  readTime?: string
  updatedAt?: string
  tags?: string[]
}

export const helpArticles: Record<string, HelpArticle> = {
  'getting-started': {
    id: 'getting-started',
    title: 'Getting Started',
    category: 'Basics',
    content: 'Welcome to nself-admin! This guide will help you get started.',
    description: 'Quick start guide for nself-admin',
    readTime: '5 min',
    updatedAt: '2026-02-01',
  },
  'api-reference': {
    id: 'api-reference',
    title: 'API Reference',
    category: 'API',
    content: 'API documentation coming soon.',
    description: 'Complete API reference',
    readTime: '10 min',
    updatedAt: '2026-02-01',
  },
  'cli-commands': {
    id: 'cli-commands',
    title: 'CLI Commands',
    category: 'CLI',
    content: 'CLI commands documentation coming soon.',
    description: 'nself CLI commands reference',
    readTime: '8 min',
    updatedAt: '2026-02-01',
  },
  'database-guide': {
    id: 'database-guide',
    title: 'Database Guide',
    category: 'Database',
    content: 'Database operations guide coming soon.',
    description: 'Database management guide',
    readTime: '12 min',
    updatedAt: '2026-02-01',
  },
  'deployment-guide': {
    id: 'deployment-guide',
    title: 'Deployment Guide',
    category: 'Deployment',
    content: 'Deployment guide coming soon.',
    description: 'Deploy to production',
    readTime: '15 min',
    updatedAt: '2026-02-01',
  },
  'services-guide': {
    id: 'services-guide',
    title: 'Services Guide',
    category: 'Services',
    content: 'Services management guide coming soon.',
    description: 'Manage your services',
    readTime: '10 min',
    updatedAt: '2026-02-01',
  },
}

export const helpCategories = ['Basics', 'API', 'CLI', 'Database', 'Deployment', 'Services']

// Array version for filtering/mapping operations
export const helpArticlesArray: HelpArticle[] = Object.values(helpArticles)

// Search index for help articles
export const helpSearchIndex = Object.values(helpArticles).map((article) => ({
  id: article.id,
  title: article.title,
  content: article.content,
  category: article.category,
  tags: article.tags || [],
}))
