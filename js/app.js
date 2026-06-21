const TROY_OUNCE_GRAMS = 31.1034768;
const SCALE_OUNCE_GRAMS = 28.349523125;
const SCALE_POUND_GRAMS = 453.59237;
const SETTINGS_KEY = "metalBuyerSettings.v1";
const ROWS_KEY = "metalBuyerRows.v1";
const KITCO_PRICE_PAGE = "https://www.kitco.com/price/precious-metals";

const materials = [
  { id: "gold14", label: "14K gold", metal: "gold", purity: 14 / 24, percentLess: 18, manualPerGram: 0 },
  { id: "gold18", label: "18K gold", metal: "gold", purity: 18 / 24, percentLess: 15, manualPerGram: 0 },
  { id: "gold24", label: "24K gold", metal: "gold", purity: 1, percentLess: 8, manualPerGram: 0 },
  { id: "silver", label: "Silver", metal: "silver", purity: 0.925, percentLess: 20, manualPerGram: 0 },
  { id: "plated", label: "Plated", metal: "manual", purity: 1, percentLess: 0, manualPerGram: 0.25 },
  { id: "mix", label: "Mixed lot", metal: "manual", purity: 1, percentLess: 0, manualPerGram: 1 }
];

const defaultSettings = {
  goldSpot: 2325,
  silverSpot: 29,
  source: "Default starter prices",
  updatedAt: "",
  visionApiKey: "",
  materials
};

let settings = loadSettings();
let rows = loadRows();
let stream = null;

const $ = (id) => document.getElementById(id);
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  fillMaterialSelect();
  renderSettings();
  bindEvents();
  renderAll();
  if (window.lucide) window.lucide.createIcons();
});

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (!stored) return structuredClone(defaultSettings);
    return {
      ...structuredClone(defaultSettings),
      ...stored,
      materials: materials.map((material) => ({ ...material, ...(stored.materials || []).find((item) => item.id === material.id) }))
    };
  } catch {
    return structuredClone(defaultSettings);
  }
}

function loadRows() {
  try {
    return JSON.parse(localStorage.getItem(ROWS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveSettingsToStorage() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function saveRowsToStorage() {
  localStorage.setItem(ROWS_KEY, JSON.stringify(rows));
}

function initTabs() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".section").forEach((section) => section.classList.remove("active"));
      button.classList.add("active");
      $(`${button.dataset.tab}Section`).classList.add("active");
      $("pageTitle").textContent = button.dataset.tab === "buy" ? "Buy calculation" : button.dataset.tab === "history" ? "Saved rows" : "Settings";
    });
  });
}

function fillMaterialSelect() {
  $("material").innerHTML = settings.materials.map((material) => `<option value="${material.id}">${material.label}</option>`).join("");
}

function bindEvents() {
  ["material", "weight", "weightUnit", "manualRate"].forEach((id) => $(id).addEventListener("input", renderEstimate));
  $("saveRowBtn").addEventListener("click", saveCurrentRow);
  $("clearFormBtn").addEventListener("click", clearForm);
  $("saveSettingsBtn").addEventListener("click", saveSettingsFromForm);
  $("updatePricesBtn").addEventListener("click", updatePrices);
  $("startCameraBtn").addEventListener("click", startCamera);
  $("captureBtn").addEventListener("click", captureAndReadScale);
  $("exportCsvBtn").addEventListener("click", exportCsv);
  $("clearRowsBtn").addEventListener("click", clearRows);
}

function renderAll() {
  $("goldSpot").value = settings.goldSpot;
  $("silverSpot").value = settings.silverSpot;
  $("visionApiKey").value = settings.visionApiKey || "";
  renderPrices();
  renderEstimate();
  renderHistory();
}

