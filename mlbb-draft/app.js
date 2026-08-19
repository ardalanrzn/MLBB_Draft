// ---------- Draft sequence (standard MLBB draft-pick order) ----------
// 6 bans alternating, then 10 picks in 1-2-2-2-2-1 snake order.
const SEQUENCE = [
  { type: "ban", team: "blue" },
  { type: "ban", team: "red" },
  { type: "ban", team: "blue" },
  { type: "ban", team: "red" },
  { type: "ban", team: "blue" },
  { type: "ban", team: "red" },
  { type: "pick", team: "blue" },
  { type: "pick", team: "red" },
  { type: "pick", team: "red" },
  { type: "pick", team: "blue" },
  { type: "pick", team: "blue" },
  { type: "pick", team: "red" },
  { type: "pick", team: "red" },
  { type: "pick", team: "blue" },
  { type: "pick", team: "blue" },
  { type: "pick", team: "red" },
];

const ROLE_COLORS = {
  tank: "#3b82f6",
  fighter: "#ef4444",
  assassin: "#a855f7",
  mage: "#06b6d4",
  marksman: "#f59e0b",
  support: "#22c55e",
};

const ROLE_LABEL = {
  tank: "Tank",
  fighter: "Fighter",
  assassin: "Assassin",
  mage: "Mage",
  marksman: "Marksman",
  support: "Support",
};

const state = {
  step: 0,
  banned: new Set(),
  picked: { blue: [], red: [] },
  actions: [], // {step, type, team, hero}
  mySide: "blue",
  filterRole: "all",
  filterLane: "all",
  query: "",
  timerSeconds: null,
  timerTotal: 0,
  timerHandle: null,
  banDuration: 15,
  pickDuration: 30,
};

const heroById = Object.fromEntries(HEROES.map(h => [h.name, h]));

// ---------- DOM refs ----------
const $ = sel => document.querySelector(sel);
const grid = $("#hero-grid");
const searchInput = $("#search-input");
const roleFilters = $("#role-filters");
const laneFilters = $("#lane-filters");
const turnBanner = $("#turn-banner");
const timerEl = $("#timer");
const timerRing = $("#timer-ring");
const slotsBlue = $("#slots-blue");
const slotsRed = $("#slots-red");
const suggestionList = $("#suggestion-list");
const undoBtn = $("#undo-btn");
const resetBtn = $("#reset-btn");
const sideToggle = $("#side-toggle");
const skipBtn = $("#skip-btn");

// ---------- Helpers ----------
function initials(name) {
  return name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();
}

function primaryRoleColor(hero) {
  return ROLE_COLORS[hero.roles[0]] || "#888";
}

function currentAction() {
  return SEQUENCE[state.step] || null;
}

function isHeroTaken(name) {
  return state.banned.has(name) || state.picked.blue.includes(name) || state.picked.red.includes(name);
}

function teamRoleCounts(team) {
  const counts = {};
  for (const n of state.picked[team]) {
    const h = heroById[n];
    if (!h) continue;
    for (const r of h.roles) counts[r] = (counts[r] || 0) + 1;
  }
  return counts;
}

// ---------- Timer ----------
function stopTimer() {
  clearInterval(state.timerHandle);
  state.timerHandle = null;
}

function startTimer() {
  stopTimer();
  const action = currentAction();
  if (!action) {
    timerEl.textContent = "--";
    setRing(0);
    return;
  }
  const total = action.type === "ban" ? state.banDuration : state.pickDuration;
  state.timerTotal = total;
  state.timerSeconds = total;
  timerEl.textContent = state.timerSeconds;
  setRing(1);
  state.timerHandle = setInterval(() => {
    state.timerSeconds -= 1;
    timerEl.textContent = Math.max(state.timerSeconds, 0);
    setRing(Math.max(state.timerSeconds, 0) / state.timerTotal);
    timerEl.classList.toggle("urgent", state.timerSeconds <= 5);
    if (state.timerSeconds <= 0) {
      stopTimer();
      // auto-skip this turn (registers no hero, just advances)
      advanceTurn(null);
    }
  }, 1000);
}

function setRing(fraction) {
  const circumference = 2 * Math.PI * 26;
  timerRing.style.strokeDashoffset = circumference * (1 - fraction);
}

// ---------- Rendering ----------
function render() {
  renderBanner();
  renderSlots();
  renderGrid();
  renderSuggestions();
  undoBtn.disabled = state.actions.length === 0;
}

