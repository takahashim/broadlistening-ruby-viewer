import ChartManager from "../js/shared/chart_manager";
import i18nMessages from "../lib/broadlistening/viewer/assets/i18n/ja.json";
import renderRb from "../lib/broadlistening/viewer/renderer.rb";
import templateErb from "../lib/broadlistening/viewer/assets/template.html.erb";
import { DefaultRubyVM } from "@ruby/wasm-wasi/dist/browser";

let vm = null;
let currentManager = null;

async function initRubyVM() {
  const wasmUrl = new URL("./ruby+stdlib.wasm", import.meta.url);
  const response = await fetch(wasmUrl);
  if (!response.ok) {
    throw new Error(`Failed to load ruby.wasm (${response.status} ${response.statusText})`);
  }
  let module;
  try {
    module = await WebAssembly.compileStreaming(response.clone());
  } catch {
    module = await WebAssembly.compile(await response.arrayBuffer());
  }
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

  const spinner = document.getElementById("spinner");
  const statusMsg = document.getElementById("status-msg");
  const uploadInstructions = document.getElementById("upload-instructions");
  const fileInput = document.getElementById("file-input");
  const loadingIndicator = document.getElementById("loading-indicator");

  // Remove any error detail
  const oldDetail = loadingIndicator.querySelector(".blv-error-detail");
  if (oldDetail) oldDetail.remove();

  // Restore to ready state
  spinner.style.display = "none";
  statusMsg.textContent = "準備完了";
  statusMsg.className = "blv-status-msg blv-status-msg--ready";
  uploadInstructions.style.display = "";
  fileInput.disabled = false;
  fileInput.value = "";
}

function handleFile(file) {
  const spinner = document.getElementById("spinner");
  const statusMsg = document.getElementById("status-msg");
  const loadingIndicator = document.getElementById("loading-indicator");
  const uploadInstructions = document.getElementById("upload-instructions");
  const fileInput = document.getElementById("file-input");

  // Remove any previous error detail
  const oldDetail = loadingIndicator.querySelector(".blv-error-detail");
  if (oldDetail) oldDetail.remove();

  // Show loading state
  spinner.style.display = "";
  statusMsg.textContent = "JSON を読み込み中...";
  statusMsg.className = "blv-status-msg";
  uploadInstructions.style.display = "none";
  fileInput.disabled = true;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      JSON.parse(e.target.result);
      showView(e.target.result);
    } catch (err) {
      spinner.style.display = "none";
      statusMsg.textContent = "JSON の読み込みに失敗しました";
      statusMsg.className = "blv-status-msg blv-status-msg--error";
      const detail = document.createElement("p");
      detail.className = "blv-error-detail";
      detail.textContent = err.message || String(err);
      loadingIndicator.appendChild(detail);
      uploadInstructions.style.display = "";
      fileInput.disabled = false;
    }
  };
  reader.readAsText(file);
}

async function init() {
  const statusMsg = document.getElementById("status-msg");
  const fileInput = document.getElementById("file-input");
  const dropZone = document.getElementById("drop-zone");
  const spinner = document.getElementById("spinner");
  const loadingIndicator = document.getElementById("loading-indicator");
  const uploadInstructions = document.getElementById("upload-instructions");

  try {
    vm = await initRubyVM();
    spinner.style.display = "none";
    statusMsg.textContent = "準備完了";
    statusMsg.classList.add("blv-status-msg--ready");
    fileInput.disabled = false;
    uploadInstructions.style.display = "";
  } catch (err) {
    spinner.style.display = "none";
    statusMsg.textContent = "Viewerの初期化に失敗しました";
    statusMsg.classList.add("blv-status-msg--error");
    const detail = document.createElement("p");
    detail.className = "blv-error-detail";
    detail.textContent = err.message || String(err);
    loadingIndicator.appendChild(detail);
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
