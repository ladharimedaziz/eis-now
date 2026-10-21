// The editor's desk: unlock with the editor code, then change anything on the site.
(() => {
const { $, esc, ic, rpc, toast, store } = NOW;
const desk = $("#desk");
const CODE_KEY = "eis-code";
let code = store.get(CODE_KEY, sessionStorage) || "";
let tab = "stories", editing = null, caseBody = "";

const ERR = {
  badcode: "That code isn't right.",
  locked: "Too many wrong codes. Try again in 15 minutes.",
  notitle: "The story needs a headline.",
  shortcode: "The new code needs at least 8 characters.",
  offline: "The site isn't connected to the database yet.",
  http: "Couldn't reach the database. Check the connection and try again."
};
const why = e => ERR[e.code] || e.message || "Something went wrong.";

function shell(inner, wide) {
  desk.innerHTML = `
    <div class="sheet-shade" data-desk-close></div>
    <section class="sheet-card desk-card${wide ? " wide" : ""}" role="dialog" aria-modal="true" aria-label="Editor">
      <button class="sheet-x" type="button" data-desk-close aria-label="Close">&times;</button>
      ${inner}
    </section>`;
  desk.hidden = false;
  document.body.classList.add("sheet-open");
}
function close() {
  desk.hidden = true; desk.innerHTML = "";
  if ($("#reader").hidden && $("#case").hidden) document.body.classList.remove("sheet-open");
}

/* ---------- the code screen ---------- */
function gate(msg = "") {
  shell(`
    <div class="gate">
      <span class="gate-ic">${ic("lock")}</span>
      <h2>Editor</h2>
      <p>Enter the editor code to post and change stories.</p>
      ${NOW.online ? "" : `<p class="desk-warn">${ERR.offline}</p>`}
      <form id="gateForm" autocomplete="off">
        <input id="gateCode" class="code-input" type="password" placeholder="Editor code" aria-label="Editor code" autocapitalize="characters" spellcheck="false">
        <button class="btn solid" type="submit">Unlock</button>
      </form>
      <p class="desk-err" id="gateErr" role="alert">${esc(msg)}</p>
    </div>`);
  $("#gateCode").focus();
  $("#gateForm").addEventListener("submit", async e => {
    e.preventDefault();
    const tryCode = $("#gateCode").value.trim(); if (!tryCode) return;
    const btn = e.submitter; btn.disabled = true;
    try {
      const out = await rpc("eis_check", { code: tryCode });
      code = tryCode; caseBody = out.case || "";
      store.set(CODE_KEY, code, sessionStorage);
      open();
    } catch (err) {
      $("#gateErr").textContent = why(err);
      $(".gate").classList.remove("shake"); void $(".gate").offsetWidth; $(".gate").classList.add("shake");
    } finally { btn.disabled = false; }
  });
}

async function save(fn, args, okText) {
  try {
    const out = await rpc(fn, { code, ...args });
    await NOW.refresh();
    toast(okText);
    return out;
  } catch (err) {
    if (err.code === "badcode" || err.code === "locked") { code = ""; store.set(CODE_KEY, null, sessionStorage); gate(why(err)); }
    else toast(why(err), true);
    throw err;
  }
}

/* ---------- the desk ---------- */
const TABS = [["stories", "Stories"], ["issue", "Issue"], ["ticker", "Ticker"], ["crew", "Crew"], ["mystery", "Mystery"], ["code", "Code"]];

function open() {
  if (!code) return gate();
  shell(`
    <header class="desk-head">
      <h2>${ic("pen")} Editor's desk</h2>
      <button class="chip" type="button" id="lockBtn">${ic("lock")} Lock</button>
    </header>
    <nav class="desk-tabs" role="tablist">${TABS.map(([k, label]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === tab}">${label}</button>`).join("")}</nav>
    <div class="desk-body" id="deskBody"></div>`, true);
  $("#lockBtn").addEventListener("click", () => { code = ""; store.set(CODE_KEY, null, sessionStorage); close(); toast("Editor locked."); });
  desk.querySelector(".desk-tabs").addEventListener("click", e => {
    const b = e.target.closest("[data-tab]"); if (!b) return;
    tab = b.dataset.tab; editing = null;
    desk.querySelectorAll("[data-tab]").forEach(x => x.setAttribute("aria-selected", x === b));
    paint();
  });
  paint();
}

function paint() {
  const old = $("#deskBody"); if (!old) return;
  const body = old.cloneNode(false);
  old.replaceWith(body);
  ({ stories: storiesTab, issue: issueTab, ticker: tickerTab, crew: crewTab, mystery: mysteryTab, code: codeTab })[tab](body);
}

const field = (id, label, value = "", attrs = "") => `<label class="f"><span>${label}</span><input id="${id}" value="${esc(value)}" ${attrs}></label>`;
const area = (id, label, value = "", rows = 4, note = "") => `<label class="f"><span>${label}</span><textarea id="${id}" rows="${rows}">${esc(value)}</textarea>${note ? `<small>${note}</small>` : ""}</label>`;
const val = id => $("#" + id).value;

/* stories */
function storiesTab(body) {
  if (editing) return storyForm(body);
  const list = NOW.D.stories;
  body.innerHTML = `
    <div class="desk-row"><p class="desk-note">${list.length} stories. The front page story shows first and biggest.</p>
      <button class="btn solid" type="button" id="newStory">${ic("plus")} New story</button></div>
    <ul class="desk-list">${list.map(s => `
      <li><button type="button" data-edit="${s.id}">
        ${s.thumb ? `<img src="${s.thumb}" alt="">` : `<span class="no-pic">${ic("news")}</span>`}
        <span><b>${esc(s.title)}</b><small>${esc(s.section)} · ${esc(s.author)} · ${esc(s.date)}${s.front ? " · <em>Front page</em>" : ""}${s.clue ? " · clue" : ""}</small></span>
      </button></li>`).join("")}</ul>`;
  $("#newStory").addEventListener("click", () => { editing = { id: "", section: "", title: "", summary: "", author: "", date: new Date().toISOString().slice(0, 10), body: "", clue: "", front: false }; paint(); });
  body.querySelector(".desk-list").addEventListener("click", e => {
    const b = e.target.closest("[data-edit]"); if (!b) return;
    editing = structuredClone(NOW.D.stories.find(s => String(s.id) === b.dataset.edit)); paint();
  });
}

function storyForm(body) {
  const s = editing, sections = [...new Set(NOW.D.stories.map(x => x.section))];
  let pic;   // undefined: unchanged, "": removed, {image, thumb}: new
  body.innerHTML = `
    <button class="link-back" type="button" id="backList">&larr; All stories</button>
    <form class="desk-form" id="storyForm">
      ${field("sTitle", "Headline", s.title, 'required maxlength="160"')}
      <div class="f2">
        ${field("sSection", "Section", s.section, 'list="sectionList" placeholder="Sport, Events…"')}
        ${field("sDate", "Date", s.date, 'type="date"')}
      </div>
      <datalist id="sectionList">${sections.map(x => `<option value="${esc(x)}">`).join("")}</datalist>
      ${field("sAuthor", "Written by", s.author)}
      ${area("sSummary", "Summary on the card", s.summary, 2)}
      ${area("sBody", "Full story", s.body, 10, "Leave an empty line between paragraphs.")}
      <div class="f"><span>Photo</span>
        <div class="pic-pick">
          <div class="pic-preview" id="picPrev">${s.thumb ? `<img src="${s.thumb}" alt="">` : ic("photo")}</div>
          <label class="btn glass">${ic("photo")} Choose photo<input type="file" id="sPic" accept="image/*" hidden></label>
          <button class="btn glass" type="button" id="picRemove"${s.thumb ? "" : " hidden"}>Remove</button>
        </div>
      </div>
      <label class="check"><input type="checkbox" id="sFront"${s.front ? " checked" : ""}> Front page story</label>
      ${area("sClue", "Hidden clue (mystery)", s.clue, 2, "Invisible on the page. People only find it by selecting the text at the end of the story or reading the page source.")}
      <div class="desk-actions">
        <button class="btn solid" type="submit">${s.id ? "Save changes" : "Post story"}</button>
        ${s.id ? `<button class="btn danger" type="button" id="delStory">${ic("trash")} Delete</button>` : ""}
      </div>
    </form>`;
  $("#backList").addEventListener("click", () => { editing = null; paint(); });
  $("#sPic").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      pic = { image: await shrink(f, 1400, .82), thumb: await shrink(f, 560, .76) };
      $("#picPrev").innerHTML = `<img src="${pic.thumb}" alt="">`; $("#picRemove").hidden = false;
    } catch (err) { toast("That file couldn't be read as a picture.", true); }
  });
  $("#picRemove").addEventListener("click", () => { pic = ""; $("#picPrev").innerHTML = ic("photo"); $("#picRemove").hidden = true; });
  let armed = false;
  $("#delStory")?.addEventListener("click", async e => {
    if (!armed) { armed = true; e.currentTarget.textContent = "Tap again to delete"; setTimeout(() => { armed = false; const b = $("#delStory"); if (b) b.innerHTML = `${ic("trash")} Delete`; }, 3000); return; }
    try { await save("eis_delete_story", { story: s.id }, "Story deleted."); editing = null; paint(); } catch (err) {}
  });
  $("#storyForm").addEventListener("submit", async e => {
    e.preventDefault();
    const story = { id: s.id, title: val("sTitle"), section: val("sSection"), date: val("sDate"), author: val("sAuthor"), summary: val("sSummary"), body: val("sBody"), clue: val("sClue"), front: $("#sFront").checked };
    if (pic === "") Object.assign(story, { image: "", thumb: "" });
    else if (pic) Object.assign(story, pic);
    const btn = e.submitter; btn.disabled = true; btn.textContent = "Saving…";
    try { await save("eis_save_story", { story }, s.id ? "Story saved." : "Story posted."); editing = null; paint(); }
    catch (err) { btn.disabled = false; btn.textContent = s.id ? "Save changes" : "Post story"; }
  });
}

// photos are shrunk on the device before upload so the page stays quick
function shrink(file, max, quality) {
  return new Promise((ok, fail) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = fail;
    img.src = url;
  });
}

/* issue, hero and contact */
function issueTab(body) {
  const S = NOW.D.settings, i = S.issue || {}, h = S.hero || {}, c = S.contact || {};
  body.innerHTML = `
    <form class="desk-form" id="issueForm">
      <h3>This issue</h3>
      <div class="f3">${field("iNum", "Issue number", i.number, 'type="number" min="1"')}${field("iMonth", "Month", i.month)}${field("iChan", "Channel tag", i.channel)}</div>
      <h3>Top of the page</h3>
      <div class="f2">${field("hTitle", "Big title", h.title)}${field("hHigh", "Colour-bar line", h.highlight)}</div>
      ${area("hLede", "Line under the title", h.lede, 2)}
      <h3>Contact</h3>
      ${area("cText", "Story tip text", c.text, 2)}
      ${field("cEmail", "Tip email", c.email, 'type="email"')}
      <div class="desk-actions"><button class="btn solid" type="submit">Save</button></div>
    </form>`;
  $("#issueForm").addEventListener("submit", async e => {
    e.preventDefault();
    try {
      await rpc("eis_save_setting", { code, key: "issue", value: { number: +val("iNum") || 1, month: val("iMonth"), channel: val("iChan") } });
      await rpc("eis_save_setting", { code, key: "hero", value: { title: val("hTitle"), highlight: val("hHigh"), lede: val("hLede") } });
      await save("eis_save_setting", { key: "contact", value: { text: val("cText"), email: val("cEmail") } }, "Saved.");
    } catch (err) { if (err.code !== "badcode" && err.code !== "locked") toast(why(err), true); }
  });
}

/* ticker */
function tickerTab(body) {
  body.innerHTML = `
    <form class="desk-form" id="tickForm">
      ${area("tLines", "Headlines", (NOW.D.settings.ticker || []).join("\n"), 8, "One headline per line. They scroll across the top of the page.")}
      <div class="desk-actions"><button class="btn solid" type="submit">Save ticker</button></div>
    </form>`;
  $("#tickForm").addEventListener("submit", async e => {
    e.preventDefault();
    const lines = val("tLines").split("\n").map(l => l.trim()).filter(Boolean);
    try { await save("eis_save_setting", { key: "ticker", value: lines }, "Ticker saved."); } catch (err) {}
  });
}

/* crew */
function crewTab(body) {
  let crew = structuredClone(NOW.D.settings.crew || []);
  const draw = () => {
    body.innerHTML = `
      <form class="desk-form" id="crewForm">
        <div class="crew-rows">${crew.map((m, i) => `
          <div class="crew-row" data-i="${i}">
            <div class="f3">${field("cr" + i, "Role", m.role)}${field("cn" + i, "Name", m.name)}${field("ca" + i, "About", m.about)}</div>
            <div class="row-tools">
              <button type="button" class="icon-btn" data-move="-1" aria-label="Move up"${i ? "" : " disabled"}>${ic("up")}</button>
              <button type="button" class="icon-btn" data-move="1" aria-label="Move down"${i < crew.length - 1 ? "" : " disabled"}>${ic("down")}</button>
              <button type="button" class="icon-btn" data-remove aria-label="Remove">${ic("trash")}</button>
            </div>
          </div>`).join("")}</div>
        <div class="desk-actions">
          <button class="btn glass" type="button" id="addMember">${ic("plus")} Add person</button>
          <button class="btn solid" type="submit">Save crew</button>
        </div>
      </form>`;
  };
  const read = () => { crew = crew.map((_, i) => ({ role: val("cr" + i), name: val("cn" + i), about: val("ca" + i) })); };
  draw();
  body.addEventListener("click", e => {
    const row = e.target.closest(".crew-row");
    if (e.target.closest("#addMember")) { read(); crew.push({ role: "", name: "", about: "" }); draw(); return; }
    if (!row) return;
    const i = +row.dataset.i;
    if (e.target.closest("[data-remove]")) { read(); crew.splice(i, 1); draw(); }
    const mv = e.target.closest("[data-move]");
    if (mv) { read(); const j = i + +mv.dataset.move; [crew[i], crew[j]] = [crew[j], crew[i]]; draw(); }
  });
  body.addEventListener("submit", async e => {
    e.preventDefault(); read();
    try { await save("eis_save_setting", { key: "crew", value: crew.filter(m => m.name.trim()) }, "Crew saved."); } catch (err) {}
  });
}

/* the mystery */
function mysteryTab(body) {
  const M = NOW.D.settings.mystery || {};
  body.innerHTML = `
    <form class="desk-form" id="mysForm">
      <label class="check"><input type="checkbox" id="mOn"${M.on ? " checked" : ""}> Mystery switched on</label>
      <p class="desk-note">How it works: the signal scrolls in the ticker among the headlines. The console message shows for anyone who opens the browser's developer tools. Each story can carry a hidden clue (set it on the story). Whoever pieces the password together opens the case file at <b>${esc(location.origin + location.pathname)}#case</b>. Five quick taps on the logo in the side menu also lead there.</p>
      ${field("mSignal", "Signal in the ticker", M.signal)}
      ${area("mConsole", "Console message", M.console, 3)}
      ${field("mHint", "Hint on the case file lock", M.hint)}
      <h3>Case file</h3>
      ${area("mCase", "What players see when they get in", caseBody, 8)}
      ${field("mPass", "New password", "", 'placeholder="Leave empty to keep the current one" autocomplete="off"')}
      <small class="desk-note">Capitals don't matter for the password.</small>
      <div class="desk-actions"><button class="btn solid" type="submit">Save mystery</button></div>
    </form>`;
  $("#mysForm").addEventListener("submit", async e => {
    e.preventDefault();
    try {
      await rpc("eis_save_case", { code, body: val("mCase"), password: val("mPass") });
      caseBody = val("mCase");
      await save("eis_save_setting", { key: "mystery", value: { on: $("#mOn").checked, signal: val("mSignal"), console: val("mConsole"), hint: val("mHint") } }, val("mPass") ? "Mystery saved, new password set." : "Mystery saved.");
      $("#mPass").value = "";
    } catch (err) { if (err.code !== "badcode" && err.code !== "locked") toast(why(err), true); }
  });
}

/* changing the editor code */
function codeTab(body) {
  body.innerHTML = `
    <form class="desk-form" id="codeForm" autocomplete="off">
      <p class="desk-note">Anyone with the code can change the site. Change it if it gets passed around.</p>
      ${field("nc1", "New code", "", 'type="password" minlength="8"')}
      ${field("nc2", "New code again", "", 'type="password" minlength="8"')}
      <div class="desk-actions"><button class="btn solid" type="submit">Change code</button></div>
    </form>`;
  $("#codeForm").addEventListener("submit", async e => {
    e.preventDefault();
    if (val("nc1") !== val("nc2")) return toast("The two codes don't match.", true);
    try {
      await save("eis_change_code", { new_code: val("nc1") }, "Code changed. Use the new one from now on.");
      code = val("nc1").trim(); store.set(CODE_KEY, code, sessionStorage);
      e.target.reset();
    } catch (err) {}
  });
}

document.addEventListener("click", e => {
  if (e.target.closest("[data-desk]")) { e.preventDefault(); code ? (async () => { try { caseBody = (await rpc("eis_check", { code })).case || ""; open(); } catch (err) { code = ""; gate(); } })() : gate(); }
  if (e.target.closest("[data-desk-close]")) close();
});
addEventListener("keydown", e => { if (e.key === "Escape" && !desk.hidden) close(); });
if (location.hash === "#editor") document.addEventListener("now:ready", () => gate());
})();
