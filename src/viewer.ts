/**
 * Waris Web: open a Waris family file in the browser (for iPhone users and computers) and look
 * through it: the tree, search, a person's details, and how two people are related.
 * The file is read on this device only. Nothing is uploaded anywhere.
 */
import { parseBackup } from "../../waris-geneology-v2/lib/backup";
import { type ChartPhotos, treeSvg } from "../../waris-geneology-v2/lib/chart";
import { FamilyGraph } from "../../waris-geneology-v2/lib/graph";
import { type Kin, relationSummary, relationText, type RelationText } from "../../waris-geneology-v2/lib/kinship";
import { layoutTree, type TreeLayout } from "../../waris-geneology-v2/lib/layout";
import { cardName, fullName, type FamilySnapshot, type Person } from "../../waris-geneology-v2/lib/model";
import { demoSnapshot } from "./demo";

type Lang = "ms" | "en";

const T = {
  ms: {
    open: "Buka fail keluarga",
    demo: "Cuba contoh keluarga",
    intro: "Buka fail Waris yang dikongsi dengan anda (dari WhatsApp, Telegram atau Fail) untuk melihat salasilah keluarga.",
    private: "Fail dibuka dalam peranti ini sahaja. Tiada apa-apa dimuat naik.",
    search: "Cari nama…",
    living: "Masih hidup",
    deceased: "Meninggal dunia",
    born: "Lahir",
    died: "Meninggal",
    place: "Tempat",
    parents: "Ibu bapa",
    spouses: "Pasangan",
    children: "Anak",
    siblings: "Adik-beradik",
    centre: "Jadikan tengah",
    relate: "Hubungan dengan…",
    pickOther: "Pilih orang kedua",
    meet: "Mereka bertemu di",
    shared: "Leluhur bersama",
    gensUp: (n: number) => `${n} generasi ke atas`,
    sentence: (a: string, b: string, rel: string) => `${b} ialah ${rel} kepada ${a}`,
    notRelated: "Tiada hubungan ditemui dalam fail ini",
    people: (n: number) => `${n} orang`,
    hint: "Ketik seseorang untuk jadikan tengah. Ketik orang di tengah untuk butiran.",
    close: "Tutup",
    fit: "Muat skrin",
    other: "Buka fail lain",
    bad: "Fail ini bukan fail Waris yang sah.",
    photosOff: "Fail ini dikongsi tanpa gambar.",
  },
  en: {
    open: "Open family file",
    demo: "Try an example family",
    intro: "Open a Waris file someone shared with you (from WhatsApp, Telegram or Files) to see the family tree.",
    private: "The file is opened on this device only. Nothing is uploaded.",
    search: "Search a name…",
    living: "Living",
    deceased: "Deceased",
    born: "Born",
    died: "Died",
    place: "Place",
    parents: "Parents",
    spouses: "Spouses",
    children: "Children",
    siblings: "Siblings",
    centre: "Put in the centre",
    relate: "Relationship with…",
    pickOther: "Pick the second person",
    meet: "Where they meet",
    shared: "Shared ancestor",
    gensUp: (n: number) => `${n} generation${n === 1 ? "" : "s"} up`,
    sentence: (a: string, b: string, rel: string) => `${b} is ${a}'s ${rel}`,
    notRelated: "No relationship found in this file",
    people: (n: number) => `${n} people`,
    hint: "Tap someone to put them in the centre. Tap the centre person for details.",
    close: "Close",
    fit: "Fit to screen",
    other: "Open another file",
    bad: "This is not a valid Waris file.",
    photosOff: "This file was shared without photos.",
  },
};

let lang: Lang = "ms";
try {
  lang = (localStorage.getItem("waris-lang") as Lang) || "ms";
} catch {
  /* private mode */
}
const tr = () => T[lang];

