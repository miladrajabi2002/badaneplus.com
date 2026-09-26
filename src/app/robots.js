export const dynamic = 'force-static';

export default function Robots() {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://badaneplus.com/sitemap.xml',
  };
}
