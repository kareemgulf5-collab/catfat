/* Container capacity — logic ported from the EgyGulf CBM calculator, with real-world tolerances. */

// Standard inner dimensions (cm).
export const CONTAINERS = {
  '20': { L: 589, W: 235, H: 239, label: "20'" },
  '40': { L: 1203, W: 235, H: 239, label: "40'" },
};
// Paper dimensions never fit 1:1 in practice: cartons bulge and the wall rails / corrugation eat width.
// Used only when we must compute geometrically (no real cartons-per-container figure).
export const TOL = { bulge: 1, L: 5, W: 5, H: 5 };   // +1 cm per carton side; −5 cm per container side
export const DEFAULT_MARGIN = 5;                      // % safety margin applied to every capacity

export const volume = c => c.L * c.W * c.H / 1e6;

export function parseBox(s) {
  const m = String(s || '').replace(/[xX*]/g, '×').match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)/);
  return m ? [+m[1], +m[2], +m[3]] : null;
}
export const boxCbm = d => d ? d[0] * d[1] * d[2] / 1e6 : 0;

function permutations(a) {
  if (a.length <= 1) return [a];
  const r = [];
  a.forEach((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).forEach(p => r.push([x, ...p])));
  return r;
}
// Best carton count: all 6 orientations + mixed-orientation height bands (unbounded knapsack over height).
function bestFitRaw(dims, L, W, H) {
  const s = 10, Ls = Math.round(L * s), Ws = Math.round(W * s), Hs = Math.round(H * s);
  const opts = permutations(dims.map(d => Math.round(d * s)))
    .map(([l, w, h]) => ({ h, bpl: Math.floor(Ls / l) * Math.floor(Ws / w) }))
    .filter(o => o.bpl > 0 && o.h > 0);
  const dp = new Float64Array(Hs + 1);
  for (let c = 1; c <= Hs; c++) for (const o of opts) if (o.h <= c && dp[c - o.h] + o.bpl > dp[c]) dp[c] = dp[c - o.h] + o.bpl;
  return dp[Hs];
}
const fitCache = new Map();
export function geoFit(dims, type) {
  const key = dims.join('×') + '@' + type;
  if (!fitCache.has(key)) {
    const c = CONTAINERS[type];
    const d = dims.map(x => x + TOL.bulge);
    fitCache.set(key, bestFitRaw(d, c.L - TOL.L, c.W - TOL.W, c.H - TOL.H));
  }
  return fitCache.get(key);
}

/**
 * Cartons of this line that fit in ONE container of `type`, before the safety margin.
 * source: 'list' (cartons/40ft from the price list), 'calc' (geometric estimate), or null (unknown).
 */
export function lineCapacity(item, type) {
  const dims = parseBox(item.box);
  const cap40 = parseInt(String(item.cap40 || '').replace(/,/g, '')) || 0;
  if (cap40 > 0) {
    if (type === '40') return { cap: cap40, source: 'list' };
    // scale the real 40ft figure to 20ft by the geometric ratio for this carton (falls back to volume ratio)
    const ratio = dims ? geoFit(dims, '20') / Math.max(geoFit(dims, '40'), 1) : volume(CONTAINERS['20']) / volume(CONTAINERS['40']);
    return { cap: Math.floor(cap40 * ratio), source: 'list' };
  }
  if (dims) return { cap: geoFit(dims, type), source: 'calc' };
  return { cap: 0, source: null };
}

/** Whole-invoice load plan. */
export function loadPlan(items, type, count, marginPct) {
  if (!CONTAINERS[type]) return null;
  const n = Math.max(parseInt(count) || 0, 0);
  const margin = Math.min(Math.max(parseFloat(marginPct) || 0, 0), 50);
  let used = 0, cbm = 0;
  const lines = items.map(it => {
    const qty = parseInt(it.qty) || 0;
    const { cap, source } = lineCapacity(it, type);
    const usable = Math.floor(cap * (1 - margin / 100));
    const share = usable > 0 ? qty / usable : 0;          // fraction of one container
    const c = boxCbm(parseBox(it.box)) || parseFloat(it.cbm) || 0;
    used += share; cbm += c * qty;
    return { qty, cap, usable, share, source, unknown: qty > 0 && !usable };
  });
  const fill = n ? used / n : 0;
  return { type, n, margin, used, fill, cbm, lines, unknown: lines.some(l => l.unknown),
    over: n > 0 && used > n + 1e-9, needed: Math.ceil(used - 1e-9) };
}

/** Scale all quantities so the invoice fills exactly `n` containers (never above). */
export function fitQuantities(items, plan) {
  if (!plan || !plan.n || plan.used <= 0) return null;
  const k = plan.n / plan.used;
  const next = items.map((it, i) => {
    const l = plan.lines[i];
    return l.usable > 0 && l.qty > 0 ? Math.max(Math.floor(l.qty * k), 0) : (parseInt(it.qty) || 0);
  });
  // top up with single cartons (largest lines first) while still within capacity
  let used = next.reduce((s, q, i) => s + (plan.lines[i].usable ? q / plan.lines[i].usable : 0), 0);
  const order = plan.lines.map((l, i) => i).filter(i => plan.lines[i].usable > 0 && plan.lines[i].qty > 0)
    .sort((a, b) => plan.lines[b].qty - plan.lines[a].qty);
  for (let guard = 0, added = true; added && guard < 100000; guard++) {
    added = false;
    for (const i of order) {
      const step = 1 / plan.lines[i].usable;
      if (used + step <= plan.n + 1e-9) { next[i]++; used += step; added = true; }
    }
  }
  return next;
}