function renderPrices() {
  $("goldDisplay").textContent = currency.format(settings.goldSpot);
  $("silverDisplay").textContent = currency.format(settings.silverSpot);
  $("goldGramDisplay").textContent = `${currency.format(settings.goldSpot / TROY_OUNCE_GRAMS)} / g pure | ${currency.format(settings.goldSpot / TROY_OUNCE_GRAMS * SCALE_OUNCE_GRAMS)} / oz pure`;
  $("silverGramDisplay").textContent = `${currency.format(settings.silverSpot / TROY_OUNCE_GRAMS)} / g pure | ${currency.format(settings.silverSpot / TROY_OUNCE_GRAMS * SCALE_OUNCE_GRAMS)} / oz pure`;
  const updated = settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : "Not updated in this browser";
  $("priceStatus").innerHTML = `Source: ${settings.source}<br>Updated: ${updated}`;
  const today = new Date().toDateString();
  const total = rows
    .filter((row) => new Date(row.createdAt).toDateString() === today)
    .reduce((sum, row) => sum + row.total, 0);
  $("todayTotalDisplay").textContent = currency.format(total);
}

function renderEstimate() {
  const material = getSelectedMaterial();
  const weight = parseFloat($("weight").value) || 0;
  const unit = $("weightUnit").value;
  const grams = weightToGrams(weight, unit);
  const manualOverride = parseFloat($("manualRate").value) || 0;
  const ratePerGram = manualOverride ? rateToPerGram(manualOverride, unit) : getRatePerGram(material);
  const ratePerUnit = rateFromPerGram(ratePerGram, unit);
  const total = grams * ratePerGram;
  $("manualRateLabel").textContent = `Override per ${unitLabel(unit)}`;
  $("payDisplay").textContent = currency.format(total);
  $("rateBreakdown").textContent = `${material.label}: ${currency.format(ratePerUnit)} / ${unitLabel(unit)} (${currency.format(ratePerGram)} / g, ${currency.format(rateFromPerGram(ratePerGram, "oz"))} / oz) x ${number.format(weight)} ${unitLabel(unit)}`;
}

function getSelectedMaterial() {
  return settings.materials.find((material) => material.id === $("material").value) || settings.materials[0];
}

function getRatePerGram(material) {
  if (material.manualPerGram > 0 || material.metal === "manual") {
    return material.manualPerGram * (1 - material.percentLess / 100);
  }
  const spot = material.metal === "gold" ? settings.goldSpot : settings.silverSpot;
  const melt = (spot / TROY_OUNCE_GRAMS) * material.purity;
  return melt * (1 - material.percentLess / 100);
}

function unitToGrams(unit) {
  if (unit === "oz") return SCALE_OUNCE_GRAMS;
  if (unit === "ozt") return TROY_OUNCE_GRAMS;
  if (unit === "lb") return SCALE_POUND_GRAMS;
  return 1;
}

function unitLabel(unit) {
  if (unit === "oz") return "oz";
  if (unit === "ozt") return "troy oz";
  if (unit === "lb") return "lb";
  return "gram";
}

function weightToGrams(weight, unit) {
  return weight * unitToGrams(unit);
}

function rateToPerGram(rate, unit) {
  return rate / unitToGrams(unit);
}

function rateFromPerGram(ratePerGram, unit) {
  return ratePerGram * unitToGrams(unit);
}

function gramsToScaleOz(grams) {
  return grams / SCALE_OUNCE_GRAMS;
}

function formatRowWeight(row) {
  const grams = row.weightGrams ?? row.weight ?? 0;
  const unit = row.weightUnit || "g";
  const entered = row.weight ?? (unit === "g" ? grams : grams / unitToGrams(unit));
  return `${number.format(entered)} ${unitLabel(unit)} (${number.format(grams)}g / ${number.format(gramsToScaleOz(grams))} oz)`;
}

function formatRowRate(row) {
  const ratePerGram = row.ratePerGram ?? row.rate ?? 0;
  const unit = row.weightUnit || "g";
  return `${currency.format(rateFromPerGram(ratePerGram, unit))} / ${unitLabel(unit)} (${currency.format(ratePerGram)} / g, ${currency.format(rateFromPerGram(ratePerGram, "oz"))} / oz)`;
}

