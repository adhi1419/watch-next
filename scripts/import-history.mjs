// Import watch history — uses same JustWatch queries as the app
const API = "http://127.0.0.1:5174";
const GQL = "https://apis.justwatch.com/graphql";

const SEARCH = `query($q: String!) {
  popularTitles(country: "DE", first: 5, sortBy: POPULAR, sortRandomSeed: 0, filter: { searchQuery: $q, objectTypes: [SHOW] }) {
    edges { node { id objectType ... on Show { totalSeasonCount } content(country: "DE", language: "en") { title originalReleaseYear } } }
  }
}`;

const SEASONS = `query($id: ID!) {
  node(id: $id) { ... on Show { seasons { id content(country: "DE", language: "en") { seasonNumber } episodes { id content(country: "DE", language: "en") { episodeNumber seasonNumber } } } } }
}`;

async function search(name) {
  const r = await fetch(GQL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: SEARCH, variables: { q: name } }) });
  const d = await r.json();
  return d?.data?.popularTitles?.edges?.[0]?.node || null;
}

async function getSeasons(id) {
  const r = await fetch(GQL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: SEASONS, variables: { id } }) });
  const d = await r.json();
  return d?.data?.node?.seasons || [];
}

async function track(titleId, title, totalSeasons) {
  await fetch(`${API}/api/tracking`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titleId, title, posterUrl: "", objectType: "SHOW", totalSeasons }) });
}

async function markEps(titleId, eps) {
  if (!eps.length) return;
  await fetch(`${API}/api/tracking/${titleId}/episodes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ episodes: eps }) });
}

function epsUpTo(seasons, targetS, targetE) {
  const eps = [];
  for (const s of seasons) {
    const sn = s.content.seasonNumber;
    for (const e of s.episodes) {
      const en = e.content.episodeNumber, esn = e.content.seasonNumber;
      if (esn < targetS || (esn === targetS && en <= targetE)) eps.push({ season: esn, episode: en });
    }
  }
  return eps;
}

function allEps(seasons) {
  return seasons.flatMap(s => s.episodes.map(e => ({ season: e.content.seasonNumber, episode: e.content.episodeNumber })));
}

// --- DATA ---
const inProgress = [
  { name: "Rick and Morty", s: 8, e: 10 },
  { name: "Nobody Wants This", s: 1, e: 10 },
  { name: "Owning Manhattan", s: 1, e: 8 },
  { name: "Man Like Mobeen", s: 4, e: 4 },
  { name: "Attack on Titan", s: 3, e: 22 },
];

const stopped = [
  { name: "Assassination Classroom", s: 2, e: 3 },
  { name: "Blue Planet", s: 1, e: 2 },
];

const stoppedCustom = [
  { name: "Too Hot to Handle", seasons: [1, 6] }, // full seasons 1 and 6
];

const standups = { name: "The Standups", custom: { 1: [1,2], 2: [1,2,5,6], 3: "full" } };

const completed = [
  "The Four Seasons", "Selling Sunset", "Emily in Paris", "Indian Matchmaking",
  "Ginny & Georgia", "Mr & Mrs Smith", "Derry Girls", "The Queen's Gambit",
  "Baby Reindeer", "Mo", "Adolescence", "The Expanse", "The Last Dance",
  "Atypical", "The Perfect Couple", "Loudermilk", "Sex Education", "High Fidelity",
  "How I Met Your Father", "Schitt's Creek", "A Time Called You", "Disenchantment",
  "MH370", "Cunk on Earth", "Peaky Blinders",
  "The G Word with Adam Conover", "Brooklyn Nine-Nine", "Better Call Saul",
  "Dark", "Uncoupled", "After Life", "Queer Eye Germany", "Inventing Anna",
  "Unbreakable Kimmy Schmidt", "All or Nothing Tottenham Hotspur", "Fleabag",
  "Parks and Recreation", "The End of the Fucking World", "Mr. Robot",
  "The IT Crowd", "Community", "Californication", "Man with a Plan",
  "Code Geass", "The Office", "Silicon Valley",
  "Seinfeld", "Game of Thrones", "The Big Bang Theory", "Breaking Bad",
  "Coupling", "Disjointed", "Fullmetal Alchemist Brotherhood",
  "Sherlock", "Two and a Half Men", "How I Met Your Mother", "Friends", "Death Note",
];

// --- EXEC ---
const { Database } = await import("bun:sqlite");
const db = new Database("/local/home/adhitr/workplace/misc/netflix-recs/watched.db");

let ok = 0, fail = [];
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function importShow(name, targetS, targetE, status, customSeasons, customEps) {
  await delay(300); // rate limit
  const show = await search(name);
  if (!show) { fail.push(name); console.log(`❌ ${name} — not found`); return; }

  const id = show.id;
  const totalSeasons = show.totalSeasonCount || 0;
  await track(id, show.content.title, totalSeasons);

  const seasons = await getSeasons(id);
  await delay(200);

  let eps;
  if (customEps) {
    eps = [];
    for (const [sNum, val] of Object.entries(customEps)) {
      const s = seasons.find(s => s.content.seasonNumber === parseInt(sNum));
      if (!s) continue;
      if (val === "full") eps.push(...s.episodes.map(e => ({ season: e.content.seasonNumber, episode: e.content.episodeNumber })));
      else for (const en of val) eps.push({ season: parseInt(sNum), episode: en });
    }
  } else if (customSeasons) {
    eps = [];
    for (const sNum of customSeasons) {
      const s = seasons.find(s => s.content.seasonNumber === sNum);
      if (s) eps.push(...s.episodes.map(e => ({ season: e.content.seasonNumber, episode: e.content.episodeNumber })));
    }
  } else if (targetS === "all") {
    eps = allEps(seasons);
  } else {
    eps = epsUpTo(seasons, targetS, targetE);
  }

  await markEps(id, eps);

  if (status === "stopped") {
    db.run("UPDATE tracking SET status = 'stopped' WHERE title_id = ?", [id]);
  }

  ok++;
  console.log(`✅ ${show.content.title} (${eps.length} eps, ${status})`);
}

console.log("=== In Progress ===");
for (const s of inProgress) await importShow(s.name, s.s, s.e, "watching");

console.log("\n=== Stopped ===");
for (const s of stopped) await importShow(s.name, s.s, s.e, "stopped");
for (const s of stoppedCustom) await importShow(s.name, null, null, "stopped", s.seasons);

console.log("\n=== Standups (partial) ===");
await importShow(standups.name, null, null, "watching", null, standups.custom);

console.log("\n=== Completed ===");
for (const name of completed) await importShow(name, "all", null, "watching");

db.close();
console.log(`\n=== Done: ${ok} imported, ${fail.length} failed ===`);
if (fail.length) console.log("Failed:", fail);
