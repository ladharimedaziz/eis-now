// Shared bits live on NOW so desk.js (the editor) can use them too.
const NOW = (() => {
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get: (k, area = localStorage) => { try { return area.getItem(k); } catch (e) { return null; } },
  set: (k, v, area = localStorage) => { try { v == null ? area.removeItem(k) : area.setItem(k, v); } catch (e) {} }
};

const ICONS = {
  home: "M3.5 10.5 12 3.5l8.5 7M5.5 9v11h13V9",
  news: "M4 5.5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8.5a2 2 0 0 1-2 2M7.5 9h6M7.5 12.5h6M7.5 16h4",
  crew: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14a6.5 6.5 0 0 1 3 6",
  tip: "M4 6.5h16v11H4zM4 7l8 6 8-6",
  sun: "M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4",
  moon: "M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z",
  pen: "M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4",
  lock: "M6 10.5h12v10H6zM8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3",
  plus: "M12 5v14M5 12h14",
  trash: "M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  photo: "M3.5 6.5h17v13h-17zM8 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM20.5 16l-5-5-8.5 8.5"
};
const ic = name => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

const NAV = [["#top", "Home", "home"], ["#stories", "Stories", "news"], ["#crew", "Crew", "crew"], ["#contact", "Contact", "tip"]];
const BARS = 6;
const when = d => d ? new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
const initials = n => (n || "?").split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();
const paras = text => String(text || "").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

/* ---------- talking to the database ---------- */
const online = typeof CLOUD !== "undefined" && !!(CLOUD.url && CLOUD.key);
async function rpc(fn, args = {}) {
  if (!online) throw Object.assign(new Error("offline"), { code: "offline" });
  const headers = { apikey: CLOUD.key, "Content-Type": "application/json" };
  if (CLOUD.key.startsWith("eyJ")) headers.Authorization = "Bearer " + CLOUD.key;
  const r = await fetch(`${CLOUD.url.replace(/\/$/, "")}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(args) });
  if (!r.ok) throw Object.assign(new Error((await r.text()) || r.statusText), { code: "http" });
  const out = await r.json();
  if (out && out.error) throw Object.assign(new Error(out.error), { code: out.error });
  return out;
}

let D = null;
async function load() {
  if (online) {
    try {
      D = await rpc("eis_view");
      store.set("eis-cache", JSON.stringify(D));
      return;
    } catch (e) {
      const cached = store.get("eis-cache");
      if (cached) { D = JSON.parse(cached); return; }
    }
  }
  D = structuredClone(DEMO);
}

/* ---------- logo ---------- */
const word = `<span class="brand-word">EIS NOW</span>`;
const logo = new Image();
logo.onerror = () => document.querySelectorAll(".brand, .side-logo").forEach(a => a.innerHTML = word);
logo.src = "assets/logo.png";

/* ---------- drawing the page ---------- */
const sectionColour = new Map();
const colourOf = section => {
  if (!sectionColour.has(section)) sectionColour.set(section, sectionColour.size % BARS);
  return sectionColour.get(section);
};
let section = "All";

function render() {
  const S = D.settings, M = S.mystery || {};
  const issue = S.issue || {}, hero = S.hero || {}, contact = S.contact || {};
  sectionColour.clear();
  D.stories.forEach(s => colourOf(s.section));

  $("#heroTitle").innerHTML = `${esc(hero.title)}<br><span>${esc(hero.highlight)}</span>`;
  $("#heroLede").textContent = hero.lede || "";
  const lead = D.stories[0];
  $("#issueCard").innerHTML = `
    <div class="screen-bars"></div>
    <div class="screen-body">
      <span class="screen-big">Issue #${esc(issue.number)}</span>
      <span class="screen-sub">${esc(issue.month)}</span>
    </div>
    ${lead ? `<a class="screen-lead" href="#story/${lead.id}"><small>Front page</small>${esc(lead.title)}</a>` : ""}
    <span class="screen-tag">${esc(issue.channel)}</span>`;
  $("#sideIssue").textContent = `Issue #${issue.number ?? ""} · ${issue.month ?? ""}`;

  const lines = (S.ticker || []).map((t, i) => `<span data-c="${i % BARS}">${esc(t)}</span>`);
  if (M.on && M.signal) lines.splice(Math.min(2, lines.length), 0, `<span class="signal" data-c="4">${esc(M.signal)}</span>`);
  const track = $("#ticker");
  track.innerHTML = lines.join("") + lines.join("");
  track.style.setProperty("--dur", Math.max(24, track.textContent.length / 10) + "s");

  const crew = S.crew || [];
  $("#crewGrid").innerHTML = crew.map((m, i) => `
    <div class="glass-card member" data-c="${i % BARS}">
      <span class="avatar">${esc(initials(m.name))}</span>
      <div><p class="role">${esc(m.role)}</p><h4>${esc(m.name)}</h4><p>${esc(m.about)}</p></div>
    </div>`).join("");
  $("#crewCount").textContent = `${crew.length} ${crew.length === 1 ? "person" : "people"}`;

  $("#tipText").textContent = contact.text || "";
  $("#tipLink").href = `mailto:${contact.email || ""}?subject=${encodeURIComponent("Story tip for EIS NOW")}`;
  $("#year").textContent = new Date().getFullYear();

  const sections = ["All", ...new Set(D.stories.map(s => s.section))];
  if (!sections.includes(section)) section = "All";
  $("#filters").innerHTML = sections.map(s => `<button type="button" role="tab" aria-selected="${s === section}" data-section="${esc(s)}"${s === "All" ? "" : ` data-c="${colourOf(s)}"`}>${esc(s)}</button>`).join("");
  showStories();
}

function showStories() {
  const list = section === "All" ? D.stories : D.stories.filter(s => s.section === section);
  $("#storyGrid").innerHTML = list.length ? list.map((s, i) => `
    <a class="glass-card story${i === 0 && section === "All" ? " lead" : ""}${s.thumb ? " has-pic" : ""}" href="#story/${s.id}" style="--i:${i}" data-c="${colourOf(s.section)}"${s.clue ? ` data-note="${esc(s.clue)}"` : ""}>
      ${s.thumb ? `<img class="story-pic" src="${s.thumb}" alt="" loading="lazy">` : ""}
      <span class="tag">${esc(s.section)}</span>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.summary)}</p>
      <p class="byline">By ${esc(s.author)} · ${when(s.date)}</p>
    </a>`).join("") : `<p class="empty">Nothing in this section yet.</p>`;
}

$("#filters").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  section = b.dataset.section;
  $("#filters").querySelectorAll("button").forEach(x => x.setAttribute("aria-selected", x === b));
  showStories();
});