function saveCurrentRow() {
  const material = getSelectedMaterial();
  const weight = parseFloat($("weight").value) || 0;
  const unit = $("weightUnit").value;
  const grams = weightToGrams(weight, unit);
  if (weight <= 0) {
    $("weight").focus();
    return;
  }
  const ratePerGram = parseFloat($("manualRate").value) ? rateToPerGram(parseFloat($("manualRate").value), unit) : getRatePerGram(material);
  const row = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    customer: $("customer").value.trim(),
    materialId: material.id,
    materialLabel: material.label,
    weight,
    weightUnit: unit,
    weightGrams: grams,
    rate: ratePerGram,
    ratePerGram,
    ratePerUnit: rateFromPerGram(ratePerGram, unit),
    total: grams * ratePerGram,
    notes: $("notes").value.trim(),
    goldSpot: settings.goldSpot,
    silverSpot: settings.silverSpot
  };
  rows.unshift(row);
  saveRowsToStorage();
  renderHistory();
  renderPrices();
  clearForm(false);
  $("storagePill").textContent = "Row saved";
  setTimeout(() => ($("storagePill").textContent = "Saved locally"), 1800);
}

function clearForm(clearCustomer = true) {
  $("weight").value = "";
  $("manualRate").value = "";
  $("notes").value = "";
  if (clearCustomer) $("customer").value = "";
  renderEstimate();
}

