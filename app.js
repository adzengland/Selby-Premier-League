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

const PLAYER_LOGIN_EMAILS = {"Bob Wilcockson": "bob.wilcockson@spl.internal", "Aaron Mills": "aaron.mills@spl.internal", "Mark Dickinson": "mark.dickinson@spl.internal", "Craig Dickinson": "craig.dickinson@spl.internal", "Luke Kierans": "luke.kierans@spl.internal", "Patrick Kettlewell": "patrick.kettlewell@spl.internal", "Josh Gibbon": "josh.gibbon@spl.internal", "Tom Littlewood": "tom.littlewood@spl.internal", "Jon Lunt": "jon.lunt@spl.internal"};

const config = window.SPL_CONFIG || {};
const hasSupabase = !!(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);
const sb = hasSupabase ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY) : null;

window.SPL_SPRINT_CLIENT = sb;

let state = {
  fixturesLocked: false,
  rounds: [],
  players: [],
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
    a2: row.player2_average,
    status: row.scorer_status || null, pts1: row.player1_points, pts2: row.player2_points, darts1: row.player1_darts, darts2: row.player2_darts
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
  route();

  if (state.user) {
    const { data: adminFlag } = await sb.rpc("is_spl_admin");
    state.isAdmin = !!adminFlag;
  } else {
    state.isAdmin = false;
  }

  const [
    { data: roundsData, error: roundsError },
    { data: fixturesData, error: fixturesError },
    { data: settingsData, error: settingsError },
    { data: playersData, error: playersError }
  ] = await Promise.all([
    sb.from("rounds").select("*").order("round_number"),
    sb.from("fixtures").select("*").order("round_number").order("id"),
    sb.from("league_settings").select("*").eq("id", 1).maybeSingle(),
    sb.from("players").select("*").order("sort_order")
  ]);

  const err = roundsError || fixturesError || settingsError || playersError;
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

  window.SPL_FIXTURE_PREVIEW?.apply(state.rounds);
  state.fixturesLocked = !!settingsData?.fixtures_locked;
  state.players = playersData || [];
  state.loading = false;

  if (state.user && localStorage.getItem("spl_post_auth_route") === "admin") {
    localStorage.removeItem("spl_post_auth_route");
    if (location.hash !== "#admin") {
      location.hash = "#admin";
      return;
    }
  }

  route();
}

function getStandings() {
  const names=[...new Set([...PLAYERS,...state.players.map(p=>p.name)])];
  const rows=Object.fromEntries(names.map(player=>[player,{player,p:0,w:0,l:0,lf:0,la:0,ld:0,points:0,darts:0,avg:null}]));
  state.rounds.forEach(r=>r.fixtures.forEach(f=>{
    if(f.status!=='completed'||f.s1===null||f.s2===null)return;
    const a=rows[f.p1],b=rows[f.p2];if(!a||!b)return;
    const s1=Number(f.s1),s2=Number(f.s2);a.p++;b.p++;a.lf+=s1;a.la+=s2;b.lf+=s2;b.la+=s1;
    if(s1>s2){a.w++;b.l++;}else{b.w++;a.l++;}
    a.points+=Number(f.pts1)||0;a.darts+=Number(f.darts1)||0;b.points+=Number(f.pts2)||0;b.darts+=Number(f.darts2)||0;
  }));
  Object.values(rows).forEach(r=>{r.ld=r.lf-r.la;r.avg=r.darts?r.points*3/r.darts:null;});
  const ranked=Object.values(rows).sort((a,b)=>b.lf-a.lf||b.ld-a.ld||a.player.localeCompare(b.player));
  ranked.forEach((r,i)=>{r.rank=i&&r.lf===ranked[i-1].lf&&r.ld===ranked[i-1].ld?ranked[i-1].rank:i+1;});
  return ranked;
}

