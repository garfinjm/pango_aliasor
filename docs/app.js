/**
 * Pango Aliasor - Browser UI logic
 */
(function () {
  "use strict";

  const BUNDLED_URL = "alias_key.json";
  const UPSTREAM_URL =
    "https://raw.githubusercontent.com/cov-lineages/pango-designation/master/pango_designation/alias_key.json";

  let aliasor = null;

  const $ = (sel) => document.querySelector(sel);

  // DOM elements
  const inputEl = $("#lineage-input");
  const resultEl = $("#result");
  const statusEl = $("#status");
  const advancedToggle = $("#advanced-toggle");
  const advancedSection = $("#advanced-section");
  const upToEl = $("#up-to");
  const acceptedEl = $("#accepted-aliases");

  /**
   * Initialize aliasor: try upstream first, fall back to bundled.
   */
  async function init() {
    setStatus("Loading alias data…", "");
    try {
      aliasor = await Aliasor.fromURL(UPSTREAM_URL);
      setStatus("Loaded latest alias data from upstream", "success");
    } catch (_e) {
      try {
        aliasor = await Aliasor.fromURL(BUNDLED_URL);
        setStatus("Loaded bundled alias data (offline mode)", "success");
      } catch (e) {
        setStatus("Failed to load alias data: " + e.message, "error");
      }
    }
  }

  function setStatus(msg, cls) {
    statusEl.textContent = msg;
    statusEl.className = "status-bar";
    if (cls) statusEl.classList.add(cls);
  }

  function setResult(text, isError) {
    resultEl.textContent = text;
    resultEl.className = "result";
    if (!text) {
      resultEl.textContent = "Result will appear here";
      resultEl.classList.add("empty");
    } else if (isError) {
      resultEl.classList.add("error");
    }
  }

  function getInput() {
    return inputEl.value.trim();
  }

  function run(operation) {
    if (!aliasor) {
      setResult("Alias data not loaded yet", true);
      return;
    }
    const name = getInput();
    if (!name) {
      setResult("Please enter a lineage", true);
      return;
    }
    try {
      let result;
      switch (operation) {
        case "uncompress":
          result = aliasor.uncompress(name);
          break;
        case "compress":
          result = aliasor.compress(name);
          break;
        case "parent":
          result = aliasor.parent(name);
          if (result === "") result = "(top level — no parent)";
          break;
        case "partial": {
          const upTo = parseInt(upToEl.value, 10) || 0;
          const acceptedRaw = acceptedEl.value.trim();
          const accepted = acceptedRaw
            ? new Set(acceptedRaw.split(",").map((s) => s.trim()).filter(Boolean))
            : new Set();
          result = aliasor.partialCompress(name, upTo, accepted);
          break;
        }
        default:
          result = "";
      }
      setResult(result);
    } catch (e) {
      setResult("Error: " + e.message, true);
    }
  }

  // Event listeners
  $("#btn-uncompress").addEventListener("click", () => run("uncompress"));
  $("#btn-compress").addEventListener("click", () => run("compress"));
  $("#btn-parent").addEventListener("click", () => run("parent"));
  $("#btn-partial").addEventListener("click", () => run("partial"));

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") run("uncompress");
  });

  advancedToggle.addEventListener("click", () => {
    const isOpen = advancedSection.classList.toggle("open");
    advancedToggle.textContent = isOpen
      ? "▾ Hide advanced options"
      : "▸ Advanced options";
  });

  // Register service worker for offline support
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // Service worker registration failed — offline mode won't work
    });
  }

  init();
})();
