// Smoke test de la app Productvt (mockups HTML autocontenidos).
// Monta un DOM mínimo y ejecuta el JS de cada módulo para detectar excepciones de carga/render.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = "c:/Users/bcar3/OneDrive/Desktop/Productvt/Respaldo-Productvt-Visual";
const files = ["preview-app.html", "cronometro.html", "galaxia-v2.html", "calendario.html", "estadisticas.html", "configuracion.html"];

function makeEl(tag) {
  const children = [];
  const el = {
    tagName: (tag || "div").toUpperCase(),
    style: {}, dataset: {}, children, classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    _attrs: {}, _html: "", _text: "", _qsCache: {},
    get innerHTML(){ return this._html; },
    set innerHTML(v){ this._html = String(v); },
    get textContent(){ return this._text; },
    set textContent(v){ this._text = String(v); },
    appendChild(c){ children.push(c); return c; },
    removeChild(c){ const i = children.indexOf(c); if (i >= 0) children.splice(i, 1); return c; },
    remove(){}, focus(){}, blur(){}, click(){},
    setAttribute(k, v){ this._attrs[k] = String(v); },
    getAttribute(k){ return this._attrs[k] ?? null; },
    removeAttribute(k){ delete this._attrs[k]; },
    hasAttribute(k){ return k in this._attrs; },
    addEventListener(){}, removeEventListener(){},
    getBoundingClientRect(){ return { top: 0, left: 0, width: 800, height: 600, bottom: 600, right: 800 }; },
    // Query simulado: devuelve/crea un nodo hijo por id o selector (los HTML reales los
    // declaran en el markup; aquí basta con que las llamadas no devuelvan null).
    querySelector(sel){
      if (!sel) return null;
      if (!this._qsCache[sel]) this._qsCache[sel] = makeEl("div");
      return this._qsCache[sel];
    },
    querySelectorAll(sel){
      if (!sel) return [];
      if (sel === "[data-planet],[data-moon]") return [];
      const one = this.querySelector(sel);
      return Object.assign([one], { forEach: Array.prototype.forEach });
    },
    closest(){ return null; },
    insertBefore(c){ children.push(c); return c; },
    append(...c){ c.forEach(x => children.push(x)); },
    value: "", checked: false, disabled: false, offsetTop: 0, parentElement: null,
  };
  el.parentElement = el;
  return el;
}

let failures = 0;
for (const f of files) {
  const full = path.join(dir, f);
  const html = fs.readFileSync(full, "utf8");
  const scripts = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join("\n;\n");

  const store = new Map();
  const idCache = {};
  const documentStub = {
    documentElement: makeEl("html"),
    body: makeEl("body"),
    head: makeEl("head"),
    createElement: makeEl,
    getElementById(id){
      if (!idCache[id]) { idCache[id] = makeEl("div"); idCache[id]._attrs.id = id; }
      return idCache[id];
    },
    querySelector(sel){ return makeEl("div"); },
    querySelectorAll(){ return []; },
    addEventListener(){}, removeEventListener(){},
  };
  const sandbox = {
    console,
    window: {},
    document: documentStub,
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k),
    },
    performance: { now: () => Date.now() },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    addEventListener(){}, removeEventListener(){},
    innerWidth: 1280, innerHeight: 800,
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    Date, Math, JSON, Number, String, Object, Array, Boolean, RegExp, Error, isNaN, parseInt, parseFloat,
    location: { href: "", search: "" },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  try {
    vm.createContext(sandbox);
    vm.runInContext(scripts, sandbox, { filename: f, timeout: 8000 });
    console.log(`OK    ${f}  (${scripts.split("\n").length} líneas de script)`);
  } catch (e) {
    failures++;
    console.log(`FALLA ${f}: ${e.message}`);
  }
}
console.log(failures ? `\n${failures} módulo(s) con errores` : "\nTodos los módulos cargan y renderizan sin excepciones");
process.exit(failures ? 1 : 0);
