# Broadlistening Ruby Viewer

Broadlistening の分析結果 JSON を可視化するスタンドアロンツールです。

1. 静的サイト (ruby.wasm): ブラウザ上で JSON をドラッグ&ドロップして可視化を表示
2. HTML 生成 (exe/broadlistening-viewer): コマンドラインで JSON から単一 HTML ファイルを生成

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
- `ruby+stdlib.wasm` — ブラウザ実行用 ruby.wasm バイナリ

### ローカル確認

```bash
ruby -run -e httpd public
```

ブラウザで開き、`hierarchical_result.json` をドラッグ&ドロップすると可視化が表示されます。

### デプロイ

`public/` ディレクトリをそのまま静的ホスティングに配置できます。

## HTML 生成 (`exe/broadlistening-viewer`)

JSON から自己完結型の単一 HTML ファイルを生成します。Plotly を埋め込み JS に同梱するため、生成される HTML サイズは従来より大きくなります。

### ビルド (JS バンドル)

```bash
pnpm run build:dist
```

### HTML 生成

```bash
ruby -Ilib exe/broadlistening-viewer hierarchical_result.json
# => hierarchical_result.html が生成される

# オプション
ruby -Ilib exe/broadlistening-viewer input.json -o output.html --title "タイトル"
```

## ビルドスクリプト

| コマンド | 概要 |
|---------|-------------|
| `pnpm run build` | siteとdistの両方をビルド |
| `pnpm run build:site` | 静的サイト用に JS + CSS をビルド |
| `pnpm run build:dist` | `exe/broadlistening-viewer` JS + CSS をビルド |

## ディレクトリ構成

```
├── broadlistening-viewer.gemspec  # gem 仕様
├── lib/
│   └── broadlistening/
│       └── viewer/
│           ├── renderer.rb        # Broadlistening::Viewer::Renderer クラス
│           ├── version.rb         # バージョン定数
│           └── assets/            # コア共有アセット (ビルド出力 + テンプレート)
│               ├── template.html.erb
│               ├── broadlistening-view.js  # pnpm run build:dist:js でビルド
│               ├── app.css                 # pnpm run build:dist:css でビルド
│               └── i18n/
│                   └── ja.json    # 日本語メッセージ
├── exe/
│   └── broadlistening-viewer      # CLI 実行ファイル
├── js/                   # JS/CSS ソース (decidim-broadlistening-view と共有)
│   ├── entrypoint.js
│   ├── chart_manager.js
│   ├── scatter_chart.js
│   ├── treemap_chart.js
│   ├── plotly_shim.js    # npm パッケージ版 Plotly を返す standalone 版 shim
│   ├── app.css
│   └── ...
├── site/
│   └── entrypoint_site.js  # 静的サイト用エントリポイント (ruby.wasm)
├── public/               # 静的サイトのビルド出力 + index.html + ruby+stdlib.wasm
├── build.mjs             # esbuild 設定
└── package.json
```