function completedMatches() {
  return state.rounds
    .flatMap(r => r.fixtures)
    .filter(f => f.status === 'completed').length;
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
              <td><span class="pos">${r.rank}</span><strong>${r.player}</strong></td>
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
 const escape=window.SPLFixture?.escape||((x)=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
 return rounds.map(round=>`<article class="card round-card"><div class="round-top"><div><span class="kicker">Round ${round.number}</span><h3>${round.date?formatDate(round.date):'Date TBD'}</h3></div><div class="round-meta"><strong>Host</strong><br>${escape(round.host||'TBD')}</div></div>
 ${round.fixtures.map(f=>`<div class="fixture scorer-fixture-row"><div class="left">${escape(f.p1)}${f.a1!=null?`<div class="small">Avg ${Number(f.a1).toFixed(2)}</div>`:''}</div><div class="score ${f.status==='completed'?'':'pending'}">${f.status==='completed'?`${f.s1}–${f.s2}`:'vs'}</div><div class="right">${escape(f.p2)}${f.a2!=null?`<div class="small">Avg ${Number(f.a2).toFixed(2)}</div>`:''}</div><div class="fixture-action">${state.isAdmin?`<a class="btn secondary fixture-score-link" href="#score/${encodeURIComponent(f.id)}">${f.status==='completed'?'View scorecard':f.status==='active'?'Continue scoring':'Score match'}</a>`:''}</div></div>`).join('')||'<p>Fixtures not generated yet.</p>'}</article>`).join('');
}

function initials(name) {
  return name.split(/\s+/).map(x => x[0]).join("").slice(0, 2).toUpperCase();
}

function playerStats(name) {
  const tableRow = getStandings().find(r => r.player === name);
  let highAvg = null;
  state.rounds.forEach(round => round.fixtures.forEach(f => {
    if (f.p1 === name && f.a1 !== null && f.a1 !== "") highAvg = Math.max(highAvg ?? -Infinity, Number(f.a1));
    if (f.p2 === name && f.a2 !== null && f.a2 !== "") highAvg = Math.max(highAvg ?? -Infinity, Number(f.a2));
  }));
  return {
    p: tableRow?.p ?? 0,
    w: tableRow?.w ?? 0,
    l: tableRow?.l ?? 0,
    ld: tableRow?.ld ?? 0,
    avg: tableRow?.avg ?? null,
    highAvg
  };
}

function playerSlug(name) {
  return encodeURIComponent(name);
}

function getRecentMatches(name, limit = 5) {
  const rows = [];

  state.rounds.forEach(round => {
    round.fixtures.forEach(f => {
      const isP1 = f.p1 === name;
      const isP2 = f.p2 === name;
      if (!isP1 && !isP2) return;
      if (f.s1 === null || f.s2 === null) return;

      const ownScore = isP1 ? Number(f.s1) : Number(f.s2);
      const oppScore = isP1 ? Number(f.s2) : Number(f.s1);
      const ownAvg = isP1 ? f.a1 : f.a2;
      const opponent = isP1 ? f.p2 : f.p1;

      rows.push({
        round: round.number,
        date: round.date || "",
        opponent,
        ownScore,
        oppScore,
        result: ownScore > oppScore ? "W" : "L",
        average: ownAvg === null || ownAvg === "" ? null : Number(ownAvg)
      });
    });
  });

  rows.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return b.round - a.round;
  });

  return rows.slice(0, limit);
}

function playerCard(player) {
  const stats = playerStats(player.name);
  return `
    <a class="card player-card player-card-link" href="#player/${playerSlug(player.name)}" aria-label="View ${player.name} profile">
      <div class="player-avatar-wrap">
        ${player.avatar_url
          ? `<img class="player-avatar" src="${player.avatar_url}" alt="${player.name}">`
          : `<div class="player-avatar placeholder">${initials(player.name)}</div>`}
      </div>
      <div class="player-card-body">
        <span class="kicker">Player</span>
        <h3>${player.name}</h3>
        ${player.nickname ? `<div class="nickname">"${player.nickname}"</div>` : ""}
        <div class="player-stats">
          <div><strong>${stats.p}</strong><span>P</span></div>
          <div><strong>${stats.w}</strong><span>W</span></div>
          <div><strong>${stats.ld > 0 ? "+" : ""}${stats.ld}</strong><span>LD</span></div>
          <div><strong>${stats.avg === null ? "—" : stats.avg.toFixed(2)}</strong><span>Avg</span></div>
          <div><strong>${stats.highAvg === null ? "—" : stats.highAvg.toFixed(2)}</strong><span>High</span></div>
        </div>
        <div class="profile-card-cta">View profile →</div>
      </div>
    </a>`;
}

