# クレーンゲーム店舗ニュース - SPEC.md

## 1. Project Overview

- **Project Name**: CraneGame News (クレーンゲームニュース)
- **Type**: Static Website (SSG)
- **Build**: Node.js script generates static HTML and RSS
- **Core Functionality**: PR TIMES APIから取得したクレーンゲームニュースを静的サイトとして配信
- **Target Users**: クレーンゲーム愛好家

## 2. Build Process

### Build Script (build.js)

1. キャッシュを確認（有効期限12時間）
2. キャッシュが無効の場合、PR TIMES API (1-5ページ) から取得
3. キーワードでニュースを分類
4. 履歴を更新（過去100件保持、重複排除）
5. 静的HTML (`dist/index.html`) を生成
6. RSS Feed (`dist/rss.xml`) を生成

### Cron Schedule

```bash
# 毎日9時に実行
0 9 * * * cd /path/to/gamecenternews && npm run build
```

## 3. UI/UX Specification

### Layout Structure

- **Header**: 固定ヘッダー（ロゴ、最終更新日時）
- **Hero Section**: タイトルと説明文
- **News Feed**: ニュース記事のリスト表示
- **Footer**: コピーライト、RSS Feedリンク

### Responsive Breakpoints

- Mobile: < 768px
- Desktop: >= 768px

### Visual Design

**Color Palette**
- Primary: `#ff6b6b`
- Secondary: `#4ecdc4`
- Background: `#f8f9fa` (Light) / `#1a1a2e` (Dark)
- Surface: `#ffffff` (Light) / `#16213e` (Dark)
- Text: `#2d3436` (Light) / `#f8f9fa` (Dark)
- Accent: `#ffd93d`

**Typography**
- Font Family: "Noto Sans JP", "M PLUS Rounded 1c", sans-serif

## 4. RSS Feed Specification

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>クレーンゲームニュース</title>
    <link>https://example.com/</link>
    <description>クレーンゲームの新店舗情報を每日お届け</description>
    <language>ja</language>
    <item>
      <title>記事タイトル</title>
      <link>PR TIMES記事URL</link>
      <pubDate>Wed, 19 Apr 2026 09:00:00 +0900</pubDate>
      <source>PR TIMES</source>
    </item>
  </channel>
</rss>
```

## 5. News Classification

**設定ファイル:** `config/keywords.json`

```json
{
  "new_store_keywords": [
    "店"
  ]
}
```

**ロジック:** タイトルがキーワードを含む → ニュースとして表示

## 6. Output Files

- `dist/index.html` - 静的HTML
- `dist/rss.xml` - RSS Feed
- `dist/css/style.css` - スタイルシート
- `dist/data/news.json` - 現在のニュースデータ
- `dist/data/history.json` - 過去100件の履歴
- `dist/data/cache.json` - APIキャッシュ（12時間有効）

## 7. Data Source

**PR TIMES API:**
```
https://prtimes.jp/api/keyword_search.php/search?keyword=クレーンゲーム&page={1-5}&limit=40
```

## 8. Acceptance Criteria

- [x] npm run build でHTMLが生成される
- [x] RSS Feedが生成される
- [x] キーワードで分類されたニュースが表示される
- [x] 過去100件の履歴が保持される
- [x] 12時間のキャッシュが機能する
- [x] レスポンシブ表示される