function renderBanner() {
  const action = currentAction();
  if (!action) {
    turnBanner.textContent = "Draft complete";
    turnBanner.className = "turn-banner done";
    stopTimer();
    timerEl.textContent = "--";
    setRing(0);
    return;
  }
  const label = action.type === "ban" ? "BAN" : "PICK";
  const teamLabel = action.team === "blue" ? "Blue Team" : "Red Team";
  const mine = action.team === state.mySide;
  turnBanner.textContent = `${teamLabel} — ${label}${mine ? " (You)" : ""}`;
  turnBanner.className = `turn-banner ${action.team} ${action.type}`;
}

function renderSlots() {
  renderSlotRow(slotsBlue, "blue");
  renderSlotRow(slotsRed, "red");

  // ban strip: show all bans in order at top under banner (built once here)
  const banStrip = $("#ban-strip");
  banStrip.innerHTML = "";
  const bans = state.actions.filter(a => a.type === "ban");
  for (let i = 0; i < 6; i++) {
    const a = bans[i];
    const div = document.createElement("div");
    div.className = "ban-chip" + (a ? ` filled ${a.team}` : "");
    if (a && a.hero) {
      div.innerHTML = `<span class="ban-x">✕</span><span>${a.hero}</span>`;
    } else {
      div.textContent = "—";
    }
    banStrip.appendChild(div);
  }
}

function renderSlotRow(container, team) {
  container.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const heroName = state.picked[team][i];
    const div = document.createElement("div");
    div.className = "pick-slot" + (heroName ? " filled" : "");
    if (heroName) {
      const hero = heroById[heroName];
      div.style.setProperty("--role-color", primaryRoleColor(hero));
      div.innerHTML = `<div class="avatar">${initials(heroName)}</div><div class="pick-name">${heroName}</div>`;
    } else {
      div.innerHTML = `<div class="avatar empty">${i + 1}</div>`;
    }
    container.appendChild(div);
  }
}

function matchesFilters(hero) {
  if (state.filterRole !== "all" && !hero.roles.includes(state.filterRole)) return false;
  if (state.filterLane !== "all" && !hero.lane.includes(state.filterLane)) return false;
  if (state.query && !hero.name.toLowerCase().includes(state.query.toLowerCase())) return false;
  return true;
}

function renderGrid() {
  grid.innerHTML = "";
  const action = currentAction();
  const list = HEROES.filter(matchesFilters).sort((a, b) => a.name.localeCompare(b.name));

  for (const hero of list) {
    const taken = isHeroTaken(hero.name);
    const card = document.createElement("button");
    card.className = "hero-card" + (taken ? " taken" : "");
    card.style.setProperty("--role-color", primaryRoleColor(hero));
    card.disabled = taken || !action;

    let badge = "";
    if (hero.tier === "S") badge = `<span class="badge tier-s">S</span>`;
    if (hero.tag) badge += `<span class="badge tag">${hero.tag}</span>`;

    card.innerHTML = `
      <div class="avatar">${initials(hero.name)}</div>
      <div class="hero-name">${hero.name}</div>
      <div class="hero-roles">${hero.roles.map(r => ROLE_LABEL[r]).join(" / ")}</div>
      ${badge}
      ${taken ? '<div class="taken-mark">✕</div>' : ""}
    `;
    card.addEventListener("click", () => handleHeroTap(hero.name));
    grid.appendChild(card);
  }

  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state">No heroes match your search/filters.</div>`;
  }
}

function renderSuggestions() {
  suggestionList.innerHTML = "";
  const action = currentAction();
  if (!action) {
    suggestionList.innerHTML = `<div class="empty-state">No more suggestions — draft's done. GL!</div>`;
    return;
  }

  const suggestions = buildSuggestions(action);
  if (suggestions.length === 0) {
    suggestionList.innerHTML = `<div class="empty-state">No strong signal yet — pick on read.</div>`;
    return;
  }

  for (const s of suggestions) {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    div.innerHTML = `
      <div class="avatar small" style="--role-color:${primaryRoleColor(heroById[s.name])}">${initials(s.name)}</div>
      <div class="suggestion-text">
        <div class="suggestion-name">${s.name}</div>
        <div class="suggestion-reason">${s.reason}</div>
      </div>
    `;
    div.addEventListener("click", () => handleHeroTap(s.name));
    suggestionList.appendChild(div);
  }
}