function renderPlayerProfile(playerName) {
  const player = state.players.find(p => p.name === playerName);
  if (!player) {
    return `
      <section class="section-head">
        <div><span class="kicker">Players</span><h2>Profile not found</h2></div>
        <a class="btn secondary" href="#players">Back to Players</a>
      </section>`;
  }

  const stats = playerStats(player.name);
  const recent = getRecentMatches(player.name, 5);
  const ownsProfile = !!(state.user && player.user_id === state.user.id);

  return `
    <section class="profile-hero card">
      <div class="profile-hero-avatar">
        ${player.avatar_url
          ? `<img class="player-avatar profile-large" src="${player.avatar_url}" alt="${player.name}">`
          : `<div class="player-avatar placeholder profile-large">${initials(player.name)}</div>`}
      </div>

      <div class="profile-hero-copy">
        <span class="kicker">Selby Premier League</span>
        <h1>${player.name}</h1>
        ${player.nickname ? `<div class="profile-nickname">"${player.nickname}"</div>` : ""}
        ${player.bio
          ? `<p class="profile-bio">${player.bio}</p>`
          : `<p class="profile-bio muted">No bio added yet.</p>`}

        <div class="profile-actions">
          <a class="btn secondary" href="#players">← All players</a>
          ${ownsProfile ? `<a class="btn" href="#profile">Edit my profile</a>` : ""}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div><span class="kicker">Profile</span><h2>Player Details</h2></div>
      </div>

      <div class="profile-details-grid">
        <div class="card profile-detail-card">
          <span class="profile-detail-label">Nickname</span>
          <strong>${player.nickname || "—"}</strong>
        </div>

        <div class="card profile-detail-card">
          <span class="profile-detail-label">Walk-on song</span>
          <strong>${player.walk_on_song || "—"}</strong>
        </div>

        <div class="card profile-detail-card profile-detail-wide">
          <span class="profile-detail-label">Bio</span>
          <div class="profile-detail-text">${player.bio || "No bio added yet."}</div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div><span class="kicker">Current form</span><h2>Season Stats</h2></div>
      </div>

      <div class="profile-stat-grid">
        <div class="card soft"><div class="stat-value">${stats.p}</div><div class="stat-label">Played</div></div>
        <div class="card soft"><div class="stat-value">${stats.w}</div><div class="stat-label">Won</div></div>
        <div class="card soft"><div class="stat-value">${stats.l}</div><div class="stat-label">Lost</div></div>
        <div class="card soft"><div class="stat-value">${stats.ld > 0 ? "+" : ""}${stats.ld}</div><div class="stat-label">Leg Difference</div></div>
        <div class="card soft"><div class="stat-value">${stats.avg === null ? "—" : stats.avg.toFixed(2)}</div><div class="stat-label">Season Avg</div></div>
        <div class="card soft"><div class="stat-value">${stats.highAvg === null ? "—" : stats.highAvg.toFixed(2)}</div><div class="stat-label">Highest Match Avg</div></div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div><span class="kicker">Latest</span><h2>Recent Results</h2></div>
      </div>

      <div class="card recent-results">
        ${recent.length
          ? recent.map(m => `
              <div class="recent-result">
                <div class="result-badge ${m.result === "W" ? "win" : "loss"}">${m.result}</div>
                <div class="recent-result-main">
                  <strong>${m.ownScore}–${m.oppScore} vs ${m.opponent}</strong>
                  <div class="small">Round ${m.round}${m.date ? ` • ${formatDate(m.date)}` : ""}</div>
                </div>
                <div class="recent-result-avg">
                  <span>Avg</span>
                  <strong>${m.average === null ? "—" : m.average.toFixed(2)}</strong>
                </div>
              </div>
            `).join("")
          : `<div class="muted">No completed matches yet.</div>`}
      </div>
    </section>`;
}

