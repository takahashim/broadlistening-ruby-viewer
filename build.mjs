import * as esbuild from "esbuild";
import { copyFile } from "fs/promises";
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
  // dist (default) - generate.rb 用バンドル
  await esbuild.build({
    entryPoints: [resolve(__dirname, "src/entrypoint.js")],
    bundle: true,
    minify: true,
    outfile: resolve(__dirname, "dist/broadlistening-view.js"),
    format: "iife",
  });
}