function renderHistory() {
  if (!rows.length) {
    $("historyTable").innerHTML = '<div class="empty">No saved rows yet.</div>';
    return;
  }
  $("historyTable").innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Customer</th>
          <th>Material</th>
          <th>Weight</th>
          <th>Rate</th>
          <th>Total</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${new Date(row.createdAt).toLocaleString()}</td>
            <td>${escapeHtml(row.customer || "-")}</td>
            <td>${escapeHtml(row.materialLabel)}</td>
            <td>${formatRowWeight(row)}</td>
            <td>${formatRowRate(row)}</td>
            <td><strong>${currency.format(row.total)}</strong></td>
            <td>${escapeHtml(row.notes || "-")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderSettings() {
  $("materialSettings").innerHTML = settings.materials.map((material) => `
    <div class="material-row" data-material-row="${material.id}">
      <div class="field">
        <label>Material</label>
        <input value="${material.label}" disabled>
      </div>
      <div class="field">
        <label>Percent less</label>
        <input data-setting="percentLess" type="number" min="0" max="100" step="0.1" inputmode="decimal" value="${material.percentLess}">
      </div>
      <div class="field">
        <label>${material.metal === "manual" ? "Manual $/gram" : "Extra manual $/gram"}</label>
        <input data-setting="manualPerGram" type="number" min="0" step="0.01" inputmode="decimal" value="${material.manualPerGram}">
      </div>
    </div>
  `).join("");
}

function saveSettingsFromForm() {
  settings.goldSpot = parseFloat($("goldSpot").value) || 0;
  settings.silverSpot = parseFloat($("silverSpot").value) || 0;
  settings.visionApiKey = $("visionApiKey").value.trim();
  document.querySelectorAll("[data-material-row]").forEach((row) => {
    const material = settings.materials.find((item) => item.id === row.dataset.materialRow);
    material.percentLess = parseFloat(row.querySelector('[data-setting="percentLess"]').value) || 0;
    material.manualPerGram = parseFloat(row.querySelector('[data-setting="manualPerGram"]').value) || 0;
  });
  settings.source = settings.source || "Manual";
  settings.updatedAt = settings.updatedAt || new Date().toISOString();
  saveSettingsToStorage();
  fillMaterialSelect();
  renderAll();
  $("storagePill").textContent = "Settings saved";
  setTimeout(() => ($("storagePill").textContent = "Saved locally"), 1800);
}

async function updatePrices() {
  const button = $("updatePricesBtn");
  button.disabled = true;
  $("priceStatus").textContent = "Trying to update prices...";
  try {
    const kitcoPrices = await fetchKitcoPrices();
    applyFetchedPrices(kitcoPrices.gold, kitcoPrices.silver, "Kitco price page");
  } catch (kitcoError) {
    try {
      const backupPrices = await fetchBackupSpotPrices();
      applyFetchedPrices(backupPrices.gold, backupPrices.silver, "Backup free spot feed");
    } catch {
      $("priceStatus").innerHTML = `Automatic update failed. Open Kitco and enter spot prices in Settings.<br>${escapeHtml(kitcoError.message)}`;
    }
  } finally {
    button.disabled = false;
  }
}

function applyFetchedPrices(gold, silver, source) {
  if (gold > 0) settings.goldSpot = gold;
  if (silver > 0) settings.silverSpot = silver;
  settings.source = source;
  settings.updatedAt = new Date().toISOString();
  saveSettingsToStorage();
  renderAll();
}

async function fetchKitcoPrices() {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(KITCO_PRICE_PAGE)}`;
  const response = await fetch(proxyUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("Kitco page could not be reached from this browser.");
  const html = await response.text();
  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const gold = readNearbyPrice(plain, "Gold");
  const silver = readNearbyPrice(plain, "Silver");
  if (!gold || !silver) throw new Error("Kitco prices were not readable automatically.");
  return { gold, silver };
}

function readNearbyPrice(text, label) {
  const normalized = text.replace(/\s+/g, " ");
  const pricePattern = "([0-9]{1,3}(?:,[0-9]{3})*(?:\\.[0-9]{1,3})?)";
  const optionalKitcoDate = "(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+\\d{1,2},\\s+\\d{4}\\s+\\d{1,2}:\\d{2}\\s+)?";
  const rowPattern = new RegExp(`\\b${label}\\b\\s+${optionalKitcoDate}${pricePattern}`, "gi");
  const validRange = label === "Gold"
    ? (value) => value >= 1000 && value <= 10000
    : (value) => value >= 10 && value <= 500;

  let match;
  while ((match = rowPattern.exec(normalized)) !== null) {
    const value = parseFloat(match[1].replace(/,/g, ""));
    if (validRange(value)) return value;
  }

  return 0;
}

async function fetchBackupSpotPrices() {
  const response = await fetch("https://api.metals.live/v1/spot", { cache: "no-store" });
  if (!response.ok) throw new Error("Backup price feed failed.");
  const data = await response.json();
  const gold = data.find((item) => item.gold)?.gold;
  const silver = data.find((item) => item.silver)?.silver;
  if (!gold || !silver) throw new Error("Backup prices were missing.");
  return { gold, silver };
}

async function startCamera() {
  if (stream) return;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    $("camera").srcObject = stream;
    $("ocrOutput").textContent = "Camera is open. Fill the scale display in the frame, then tap Read scale.";
  } catch (error) {
    $("ocrOutput").textContent = `Camera could not open: ${error.message}`;
  }
}

async function captureAndReadScale() {
  const video = $("camera");
  if (!video.srcObject) {
    await startCamera();
    if (!video.srcObject) return;
  }
  const canvas = $("captureCanvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const context = canvas.getContext("2d");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  $("ocrOutput").textContent = "Reading scale...";
  $("captureBtn").disabled = true;
  try {
    const usedVision = Boolean(settings.visionApiKey);
    const text = usedVision ? await readScaleWithCloudVision(canvas) : await readScaleWithTesseract(canvas);
    const parsed = parseScaleReading(text);
    $("ocrOutput").textContent = text
      ? `${usedVision ? "Google Vision" : "Tesseract"} read: ${text}`
      : "No text found. Try closer, brighter, and straighter.";
    if (parsed.value > 0) {
      $("weight").value = parsed.value;
      $("weightUnit").value = parsed.unit;
      renderEstimate();
      $("ocrOutput").textContent += `\nDetected scale reading: ${number.format(parsed.value)} ${unitLabel(parsed.unit)}`;
    }
  } catch (error) {
    try {
      const text = await readScaleWithTesseract(canvas);
      const parsed = parseScaleReading(text);
      $("ocrOutput").textContent = text ? `Google Vision failed. Tesseract read: ${text}` : `Google Vision failed. No text found.\n${error.message}`;
      if (parsed.value > 0) {
        $("weight").value = parsed.value;
        $("weightUnit").value = parsed.unit;
        renderEstimate();
        $("ocrOutput").textContent += `\nDetected scale reading: ${number.format(parsed.value)} ${unitLabel(parsed.unit)}`;
      }
    } catch {
      $("ocrOutput").textContent = `OCR failed: ${error.message}`;
    }
  } finally {
    $("captureBtn").disabled = false;
  }
}

async function readScaleWithCloudVision(canvas) {
  const imageContent = canvas.toDataURL("image/jpeg", 0.85).replace(/^data:image\/jpeg;base64,/, "");
  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(settings.visionApiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: imageContent },
          features: [{ type: "TEXT_DETECTION", maxResults: 20 }]
        }
      ]
    })
  });
  const data = await response.json();
  if (!response.ok || data.responses?.[0]?.error) {
    throw new Error(data.responses?.[0]?.error?.message || data.error?.message || "Google Vision request failed.");
  }
  return data.responses?.[0]?.textAnnotations?.[0]?.description?.trim() || "";
}

async function readScaleWithTesseract(canvas) {
  const result = await Tesseract.recognize(canvas, "eng", {
    tessedit_char_whitelist: "0123456789.,gGoOzZtTlLbBnNeEtTwWiIgGhHsSaAbBrR"
  });
  return result.data.text.trim();
}

function parseScaleReading(text) {
  const normalized = text
    .toLowerCase()
    .replace(/[,]/g, ".")
    .replace(/[|]/g, "1")
    .replace(/\bo\s*z\b/g, "oz")
    .replace(/\s+/g, " ");
  const readingPattern = /(-?\d+(?:\.\d+)?)\s*(ozt|troy\s*oz|lb|lbs|pounds?|oz|ounces?|grams?|gr\b|g\b)?/gi;
  const candidates = [];
  let match;

  while ((match = readingPattern.exec(normalized)) !== null) {
    const value = parseFloat(match[1]);
    if (!Number.isFinite(value) || value <= 0) continue;

    const unitText = match[2] || "";
    const unit = readUnit(unitText);
    const start = Math.max(0, match.index - 35);
    const end = Math.min(normalized.length, readingPattern.lastIndex + 35);
    const nearby = normalized.slice(start, end);
    const grams = weightToGrams(value, unit);
    let score = 0;

    if (unitText) score += 6;
    if (/\b(net|gross|tare|stable|weight|weigh|scale|hold|zero)\b/.test(nearby)) score += 3;
    if (/\b(usd|price|total|spot|gold|silver|customer|date|time)\b/.test(nearby)) score -= 4;
    if (grams >= 0.01 && grams <= 100000) score += 2;
    if (value >= 1000 && !unitText) score -= 3;

    candidates.push({ value, unit, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || { value: 0, unit: "g" };
}

function readUnit(unitText) {
  if (/ozt|troy/.test(unitText)) return "ozt";
  if (/lb|pound/.test(unitText)) return "lb";
  if (/oz|ounce/.test(unitText)) return "oz";
  return "g";
}

function exportCsv() {
  if (!rows.length) return;
  const header = ["createdAt", "customer", "material", "enteredWeight", "enteredUnit", "weightGrams", "weightOz", "ratePerEnteredUnit", "ratePerGram", "ratePerOz", "total", "notes", "goldSpot", "silverSpot"];
  const csvRows = rows.map((row) => [
    row.createdAt,
    row.customer,
    row.materialLabel,
    row.weight,
    row.weightUnit || "g",
    row.weightGrams ?? row.weight,
    gramsToScaleOz(row.weightGrams ?? row.weight ?? 0),
    row.ratePerUnit ?? rateFromPerGram(row.ratePerGram ?? row.rate ?? 0, row.weightUnit || "g"),
    row.ratePerGram ?? row.rate,
    rateFromPerGram(row.ratePerGram ?? row.rate ?? 0, "oz"),
    row.total,
    row.notes,
    row.goldSpot,
    row.silverSpot
  ]);
  const csv = [header, ...csvRows].map((line) => line.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `metal-buying-rows-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function clearRows() {
  if (!rows.length) return;
  const ok = confirm("Clear all saved rows from this browser?");
  if (!ok) return;
  rows = [];
  saveRowsToStorage();
  renderHistory();
  renderPrices();
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