function renderPlayers() {
  return `
    <section class="section-head">
      <div>
        <span class="kicker">The field</span>
        <h2>Players</h2>
        <div class="small">Tap a player to view their profile, bio and latest stats.</div>
      </div>
      <div>
        ${state.user
          ? `<a class="btn secondary" href="#profile">My Profile</a>`
          : `<a class="btn secondary" href="#profile">Player Login</a>`}
      </div>
    </section>
    <div class="players-grid">
      ${state.players.map(playerCard).join("")}
    </div>`;
}

function renderProfileEditor() {
  if (!state.user) return renderPlayerLogin();

  const player = state.players.find(p => p.user_id === state.user.id);
  if (!player) {
    return `
      <section class="section-head">
        <div><span class="kicker">Your profile</span><h2>Player Profile</h2></div>
      </section>
      <div class="notice">
        Your login hasn't been linked to a player yet. Ask Adam to link your account in Supabase.
      </div>
      <div class="admin-toolbar">
        <button class="btn secondary" id="logoutBtn">Sign out</button>
      </div>`;
  }

  return `
    <section class="section-head">
      <div><span class="kicker">Your profile</span><h2>${player.name}</h2></div>
      <div class="small">Signed in as ${state.players.find(p => p.user_id === state.user.id)?.name || "SPL player"}</div>
    </section>

    <div class="card profile-editor">
      <div class="profile-preview">
        ${player.avatar_url
          ? `<img class="player-avatar large" src="${player.avatar_url}" alt="${player.name}">`
          : `<div class="player-avatar placeholder large">${initials(player.name)}</div>`}
      </div>

      <div class="field">
        <label>Nickname</label>
        <input id="profileNickname" type="text" maxlength="40" value="${player.nickname || ""}" placeholder="The Yorkshire Punisher">
      </div>

      <div class="field">
        <label>Walk-on song</label>
        <input id="profileWalkOn" type="text" maxlength="120" value="${player.walk_on_song || ""}" placeholder="Artist – Track">
      </div>

      <div class="field">
        <label>Bio</label>
        <textarea id="profileBio" maxlength="300" rows="5" placeholder="A few lines about your darts career...">${player.bio || ""}</textarea>
      </div>

      <div class="field">
        <label>Avatar</label>
        <input id="profileAvatar" type="file" accept="image/png,image/jpeg,image/webp">
        <div class="small">PNG, JPG or WebP. Keep it sensible — this is a darts league, not Getty Images.</div>
      </div>

      <div class="admin-toolbar">
        <button class="btn" id="saveProfileBtn">Save profile</button>
        <button class="btn secondary" id="logoutBtn">Sign out</button>
      </div>
      <div id="profileMessage" class="small"></div>
    </div>`;
}