const $ = <E extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as E;
const el = (tag: string, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

// ---------- state ----------
let graph: FamilyGraph | null = null;
let photos: ChartPhotos = {};
let focusId = "";
let layout: TreeLayout | null = null;
let view = { x: 0, y: 0, s: 1 };
let picking: string | null = null; // choosing the second person for "relationship with…"

const life = (p: Person) => {
  const b = p.birthDate?.slice(0, 4);
  const d = p.deathDate?.slice(0, 4);
  if (p.living) return b ? `${b}–${tr().living}` : tr().living;
  if (b || d) return `${b ?? "?"}–${d ?? "?"}`;
  return tr().deceased;
};

function load(snapshot: FamilySnapshot, pics: ChartPhotos, note?: string) {
  graph = new FamilyGraph(snapshot);
  photos = pics;
  const first = snapshot.homePersonId && graph.get(snapshot.homePersonId) ? snapshot.homePersonId : snapshot.persons[0]?.id;
  if (!first) return showError(tr().bad);
  $("#start").hidden = true;
  $("#app").hidden = false;
  $("#family").textContent = snapshot.familyName || "Waris";
  $("#count").textContent = tr().people(graph.size) + (note ? ` · ${note}` : "");
  setFocus(first, true);
}

function showError(msg: string) {
  const e = $("#error");
  e.textContent = msg;
  e.hidden = false;
}

async function openFile(file: File) {
  try {
    const parsed = parseBackup(await file.text());
    const pics: ChartPhotos = {};
    for (const p of parsed.data.persons) {
      const b64 = p.photo ? parsed.photos[p.photo] : undefined;
      if (b64) pics[p.id] = `data:image/jpeg;base64,${b64}`;
      else if (parsed.legacyPhotos[p.id]?.startsWith("data:")) pics[p.id] = parsed.legacyPhotos[p.id];
    }
    const none = parsed.data.persons.some((p) => p.photo) && !Object.keys(pics).length;
    load(parsed.data, pics, none ? tr().photosOff : undefined);
  } catch {
    showError(tr().bad);
  }
}

// ---------- tree ----------
function setFocus(id: string, fit = false) {
  if (!graph) return;
  focusId = id;
  layout = layoutTree(graph, id, { up: 2, down: 2, showAdd: false });
  drawTree(fit);
}

function drawTree(fit: boolean) {
  if (!graph || !layout) return;
  const stage = $("#stage");
  const canvas = $("#canvas");
  canvas.innerHTML = treeSvg(layout, photos, { kicker: "", title: "", footer: "", life, deceased: tr().deceased });
  const svg = canvas.querySelector("svg")!;
  svg.setAttribute("width", String(layout.width));
  svg.setAttribute("height", String(layout.height));
  canvas.style.width = `${layout.width}px`;
  canvas.style.height = `${layout.height}px`;
  // a real button over every person, so taps and keyboards both work
  for (const k of layout.cards) {
    if (!k.person) continue;
    const b = el("button", `hit${k.focus ? " focus" : ""}`);
    b.style.left = `${k.x}px`;
    b.style.top = `${k.y}px`;
    b.style.width = `${k.w}px`;
    b.style.height = `${k.h}px`;
    b.setAttribute("aria-label", fullName(k.person));
    const pid = k.person.id;
    b.addEventListener("click", (e) => {
      if (moved) return e.preventDefault();
      if (picking) return showRelation(picking, pid);
      if (pid === focusId) openProfile(pid);
      else setFocus(pid);
    });
    canvas.appendChild(b);
  }
  const focus = layout.cards.find((k) => k.focus)!;
  const W = stage.clientWidth;
  const H = stage.clientHeight;
  if (fit) {
    const s = Math.min(1, Math.max(0.35, Math.min(W / layout.width, H / layout.height) * 0.95));
    view = { s, x: (W - layout.width * s) / 2, y: Math.max(8, (H - layout.height * s) / 2) };
  } else {
    // keep the scale, bring the new centre person into the middle
    view.x = W / 2 - (focus.x + focus.w / 2) * view.s;
    view.y = H / 2 - (focus.y + focus.h / 2) * view.s;
  }
  apply();
}

const apply = () => {
  $("#canvas").style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
};

function zoomAt(f: number, cx: number, cy: number) {
  const s = Math.min(2.5, Math.max(0.2, view.s * f));
  view.x = cx - (cx - view.x) * (s / view.s);
  view.y = cy - (cy - view.y) * (s / view.s);
  view.s = s;
  apply();
}

// drag and pinch
let moved = false;
const pointers = new Map<number, { x: number; y: number }>();
let pinch0 = 0;
function setupGestures() {
  const stage = $("#stage");
  stage.addEventListener("pointerdown", (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  stage.addEventListener("pointermove", (e) => {
    const last = pointers.get(e.pointerId);
    if (!last) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      if (Math.abs(dx) + Math.abs(dy) > 0) {
        if (!moved && Math.hypot(dx, dy) < 2) return;
        moved = true;
        stage.setPointerCapture(e.pointerId);
        view.x += dx;
        view.y += dy;
        apply();
      }
    } else if (pointers.size === 2) {
      moved = true;
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = stage.getBoundingClientRect();
      if (pinch0) zoomAt(d / pinch0, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pinch0 = d;
    }
  });
  const up = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch0 = 0;
  };
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    },
    { passive: false },
  );
}