function buildSuggestions(action) {
  const out = [];
  const seen = new Set();
  const add = (name, reason) => {
    if (seen.has(name) || isHeroTaken(name)) return;
    seen.add(name);
    out.push({ name, reason });
  };

  if (action.type === "pick") {
    // 1) counter the enemy's most recent pick
    const enemy = action.team === "blue" ? "red" : "blue";
    const lastEnemyPick = state.picked[enemy][state.picked[enemy].length - 1];
    if (lastEnemyPick && COUNTERS[lastEnemyPick]) {
      for (const c of COUNTERS[lastEnemyPick]) {
        add(c, `Strong counter to ${lastEnemyPick}`);
      }
    }

    // 2) fill your own team's biggest role gap
    const counts = teamRoleCounts(action.team);
    const priority = ["tank", "support", "marksman", "mage", "fighter", "assassin"];
    const missing = priority.filter(r => !counts[r]);
    for (const role of missing.slice(0, 2)) {
      const candidates = HEROES
        .filter(h => h.roles.includes(role) && !isHeroTaken(h.name))
        .sort((a, b) => (b.tier === "S") - (a.tier === "S"));
      if (candidates[0]) add(candidates[0].name, `Fills open ${ROLE_LABEL[role]} slot`);
    }

    // 3) current-patch meta picks still available
    const metaAvailable = HEROES.filter(h => h.tier === "S" && !isHeroTaken(h.name));
    for (const h of metaAvailable.slice(0, 2)) {
      add(h.name, "Top meta pick this patch (2.1.95)");
    }
  } else {
    // ban phase: suggest banning enemy-favored meta heroes not yet taken
    const metaAvailable = HEROES.filter(h => h.tier === "S" && !isHeroTaken(h.name));
    for (const h of metaAvailable) {
      add(h.name, "High-priority ban — dominant this patch");
    }
    // also suggest banning hard counters to your own likely picks
    const myCounts = teamRoleCounts(state.mySide);
    if (Object.keys(myCounts).length === 0) {
      for (const h of HEROES.filter(h => h.tier === "S").slice(0, 3)) {
        add(h.name, "Contest early — strong first-phase target");
      }
    }
  }

  return out.slice(0, 5);
}

// ---------- Actions ----------
function handleHeroTap(name) {
  const action = currentAction();
  if (!action || isHeroTaken(name)) return;
  advanceTurn(name);
}

function advanceTurn(heroName) {
  const action = currentAction();
  if (!action) return;

  if (heroName) {
    if (action.type === "ban") {
      state.banned.add(heroName);
    } else {
      state.picked[action.team].push(heroName);
    }
  }

  state.actions.push({ step: state.step, type: action.type, team: action.team, hero: heroName });
  state.step += 1;
  render();
  if (currentAction()) startTimer(); else stopTimer();
}

function undo() {
  if (state.actions.length === 0) return;
  stopTimer();
  const last = state.actions.pop();
  if (last.hero) {
    if (last.type === "ban") state.banned.delete(last.hero);
    else state.picked[last.team].pop();
  }
  state.step = last.step;
  render();
  startTimer();
}

function resetDraft() {
  stopTimer();
  state.step = 0;
  state.banned.clear();
  state.picked = { blue: [], red: [] };
  state.actions = [];
  render();
  startTimer();
}

// ---------- Filters / search wiring ----------
function buildFilterChips(container, values, labelFn, onSelect) {
  container.innerHTML = "";
  for (const v of values) {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = labelFn(v);
    btn.dataset.value = v;
    btn.addEventListener("click", () => onSelect(v, btn));
    container.appendChild(btn);
  }
}

function setActiveChip(container, value) {
  [...container.children].forEach(c => c.classList.toggle("active", c.dataset.value === value));
}

buildFilterChips(
  roleFilters,
  ["all", "tank", "fighter", "assassin", "mage", "marksman", "support"],
  v => (v === "all" ? "All Roles" : ROLE_LABEL[v]),
  v => { state.filterRole = v; setActiveChip(roleFilters, v); renderGrid(); }
);
setActiveChip(roleFilters, "all");

buildFilterChips(
  laneFilters,
  ["all", "exp", "jungle", "mid", "gold", "roam"],
  v => (v === "all" ? "All Lanes" : v[0].toUpperCase() + v.slice(1)),
  v => { state.filterLane = v; setActiveChip(laneFilters, v); renderGrid(); }
);
setActiveChip(laneFilters, "all");

searchInput.addEventListener("input", e => {
  state.query = e.target.value;
  renderGrid();
});

undoBtn.addEventListener("click", undo);
resetBtn.addEventListener("click", () => {
  if (confirm("Reset the whole draft?")) resetDraft();
});
skipBtn.addEventListener("click", () => advanceTurn(null));
sideToggle.addEventListener("click", () => {
  state.mySide = state.mySide === "blue" ? "red" : "blue";
  sideToggle.textContent = `Playing: ${state.mySide === "blue" ? "Blue" : "Red"} Team`;
  sideToggle.className = `side-toggle ${state.mySide}`;
  render();
});

// ---------- Init ----------
sideToggle.textContent = "Playing: Blue Team";
render();
startTimer();

// ---------- Service worker ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