async function saveProfile() {
  const player = state.players.find(p => p.user_id === state.user?.id);
  const msg = document.querySelector("#profileMessage");
  if (!player || !msg) return;

  msg.textContent = "Saving…";

  let avatarUrl = player.avatar_url || null;
  const file = document.querySelector("#profileAvatar")?.files?.[0];

  if (file) {
    if (file.size > 2 * 1024 * 1024) {
      msg.textContent = "Avatar is too large. Keep it under 2 MB.";
      return;
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${state.user.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await sb.storage
      .from("player-avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      msg.textContent = uploadError.message;
      return;
    }

    const { data } = sb.storage.from("player-avatars").getPublicUrl(path);
    avatarUrl = data.publicUrl;
  }

  const patch = {
    nickname: document.querySelector("#profileNickname")?.value.trim() || null,
    walk_on_song: document.querySelector("#profileWalkOn")?.value.trim() || null,
    bio: document.querySelector("#profileBio")?.value.trim() || null,
    avatar_url: avatarUrl
  };

  const { error } = await sb.rpc("update_own_player_profile", {
    p_nickname: patch.nickname,
    p_bio: patch.bio,
    p_walk_on_song: patch.walk_on_song,
    p_avatar_url: patch.avatar_url
  });

  if (error) {
    msg.textContent = error.message;
    return;
  }

  await loadData();
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
      <p>Ten Players. Nine rounds. First to five legs. Welcome to average darts at it's very best.</p>
    </section>

    <section class="section grid three">
      <div class="card soft">
        <div class="stat-value">${completedMatches()}/45</div>
        <div class="stat-label">Matches played</div>
      </div>
      <div class="card soft">
        <div class="stat-value">${completedMatches() > 0 && leader ? leader.player : "TBD"}</div>
        <div class="stat-label">
          ${completedMatches() > 0 && leader
            ? `Current league leader • ${leader.ld > 0 ? "+" : ""}${leader.ld} LD`
            : "Current league leader"}
        </div>
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
        <div class="small">Ranked by legs for, then leg difference</div>
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
      <div class="small">Most legs for wins; leg difference breaks ties. Equal on both = shared position.</div>
    </section>
    ${renderTable()}
    <section class="section grid three">
      <div class="card"><div class="stat-value">5</div><div class="stat-label">Legs needed to win a match</div></div>
      <div class="card"><div class="stat-value">45</div><div class="stat-label">Season matches</div></div>
      <div class="card"><div class="stat-value">9</div><div class="stat-label">Rounds</div></div>
    </section>`;
}

function renderPlayerLogin() {
  return `
    <section class="section-head">
      <div><span class="kicker">Players</span><h2>Player Login</h2></div>
      <div class="small">Choose your name and enter your SPL password.</div>
    </section>

    <div class="card login-card">
      <h3>Sign in</h3>
      <p class="muted">No email address needed. Pick your name and use the password you\'ve been given. Adam uses the separate Admin sign-in.</p>
      <div class="field">
        <label>Player</label>
        <select id="loginPlayer">
          <option value="">Select your name…</option>
          ${PLAYERS.filter(name => name !== "Adam England").map(name => `<option value="${name}">${name}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Password</label>
        <input id="loginPassword" type="password" autocomplete="current-password" placeholder="••••••••">
      </div>
      <div class="admin-toolbar">
        <button class="btn" id="loginBtn">Sign in</button>
      </div>
      <div id="loginMessage" class="small"></div>
      <div class="login-switch small">League administrator? <a href="#admin">Go to Admin login</a></div>
    </div>`;
}


function renderAdminLogin() {
  return `
    <section class="section-head">
      <div><span class="kicker">League control</span><h2>Admin Login</h2></div>
      <div class="small">Separate from player password accounts.</div>
    </section>

    <div class="card login-card">
      <h3>Admin sign in</h3>
      <p class="muted">Use your original Supabase admin account, or continue with Google if that is how the account was created.</p>

      <div class="field">
        <label>Email</label>
        <input id="adminEmail" type="email" autocomplete="email" placeholder="Admin email">
      </div>

      <div class="field">
        <label>Password</label>
        <input id="adminPassword" type="password" autocomplete="current-password" placeholder="••••••••">
      </div>

      <div class="admin-toolbar">
        <button class="btn" id="adminLoginBtn">Sign in with email</button>
        <button class="btn secondary" id="googleLoginBtn">Continue with Google</button>
      </div>

      <div id="adminLoginMessage" class="small"></div>
      <div class="login-switch small">Player account? <a href="#profile">Go to Player login</a></div>
    </div>`;
}

function renderAdmin() {
  if (!state.user) return renderAdminLogin();

  if (!state.isAdmin) {
    return `
      <section class="section-head">
        <div><span class="kicker">League control</span><h2>Admin</h2></div>
      </section>
      <div class="notice error">
        You are signed in, but this account does not have league-admin access.
      </div>
      <div class="admin-toolbar">
        <button class="btn secondary" id="logoutBtn">Sign out</button>
      </div>`;
  }

  return `
    <section class="section-head">
      <div><span class="kicker">League control</span><h2>Admin</h2></div>
      <div class="small">Signed in as ${state.players.find(p => p.user_id === state.user.id)?.name || "SPL player"}</div>
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
      <a class="btn secondary" href="#profile">My profile</a>
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

          <div class="section">${fixturesMarkup([round])}</div>
        </article>
      `).join("")}
    </div>`;
}

async function signInPlayer() {
  const playerName = document.querySelector("#loginPlayer")?.value;
  const password = document.querySelector("#loginPassword")?.value;
  const msg = document.querySelector("#loginMessage");

  if (!playerName || !password) {
    msg.textContent = "Choose your name and enter your password.";
    return;
  }

  const email = PLAYER_LOGIN_EMAILS[playerName];
  if (!email) {
    msg.textContent = "That player login is not configured.";
    return;
  }

  msg.textContent = "Signing in…";

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    msg.textContent = error.message || "Unable to sign in.";
    return;
  }

  await loadData();
}


async function signInAdmin() {
  const email = document.querySelector("#adminEmail")?.value.trim();
  const password = document.querySelector("#adminPassword")?.value;
  const msg = document.querySelector("#adminLoginMessage");

  if (!email || !password) {
    if (msg) msg.textContent = "Enter your admin email and password.";
    return;
  }

  if (msg) msg.textContent = "Signing in…";

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    if (msg) msg.textContent = error.message || "Unable to sign in.";
    return;
  }

  await loadData();
}

async function signInAdminWithGoogle() {
  const msg = document.querySelector("#adminLoginMessage");
  if (msg) msg.textContent = "Opening Google sign-in…";

  localStorage.setItem("spl_post_auth_route", "admin");

  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}${window.location.pathname}`
    }
  });

  if (error && msg) {
    localStorage.removeItem("spl_post_auth_route");
    msg.textContent = error.message || "Unable to start Google sign-in.";
  }
}

