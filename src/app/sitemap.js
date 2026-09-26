import { buildSiteData, visiblePosts } from '@/lib/data';

export const dynamic = 'force-static';

export default function Sitemap() {
  const { cars, posts } = buildSiteData();
  const base = 'https://badaneplus.com';
  const today = new Date().toISOString().slice(0, 10);

  const urls = [`${base}/`, `${base}/blog/`];
  for (const car of cars) {
    if ((car._products || []).length > 0) urls.push(`${base}/${car.slug}/`);
  }
  for (const p of visiblePosts(posts)) urls.push(`${base}/blog/${p.slug}/`);

  return urls.map((u) => ({
    url: u,
    lastModified: today,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));
}
