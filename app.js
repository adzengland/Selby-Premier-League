const PLAYERS = [
  "Bob Wilcockson",
  "Adam England",
  "Aaron Mills",
  "Mark Dickinson",
  "Craig Dickinson",
  "Luke Kierans",
  "Patrick Kettlewell",
  "Josh Gibbon",
  "Tom Littlewood",
  "Jon Lunt"
];

const config = window.SPL_CONFIG || {};
const hasSupabase = !!(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);
const sb = hasSupabase ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY) : null;

let state = {
  fixturesLocked: false,
  rounds: [],
  user: null,
  isAdmin: false,
  loading: true,
  error: null
};

function shuffled(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateRoundRobinData() {
  const players = shuffled(PLAYERS);
  const fixed = players[0];
  let rotating = players.slice(1);
  const rounds = [];

  for (let r = 0; r < 9; r++) {
    const lineup = [fixed, ...rotating];
    const fixtures = [];

    for (let i = 0; i < 5; i++) {
      const a = lineup[i];
      const b = lineup[lineup.length - 1 - i];
      const flip = Math.random() > 0.5;

      fixtures.push({
        round_number: r + 1,
        player1: flip ? b : a,
        player2: flip ? a : b,
        player1_legs: null,
        player2_legs: null,
        player1_average: null,
        player2_average: null
      });
    }

    rounds.push(fixtures);
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }

  return rounds.flat();
}

function formatDate(iso) {
  if (!iso) return "TBD";
  const d = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(d);
}

function normalizeFixture(row) {
  return {
    id: row.id,
    p1: row.player1,
    p2: row.player2,
    s1: row.player1_legs,
    s2: row.player2_legs,
    a1: row.player1_average,
    a2: row.player2_average
  };
}

async function loadData() {
  if (!hasSupabase) {
    state.loading = false;
    state.error = "Supabase is not configured.";
    route();
    return;
  }

  state.loading = true;
  state.error = null;
  route();

  const { data: sessionData } = await sb.auth.getSession();
  state.user = sessionData?.session?.user || null;

  if (state.user) {
    const { data: adminFlag } = await sb.rpc("is_spl_admin");
    state.isAdmin = !!adminFlag;
  } else {
    state.isAdmin = false;
  }

  const [
    { data: roundsData, error: roundsError },
    { data: fixturesData, error: fixturesError },
    { data: settingsData, error: settingsError }
  ] = await Promise.all([
    sb.from("rounds").select("*").order("round_number"),
    sb.from("fixtures").select("*").order("round_number").order("id"),
    sb.from("league_settings").select("*").eq("id", 1).maybeSingle()
  ]);

  const err = roundsError || fixturesError || settingsError;
  if (err) {
    state.error = err.message;
    state.loading = false;
    route();
    return;
  }

  const fixturesByRound = {};
  (fixturesData || []).forEach(f => {
    fixturesByRound[f.round_number] ||= [];
    fixturesByRound[f.round_number].push(normalizeFixture(f));
  });

  state.rounds = (roundsData || []).map(r => ({
    number: r.round_number,
    date: r.play_date || "",
    host: r.host || "",
    fixtures: fixturesByRound[r.round_number] || []
  }));

  state.fixturesLocked = !!settingsData?.fixtures_locked;
  state.loading = false;
  route();
}

function getStandings() {
  const rows = Object.fromEntries(PLAYERS.map(name => [name, {
    player: name,
    p: 0, w: 0, l: 0,
    lf: 0, la: 0, ld: 0,
    avgTotal: 0, avgCount: 0, avg: null
  }]));

  state.rounds.forEach(round => round.fixtures.forEach(f => {
    const a = rows[f.p1];
    const b = rows[f.p2];
    if (!a || !b) return;

    if (f.a1 !== null && f.a1 !== "" && Number.isFinite(Number(f.a1))) {
      a.avgTotal += Number(f.a1);
      a.avgCount++;
    }
    if (f.a2 !== null && f.a2 !== "" && Number.isFinite(Number(f.a2))) {
      b.avgTotal += Number(f.a2);
      b.avgCount++;
    }

    const s1 = Number(f.s1), s2 = Number(f.s2);
    if (!Number.isFinite(s1) || !Number.isFinite(s2) || f.s1 === null || f.s2 === null) return;

    a.p++; b.p++;
    a.lf += s1; a.la += s2;
    b.lf += s2; b.la += s1;

    if (s1 > s2) {
      a.w++; b.l++;
    } else {
      b.w++; a.l++;
    }
  }));

  Object.values(rows).forEach(r => {
    r.ld = r.lf - r.la;
    r.avg = r.avgCount ? r.avgTotal / r.avgCount : null;
  });

  return Object.values(rows).sort((a, b) =>
    b.ld - a.ld ||
    b.lf - a.lf ||
    a.player.localeCompare(b.player)
  );
}

function completedMatches() {
  return state.rounds
    .flatMap(r => r.fixtures)
    .filter(f => f.s1 !== null && f.s2 !== null).length;
}

function renderTable() {
  const table = getStandings();

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Player</th><th>P</th><th>W</th><th>L</th>
            <th>LF</th><th>LA</th><th>LD</th><th>Avg</th>
          </tr>
        </thead>
        <tbody>
          ${table.map((r, i) => `
            <tr>
              <td><span class="pos">${i + 1}</span><strong>${r.player}</strong></td>
              <td>${r.p}</td>
              <td>${r.w}</td>
              <td>${r.l}</td>
              <td>${r.lf}</td>
              <td>${r.la}</td>
              <td><strong>${r.ld > 0 ? "+" : ""}${r.ld}</strong></td>
              <td>${r.avg === null ? "—" : r.avg.toFixed(2)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>`;
}

function fixturesMarkup(rounds = state.rounds) {
  return rounds.map(round => `
    <article class="card round-card">
      <div class="round-top">
        <div>
          <span class="kicker">Round ${round.number}</span>
          <h3>${round.date ? formatDate(round.date) : "Date TBD"}</h3>
        </div>
        <div class="round-meta">
          <strong>Host</strong><br>${round.host || "TBD"}
        </div>
      </div>

      ${round.fixtures.length
        ? round.fixtures.map(f => {
            const done = f.s1 !== null && f.s2 !== null;
            return `
              <div class="fixture">
                <div class="left">
                  ${f.p1}
                  ${f.a1 !== null && f.a1 !== "" ? `<div class="small">Avg ${Number(f.a1).toFixed(2)}</div>` : ""}
                </div>
                <div class="score ${done ? "" : "pending"}">
                  ${done ? `${f.s1}–${f.s2}` : "vs"}
                </div>
                <div class="right">
                  ${f.p2}
                  ${f.a2 !== null && f.a2 !== "" ? `<div class="small">Avg ${Number(f.a2).toFixed(2)}</div>` : ""}
                </div>
              </div>`;
          }).join("")
        : `<div class="muted">Fixtures not generated yet.</div>`
      }
    </article>
  `).join("");
}

function renderHome() {
  const standings = getStandings();
  const leader = standings[0];
  const nextRound = state.rounds.find(r => r.fixtures.some(f => f.s1 === null || f.s2 === null)) || state.rounds[0];

  return `
    <section class="hero">
      <img class="hero-logo" src="./assets/spl.png" alt="">
      <span class="kicker">2026/27 Season</span>
      <h1>Selby Premier League</h1>
      <p>Ten players. Nine rounds. First to five legs. No points system — when the dust settles, the biggest leg difference wins the league.</p>
    </section>

    <section class="section grid three">
      <div class="card soft">
        <div class="stat-value">${completedMatches()}/45</div>
        <div class="stat-label">Matches played</div>
      </div>
      <div class="card soft">
        <div class="stat-value">${leader ? (leader.ld > 0 ? "+" : "") + leader.ld : "0"}</div>
        <div class="stat-label">Current best leg difference</div>
      </div>
      <div class="card soft">
        <div class="stat-value">${nextRound?.date ? formatDate(nextRound.date).replace(" 2026","").replace(" 2027","") : "TBD"}</div>
        <div class="stat-label">Next round • ${nextRound?.host || "Host TBD"}</div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <span class="kicker">Next up</span>
          <h2>Round ${nextRound?.number || 1}</h2>
        </div>
        <a class="btn secondary" href="#fixtures">All fixtures</a>
      </div>
      ${nextRound ? fixturesMarkup([nextRound]) : ""}
    </section>

    <section class="section">
      <div class="section-head">
        <div><span class="kicker">Standings</span><h2>League table</h2></div>
        <div class="small">Ranked by leg difference</div>
      </div>
      ${renderTable()}
    </section>`;
}

function renderFixtures() {
  return `
    <section class="section-head">
      <div><span class="kicker">Season</span><h2>Fixtures & Results</h2></div>
      <div class="small">9 rounds • 5 matches per round • everyone plays everyone once</div>
    </section>
    <div class="round-list">${fixturesMarkup()}</div>`;
}

function renderTablePage() {
  return `
    <section class="section-head">
      <div><span class="kicker">Standings</span><h2>League Table</h2></div>
      <div class="small">Overall winner = highest leg difference. Exact tie? Playoff.</div>
    </section>
    ${renderTable()}
    <section class="section grid three">
      <div class="card"><div class="stat-value">5</div><div class="stat-label">Legs needed to win a match</div></div>
      <div class="card"><div class="stat-value">45</div><div class="stat-label">Season matches</div></div>
      <div class="card"><div class="stat-value">9</div><div class="stat-label">Rounds</div></div>
    </section>`;
}

function renderLogin() {
  return `
    <section class="section-head">
      <div><span class="kicker">League control</span><h2>Admin</h2></div>
      <div class="small">Sign in to manage the league.</div>
    </section>

    <div class="card login-card">
      <h3>Admin sign in</h3>
      <p class="muted">Use the Supabase user account you created for league administration.</p>
      <div class="field">
        <label>Email</label>
        <input id="loginEmail" type="email" autocomplete="email" placeholder="you@example.com">
      </div>
      <div class="field">
        <label>Password</label>
        <input id="loginPassword" type="password" autocomplete="current-password" placeholder="••••••••">
      </div>
      <div class="admin-toolbar">
        <button class="btn" id="loginBtn">Sign in</button>
      </div>
      <div id="loginMessage" class="small"></div>
    </div>`;
}

function renderAdmin() {
  if (!state.user) return renderLogin();

  if (!state.isAdmin) {
    return `
      <section class="section-head">
        <div><span class="kicker">League control</span><h2>Admin</h2></div>
      </section>
      <div class="notice error">
        You are signed in as <strong>${state.user.email}</strong>, but this account is not in the SPL admin list.
      </div>
      <div class="admin-toolbar">
        <button class="btn secondary" id="logoutBtn">Sign out</button>
      </div>`;
  }

  return `
    <section class="section-head">
      <div><span class="kicker">League control</span><h2>Admin</h2></div>
      <div class="small">Signed in as ${state.user.email}</div>
    </section>

    <div class="notice">
      Live mode is connected. Changes here are saved to Supabase and visible to everyone using the site.
    </div>

    <div class="admin-toolbar">
      <button class="btn" id="generateBtn" ${state.fixturesLocked ? "disabled" : ""}>
        ${state.rounds[0]?.fixtures?.length ? "Regenerate fixtures" : "Generate fixtures"}
      </button>
      <button class="btn secondary" id="lockBtn">
        ${state.fixturesLocked ? "Unlock fixtures" : "Lock fixtures"}
      </button>
      <button class="btn secondary" id="logoutBtn">Sign out</button>
    </div>

    <div class="round-list">
      ${state.rounds.map(round => `
        <article class="card admin-round">
          <div class="round-top">
            <div>
              <span class="kicker">Round ${round.number}</span>
              <h3>${round.date ? formatDate(round.date) : "Date TBD"}</h3>
            </div>
            <div class="small">${round.fixtures.length ? `${round.fixtures.length} matches` : "No fixtures yet"}</div>
          </div>

          <div class="form-row">
            <div class="field">
              <label>Date</label>
              <input type="date" data-round-date="${round.number}" value="${round.date || ""}">
            </div>
            <div class="field">
              <label>Host / venue</label>
              <input type="text" data-round-host="${round.number}" value="${round.host || ""}" placeholder="TBD">
            </div>
          </div>

          <div class="section">
            ${round.fixtures.length
              ? round.fixtures.map((f, idx) => `
                <div class="admin-fixture admin-fixture-with-avg">
                  <div class="p1">${f.p1}</div>

                  <div class="score-entry">
                    <input type="number" min="0" max="5" inputmode="numeric"
                      data-score="${round.number}|${idx}|s1"
                      value="${f.s1 ?? ""}" placeholder="Legs">
                    <input type="number" min="0" max="180" step="0.01" inputmode="decimal"
                      data-avg="${round.number}|${idx}|a1"
                      value="${f.a1 ?? ""}" placeholder="Avg">
                  </div>

                  <span>–</span>

                  <div class="score-entry">
                    <input type="number" min="0" max="5" inputmode="numeric"
                      data-score="${round.number}|${idx}|s2"
                      value="${f.s2 ?? ""}" placeholder="Legs">
                    <input type="number" min="0" max="180" step="0.01" inputmode="decimal"
                      data-avg="${round.number}|${idx}|a2"
                      value="${f.a2 ?? ""}" placeholder="Avg">
                  </div>

                  <div>${f.p2}</div>
                </div>
              `).join("")
              : `<div class="muted">Generate the season fixtures to start entering results.</div>`
            }
          </div>
        </article>
      `).join("")}
    </div>`;
}

async function signIn() {
  const email = document.querySelector("#loginEmail")?.value.trim();
  const password = document.querySelector("#loginPassword")?.value;
  const msg = document.querySelector("#loginMessage");

  if (!email || !password) {
    msg.textContent = "Enter your email and password.";
    return;
  }

  msg.textContent = "Signing in…";

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    msg.textContent = error.message;
    return;
  }

  await loadData();
}

async function signOut() {
  await sb.auth.signOut();
  state.user = null;
  state.isAdmin = false;
  route();
}

async function regenerateFixtures() {
  if (state.fixturesLocked || !state.isAdmin) return;

  const anyResults = state.rounds.some(r =>
    r.fixtures.some(f =>
      f.s1 !== null || f.s2 !== null || f.a1 !== null || f.a2 !== null
    )
  );

  if (anyResults && !confirm("This will wipe entered scores and averages and create a new fixture draw. Continue?")) {
    return;
  }

  const btn = document.querySelector("#generateBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generating…";
  }

  const { error: deleteError } = await sb.from("fixtures").delete().gte("id", 0);
  if (deleteError) {
    alert(deleteError.message);
    await loadData();
    return;
  }

  const fixtures = generateRoundRobinData();
  const { error: insertError } = await sb.from("fixtures").insert(fixtures);

  if (insertError) {
    alert(insertError.message);
    await loadData();
    return;
  }

  await loadData();
}

async function toggleLock() {
  if (!state.isAdmin) return;

  const { error } = await sb
    .from("league_settings")
    .update({ fixtures_locked: !state.fixturesLocked })
    .eq("id", 1);

  if (error) {
    alert(error.message);
    return;
  }

  await loadData();
}

async function updateRound(number, patch) {
  if (!state.isAdmin) return;

  const { error } = await sb
    .from("rounds")
    .update(patch)
    .eq("round_number", number);

  if (error) {
    alert(error.message);
  }
}

async function updateFixture(roundNumber, index, patch) {
  if (!state.isAdmin) return;

  const fixture = state.rounds[roundNumber - 1]?.fixtures[index];
  if (!fixture?.id) return;

  const { error } = await sb
    .from("fixtures")
    .update(patch)
    .eq("id", fixture.id);

  if (error) {
    alert(error.message);
  }
}

function validateCompletedScore(fixture, changedKey, changedValue) {
  const next = { ...fixture, [changedKey]: changedValue };

  if (next.s1 === null || next.s2 === null) return true;

  return (
    (Number(next.s1) === 5 && Number(next.s2) >= 0 && Number(next.s2) <= 4) ||
    (Number(next.s2) === 5 && Number(next.s1) >= 0 && Number(next.s1) <= 4)
  );
}

function bindAdmin() {
  document.querySelector("#loginBtn")?.addEventListener("click", signIn);
  document.querySelector("#loginPassword")?.addEventListener("keydown", e => {
    if (e.key === "Enter") signIn();
  });

  document.querySelector("#logoutBtn")?.addEventListener("click", signOut);
  document.querySelector("#generateBtn")?.addEventListener("click", regenerateFixtures);
  document.querySelector("#lockBtn")?.addEventListener("click", toggleLock);

  document.querySelectorAll("[data-round-date]").forEach(el => {
    el.addEventListener("change", async e => {
      const n = Number(e.target.dataset.roundDate);
      const value = e.target.value || null;
      state.rounds[n - 1].date = e.target.value;
      await updateRound(n, { play_date: value });
      route();
    });
  });

  document.querySelectorAll("[data-round-host]").forEach(el => {
    el.addEventListener("change", async e => {
      const n = Number(e.target.dataset.roundHost);
      const value = e.target.value.trim();
      state.rounds[n - 1].host = value;
      await updateRound(n, { host: value || null });
      route();
    });
  });

  document.querySelectorAll("[data-score]").forEach(el => {
    el.addEventListener("change", async e => {
      const [r, idx, key] = e.target.dataset.score.split("|");
      const roundNumber = Number(r);
      const index = Number(idx);
      const fixture = state.rounds[roundNumber - 1].fixtures[index];
      const raw = e.target.value.trim();
      const val = raw === "" ? null : Number(raw);

      if (val !== null && (!Number.isInteger(val) || val < 0 || val > 5)) {
        alert("Legs must be a whole number from 0 to 5.");
        e.target.value = fixture[key] ?? "";
        return;
      }

      if (!validateCompletedScore(fixture, key, val)) {
        alert("A completed match must finish 5–0 through 5–4.");
        e.target.value = fixture[key] ?? "";
        return;
      }

      fixture[key] = val;
      const dbKey = key === "s1" ? "player1_legs" : "player2_legs";
      await updateFixture(roundNumber, index, { [dbKey]: val });
      route();
    });
  });

  document.querySelectorAll("[data-avg]").forEach(el => {
    el.addEventListener("change", async e => {
      const [r, idx, key] = e.target.dataset.avg.split("|");
      const roundNumber = Number(r);
      const index = Number(idx);
      const fixture = state.rounds[roundNumber - 1].fixtures[index];
      const raw = e.target.value.trim();
      const val = raw === "" ? null : Number(raw);

      if (val !== null && (!Number.isFinite(val) || val < 0 || val > 180)) {
        alert("Enter a darts average between 0 and 180.");
        e.target.value = fixture[key] ?? "";
        return;
      }

      fixture[key] = val;
      const dbKey = key === "a1" ? "player1_average" : "player2_average";
      await updateFixture(roundNumber, index, { [dbKey]: val });
      route();
    });
  });
}

function loadingMarkup() {
  return `
    <section class="hero">
      <span class="kicker">Loading</span>
      <h1>Selby Premier League</h1>
      <p>Pulling the latest league data…</p>
    </section>`;
}

function errorMarkup() {
  return `
    <section class="section-head">
      <div><span class="kicker">Connection problem</span><h2>Couldn't load league data</h2></div>
    </section>
    <div class="notice error">${state.error}</div>`;
}

function route() {
  const routeName = (location.hash || "#home").slice(1);

  document.querySelectorAll(".nav a").forEach(a => {
    a.classList.toggle("active", a.dataset.route === routeName);
  });

  const app = document.querySelector("#app");

  if (state.loading) {
    app.innerHTML = loadingMarkup();
    return;
  }

  if (state.error) {
    app.innerHTML = errorMarkup();
    return;
  }

  if (routeName === "fixtures") {
    app.innerHTML = renderFixtures();
  } else if (routeName === "table") {
    app.innerHTML = renderTablePage();
  } else if (routeName === "admin") {
    app.innerHTML = renderAdmin();
    bindAdmin();
  } else {
    app.innerHTML = renderHome();
  }
}

window.addEventListener("hashchange", route);

if (sb) {
  sb.auth.onAuthStateChange(async () => {
    await loadData();
  });
}

loadData();
