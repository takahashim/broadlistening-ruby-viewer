import * as esbuild from "esbuild";
import { copyFile, readdir } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2]; // "shared", "site", or "dist"

if (target === "shared") {
  // TS → JS コンパイル（個別ファイル、バンドルなし）
  // ts/shared/*.ts → js/shared/*.js
  const files = await readdir(resolve(__dirname, "ts/shared"));
  const entryPoints = files
    .filter(f => f.endsWith(".ts"))
    .map(f => resolve(__dirname, "ts/shared", f));

  await esbuild.build({
    entryPoints,
    outdir: resolve(__dirname, "js/shared"),
    format: "esm",
    bundle: false,
    sourcemap: false,
  });

  // plotly_shim は別途バンドルして npm import を解決
  await esbuild.build({
    entryPoints: [resolve(__dirname, "ts/shared/plotly_shim.ts")],
    outfile: resolve(__dirname, "js/shared/plotly_shim.js"),
    format: "esm",
    bundle: true,
    external: ["plotly.js-dist-min"],
    allowOverwrite: true,
  });
} else if (target === "site") {
  await esbuild.build({
    entryPoints: [resolve(__dirname, "site/entrypoint_site.js")],
    bundle: true,
    minify: true,
    outfile: resolve(__dirname, "public/broadlistening-site.js"),
    format: "esm",
    loader: { ".rb": "text", ".erb": "text", ".json": "json" },
  });

  const wasmSource = resolve(__dirname, "node_modules/@ruby/3.4-wasm-wasi/dist/ruby+stdlib.wasm");
  const wasmDestination = resolve(__dirname, "public/ruby+stdlib.wasm");
  try {
    await copyFile(wasmSource, wasmDestination);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to copy ruby.wasm from ${wasmSource} to ${wasmDestination}: ${message}`
    );
  }
} else {
  // dist (default) - exe/broadlistening-viewer 用バンドル
  await esbuild.build({
    entryPoints: [resolve(__dirname, "ts/entrypoint.ts")],
    bundle: true,
    minify: true,
    outfile: resolve(__dirname, "lib/broadlistening/viewer/assets/broadlistening-view.js"),
    format: "iife",
  });
}
