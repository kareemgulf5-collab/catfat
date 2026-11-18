import {
  doc, getDoc, getDocs, collection, query, where, runTransaction, updateDoc, deleteDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db, auth, isAdmin, isIn, login, listUsers, createUser, updateUser, USERNAME_RE } from './auth.js';
import { BRANDS } from './data.js';
import { t, esc, go, route } from './app.js';
import { CONTAINERS, DEFAULT_MARGIN, loadPlan, fitQuantities, parseBox, boxCbm } from './container.js';

/* ═════════════ helpers ═════════════ */
const FIELDS = ['invDate', 'portLoad', 'port', 'company', 'country', 'email', 'phone', 'address', 'website', 'notes', 'disc', 'ctype', 'ccount', 'cmargin', 'salesName', 'socialName'];
const today = () => new Date().toISOString().slice(0, 10);
const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const usd = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const blankItem = () => ({ name: '', flavours: [], pack: '', upc: '', qty: '', price: '', onDisc: false, ref: '', box: '', cap40: '' });
const fmtInt = n => Math.round(n).toLocaleString('en-US');
const pct = (x, d = 1) => (x * 100).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }) + '%';
const planOf = e => loadPlan(e.items, e.f.ctype, e.f.ccount, e.f.cmargin);
const tsMs = v => v && typeof v.toMillis === 'function' ? v.toMillis() : (v ? +new Date(v) : 0);
const fmtDate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtStamp = v => { const ms = tsMs(v); return ms ? new Date(ms).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; };

export function calc(items, discPct) {
  let subtotal = 0, marked = 0, totalQty = 0;
  const anyMarked = items.some(it => it.onDisc);
  for (const it of items) {
    const line = (parseInt(it.qty) || 0) * num(it.price);
    subtotal += line; totalQty += parseInt(it.qty) || 0;
    if (it.onDisc) marked += line;
  }
  // no product marked → the discount applies to the whole invoice
  const discountable = anyMarked ? marked : subtotal;
  const pct = Math.min(Math.max(num(discPct), 0), 100);
  const discAmt = discountable * pct / 100;
  const r2 = n => Math.round(n * 100) / 100;
  return { subtotal: r2(subtotal), discountable: r2(discountable), discAmt: r2(discAmt), total: r2(subtotal - discAmt), totalQty, pct, scope: anyMarked ? 'marked' : 'all' };
}

/* catalog → invoice line */
const PACK_WORD = { BAG: 'Bag', BAGS: 'Bag', JAR: 'Jar', BOX: 'Box', TREE: 'Tree', CAR: 'Car' };
export function lineFromCatalog(b, p, r) {
  const m = String(r.carton).match(/^([A-Z]+)\s+(\d+)(?:\s*×\s*(.+))?$/i);
  const type = m ? (PACK_WORD[m[1].toUpperCase()] || m[1]) : r.pack;
  const upc = m ? m[2] : '';
  let pack;
  if (m && m[3]) pack = /pcs$/i.test(m[3]) ? `${type} ${m[3]} (${r.weight})` : `${type} ${m[3]}`;
  else pack = `${type} ${r.weight}`;
  return {
    name: `${b.name} ${p.name}`, flavours: [...p.flavours], pack, upc,
    price: r.price != null ? String(r.price) : '', ref: `${p.id}|${BRANDS_INDEX.rowKey(p, r)}`,
    box: String(r.box || ''), cap40: /\d/.test(String(r.ft)) ? String(r.ft).replace(/,/g, '') : '',
  };
}
const BRANDS_INDEX = {
  rowKey: (p, r) => p.rows.indexOf(r),
  find(ref) {
    const [pid, ri] = String(ref).split('|');
    for (const b of BRANDS) { const p = b.products.find(x => x.id === pid); if (p && p.rows[+ri]) return { b, p, r: p.rows[+ri] }; }
    return null;
  },
};
function pickerOptions(sel) {
  return BRANDS.map(b => `<optgroup label="${esc(b.name)}">${b.products.map(p => p.rows.map((r, i) => {
    const v = `${p.id}|${i}`;
    const price = r.price != null ? ` — $${r.price}` : '';
    return `<option value="${v}" ${v === sel ? 'selected' : ''}>${esc(p.name)} · ${esc(r.weight)} · ${esc(r.carton)}${price}</option>`;
  }).join('')).join('')}</optgroup>`).join('');
}