/* ---------- sheets: a story (#story/<id>) and the case file (#case) ---------- */
let lastFocus = null;
const openSheet = el => {
  if (el.hidden) lastFocus = document.activeElement;
  document.querySelectorAll(".sheet").forEach(s => s !== el && s.id !== "desk" && (s.hidden = true));
  el.hidden = false;
  document.body.classList.add("sheet-open");
  el.querySelector(".sheet-card").scrollTop = 0;
};
const closeSheets = () => {
  const open = [...document.querySelectorAll("#reader, #case")].some(s => !s.hidden);
  document.querySelectorAll("#reader, #case").forEach(s => s.hidden = true);
  if ($("#desk").hidden) document.body.classList.remove("sheet-open");
  document.title = "EIS NOW";
  if (open) lastFocus?.focus?.();
};

async function showStory(s) {
  const body = paras(s.body);
  $("#readerBody").innerHTML = `
    ${s.hasImage || s.thumb ? `<img class="reader-pic" id="readerPic" src="${s.thumb || ""}" alt="">` : ""}
    <span class="tag" data-c="${colourOf(s.section)}">${esc(s.section)}</span>
    <h1 id="readerTitle">${esc(s.title)}</h1>
    <p class="reader-meta">By ${esc(s.author)} · ${when(s.date)}</p>
    ${(body.length ? body : [s.summary]).map(p => `<p>${esc(p)}</p>`).join("")}
    ${D.settings.mystery?.on && s.clue ? `<p class="clue">${esc(s.clue)}</p>` : ""}`;
  openSheet($("#reader"));
  $("#reader .sheet-x").focus();
  document.title = `${s.title} · EIS NOW`;
  if (s.hasImage && online) {
    try { const full = await rpc("eis_image", { story: s.id }); if (full && $("#readerPic")) $("#readerPic").src = full; } catch (e) {}
  }
}

function showCase() {
  const M = D.settings.mystery || {};
  $("#caseHint").textContent = M.hint || "";
  $("#caseMsg").textContent = "";
  $("#caseBody").hidden = true;
  $("#caseForm").hidden = false;
  $("#casePass").value = "";
  openSheet($("#case"));
  $("#casePass").focus();
  document.title = "CASE FILE · EIS NOW";
}

function typeOut(el, text) {
  el.hidden = false; el.textContent = "";
  let i = 0;
  const step = () => { el.textContent = text.slice(0, i += 3); if (i < text.length) requestAnimationFrame(step); };
  step();
}

