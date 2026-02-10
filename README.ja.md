# Broadlistening Ruby Viewer

Broadlistening の分析結果 JSON を可視化するスタンドアロンツールです。

1. 静的サイト (ruby.wasm): ブラウザ上で JSON をドラッグ&ドロップして可視化を表示
2. HTML 生成 (generate.rb): コマンドラインで JSON から単一 HTML ファイルを生成

使用しているJSファイルは `decidim-broadlistening-view` と共有しています。

## セットアップ

```bash
pnpm install
bundle install
```

## 静的サイト (ruby.wasm)

ブラウザ内で ruby.wasm を使い、JSON ファイルを読み込んで可視化を表示します。GitHub Pages / Cloudflare Pages 等にデプロイ可能です。

### ビルド

```bash
pnpm run build:site
```

`public/` ディレクトリに以下が生成されます。

- `index.html` — エントリポイント
- `broadlistening-site.js` — バンドル済み JS
- `app.css` — コンパイル済み CSS

### ローカル確認

```bash
ruby -run -e httpd public
```

ブラウザで開き、`hierarchical_result.json` をドラッグ&ドロップすると可視化が表示されます。

### デプロイ

`public/` ディレクトリをそのまま静的ホスティングに配置できます。

## HTML 生成 (generate.rb)

JSON から自己完結型の単一 HTML ファイルを生成します。

### ビルド (JS バンドル)

```bash
pnpm run build:dist
```

### HTML 生成

```bash
bundle exec ruby generate.rb hierarchical_result.json
# => hierarchical_result.html が生成される

# オプション
bundle exec ruby generate.rb input.json -o output.html --title "タイトル"
```

## ディレクトリ構成

```
├── src/                  # JS/SCSS ソース (decidim-broadlistening-view からのコピー)
│   ├── chart_manager.js
│   ├── scatter_chart.js
│   ├── treemap_chart.js
│   ├── plotly_shim.js    # window.Plotly を返す standalone 版 shim
│   ├── ...
│   └── app.scss
├── site/
│   └── entrypoint_site.js  # 静的サイト用エントリポイント (ruby.wasm)
├── public/               # 静的サイトのビルド出力 + index.html
├── dist/                 # generate.rb 用 JS バンドル出力
├── i18n/
│   └── ja.json           # 日本語メッセージ
├── render.rb             # 共有レンダリング関数
├── generate.rb           # HTML 生成スクリプト
├── template.html.erb     # ERB テンプレート
├── build.mjs             # esbuild 設定
└── package.json
```