async function signOut() {
  await sb.auth.signOut();
  state.user = null;
  state.isAdmin = false;
  route();
}

async function regenerateFixtures() {
  if (state.fixturesLocked || !state.isAdmin || state.rounds.some(r=>r.fixtures.some(f=>f.status))) return;

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

function bindAdmin() {
  document.querySelector("#loginBtn")?.addEventListener("click", signInPlayer);
  document.querySelector("#loginPassword")?.addEventListener("keydown", e => {
    if (e.key === "Enter") signInPlayer();
  });

  document.querySelector("#adminLoginBtn")?.addEventListener("click", signInAdmin);
  document.querySelector("#adminPassword")?.addEventListener("keydown", e => {
    if (e.key === "Enter") signInAdmin();
  });
  document.querySelector("#googleLoginBtn")?.addEventListener("click", signInAdminWithGoogle);
  document.querySelector("#logoutBtn")?.addEventListener("click", signOut);
  document.querySelector("#saveProfileBtn")?.addEventListener("click", saveProfile);
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

function updateSiteAccount(){
 const link=document.getElementById('siteAccount');if(!link)return;
 const player=state.players.find(p=>p.user_id===state.user?.id);
 const name=state.user?(player?.name||'My account'):'Sign in';
 link.querySelector('.site-account-name').textContent=name;
 link.setAttribute('aria-label',state.user?`Account: ${name}`:'Sign in to your account');link.title=state.user?name+' · My account':'Sign in';
 const avatar=link.querySelector('.site-account-avatar');avatar.replaceChildren();avatar.textContent=state.user?name.split(/\s+/).map(x=>x[0]).slice(0,2).join(''):'↪';
 if(state.user&&player?.avatar_url){try{const url=new URL(player.avatar_url,location.href);if(['https:','http:'].includes(url.protocol)){const img=new Image();img.alt='';img.src=url.href;img.referrerPolicy='no-referrer';img.onerror=()=>{avatar.textContent=name.split(/\s+/).map(x=>x[0]).slice(0,2).join('');};avatar.replaceChildren(img);}}catch{}}
}
function route() {
  updateSiteAccount();
  const routeName = (location.hash || "#home").slice(1);
  if (routeName.startsWith("score/") && window.SPLFixture) {window.SPLFixture.open(decodeURIComponent(routeName.slice(6))); return;}
  window.SPLFixture?.close();
  document.body.classList.remove("fixture-scoring");

  document.querySelectorAll(".nav a").forEach(a => {
    a.classList.toggle("active", a.dataset.route === routeName);
  });

  const app = document.querySelector("#app");
  const hideSprint=window.SPL_CONFIG?.SPRINT_HIDE_SIGNED_OUT!==false;
  document.querySelectorAll('[data-route="sprint"],[data-route="clock"]').forEach(a=>{a.style.display=hideSprint&&!state.user?'none':'';});

  // Preserve the mounted game through auth refresh and league-data reloads.
  if (routeName === "sprint" || routeName === "clock") {
    if(hideSprint&&!state.user){document.body.classList.remove('sprint-mobile-playing');app.innerHTML='<section class="hero"><h1>Player games</h1><p>Sign in with your player account to play.</p><a class="btn" href="#profile">Player Login</a></section>';return;}
    if (document.getElementById("spl-sprint-frame") && document.getElementById("spl-sprint-frame").dataset.game !== routeName) app.replaceChildren();
    if (!document.getElementById("spl-sprint-frame")) {
      app.innerHTML = '<iframe id="spl-sprint-frame" title="SPL game and leaderboard" src="./' + (routeName==='clock'?'clock':'sprint') + '/?embedded=1&v=clock-release1" style="display:block;width:100%;height:1100px;border:0;background:transparent" scrolling="no"></iframe>';
    }
    document.getElementById('spl-sprint-frame').dataset.game=routeName;
    return;
  }


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
  } else if (routeName === "players") {
    app.innerHTML = renderPlayers();
  } else if (routeName.startsWith("player/")) {
    const playerName = decodeURIComponent(routeName.slice("player/".length));
    app.innerHTML = renderPlayerProfile(playerName);
  } else if ((routeName === "profile" || routeName === "account")) {
    app.innerHTML = renderProfileEditor();
    bindAdmin();
  } else if (routeName === "admin") {
    app.innerHTML = renderAdmin();
    bindAdmin();
  } else {
    app.innerHTML = renderHome();
  }
}

window.addEventListener("hashchange", route);

if (sb) {
  sb.auth.onAuthStateChange((_event,session) => {
    state.user=session?.user||null;route();
    setTimeout(() => loadData(), 0);
  });
}

loadData();


// Only accept sizing messages from this page's own same-origin game frame.
window.addEventListener("message", event => {
  const frame = document.getElementById("spl-sprint-frame");
  if (!frame || event.origin !== location.origin || event.source !== frame.contentWindow) return;
  if (event.data?.type !== "spl-sprint-height") return;
  const height = Number(event.data.height);
  if (Number.isFinite(height) && height >= 100 && height <= 20000) frame.style.height = Math.ceil(height) + "px";
});

// SPL mobile viewport and play focus. Only the embedded same-origin game can trigger it.
(()=>{
 const style=document.createElement('style');style.textContent='@media(max-width:650px){body.sprint-mobile-playing .site-header{min-height:44px;height:44px;padding:0;gap:0}body.sprint-mobile-playing .site-header .brand{display:none}body.sprint-mobile-playing .nav{display:flex;flex-wrap:nowrap;width:100%;overflow:auto;gap:0}body.sprint-mobile-playing .nav a{padding:10px 8px;font-size:12px;white-space:nowrap}body.sprint-mobile-playing .content{padding-top:8px}}';document.head.append(style);
 const send=()=>{const f=document.getElementById('spl-sprint-frame');if(!f)return;const h=window.visualViewport?.height||innerHeight;const header=document.querySelector('.site-header').getBoundingClientRect().height;f.contentWindow.postMessage({type:'spl-play-viewport',height:Math.max(240,h-header-18)},location.origin);};
 addEventListener('message',e=>{const f=document.getElementById('spl-sprint-frame');if(!f||e.source!==f.contentWindow||e.origin!==location.origin)return;
  if(e.data?.type==='spl-mobile-ready')send();
  if(e.data?.type==='spl-mobile-play'){document.body.classList.toggle('sprint-mobile-playing',!!e.data.active);requestAnimationFrame(()=>{send();if(e.data.active&&matchMedia('(max-width:650px)').matches){const y=f.getBoundingClientRect().top+scrollY-document.querySelector('.site-header').getBoundingClientRect().height-8;window.scrollTo({top:y,behavior:'instant'});}});}
 });
 addEventListener('resize',send);window.visualViewport?.addEventListener('resize',send);
 addEventListener('hashchange',()=>{if(!['#sprint','#clock'].includes(location.hash))document.body.classList.remove('sprint-mobile-playing');});
})();