$("#caseForm").addEventListener("submit", async e => {
  e.preventDefault();
  const pass = $("#casePass").value.trim(); if (!pass) return;
  const msg = $("#caseMsg");
  msg.className = "case-msg"; msg.textContent = "CHECKING…";
  try {
    const out = await rpc("eis_open_case", { password: pass });
    msg.textContent = "ACCESS GRANTED";
    msg.classList.add("good");
    $("#caseForm").hidden = true;
    typeOut($("#caseBody"), out.body || "");
  } catch (err) {
    msg.classList.add("bad");
    msg.textContent = err.code === "locked" ? "TOO MANY TRIES. THE FILE IS SEALED FOR NOW." : err.code === "offline" ? "NO SIGNAL." : "ACCESS DENIED";
    $(".casefile").classList.remove("shake"); void $(".casefile").offsetWidth; $(".casefile").classList.add("shake");
  }
});

function route() {
  const h = location.hash;
  const m = h.match(/^#story\/(.+)$/);
  const s = m && D.stories.find(x => String(x.id) === m[1]);
  if (s) return showStory(s);
  if (h === "#case" && D.settings.mystery?.on) return showCase();
  closeSheets();
}
addEventListener("hashchange", route);
document.addEventListener("click", e => {
  if (e.target.closest("#reader [data-close], #case [data-close]")) {
    history.replaceState(null, "", location.pathname + location.search + (location.hash.startsWith("#story/") ? "#stories" : ""));
    closeSheets();
  }
});
addEventListener("keydown", e => {
  if (e.key === "Escape" && (!$("#reader").hidden || !$("#case").hidden)) $(".sheet:not([hidden]):not(#desk) [data-close]").click();
});

/* ---------- light / dark ---------- */
const themeBtn = $("#theme");
function paintTheme() {
  const dark = document.documentElement.dataset.theme !== "light";
  themeBtn.innerHTML = ic(dark ? "sun" : "moon");
  themeBtn.setAttribute("aria-label", dark ? "Light mode" : "Dark mode");
  document.querySelector('meta[name="theme-color"]').content = dark ? "#08080A" : "#F2F2F0";
}
themeBtn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  const flip = () => { document.documentElement.dataset.theme = next; store.set("eis-theme", next); paintTheme(); };
  document.startViewTransition ? document.startViewTransition(flip) : flip();
});

/* ---------- menus and which section is on screen ---------- */
function menus() {
  const links = NAV.map(([href, label, icon], i) => `<a href="${href}" data-c="${[1, 3, 2, 0][i]}">${ic(icon)}<span>${label}</span></a>`).join("");
  $("#sideNav").innerHTML = links;
  $("#bnav").innerHTML = links;
  $("#topNav").innerHTML = NAV.slice(1).map(([href, label]) => `<a href="${href}">${label}</a>`).join("") + `<button class="editor-btn" type="button" data-desk>Editor</button>`;
  const spy = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    const href = en.target.classList.contains("hero") ? "#top" : "#" + en.target.id;
    document.querySelectorAll(".side-nav a, .bnav a, .top-nav a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === href));
  }), { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll(".hero, #stories, #crew, #contact").forEach(s => spy.observe(s));
}

/* ---------- glass that catches the light under the pointer ---------- */
if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
  let lit = null;
  document.addEventListener("pointermove", e => {
    const card = e.target.closest?.(".glass-card");
    if (lit && lit !== card) lit.classList.remove("lit");
    lit = card; if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", e.clientX - r.left + "px");
    card.style.setProperty("--my", e.clientY - r.top + "px");
    card.classList.add("lit");
  }, { passive: true });
}

/* ---------- the TV-headed people floating down the background ---------- */
function figures() {
  const HEAD = `<rect class="screen-glow" x="18" y="15" width="24" height="16" rx="2"/><rect x="15" y="12" width="30" height="22" rx="3"/><path d="M22 12 14 2M38 12l8-10"/>`;
  const POSES = [
    "M30 34v36M30 45 10 30M30 45l18 10M30 70 14 96M30 70l16 26",
    "M30 34v36M30 45l25-5M30 45 15 60M30 70 18 96M30 70l12 26",
    "M30 34v34M30 42 10 50M30 42l22-7M30 68 10 90M30 68l18 30",
    "M30 34v36M30 40 12 10M30 40l18-30M30 70 16 96M30 70l14 26",
    "M30 34v36M30 42l12-24M30 42 14 55M30 70 18 96M30 70l12 26"
  ];
  const count = innerWidth < 720 ? 9 : 16;
  $("#figures").innerHTML = Array.from({ length: count }, (_, i) => {
    const left = (i / count) * 100 + Math.random() * (100 / count);
    const w = 30 + Math.random() * 28, dur = 16 + Math.random() * 15, delay = -Math.random() * dur;
    const mic = i % POSES.length === 4 ? `<circle cx="42" cy="14" r="4"/>` : "";
    return `<svg viewBox="0 0 60 100" data-c="${i % BARS}" style="left:${left}%;width:${w}px;animation-duration:${dur}s;animation-delay:${delay}s">${HEAD}<path d="${POSES[i % POSES.length]}"/>${mic}</svg>`;
  }).join("");
}