// ---------- search ----------
function setupSearch() {
  const input = $<HTMLInputElement>("#search");
  const list = $("#results");
  input.addEventListener("input", () => {
    list.innerHTML = "";
    const q = input.value.trim().toLowerCase();
    if (!graph || q.length < 2) return (list.hidden = true);
    const hits = graph.snapshot.persons.filter((p) => fullName(p).toLowerCase().includes(q) || (p.nickname ?? "").toLowerCase().includes(q)).slice(0, 30);
    for (const p of hits) {
      const b = el("button", "result");
      b.append(el("strong", "", fullName(p)), el("span", "muted", ` · ${life(p)}`));
      b.addEventListener("click", () => {
        list.hidden = true;
        input.value = "";
        if (picking) showRelation(picking, p.id);
        else setFocus(p.id);
      });
      list.appendChild(b);
    }
    list.hidden = !hits.length;
  });
}

// ---------- profile and relationships ----------
function personRow(p: Person) {
  const b = el("button", "row");
  const img = photos[p.id];
  const av = el("span", `av ${p.sex}`);
  if (img) av.style.backgroundImage = `url("${img}")`;
  else av.textContent = p.givenName.charAt(0).toUpperCase();
  const txt = el("span", "rowtext");
  txt.append(el("strong", "", fullName(p)), el("span", "muted", life(p)));
  b.append(av, txt);
  b.addEventListener("click", () => {
    closeSheet();
    setFocus(p.id);
  });
  return b;
}

function openSheet(build: (body: HTMLElement) => void) {
  const body = $("#sheetBody");
  body.innerHTML = "";
  build(body);
  $("#sheet").hidden = false;
  $("#sheet").scrollTop = 0;
}
const closeSheet = () => ($("#sheet").hidden = true);

function openProfile(id: string) {
  const g = graph!;
  const p = g.get(id)!;
  openSheet((body) => {
    const head = el("div", "phead");
    const img = photos[p.id];
    const big = el("div", `portrait ${p.sex}`);
    if (img) big.style.backgroundImage = `url("${img}")`;
    else big.textContent = p.givenName.charAt(0).toUpperCase();
    const names = el("div");
    names.append(el("h2", "", [p.prefix, cardName(p)[0]].filter(Boolean).join(" ")), el("p", "muted", cardName(p)[1]), el("p", "", life(p)));
    head.append(big, names);
    body.append(head);
    const facts = el("dl", "facts");
    const fact = (k: string, v?: string) => {
      if (!v) return;
      facts.append(el("dt", "", k), el("dd", "", v));
    };
    fact(tr().born, [p.birthDate, p.birthPlace].filter(Boolean).join(" · "));
    if (!p.living) fact(tr().died, [p.deathDate, p.deathPlace].filter(Boolean).join(" · "));
    if (facts.childElementCount) body.append(facts);
    if (p.notes) body.append(el("p", "notes", p.notes));
    const group = (title: string, people: Person[]) => {
      if (!people.length) return;
      body.append(el("h3", "", title));
      for (const x of people) body.append(personRow(x));
    };
    group(tr().parents, g.parents(id));
    group(tr().spouses, g.partners(id));
    group(tr().children, g.children(id));
    group(
      tr().siblings,
      g.siblings(id).map((s) => s.person),
    );
    const rel = el("button", "primary", tr().relate);
    rel.addEventListener("click", () => {
      picking = id;
      closeSheet();
      $("#picking").hidden = false;
      $("#pickingText").textContent = `${tr().pickOther}: ${p.givenName}`;
      $<HTMLInputElement>("#search").focus();
    });
    body.append(rel);
  });
}

const kinWord = (k: Kin) => (lang === "ms" ? (k.call ?? k.bm) : k.en);
function headline(a: Person, b: Person, r: RelationText | null) {
  if (!r) return null;
  if (r.direct.length) return tr().sentence(a.givenName, b.givenName, r.direct.map(kinWord).join(" · "));
  if (r.via) return tr().sentence(a.givenName, b.givenName, lang === "ms" ? r.via.bm : r.via.en);
  return null;
}

