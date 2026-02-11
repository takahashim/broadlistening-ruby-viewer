# Broadlistening Viewer

[日本語版 README](./README.ja.md)

A standalone tool to visualize Broadlistening analysis JSON files.

It supports two usage modes:

1. Static site (ruby.wasm): drag and drop JSON in the browser and view charts
2. HTML generation (`exe/broadlistening-viewer`): generate a single self-contained HTML file from JSON on the command line

The JavaScript sources are shared with `decidim-broadlistening-view`.

## Setup

```bash
pnpm install
bundle install
```

## Static Site (ruby.wasm)

Uses ruby.wasm in the browser to load JSON files and render visualizations. The output can be deployed to static hosting platforms such as GitHub Pages or Cloudflare Pages.

### Build

```bash
pnpm run build:site
```

The following files are generated in `public/`:

- `index.html` - entry point
- `broadlistening-site.js` - bundled JavaScript
- `app.css` - compiled stylesheet
- `ruby+stdlib.wasm` - ruby.wasm binary for browser runtime

### Local Preview

```bash
ruby -run -e httpd public
```

Open the site in a browser, then drag and drop `hierarchical_result.json`.

### Deploy

Deploy the `public/` directory as-is to any static hosting service.

## HTML Generation (`exe/broadlistening-viewer`)

Generates a self-contained single HTML file from JSON. Plotly is bundled into the embedded JS, so output HTML size is larger than before.

### Build (JS bundle)

```bash
pnpm run build:dist
```

### Generate HTML

```bash
ruby -Ilib exe/broadlistening-viewer hierarchical_result.json
# => hierarchical_result.html is generated

# Option
ruby -Ilib exe/broadlistening-viewer input.json -o output.html --title "Title"
```

## Build Scripts

| Command | Description |
|---------|-------------|
| `pnpm run build` | Build both site and dist outputs |
| `pnpm run build:site` | Build JS + CSS for the static site |
| `pnpm run build:dist` | Build JS + CSS bundle for `exe/broadlistening-viewer` |

## Directory Structure

```
├── broadlistening-viewer.gemspec  # gem specification
├── lib/
│   └── broadlistening/
│       └── viewer/
│           ├── renderer.rb        # Broadlistening::Viewer::Renderer class
│           ├── version.rb         # version constant
│           └── assets/            # core shared assets (build output + templates)
│               ├── template.html.erb
│               ├── broadlistening-view.js  # built by pnpm run build:dist:js
│               ├── app.css                 # built by pnpm run build:dist:css
│               └── i18n/
│                   └── ja.json    # Japanese messages
├── exe/
│   └── broadlistening-viewer      # CLI executable
├── js/                   # JS/CSS sources (shared with decidim-broadlistening-view)
│   ├── entrypoint.js
│   ├── chart_manager.js
│   ├── scatter_chart.js
│   ├── treemap_chart.js
│   ├── plotly_shim.js    # standalone shim returning Plotly from npm package
│   ├── app.css
│   └── ...
├── site/
│   └── entrypoint_site.js  # entry point for static site (ruby.wasm)
├── public/               # static site build output + index.html + ruby+stdlib.wasm
├── build.mjs             # esbuild configuration
└── package.json
```
