# Broadlistening Ruby Viewer

[日本語版 README](./README.ja.md)

A standalone tool to visualize Broadlistening analysis JSON files.

It supports two usage modes:

1. Static site (ruby.wasm): drag and drop JSON in the browser and view charts
2. HTML generation (`generate.rb`): generate a single self-contained HTML file from JSON on the command line

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

### Local Preview

```bash
pnpm dlx serve public
```

Open the site in a browser, then drag and drop `hierarchical_result.json`.

### Deploy

Deploy the `public/` directory as-is to any static hosting service.

## HTML Generation (`generate.rb`)

Generates a self-contained single HTML file from JSON.

### Build (JS bundle)

```bash
pnpm run build:dist
```

### Generate HTML

```bash
bundle exec ruby generate.rb hierarchical_result.json
# => hierarchical_result.html is generated

# Option
bundle exec ruby generate.rb input.json -o output.html --title "Title"
```

## Build Scripts

| Command | Description |
|---------|-------------|
| `pnpm run build` | Build both site and dist outputs |
| `pnpm run build:site` | Build JS + CSS for the static site |
| `pnpm run build:site:js` | Build only JS for the static site |
| `pnpm run build:site:css` | Build only CSS for the static site |
| `pnpm run build:dist` | Build JS bundle for `generate.rb` |

## Directory Structure

```
├── src/                  # JS/SCSS sources (copied from decidim-broadlistening-view)
│   ├── chart_manager.js
│   ├── scatter_chart.js
│   ├── treemap_chart.js
│   ├── plotly_shim.js    # standalone shim returning window.Plotly
│   ├── ...
│   └── app.scss
├── site/
│   └── entrypoint_site.js  # entry point for static site (ruby.wasm)
├── public/               # static site build output + index.html
├── dist/                 # JS bundle output for generate.rb
├── i18n/
│   └── ja.json           # Japanese messages
├── render.rb             # shared rendering function
├── generate.rb           # HTML generation script
├── template.html.erb     # ERB template
├── build.mjs             # esbuild configuration
└── package.json
```