function showRelation(aId: string, bId: string) {
  picking = null;
  $("#picking").hidden = true;
  const g = graph!;
  const a = g.get(aId)!;
  const b = g.get(bId)!;
  const ab = relationText(g, aId, bId);
  const ba = relationText(g, bId, aId);
  const s = relationSummary(g, aId, bId);
  openSheet((body) => {
    const pair = el("div", "pair");
    for (const x of [a, b]) {
      const c = el("div", "paircard");
      const img = photos[x.id];
      const ph = el("div", `portrait ${x.sex}`);
      if (img) ph.style.backgroundImage = `url("${img}")`;
      else ph.textContent = x.givenName.charAt(0).toUpperCase();
      c.append(ph, el("strong", "", cardName(x)[0]), el("span", "muted", cardName(x)[1]));
      pair.append(c);
    }
    body.append(pair);
    const hero = el("div", "hero");
    const line = headline(a, b, ab);
    hero.append(el("div", "kicker", lang === "ms" ? "HUBUNGAN MEREKA" : "HOW THEY'RE RELATED"), el("div", "big", line ?? tr().notRelated));
    if (ab?.direct[0]) hero.append(el("div", "small", lang === "ms" ? ab.direct[0].en : ab.direct[0].bm));
    body.append(hero);
    const anc = s.common.find((x) => x.sex === "male") ?? s.common[0];
    if (s.blood && s.blood.up > 0 && s.blood.down > 0 && anc && s.commonToA && s.commonToB) {
      body.append(el("h3", "", tr().meet));
      const m = el("div", "meet");
      m.append(personRow(anc));
      const boxes = el("div", "boxes");
      for (const [who, kin, n] of [
        [a, s.commonToA, s.blood.up],
        [b, s.commonToB, s.blood.down],
      ] as [Person, Kin, number][]) {
        const bx = el("div", "box");
        const word = n >= 4 ? (lang === "ms" ? "Leluhur" : "Ancestor") : (lang === "ms" ? kin.bm : kin.en).replace(/ (lelaki|perempuan)$/, "");
        bx.append(el("strong", "", who.givenName), el("span", "kin", word.charAt(0).toUpperCase() + word.slice(1)), el("span", "dots", "●".repeat(Math.min(n, 6)) + (n > 6 ? ` +${n - 6}` : "")), el("span", "muted", tr().gensUp(n)));
        boxes.append(bx);
      }
      m.append(boxes);
      body.append(m);
    }
    const back = headline(b, a, ba);
    if (back) body.append(el("p", "reverse", back));
  });
}

// ---------- language ----------
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((e) => {
    const v = tr()[e.dataset.t as keyof (typeof T)["ms"]];
    if (typeof v === "string") e.textContent = v;
  });
  $<HTMLInputElement>("#search").placeholder = tr().search;
  $("#langBtn").textContent = lang === "ms" ? "EN" : "BM";
  if (graph) {
    $("#count").textContent = tr().people(graph.size);
    drawTree(false);
  }
}

// ---------- start ----------
function start() {
  const input = $<HTMLInputElement>("#file");
  document.querySelectorAll(".openBtn").forEach((b) => b.addEventListener("click", () => input.click()));
  input.addEventListener("change", () => {
    const f = input.files?.[0];
    if (f) openFile(f);
    input.value = "";
  });
  $("#demoBtn").addEventListener("click", () => load(demoSnapshot(), {}));
  $("#langBtn").addEventListener("click", () => {
    lang = lang === "ms" ? "en" : "ms";
    try {
      localStorage.setItem("waris-lang", lang);
    } catch {
      /* ignore */
    }
    applyLang();
  });
  $("#closeSheet").addEventListener("click", closeSheet);
  $("#sheet").addEventListener("click", (e) => {
    if (e.target === $("#sheet")) closeSheet();
  });
  $("#cancelPick").addEventListener("click", () => {
    picking = null;
    $("#picking").hidden = true;
  });
  $("#zoomIn").addEventListener("click", () => zoomAt(1.25, $("#stage").clientWidth / 2, $("#stage").clientHeight / 2));
  $("#zoomOut").addEventListener("click", () => zoomAt(0.8, $("#stage").clientWidth / 2, $("#stage").clientHeight / 2));
  $("#fitBtn").addEventListener("click", () => drawTree(true));
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) openFile(f);
  });
  window.addEventListener("resize", () => graph && drawTree(false));
  setupGestures();
  setupSearch();
  applyLang();
  if (location.hash === "#contoh") load(demoSnapshot(), {});
}
start();
