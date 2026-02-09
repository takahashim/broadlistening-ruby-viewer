import * as esbuild from "esbuild";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2]; // "site" or "dist"

if (target === "site") {
  await esbuild.build({
    entryPoints: [resolve(__dirname, "site/entrypoint_site.js")],
    bundle: true,
    minify: true,
    outfile: resolve(__dirname, "public/broadlistening-site.js"),
    format: "esm",
    loader: { ".rb": "text", ".erb": "text", ".json": "json" },
  });
} else {
  // dist (default) - generate.rb 用バンドル
  await esbuild.build({
    entryPoints: [resolve(__dirname, "src/entrypoint.js")],
    bundle: true,
    minify: true,
    outfile: resolve(__dirname, "dist/broadlistening-view.js"),
    format: "iife",
  });
}
