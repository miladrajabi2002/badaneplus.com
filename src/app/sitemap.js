import { buildSiteData, visiblePosts } from '@/lib/data';

export const dynamic = 'force-static';

export default function Sitemap() {
  const { cars, posts } = buildSiteData();
  const base = 'https://badaneplus.com';
  const today = new Date().toISOString().slice(0, 10);

  const urls = [
    { url: `${base}/`, priority: 1.0, changeFrequency: 'daily' },
    { url: `${base}/blog/`, priority: 0.7, changeFrequency: 'weekly' },
  ];
  for (const car of cars) {
    if ((car._products || []).length > 0) {
      urls.push({ url: `${base}/${car.slug}/`, priority: 0.8, changeFrequency: 'weekly' });
    }
  }
  for (const p of visiblePosts(posts)) {
    urls.push({
      url: `${base}/blog/${p.slug}/`,
      priority: 0.6,
      changeFrequency: 'monthly',
      lastModified: p.date || today,
    });
  }

  return urls.map((u) => ({
    url: u.url,
    lastModified: u.lastModified || today,
    changeFrequency: u.changeFrequency,
    priority: u.priority,
  }));
}
