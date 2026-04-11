import type { MetadataRoute } from 'next'

const BASE_URL = 'https://docscraper.codiac.online'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
