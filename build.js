import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SITE_URL = 'https://example.com';
const MAX_HISTORY = 100;
const MAX_PAGES = 5;
const CACHE_FILE = path.join(__dirname, 'dist/data/cache.json');
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

async function fetchKeywords() {
  const data = fs.readFileSync(path.join(__dirname, 'config/keywords.json'), 'utf-8');
  return JSON.parse(data).new_store_keywords;
}

function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    const age = Date.now() - cache.timestamp;
    if (age < CACHE_DURATION) {
      console.log(`Using cache (age: ${Math.floor(age / 3600000)}h)`);
      return cache.articles;
    }
  }
  return null;
}

function saveCache(articles) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify({ timestamp: Date.now(), articles }, null, 2));
  console.log('Cache saved');
}

function loadHistory() {
  const historyPath = path.join(__dirname, 'dist/data/history.json');
  if (fs.existsSync(historyPath)) {
    return JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  }
  return [];
}

function saveHistory(history) {
  const historyPath = path.join(__dirname, 'dist/data/history.json');
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

async function fetchArticles() {
  const cached = loadCache();
  if (cached) return cached;

  const allArticles = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    console.log(`Fetching page ${page}...`);
    const url = `https://prtimes.jp/api/keyword_search.php/search?keyword=%E3%82%AF%E3%83%AC%E3%83%BC%E3%83%B3%E3%82%B2%E3%83%BC%E3%83%A0&page=${page}&limit=40`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await response.json();
    const articles = data.data.release_list.map(item => ({
      title: item.title,
      date: item.released_at,
      url: 'https://prtimes.jp' + item.release_url,
      source: item.company_name
    }));
    allArticles.push(...articles);
    console.log(`  Page ${page}: ${articles.length} articles`);
  }
  
  saveCache(allArticles);
  return allArticles;
}

function classifyNews(articles, keywords) {
  const newStore = [];
  const other = [];
  
  for (const article of articles) {
    const hasCrane = article.title.includes('クレーン');
    const hasKeyword = keywords.some(k => article.title.includes(k));
    
    if (hasCrane && hasKeyword) {
      newStore.push(article);
    } else {
      other.push(article);
    }
  }
  
  return { newStore, other };
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRssDate(dateStr) {
  const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日(?:\s*(\d{1,2})時(\d{1,2})分)?/);
  if (!match) return new Date().toUTCString();
  
  const [, year, month, day, hour = '0', min = '0'] = match;
  const date = new Date(year, month - 1, day, hour, min);
  return date.toUTCString();
}

function generateHTML(newStore, lastUpdated) {
  const formatDate = (d) => {
    const match = d.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!match) return d;
    return `${match[1]}/${match[2]}/${match[3]}`;
  };

  const renderCards = (articles) => 
    articles.map(a => `
      <article class="news-card">
        <div class="news-card-header">
          <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener" class="news-card-title">${escapeHtml(a.title)}</a>
          <span class="news-card-date">${formatDate(a.date)}</span>
        </div>
        <p class="news-card-source">${a.source}</p>
      </article>
    `).join('');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>クレーンゲームニュース</title>
  <meta name="description" content="クレーンゲームの新店舗情報を每日をお届け">
  <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="rss.xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c&family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="header">
    <div class="header-content">
      <h1 class="logo">🎯 クレーンゲームニュース</h1>
      <p class="last-updated">最終更新: ${lastUpdated}</p>
    </div>
  </header>

  <main class="main">
    <section class="hero">
      <h2>クレーンゲーム新店舗情報をリアルタイムでお届け</h2>
    </section>

    <section class="news-section">
      <h3 class="section-title">🏪 新店舗ニュース</h3>
      <div class="news-list">
        ${newStore.length > 0 ? renderCards(newStore) : '<p class="no-news">該当するニュースはありません</p>'}
      </div>
    </section>
  </main>

  <footer class="footer">
    <p>&copy; 2026 CraneGame News. All rights reserved.</p>
    <p><a href="rss.xml">RSS Feed</a></p>
  </footer>
</body>
</html>`;
}

function generateRSS(newStore, lastUpdated) {
  const items = newStore.map(a => `    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${escapeHtml(a.url)}</link>
      <pubDate>${formatRssDate(a.date)}</pubDate>
      <source>PR TIMES</source>
    </item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>クレーンゲームニュース</title>
    <link>${SITE_URL}</link>
    <description>クレーンゲームの新店舗情報を每日をお届け</description>
    <language>ja</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}

async function build() {
  console.log('Building site...');
  
  const keywords = await fetchKeywords();
  console.log('Keywords loaded:', keywords);
  
  console.log('Fetching PR TIMES API...');
  const articles = await fetchArticles();
  console.log(`Found ${articles.length} articles`);
  
  const { newStore, other } = classifyNews(articles, keywords);
  console.log(`New store: ${newStore.length}, Other: ${other.length}`);
  
  const now = new Date();
  const lastUpdated = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  if (!fs.existsSync(path.join(distDir, 'css'))) {
    fs.mkdirSync(path.join(distDir, 'css'), { recursive: true });
  }
  if (!fs.existsSync(path.join(distDir, 'data'))) {
    fs.mkdirSync(path.join(distDir, 'data'), { recursive: true });
  }
  
  const history = loadHistory();
  const newEntries = newStore.map(a => ({ ...a, fetchedAt: now.toISOString() }));
  const existingUrls = new Set(history.map(a => a.url));
  const uniqueNewEntries = newEntries.filter(a => !existingUrls.has(a.url));
  const combinedHistory = [...uniqueNewEntries, ...history].slice(0, MAX_HISTORY);
  saveHistory(combinedHistory);
  console.log(`History saved: ${combinedHistory.length} entries (${uniqueNewEntries.length} new)`);
  
  fs.writeFileSync(path.join(distDir, 'index.html'), generateHTML(newStore, lastUpdated));
  console.log('Generated dist/index.html');
  
  fs.writeFileSync(path.join(distDir, 'rss.xml'), generateRSS(newStore, lastUpdated));
  console.log('Generated dist/rss.xml');
  
  fs.writeFileSync(path.join(distDir, 'data/news.json'), JSON.stringify({ newStore, other, history: combinedHistory, lastUpdated }, null, 2));
  console.log('Generated dist/data/news.json (current + history)');
  
  console.log('Done!');
}

build().catch(console.error);