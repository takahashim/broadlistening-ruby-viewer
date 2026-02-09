import ChartManager from "../src/chart_manager";
import i18nMessages from "../i18n/ja.json";
import renderRb from "../render.rb";
import templateErb from "../template.html.erb";

let vm = null;
let currentManager = null;

async function initRubyVM() {
  const { DefaultRubyVM } = await import(
    "https://cdn.jsdelivr.net/npm/@ruby/wasm-wasi@2.8.1/dist/browser/+esm"
  );
  const response = await fetch(
    "https://cdn.jsdelivr.net/npm/@ruby/3.4-wasm-wasi@2.8.1/dist/ruby+stdlib.wasm"
  );
  const module = await WebAssembly.compileStreaming(response);
  const { vm: rubyVM } = await DefaultRubyVM(module);
  rubyVM.eval(renderRb);
  return rubyVM;
}

function showView(jsonStr) {
  if (currentManager) { currentManager.destroy(); currentManager = null; }

  const contentBody = document.getElementById("content-body");

  window.__blvJsonStr = jsonStr;
  window.__blvTemplateStr = templateErb;
  window.__blvCssStr = "";
  window.__blvJsStr = "";
  window.__blvI18nStr = JSON.stringify(i18nMessages);

  vm.eval(`
    require "js"
    json_str = JS.global[:__blvJsonStr].to_s
    template_str = JS.global[:__blvTemplateStr].to_s
    css_str = JS.global[:__blvCssStr].to_s
    js_str = JS.global[:__blvJsStr].to_s
    i18n_str = JS.global[:__blvI18nStr].to_s
    JS.global[:__blvResultHtml] = render_html(json_str, template_str, css_str, js_str, i18n_str)
  `);

  const fullHtml = window.__blvResultHtml;
  const parser = new DOMParser();
  const doc = parser.parseFromString(fullHtml, "text/html");
  contentBody.innerHTML = doc.body.innerHTML;

  const i18nEl = document.getElementById("broadlistening-view-i18n");
  if (i18nEl) i18nEl.dataset.messages = window.__blvI18nStr;

  document.getElementById("upload-area").hidden = true;
  document.getElementById("content-area").hidden = false;

  const chartContainer = document.getElementById("chart-container");
  if (chartContainer) {
    const data = JSON.parse(jsonStr);
    currentManager = new ChartManager(chartContainer, data);
  }
}

function resetView() {
  if (currentManager) { currentManager.destroy(); currentManager = null; }
  document.getElementById("content-body").innerHTML = "";
  document.getElementById("upload-area").hidden = false;
  document.getElementById("content-area").hidden = true;
  document.getElementById("file-input").value = "";
}

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      JSON.parse(e.target.result);
      showView(e.target.result);
    } catch (err) {
      alert("JSON の読み込みに失敗しました: " + err.message);
    }
  };
  reader.readAsText(file);
}

async function init() {
  const statusMsg = document.getElementById("status-msg");
  const fileInput = document.getElementById("file-input");
  const dropZone = document.getElementById("drop-zone");

  try {
    vm = await initRubyVM();
    statusMsg.textContent = "準備完了";
    fileInput.disabled = false;
  } catch (err) {
    statusMsg.textContent = "Ruby VM の初期化に失敗しました";
    console.error(err);
    return;
  }

  fileInput.addEventListener("change", (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  dropZone.addEventListener("dragover", (e) => { e.preventDefault(); });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  document.getElementById("reload-btn").addEventListener("click", resetView);
}

document.addEventListener("DOMContentLoaded", init);