/* ---------- power-on ---------- */
const tv = $("#tv");
function powerSound() {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const ac = new AC(), t = ac.currentTime, out = ac.createGain();
  out.gain.value = .5; out.connect(ac.destination);

  const thunk = ac.createOscillator(), tg = ac.createGain();
  thunk.frequency.setValueAtTime(140, t); thunk.frequency.exponentialRampToValueAtTime(38, t + .35);
  tg.gain.setValueAtTime(.0001, t); tg.gain.exponentialRampToValueAtTime(.8, t + .02); tg.gain.exponentialRampToValueAtTime(.0001, t + .5);
  thunk.connect(tg).connect(out); thunk.start(t); thunk.stop(t + .6);

  const whine = ac.createOscillator(), wg = ac.createGain();
  whine.frequency.setValueAtTime(6000, t + .3); whine.frequency.linearRampToValueAtTime(9500, t + 1.2);
  wg.gain.setValueAtTime(.0001, t + .3); wg.gain.exponentialRampToValueAtTime(.025, t + 1); wg.gain.exponentialRampToValueAtTime(.0001, t + 3.6);
  whine.connect(wg).connect(out); whine.start(t + .3); whine.stop(t + 3.8);

  const len = ac.sampleRate * 2.8, buf = ac.createBuffer(1, len, ac.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const hiss = ac.createBufferSource(), band = ac.createBiquadFilter(), hg = ac.createGain();
  hiss.buffer = buf; band.type = "bandpass"; band.frequency.value = 2400; band.Q.value = .6;
  hg.gain.setValueAtTime(.0001, t);
  [[1.1, .32], [1.4, .08], [1.7, .36], [2, .06], [2.4, .34], [2.8, .1], [3.2, .28], [3.55, .0001]].forEach(([at, v]) => hg.gain.setValueAtTime(v, t + at));
  hiss.connect(band).connect(hg).connect(out); hiss.start(t + 1); hiss.stop(t + 3.8);

  // the test-card tone while the colour bars are up
  const tone = ac.createOscillator(), og = ac.createGain();
  tone.frequency.value = 1000;
  og.gain.setValueAtTime(.0001, t + 3.7); og.gain.exponentialRampToValueAtTime(.06, t + 3.75); og.gain.setValueAtTime(.06, t + 4.45); og.gain.exponentialRampToValueAtTime(.0001, t + 4.55);
  tone.connect(og).connect(out); tone.start(t + 3.7); tone.stop(t + 4.6);

  setTimeout(() => ac.close(), 7000);
}
function powerOn() {
  if (tv.classList.contains("on")) return;
  tv.classList.add("on");
  try { powerSound(); } catch (e) {}
  store.set("eis-tuned", "1", sessionStorage);
  setTimeout(() => { tv.remove(); document.body.classList.remove("tuning"); }, 6400);
}

/* ---------- a few things for people who go looking ---------- */
function easterEggs() {
  const M = D.settings.mystery || {};
  if (!M.on) return;
  if (M.console) console.log(`%c${M.console}`, "font: 13px/1.6 monospace; color: #22B5C2; padding: 10px 0");
  let taps = 0, timer;
  $("#sideLogo").addEventListener("click", e => {
    taps++; clearTimeout(timer); timer = setTimeout(() => taps = 0, 1200);
    if (taps === 5) { e.preventDefault(); taps = 0; document.body.classList.add("glitch"); setTimeout(() => { document.body.classList.remove("glitch"); location.hash = "#case"; }, 700); }
  });
}

let toastTimer;
function toast(text, bad) {
  const t = $("#toast");
  t.textContent = text; t.className = "toast" + (bad ? " bad" : ""); t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 3200);
}

async function refresh() {
  await load();
  render();
}

(async () => {
  if (store.get("eis-tuned", sessionStorage) === "1" || location.hash) tv.remove();
  else { document.body.classList.add("tuning"); tv.addEventListener("click", powerOn); tv.focus(); }
  paintTheme();
  menus();
  figures();
  await load();
  render();
  route();
  easterEggs();
  document.dispatchEvent(new Event("now:ready"));
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js");
})();

return { $, esc, ic, rpc, online, get D() { return D; }, refresh, toast, store, paras, BARS };
})();