/* ═════════════ data layer ═════════════ */
async function fetchInvoices() {
  const col = collection(db, 'invoices');
  const snap = await getDocs(isAdmin() ? col : query(col, where('ownerUid', '==', auth.user.uid)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (tsMs(b.createdAt) - tsMs(a.createdAt)) || String(b.number).localeCompare(String(a.number)));
}
async function fetchInvoice(id) {
  const s = await getDoc(doc(db, 'invoices', id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}
function payload(e) {
  const items = e.items.map(it => ({
    name: String(it.name || '').slice(0, 200), flavours: (it.flavours || []).map(f => String(f).slice(0, 60)).slice(0, 30),
    pack: String(it.pack || '').slice(0, 80), upc: String(it.upc || '').slice(0, 10), qty: String(it.qty || '').slice(0, 10),
    price: String(it.price || '').slice(0, 14), onDisc: !!it.onDisc, ref: String(it.ref || ''),
    box: String(it.box || '').slice(0, 40), cap40: String(it.cap40 || '').slice(0, 8),
  }));
  const c = calc(items, e.f.disc);
  const out = { items, subtotal: c.subtotal, discAmt: c.discAmt, total: c.total, totalQty: c.totalQty };
  const plan = loadPlan(items, e.f.ctype, e.f.ccount, e.f.cmargin);
  out.loadFill = plan ? Math.round(plan.fill * 1000) / 10 : null;
  out.totalCbm = plan ? Math.round(plan.cbm * 100) / 100 : null;
  for (const k of FIELDS) out[k] = String(e.f[k] ?? '').slice(0, k === 'notes' ? 1000 : 200);
  return out;
}
async function createInvoice(e) {
  const year = String((e.f.invDate || today()).slice(0, 4));
  const counterRef = doc(db, 'counters', year);
  return runTransaction(db, async tx => {
    const cs = await tx.get(counterRef);
    const seq = cs.exists() ? cs.data().seq + 1 : 1;
    const number = `EGF-${year}-${String(seq).padStart(4, '0')}`;
    tx.set(counterRef, { seq });
    tx.set(doc(db, 'invoices', number), {
      ...payload(e), number, year: +year,
      ownerUid: auth.user.uid, ownerName: auth.profile.name || auth.profile.username, ownerUsername: auth.profile.username,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return number;
  });
}
async function saveInvoice(e) {
  await updateDoc(doc(db, 'invoices', e.number), { ...payload(e), updatedAt: serverTimestamp(), updatedBy: auth.profile.username });
}

/* ═════════════ shared UI bits ═════════════ */
let toastTimer;
export function toast(msg, kind = 'ok') {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.className = 'toast show ' + kind; el.textContent = msg;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}
const errMsg = e => {
  const c = e && (e.code || e.message);
  if (c === 'permission-denied') return t('errPerm');
  if (c === 'unavailable') return t('errOffline');
  return TRK(c) || t('errGeneric', { m: c || '' });
};
const TRK = k => { const v = k && t(k); return v && v !== k ? v : ''; };
const loadingBox = () => `<div class="app-loading"><span class="spin"></span>${t('loading')}</div>`;
function guard() {
  if (!auth.ready) return loadingBox();
  if (!isIn()) { setTimeout(() => go('#/login'), 0); return loadingBox(); }
  return null;
}

/* ═════════════ login ═════════════ */
export function viewLogin() {
  if (auth.ready && isIn()) { setTimeout(() => go('#/invoices'), 0); return loadingBox(); }
  const err = auth.error ? `<p class="form-err" role="alert">${t(auth.error)}</p>` : '';
  return `<section class="section app-area"><div class="wrap">
    <form class="login-card" id="loginForm" novalidate>
      <h1>${t('loginTitle')}</h1>
      <p class="muted">${t('loginSub')}</p>
      <label class="fld"><span>${t('username')}</span>
        <input name="u" autocomplete="username" autocapitalize="none" spellcheck="false" required dir="ltr"></label>
      <label class="fld"><span>${t('password')}</span>
        <input name="p" type="password" autocomplete="current-password" required dir="ltr"></label>
      <div id="loginErr">${err}</div>
      <button class="btn btn-indigo wide" type="submit">${t('loginBtn')}</button>
    </form></div></section>`;
}
async function doLogin(form) {
  const btn = form.querySelector('button[type=submit]'), box = document.getElementById('loginErr');
  btn.disabled = true; btn.textContent = t('loading'); box.innerHTML = ''; auth.error = null;
  try { await login(form.u.value, form.p.value); }
  catch (e) { box.innerHTML = `<p class="form-err" role="alert">${errMsg(e)}</p>`; btn.disabled = false; btn.textContent = t('loginBtn'); }
}

/* ═════════════ invoices list ═════════════ */
const list = { rows: null, q: '', owner: 'all', err: null };
export function viewInvoices() {
  const g = guard(); if (g) return g;
  return `<section class="section app-area"><div class="wrap">
    <div class="section-head"><div><h2>${t('invTitle')}</h2><p>${isAdmin() ? t('invSubAdmin') : t('invSubUser')}</p></div>
      <button type="button" class="btn btn-saffron" data-go="invoice/new">${t('newInvoice')}</button></div>
    <div class="pl-tools">
      <label class="search"><span class="sr">${t('invSearch')}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="invq" type="search" placeholder="${t('invSearch')}" value="${esc(list.q)}"></label>
      ${isAdmin() ? `<select id="invOwner" class="sel" aria-label="${t('thBy')}"></select>` : ''}
    </div>
    <div id="invList">${loadingBox()}</div>
  </div></section>`;
}
function renderList() {
  const box = document.getElementById('invList'); if (!box) return;
  if (list.err) { box.innerHTML = `<p class="form-err">${esc(list.err)}</p>`; return; }
  if (!list.rows) { box.innerHTML = loadingBox(); return; }
  const sel = document.getElementById('invOwner');
  if (sel) {
    const owners = [...new Map(list.rows.map(r => [r.ownerUid, r.ownerName || r.ownerUsername])).entries()];
    sel.innerHTML = `<option value="all">${t('allUsers')}</option>` + owners.map(([u, n]) => `<option value="${esc(u)}" ${list.owner === u ? 'selected' : ''}>${esc(n)}</option>`).join('');
  }
  const q = list.q.trim().toLowerCase();
  const rows = list.rows.filter(r => (list.owner === 'all' || r.ownerUid === list.owner)
    && (!q || [r.number, r.company, r.country, r.ownerName, r.ownerUsername, r.salesName, r.socialName].join(' ').toLowerCase().includes(q)));
  if (!list.rows.length) { box.innerHTML = `<div class="empty-card"><p>${t('noInvoices')}</p><button type="button" class="btn btn-saffron" data-go="invoice/new">${t('newInvoice')}</button></div>`; return; }
  const admin = isAdmin();
  const sum = rows.reduce((s, r) => s + (r.total || 0), 0);
  box.innerHTML = `<div class="table-wrap"><table class="inv-list">
    <thead><tr><th>${t('thNumber')}</th><th>${t('thDate')}</th><th>${t('thCustomer')}</th><th>${t('thCountry')}</th><th>${t('thTeam')}</th><th>${t('thLoad')}</th>
      ${admin ? `<th>${t('thBy')}</th>` : ''}<th class="end">${t('thTotal')}</th><th>${t('thUpdated')}</th><th class="end"><span class="sr">actions</span></th></tr></thead>
    <tbody>${rows.length ? rows.map(r => `<tr class="item" data-go="invoice/${esc(r.id)}" tabindex="0">
      <td><b class="num">${esc(r.number)}</b></td><td><span class="num">${fmtDate(r.invDate)}</span></td>
      <td class="wrapcell">${esc(r.company) || '—'}</td><td>${esc(r.country) || '—'}</td>
      <td class="team-cell">${r.salesName || r.socialName ? `${r.salesName ? `<span>${esc(r.salesName)}</span>` : ''}${r.socialName ? `<small>${esc(r.socialName)}</small>` : ''}` : '—'}</td>
      <td>${r.ctype && CONTAINERS[r.ctype] ? `<span class="num">${esc(r.ccount)} × ${t('c' + r.ctype + 's')}</span>${r.loadFill != null ? ` <small class="${r.loadFill > 100 ? 'neg' : 'muted'}">${r.loadFill}%</small>` : ''}` : '—'}</td>
      ${admin ? `<td><span class="who">${esc(r.ownerName || r.ownerUsername)}</span></td>` : ''}
      <td class="price end"><span class="num">${usd(r.total || 0)}</span></td>
      <td class="muted"><span class="num">${fmtStamp(r.updatedAt)}</span></td>
      <td class="end"><div class="row-acts">
        <button type="button" class="mini" data-act="dup" data-id="${esc(r.id)}">${t('duplicate')}</button>
        <button type="button" class="mini danger" data-act="del" data-id="${esc(r.id)}">${t('del')}</button></div></td>
    </tr>`).join('') : `<tr><td colspan="10" class="empty">${t('noResults')}</td></tr>`}</tbody>
    <tfoot><tr><td colspan="${admin ? 7 : 6}">${rows.length} ${t('invCount')}</td><td class="price end"><span class="num">${usd(sum)}</span></td><td colspan="2"></td></tr></tfoot>
  </table></div>`;
}
async function loadList() {
  list.err = null; renderList();
  try { list.rows = await fetchInvoices(); } catch (e) { console.error(e); list.err = errMsg(e); }
  renderList();
}

/* ═════════════ editor ═════════════ */
let ed = null;          // { number|null, ownerName, f:{}, items:[], dirty, saving, loadErr }
let pendingCopy = null; // used by "duplicate"
function newEditor(copy) {
  const f = Object.fromEntries(FIELDS.map(k => [k, '']));
  f.invDate = today(); f.disc = '0'; f.ctype = '40'; f.ccount = '1'; f.cmargin = String(DEFAULT_MARGIN);
  if (copy) for (const k of FIELDS) if (k !== 'invDate') f[k] = copy[k] ?? f[k];
  return { number: null, ownerName: auth.profile.name, f, items: copy ? JSON.parse(JSON.stringify(copy.items || [])) : [blankItem()], dirty: !!copy, saving: false };
}
function fromDoc(d) {
  const f = Object.fromEntries(FIELDS.map(k => [k, d[k] ?? '']));
  if (f.disc === '') f.disc = '0';
  if (!f.ctype) f.ctype = 'none';
  if (f.ccount === '') f.ccount = '1';
  if (f.cmargin === '') f.cmargin = String(DEFAULT_MARGIN);
  return { number: d.number, ownerName: d.ownerName || d.ownerUsername, ownerUid: d.ownerUid, createdAt: d.createdAt, f,
    items: (d.items || []).map(it => ({ ...blankItem(), ...it })), dirty: false, saving: false };
}

export function viewInvoiceEditor(id) {
  const g = guard(); if (g) return g;
  if (id === 'new') { if (!ed || ed.number || ed._for !== 'new') { ed = newEditor(pendingCopy); ed._for = 'new'; pendingCopy = null; } }
  else if (!ed || ed.number !== id) ed = null;
  return `<section class="app-area editor-wrap" id="editor">${ed ? editorHTML() : loadingBox()}</section>`;
}
function editorHTML() {
  const e = ed, c = calc(e.items, e.f.disc);
  const fld = (k, type = 'text', ph = '', dir = '') => `<label class="fld"><span>${t('f_' + k)}</span>
    <input data-f="${k}" type="${type}" value="${esc(e.f[k])}" placeholder="${esc(ph)}" ${dir ? `dir="${dir}"` : ''}></label>`;
  const owner = e.number && isAdmin() && e.ownerUid !== auth.user.uid ? `<span class="pill">${t('createdBy')}: ${esc(e.ownerName)}</span>` : '';
  return `<div class="ed-bar"><div class="wrap ed-bar-row">
      <button type="button" class="crumb-back" data-go="invoices">← ${t('backToList')}</button>
      <div class="ed-title"><b class="num">${e.number ? esc(e.number) : t('newInvoice')}</b>
        ${e.number ? '' : `<small>${t('numberOnSave')}</small>`} ${owner}
        <span class="dirty ${e.dirty ? 'on' : ''}" id="dirtyFlag">${t('unsavedShort')}</span></div>
      <div class="ed-acts">
        <button type="button" class="btn btn-line sm" data-act="print">${t('printInv')}</button>
        <button type="button" class="btn btn-line sm" data-act="pdf" id="pdfBtn">${t('pdf')}</button>
        <button type="button" class="btn btn-saffron sm" data-act="save" id="saveBtn" ${e.saving ? 'disabled' : ''}>${e.saving ? t('saving') : t('save')}</button>
      </div></div></div>
    <div class="ed-tabs" role="tablist">
      <button type="button" role="tab" data-tab="form" aria-selected="true">${t('tabForm')}</button>
      <button type="button" role="tab" data-tab="preview" aria-selected="false">${t('tabPreview')}</button></div>
    <div class="wrap ed-grid" data-show="form">
      <div class="ed-form">
        <div class="card team-card"><div class="card-h-row"><h3 class="card-h">${t('secTeam')}</h3><span class="internal">${t('internalOnly')}</span></div>
          <div class="g2">
            <label class="fld"><span>${t('f_salesName')}</span><input data-f="salesName" list="dl-sales" value="${esc(e.f.salesName)}" maxlength="60" autocomplete="off"></label>
            <label class="fld"><span>${t('f_socialName')}</span><input data-f="socialName" list="dl-social" value="${esc(e.f.socialName)}" maxlength="60" autocomplete="off"></label>
          </div>
          <datalist id="dl-sales">${teamOptions('salesName')}</datalist><datalist id="dl-social">${teamOptions('socialName')}</datalist></div>
        <div class="card"><h3 class="card-h">${t('secDetails')}</h3>
          <div class="g2">${fld('invDate', 'date')}${fld('portLoad', 'text', 'Alexandria Port')}</div>
          <div class="g2">${fld('port', 'text', 'Jebel Ali, UAE')}</div></div>
        <div class="card"><h3 class="card-h">${t('secCustomer')}</h3>
          <div class="g2">${fld('company')}${fld('country')}</div>
          <div class="g2">${fld('email', 'email', '', 'ltr')}${fld('phone', 'tel', '', 'ltr')}</div>
          <div class="g2">${fld('address')}${fld('website', 'text', '', 'ltr')}</div></div>
        <div class="card" id="shipCard">${shipCardHTML()}</div>
        <div class="card"><div class="card-h-row"><h3 class="card-h">${t('secItems')}</h3>
            <button type="button" class="btn btn-line sm" data-act="add">${t('addRow')}</button></div>
          <div id="itemsBox">${itemsHTML()}</div>
          <div class="g2 sep">${fld('notes', 'text', t('notesPh'))}${fld('disc', 'number')}</div>
          <div class="totals-row" id="totalsRow">${totalsHTML(c)}</div></div>
      </div>
      <div class="ed-preview"><div class="inv-scale"><div id="invoice-doc" class="inv">${invoiceDocHTML(e)}</div></div></div>
    </div>`;
}
function teamOptions(k) {
  const names = [...new Set((list.rows || []).map(r => String(r[k] || '').trim()).filter(Boolean))].sort();
  return names.map(n => `<option value="${esc(n)}"></option>`).join('');
}
function shipCardHTML() {
  const f = ed.f, on = CONTAINERS[f.ctype];
  const seg = v => `<button type="button" data-act="ctype" data-v="${v}" aria-pressed="${f.ctype === v}">${v === 'none' ? t('cNone') : t('c' + v)}</button>`;
  return `<div class="card-h-row"><h3 class="card-h">${t('secShip')}</h3></div>
    <div class="seg" role="group" aria-label="${t('secShip')}">${seg('20')}${seg('40')}${seg('none')}</div>
    ${on ? `<div class="g2 ship-in">
      <label class="fld"><span>${t('cCount')}</span><input data-f="ccount" type="number" min="1" step="1" value="${esc(f.ccount)}" dir="ltr"></label>
      <label class="fld"><span>${t('cMargin')}</span><input data-f="cmargin" type="number" min="0" max="50" step="1" value="${esc(f.cmargin)}" dir="ltr"></label>
    </div>` : ''}
    <div id="shipSummary">${shipSummaryHTML()}</div>`;
}
function shipSummaryHTML() {
  const plan = planOf(ed);
  if (!plan) return `<p class="muted small">${t('cNoneNote')}</p>`;
  if (!plan.n) return `<p class="form-err">${t('cCountReq')}</p>`;
  const w = Math.min(plan.fill, 1) * 100;
  const cls = plan.over ? 'bad' : plan.fill >= 0.97 ? 'ok' : 'mid';
  const free = plan.n - plan.used;
  let msg;
  if (plan.used === 0) msg = `<div class="verdict-s">${t('cEmpty', { n: plan.n, c: t('c' + plan.type + 's') })}</div>`;
  else if (plan.over) msg = `<div class="verdict-s bad"><b>${t('cOver', { p: pct(plan.used / plan.n - 1) })}</b>
      <span>${t('cOverSub', { k: plan.needed, c: t('c' + plan.type + 's') })}</span></div>`;
  else msg = `<div class="verdict-s ${cls}"><b>${plan.fill >= 0.97 ? t('cFull') : t('cFits')}</b>
      ${plan.fill < 0.995 ? `<span>${t('cFree', { p: pct(free / plan.n), x: (free).toLocaleString('en-US', { maximumFractionDigits: 2 }) })}</span>` : ''}</div>`;
  const unknown = plan.unknown ? `<p class="warn">${t('cUnknown')}</p>` : '';
  const canFit = plan.used > 0 && Math.abs(plan.fill - 1) > 0.005;
  return `<div class="gauge ${cls}"><div class="gauge-top"><span>${t('cFill')}</span><b class="num">${pct(plan.fill)}</b></div>
      <div class="gauge-track"><i style="width:${w}%"></i>${plan.n > 1 ? Array.from({ length: plan.n - 1 }, (_, k) => `<s style="inset-inline-start:${(k + 1) / plan.n * 100}%"></s>`).join('') : ''}</div>
      <div class="gauge-meta"><span>${t('cUsed', { u: plan.used.toLocaleString('en-US', { maximumFractionDigits: 2 }), n: plan.n })}</span><span class="num">${plan.cbm.toLocaleString('en-US', { maximumFractionDigits: 2 })} m³</span></div></div>
    ${msg}${unknown}
    ${canFit ? `<button type="button" class="btn btn-line sm wide" data-act="fitAll">${plan.over ? t('cFitDown') : t('cFitUp')}</button>` : ''}`;
}
function shareHTML(i) {
  const plan = planOf(ed); if (!plan) return '';
  const l = plan.lines[i]; if (!l) return '';
  if (!l.usable) return `<span class="share-q">${t('cNoData')}</span>`;
  const src = l.source === 'list' ? t('srcList') : t('srcCalc');
  const free = plan.n - plan.used, room = Math.floor(free * l.usable);
  return `<span class="share-p"><b class="num">${pct(l.share, 1)}</b> ${t('ofContainer')}</span>
    <span class="share-q">${t('perC', { n: fmtInt(l.usable), c: t('c' + plan.type + 's') })} · ${src}</span>
    ${room > 0 ? `<button type="button" class="mini" data-act="fillLine" data-i="${i}">${t('cFillLine', { n: fmtInt(room) })}</button>` : ''}`;
}
function totalsHTML(c) {
  return `<span>${t('subtotal')}: <b class="num">${usd(c.subtotal)}</b></span>
    ${c.pct > 0 && c.discountable > 0 ? `<span class="neg">${t('discount')} ${c.pct}% ${t(c.scope === 'marked' ? 'discMarked' : 'discAll')}: <b class="num">−${usd(c.discAmt)}</b></span>` : ''}
    <span class="grand">${t('total')}: <b class="num">${usd(c.total)}</b></span>`;
}
function itemsHTML() {
  return ed.items.map((it, i) => `<div class="li" data-i="${i}">
    <div class="li-head"><span class="li-n num">${i + 1}</span>
      <select class="sel pick" data-pick="${i}" aria-label="${t('pickProduct')}">
        <option value="">${t('pickProduct')}</option>${pickerOptions(it.ref)}</select>
      <button type="button" class="x" data-act="rm" data-i="${i}" aria-label="${t('del')}">×</button></div>
    <label class="fld"><span>${t('productName')}</span><input data-i="${i}" data-k="name" value="${esc(it.name)}" dir="auto"></label>
    <div class="g4">
      <label class="fld"><span>${t('packSize')}</span><input data-i="${i}" data-k="pack" value="${esc(it.pack)}" dir="auto"></label>
      <label class="fld"><span>${t('upc')}</span><input data-i="${i}" data-k="upc" value="${esc(it.upc)}" inputmode="numeric" dir="ltr"></label>
      <label class="fld"><span>${t('qty')}</span><input data-i="${i}" data-k="qty" type="number" min="0" step="1" value="${esc(it.qty)}" dir="ltr"></label>
      <label class="fld"><span>${t('priceCtn')}</span><input data-i="${i}" data-k="price" type="number" min="0" step="0.01" value="${esc(it.price)}" dir="ltr"></label>
    </div>
    <div class="g-load">
      <label class="fld"><span>${t('boxSize')}</span><input data-i="${i}" data-k="box" value="${esc(it.box)}" placeholder="47×25×19" dir="ltr"></label>
      <label class="fld"><span>${t('cap40')}</span><input data-i="${i}" data-k="cap40" value="${esc(it.cap40)}" inputmode="numeric" placeholder="3150" dir="ltr"></label>
      <div class="share" id="share-${i}">${shareHTML(i)}</div>
    </div>
    <div class="li-foot">
      <div class="ftags">${it.flavours.map((f, j) => `<span class="ftag">${esc(f)}<button type="button" data-act="rmflav" data-i="${i}" data-j="${j}" aria-label="${t('del')}">×</button></span>`).join('')}
        <span class="fadd"><input data-flav="${i}" placeholder="${t('addFlavour')}" dir="auto"><button type="button" data-act="addflav" data-i="${i}">+</button></span></div>
      <button type="button" class="disc-t ${it.onDisc ? 'on' : ''}" data-act="disc" data-i="${i}">${it.onDisc ? t('onDisc') : t('applyDisc')}</button>
    </div></div>`).join('');
}
/* scale the A4 preview to whatever width the column has */
export function fitPreview() {
  const box = document.querySelector('.ed-preview .inv-scale'), inv = box && box.querySelector('.inv');
  if (!box || !inv || !box.clientWidth) return;
  inv.style.zoom = Math.min(1.5, box.clientWidth / 760);
}
window.addEventListener('resize', fitPreview);
function refresh(parts = {}) {
  if (!ed) return;
  const c = calc(ed.items, ed.f.disc);
  const doc_ = document.getElementById('invoice-doc'); if (doc_) doc_.innerHTML = invoiceDocHTML(ed);
  const tr = document.getElementById('totalsRow'); if (tr) tr.innerHTML = totalsHTML(c);
  if (parts.items) { const ib = document.getElementById('itemsBox'); if (ib) ib.innerHTML = itemsHTML(); }
  else ed.items.forEach((_, i) => { const el = document.getElementById('share-' + i); if (el) el.innerHTML = shareHTML(i); });
  const sc = document.getElementById('shipSummary'); if (sc) sc.innerHTML = shipSummaryHTML();
  const df = document.getElementById('dirtyFlag'); if (df) df.classList.toggle('on', ed.dirty);
}
function touch(parts) { ed.dirty = true; refresh(parts); }

async function loadEditor(id) {
  try {
    const d = await fetchInvoice(id);
    if (route().view !== 'invoice' || route().a !== id) return;
    if (!d) { document.getElementById('editor').innerHTML = `<div class="wrap section"><p class="form-err">${t('notFound')}</p><button class="btn btn-line" data-go="invoices">${t('backToList')}</button></div>`; return; }
    ed = fromDoc(d);
    document.getElementById('editor').innerHTML = editorHTML(); fitPreview();
  } catch (e) {
    console.error(e);
    document.getElementById('editor').innerHTML = `<div class="wrap section"><p class="form-err">${esc(errMsg(e))}</p><button class="btn btn-line" data-go="invoices">${t('backToList')}</button></div>`;
  }
}
async function doSave() {
  if (!ed || ed.saving) return;
  if (!ed.items.some(it => it.name.trim())) { toast(t('needItem'), 'err'); return; }
  const plan = planOf(ed);
  if (plan && plan.over && !confirm(t('cSaveOver', { p: pct(plan.fill) }))) return;
  ed.saving = true; const b = document.getElementById('saveBtn'); if (b) { b.disabled = true; b.textContent = t('saving'); }
  try {
    if (ed.number) { await saveInvoice(ed); ed.dirty = false; toast(t('saved')); refresh(); }
    else {
      const number = await createInvoice(ed);
      ed.number = number; ed.ownerUid = auth.user.uid; ed.dirty = false; ed._for = null;
      list.rows = null;
      toast(t('savedAs', { n: number }));
      history.replaceState(null, '', `#/invoice/${number}`);
      document.getElementById('editor').innerHTML = editorHTML(); fitPreview();
    }
  } catch (e) { console.error(e); toast(errMsg(e), 'err'); }
  finally { ed.saving = false; const b2 = document.getElementById('saveBtn'); if (b2) { b2.disabled = false; b2.textContent = t('save'); } }
}

/* PDF (libraries load on demand) */
const loadScript = src => new Promise((res, rej) => {
  if (document.querySelector(`script[src="${src}"]`)) return res();
  const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
});
async function doPDF() {
  const b = document.getElementById('pdfBtn'); if (b) { b.disabled = true; b.textContent = t('generating'); }
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const src = document.getElementById('invoice-doc');
    // render an unscaled copy so the PDF is A4-sharp regardless of screen size
    const holder = document.createElement('div'); holder.className = 'pdf-holder';
    holder.innerHTML = `<div class="inv">${src.innerHTML}</div>`; document.body.appendChild(holder);
    const canvas = await window.html2canvas(holder.firstChild, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
    holder.remove();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
    const imgH = canvas.height * pw / canvas.width, data = canvas.toDataURL('image/jpeg', 0.95);
    for (let y = 0; y < imgH; y += ph) { if (y) pdf.addPage(); pdf.addImage(data, 'JPEG', 0, -y, pw, imgH); }
    pdf.save(`invoice-${ed.number || 'draft'}.pdf`);
  } catch (e) { console.error(e); toast(t('pdfFail'), 'err'); }
  finally { if (b) { b.disabled = false; b.textContent = t('pdf'); } }
}

/* ═════════════ the printable invoice ═════════════ */
function invoiceDocHTML(e) {
  const f = e.f, c = calc(e.items, f.disc);
  const rows = e.items.map((it, i) => {
    const qty = parseInt(it.qty) || 0, price = num(it.price), line = qty * price;
    const flav = it.flavours.length ? `<div class="d-flav"><i>Flavours: </i>${it.flavours.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : '';
    const db_ = it.onDisc && c.pct > 0 ? `<span class="d-disc">−${c.pct}% / خصم</span>` : '';
    return `<tr><td>${i + 1}</td><td><div class="d-name">${esc(it.name) || '—'}</div>${flav}${db_}</td>
      <td>${esc(it.pack) || '—'}</td><td>${esc(it.upc) || '—'}</td><td>${qty || '—'}</td>
      <td>${price > 0 ? '$' + price.toFixed(2) : '—'}</td><td>${line > 0 ? usd(line) : '—'}</td></tr>`;
  }).join('');
  const discRow = c.pct > 0 && c.discountable > 0 ? `<tr class="d-discrow"><td colspan="6">${c.scope === 'marked'
    ? `Discount (${c.pct}%) on marked items / خصم على المنتجات المحددة`
    : `Discount (${c.pct}%) / خصم`}</td><td>−${usd(c.discAmt)}</td></tr>` : '';
  const cell = (lbl, v, big) => `<div class="d-cell"><div class="d-lbl">${lbl}</div><div class="d-val${big ? ' big' : ''}">${esc(v) || '—'}</div></div>`;
  return `
  <div class="d-top"><div class="d-addr">
      <b>Address:</b> Cairo – Alexandria Agricultural Road, Km 90, Tanta, Egypt<br>
      <b>Website:</b> www.egygulf-foods.com &nbsp; <b>E-Mail:</b> export@egygulf-foods.com</div>
    <div class="d-no"><div><span>Invoice No:</span><b class="mono">${esc(e.number) || 'DRAFT'}</b></div>
      <div><span>Invoice Date:</span><b>${fmtDate(f.invDate)}</b></div></div></div>
  <div class="d-head"><div class="d-brand"><img src="logo_main.webp" alt="EgyGulf Foods" class="d-logo">
      <div><div class="d-co">Egyptian Gulf International</div><div class="d-co2">For Snacks &amp; Food Industries</div>
      <div class="d-co3">الشركة المصرية الخليجية الدولية للصناعات والأغذية الخفيفة</div></div></div></div>
  <div class="d-title">فاتورة تجارية — COMMERCIAL INVOICE</div>
  <div class="d-client">
    ${cell('Website:', f.website)}${cell('Country / البلد:', f.country)}${cell('Phone / الموبايل:', f.phone)}
    ${cell('Company Name / اسم الشركة:', f.company, true)}${cell('Address / العنوان:', f.address)}${cell('Email / الإيميل:', f.email)}</div>
  <table class="d-table"><thead><tr>
    <th style="width:30px">NO</th><th class="l">Product Description<br><small>وصف المنتج</small></th>
    <th>Pack Size<br><small>حجم العبوة</small></th><th>Units/Carton<br><small>عدد الوحدات</small></th>
    <th>Qty (Cartons)<br><small>الكمية</small></th><th>Carton Price (USD)<br><small>سعر الكرتونة</small></th>
    <th>Total Value (USD)<br><small>الإجمالي</small></th></tr></thead>
    <tbody>${rows}${discRow}
    <tr class="d-total"><td colspan="4" class="r">Total Quantity (Cartons) / إجمالي الكمية</td><td>${c.totalQty} cartons</td>
      <td class="r">TOTAL VALUE (USD)</td><td class="big">${usd(c.total)}</td></tr></tbody></table>
  <div class="d-ports"><div><b>Loading Point / نقطة الشحن:</b> ${esc(f.portLoad) || '—'}</div>
    <div><b>Discharge Point / نقطة الوصول:</b> ${esc(f.port) || '—'}</div></div>
  ${(() => { const p = planOf(e); return p && p.n ? `<div class="d-ship"><div><b>Shipment:</b> ${p.n} × ${CONTAINERS[p.type].label} Container${p.n > 1 ? 's' : ''}</div>
    <div><b>Total Volume:</b> ${p.cbm.toLocaleString('en-US', { maximumFractionDigits: 2 })} m³</div></div>` : ''; })()}
  <div class="d-terms"><div class="d-terms-h">PAYMENT TERMS, DELIVERY &amp; LIABILITY — شروط السداد والتسليم والمسؤولية</div>
    <div class="d-terms-g"><div>
      <h5>Payment terms</h5><p>50% advance payment before starting production.<br>50% before loading from the factory.<br>Production and shipment will not commence unless all due payments are fully received.</p>
      <h5>Delivery &amp; risk transfer</h5><p>Goods are delivered Ex-Works (Factory). All risks and responsibilities transfer to the buyer immediately upon loading.</p>
      <h5>Limitation of liability</h5><p>The exporter shall not be liable for any indirect or consequential damages once goods leave the factory.</p>
    </div><div dir="rtl">
      <h5>شروط السداد</h5><p>50% من إجمالي قيمة الفاتورة قبل بدء الإنتاج.<br>50% قبل تحميل البضاعة من أرض المصنع.<br>لا يتم الإنتاج أو التحميل قبل استلام الدفعات كاملة.</p>
      <h5>التسليم وتحمل المخاطر</h5><p>يتم تسليم البضاعة أرض المصنع، وتنتقل المسؤولية إلى المشتري فور التحميل.</p>
      <h5>تحديد المسؤولية</h5><p>لا تتحمل الشركة المصدرة أي مسؤولية عن أضرار غير مباشرة بعد مغادرة البضاعة للمصنع.</p>
    </div></div></div>
  <div class="d-valid">The quotation / invoice is valid for two weeks (14 days) from the date of issue — مدة صلاحية عرض السعر أو الفاتورة (14 يوماً) من تاريخ الإصدار</div>
  <div class="d-purpose">This invoice is issued for commercial and customs purposes only — تم إصدار هذه الفاتورة لأغراض تجارية وجمركية فقط</div>
  ${f.notes ? `<div class="d-notes"><b>Notes / ملاحظات:</b> ${esc(f.notes)}</div>` : ''}
  <div class="d-bank"><div class="d-bank-h">BANK DETAILS (FOR PAYMENT PURPOSES ONLY)</div>
    <div class="d-bank-g">
      ${cell('Bank', 'Faisal Islamic Bank of Egypt – Tanta Branch')}${cell('Beneficiary', 'Egyptian Gulf International for Industries and Light Foods')}
      <div class="d-cell"><div class="d-lbl">Account No</div><div class="d-val mono">900820803</div></div>
      <div class="d-cell"><div class="d-lbl">IBAN (USD)</div><div class="d-val mono">EG420059000900000100015847812</div></div>
      <div class="d-cell full"><div class="d-lbl">SWIFT / BIC</div><div class="d-val mono">FIEGEGCXXXX</div></div>
    </div></div>`;
}

/* ═════════════ users (admin) ═════════════ */
const users = { rows: null, err: null, counts: {} };
export function viewUsers() {
  const g = guard(); if (g) return g;
  if (!isAdmin()) { setTimeout(() => go('#/invoices'), 0); return loadingBox(); }
  return `<section class="section app-area"><div class="wrap">
    <div class="section-head"><div><h2>${t('usersTitle')}</h2><p>${t('usersSub')}</p></div></div>
    <div class="users-grid">
      <form class="card" id="addUserForm" novalidate autocomplete="off">
        <h3 class="card-h">${t('addUser')}</h3>
        <label class="fld"><span>${t('displayName')}</span><input name="name" required maxlength="60"></label>
        <label class="fld"><span>${t('username')}</span><input name="username" required dir="ltr" autocapitalize="none" spellcheck="false" autocomplete="off"><small>${t('usernameRule')}</small></label>
        <label class="fld"><span>${t('password')}</span><input name="password" type="text" required dir="ltr" autocomplete="new-password"><small>${t('pwRule')}</small></label>
        <label class="fld"><span>${t('role')}</span><select name="role" class="sel"><option value="user">${t('roleUser')}</option><option value="admin">${t('roleAdmin')}</option></select></label>
        <div id="addUserErr"></div>
        <button class="btn btn-indigo wide" type="submit">${t('addUser')}</button>
      </form>
      <div><div id="usersList">${loadingBox()}</div><p class="muted small">${t('usersNote')}</p></div>
    </div></div></section>`;
}
function renderUsers() {
  const box = document.getElementById('usersList'); if (!box) return;
  if (users.err) { box.innerHTML = `<p class="form-err">${esc(users.err)}</p>`; return; }
  if (!users.rows) { box.innerHTML = loadingBox(); return; }
  const rows = [...users.rows].sort((a, b) => (a.role === 'admin' ? 0 : 1) - (b.role === 'admin' ? 0 : 1) || String(a.username).localeCompare(b.username));
  box.innerHTML = `<div class="table-wrap"><table class="inv-list">
    <thead><tr><th>${t('displayName')}</th><th>${t('username')}</th><th>${t('role')}</th><th>${t('status')}</th><th class="end">${t('navInvoices')}</th><th class="end"><span class="sr">actions</span></th></tr></thead>
    <tbody>${rows.map(u => {
      const me = u.uid === auth.user.uid;
      return `<tr><td><b>${esc(u.name || u.username)}</b> ${me ? `<small class="muted">${t('you')}</small>` : ''}</td>
        <td><span class="num">${esc(u.username)}</span></td>
        <td>${me ? t(u.role === 'admin' ? 'roleAdmin' : 'roleUser') : `<select class="sel sm" data-role="${esc(u.uid)}"><option value="user" ${u.role !== 'admin' ? 'selected' : ''}>${t('roleUser')}</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>${t('roleAdmin')}</option></select>`}</td>
        <td><span class="badge ${u.active ? 'ok' : 'off'}">${u.active ? t('active') : t('disabled')}</span></td>
        <td class="end"><span class="num">${users.counts[u.uid] || 0}</span></td>
        <td class="end">${me ? '' : `<button type="button" class="mini ${u.active ? 'danger' : ''}" data-act="toggleUser" data-id="${esc(u.uid)}" data-on="${u.active ? 0 : 1}">${u.active ? t('disable') : t('enable')}</button>`}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}
async function loadUsers() {
  users.err = null; renderUsers();
  try {
    const [u, inv] = await Promise.all([listUsers(), fetchInvoices()]);
    users.rows = u; users.counts = {};
    for (const r of inv) users.counts[r.ownerUid] = (users.counts[r.ownerUid] || 0) + 1;
    list.rows = inv;
  } catch (e) { console.error(e); users.err = errMsg(e); }
  renderUsers();
}
async function doAddUser(form) {
  const box = document.getElementById('addUserErr'), btn = form.querySelector('button[type=submit]');
  const data = { name: form.name.value, username: form.username.value.trim().toLowerCase(), password: form.password.value, role: form.role.value };
  box.innerHTML = '';
  if (!data.name.trim()) { box.innerHTML = `<p class="form-err">${t('needName')}</p>`; return; }
  if (!USERNAME_RE.test(data.username)) { box.innerHTML = `<p class="form-err">${t('usernameRule')}</p>`; return; }
  if (data.password.length < 6) { box.innerHTML = `<p class="form-err">${t('pwRule')}</p>`; return; }
  btn.disabled = true;
  try { await createUser(data); form.reset(); toast(t('userCreated', { u: data.username })); await loadUsers(); }
  catch (e) { console.error(e); box.innerHTML = `<p class="form-err">${errMsg(e)}</p>`; }
  finally { btn.disabled = false; }
}

/* ═════════════ lifecycle + events (called from app.js) ═════════════ */
export function mountInvoiceView(r) {
  if (!auth.ready || !isIn()) return;
  if (r.view === 'invoices') { if (list.rows) renderList(); loadList(); }
  if (r.view === 'invoice' && r.a !== 'new' && (!ed || ed.number !== r.a)) loadEditor(r.a);
  if (r.view === 'invoice') {
    requestAnimationFrame(fitPreview);
    if (!list.rows) fetchInvoices().then(rows => {
      list.rows = rows;
      const a = document.getElementById('dl-sales'), b = document.getElementById('dl-social');
      if (a) a.innerHTML = teamOptions('salesName'); if (b) b.innerHTML = teamOptions('socialName');
    }).catch(() => {});
  }
  if (r.view === 'users' && isAdmin()) loadUsers();
}
export function confirmLeave(nextHash) {
  if (!ed || !ed.dirty) return true;
  const cur = route();
  if (cur.view !== 'invoice') return true;
  if (nextHash && nextHash.replace(/^#\/?/, '') === `invoice/${ed.number || 'new'}`) return true;
  if (!confirm(t('unsaved'))) return false;
  ed = null; return true;
}
export const editorHash = () => `#/invoice/${(ed && ed.number) || 'new'}`;
export const hasUnsaved = () => !!(ed && ed.dirty && route().view === 'invoice');

export function invoiceClick(e) {
  const a = e.target.closest('[data-act]');
  const tab = e.target.closest('[data-tab]');
  if (tab) {
    document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b === tab)));
    const g = document.querySelector('.ed-grid'); if (g) g.dataset.show = tab.dataset.tab; fitPreview(); return true;
  }
  if (!a) return false;
  const i = +a.dataset.i, act = a.dataset.act;
  switch (act) {
    case 'add': ed.items.push(blankItem()); touch({ items: true }); setTimeout(() => { const s = document.querySelectorAll('.pick'); s[s.length - 1]?.focus(); }, 0); return true;
    case 'rm': if (ed.items.length && (!ed.items[i].name || confirm(t('confirmRmLine')))) { ed.items.splice(i, 1); touch({ items: true }); } return true;
    case 'disc': ed.items[i].onDisc = !ed.items[i].onDisc; touch({ items: true }); return true;
    case 'rmflav': ed.items[i].flavours.splice(+a.dataset.j, 1); touch({ items: true }); return true;
    case 'addflav': addFlav(i); return true;
    case 'save': doSave(); return true;
    case 'ctype': ed.f.ctype = a.dataset.v; if (!parseInt(ed.f.ccount)) ed.f.ccount = '1'; touch();
      document.getElementById('shipCard').innerHTML = shipCardHTML(); refresh({ items: true }); return true;
    case 'fitAll': { const plan = planOf(ed), q = fitQuantities(ed.items, plan); if (!q) return true;
      q.forEach((v, k) => { ed.items[k].qty = String(v); }); touch({ items: true }); toast(t('cFitted')); return true; }
    case 'fillLine': { const plan = planOf(ed), l = plan && plan.lines[i]; if (!l || !l.usable) return true;
      const room = Math.floor((plan.n - plan.used) * l.usable); if (room <= 0) return true;
      ed.items[i].qty = String((parseInt(ed.items[i].qty) || 0) + room); touch({ items: true }); return true; }
    case 'print': window.print(); return true;
    case 'pdf': doPDF(); return true;
    case 'dup': e.stopPropagation(); duplicate(a.dataset.id); return true;
    case 'del': e.stopPropagation(); remove(a.dataset.id); return true;
    case 'toggleUser': toggleUser(a.dataset.id, a.dataset.on === '1'); return true;
  }
  return false;
}
function addFlav(i) {
  const inp = document.querySelector(`[data-flav="${i}"]`); const v = inp && inp.value.trim();
  if (!v) return; ed.items[i].flavours.push(v); touch({ items: true });
  setTimeout(() => document.querySelector(`[data-flav="${i}"]`)?.focus(), 0);
}
async function duplicate(id) {
  const src = (list.rows || []).find(r => r.id === id) || await fetchInvoice(id).catch(() => null);
  if (!src) return;
  pendingCopy = src; ed = null; go('#/invoice/new'); toast(t('dupDone', { n: src.number }));
}
async function remove(id) {
  if (!confirm(t('confirmDel', { n: id }))) return;
  try { await deleteDoc(doc(db, 'invoices', id)); list.rows = (list.rows || []).filter(r => r.id !== id); renderList(); toast(t('deleted')); }
  catch (e) { console.error(e); toast(errMsg(e), 'err'); }
}
async function toggleUser(uid, on) {
  const u = users.rows.find(x => x.uid === uid);
  if (!on && !confirm(t('confirmDisable', { u: u ? u.username : '' }))) return;
  try { await updateUser(uid, { active: on }); u.active = on; renderUsers(); toast(t('saved')); }
  catch (e) { console.error(e); toast(errMsg(e), 'err'); }
}

export function invoiceInput(e) {
  const el = e.target;
  if (el.id === 'invq') { list.q = el.value; renderList(); return true; }
  if (el.id === 'invOwner') { list.owner = el.value; renderList(); return true; }
  if (!ed) return false;
  if (el.dataset.f) { ed.f[el.dataset.f] = el.value; touch(); return true; }
  if (el.dataset.k) { ed.items[+el.dataset.i][el.dataset.k] = el.value; touch(); return true; }
  if (el.dataset.pick !== undefined) {
    const i = +el.dataset.pick, hit = BRANDS_INDEX.find(el.value);
    if (hit) { Object.assign(ed.items[i], lineFromCatalog(hit.b, hit.p, hit.r)); touch({ items: true });
      setTimeout(() => document.querySelector(`[data-i="${i}"][data-k="qty"]`)?.focus(), 0); }
    return true;
  }
  return false;
}
export async function invoiceChange(e) {
  const el = e.target;
  if (el.dataset.role) {
    try { await updateUser(el.dataset.role, { role: el.value }); const u = users.rows.find(x => x.uid === el.dataset.role); if (u) u.role = el.value; toast(t('saved')); }
    catch (err) { console.error(err); toast(errMsg(err), 'err'); renderUsers(); }
    return true;
  }
  return false;
}
export function invoiceKey(e) {
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.flav !== undefined) { e.preventDefault(); addFlav(+e.target.dataset.flav); return true; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && route().view === 'invoice' && ed) { e.preventDefault(); doSave(); return true; }
  return false;
}
export function invoiceSubmit(e) {
  if (e.target.id === 'loginForm') { e.preventDefault(); doLogin(e.target); return true; }
  if (e.target.id === 'addUserForm') { e.preventDefault(); doAddUser(e.target); return true; }
  return false;
}
export function resetAppState() { list.rows = null; list.owner = 'all'; users.rows = null; ed = null; pendingCopy = null; }
