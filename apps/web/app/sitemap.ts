import { MetadataRoute } from 'next'
import { CATEGORIES } from '@/lib/category-config'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.near-book.com'
const API_URL = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ''

async function fetchPopularBooks(): Promise<{ isbn: string; cachedAt: string }[]> {
  try {
    const res = await fetch(`${API_URL}/books/popular?limit=50000`, {
      cache: 'no-store',
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

async function fetchAllLibraries(): Promise<{ id: number; updatedAt: string }[]> {
  try {
    const res = await fetch(`${API_URL}/libraries`, {
      cache: 'no-store',
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [popularBooks, libraries] = await Promise.all([
    fetchPopularBooks(),
    fetchAllLibraries(),
  ])

  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,        lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${SITE_URL}/search`,  lastModified: now, changeFrequency: 'daily',   priority: 0.6 },
    { url: `${SITE_URL}/popular`, lastModified: now, changeFrequency: 'daily',   priority: 0.6 },
    { url: `${SITE_URL}/libraries`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/explore`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE_URL}/category`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE_URL}/new-books`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]

  const bookPages: MetadataRoute.Sitemap = popularBooks.map((b) => ({
    url: `${SITE_URL}/book/${b.isbn}`,
    lastModified: b.cachedAt ? new Date(b.cachedAt) : now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  const libraryPages: MetadataRoute.Sitemap = libraries.map((l) => ({
    url: `${SITE_URL}/library/${l.id}`,
    lastModified: l.updatedAt ? new Date(l.updatedAt) : now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [...staticPages, ...categoryPages, ...bookPages, ...libraryPages]
}
