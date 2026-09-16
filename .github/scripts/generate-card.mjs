import { writeFileSync } from "node:fs";

const owner = process.env.GITHUB_REPOSITORY_OWNER || "pedayako";
const token = process.env.GITHUB_TOKEN;

const ROLE = "AI Engineer - CNPq fellow @ NCA/UFMA";
const LOCATION = "São Luís, Brasil";
const STACK = "Kotlin · Python · Java · Spring · Docker · AWS · Azure";
const SOCIAL = "LinkedIn · Lattes · Scholar · ORCID · last.fm";

const headers = {
  Authorization: `Bearer ${token}`,
  "User-Agent": "card-svg-script",
  Accept: "application/vnd.github+json",
};

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, { headers, ...opts });
  if (!res.ok) {
    throw new Error(`${url} -> ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function graphql(query, variables) {
  const res = await fetchJSON("https://api.github.com/graphql", {
    method: "POST",
    body: JSON.stringify({ query, variables }),
  });
  return res.data;
}

function escapeXML(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function getTotalCommits(login, createdAt) {
  const startYear = new Date(createdAt).getFullYear();
  const endYear = new Date().getFullYear();
  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) { totalCommitContributions }
      }
    }
  `;
  let total = 0;
  for (let year = startYear; year <= endYear; year++) {
    const data = await graphql(query, {
      login,
      from: `${year}-01-01T00:00:00Z`,
      to: `${year}-12-31T23:59:59Z`,
    });
    total += data.user.contributionsCollection.totalCommitContributions;
  }
  return total;
}

async function main() {
  const user = await fetchJSON(`https://api.github.com/users/${owner}`);
  const totalCommits = await getTotalCommits(owner, user.created_at);

  writeFileSync("assets/card.svg", renderSVG(owner, { totalCommits }));
}

function charWidth(text, fontSize) {
  return Math.ceil(text.length * fontSize * 0.6);
}

function renderSVG(owner, { totalCommits }) {
  const lines = [
    { x: 48, y: 80, size: 16, color: "#3DD673", markup: "$ whoami" },
    { x: 48, y: 112, size: 24, color: "#4F86D6", markup: escapeXML(owner), plain: owner },
    { x: 48, y: 156, size: 16, color: "#3DD673", markup: "$ cat role.txt" },
    { x: 48, y: 188, size: 19, color: "#C9CDD3", markup: escapeXML(ROLE), plain: ROLE },
    { x: 48, y: 212, size: 15, color: "#6B7280", markup: escapeXML(LOCATION), plain: LOCATION },
    { x: 48, y: 256, size: 16, color: "#3DD673", markup: "$ cat stack.txt" },
    { x: 48, y: 288, size: 18, color: "#C9CDD3", markup: escapeXML(STACK), plain: STACK },
    { x: 48, y: 332, size: 16, color: "#3DD673", markup: "$ git log --oneline | wc -l" },
    { x: 48, y: 372, size: 34, color: "#E5484D", markup: String(totalCommits) },
    { x: 48, y: 416, size: 16, color: "#3DD673", markup: "$ cat social.txt" },
    { x: 48, y: 448, size: 18, color: "#C9CDD3", markup: escapeXML(SOCIAL), plain: SOCIAL },
    { x: 48, y: 492, size: 16, color: "#3DD673", markup: "$" },
  ];

  let begin = 0.2;
  const clips = lines.map((l, i) => {
    const plain = l.plain ?? l.markup;
    const w = charWidth(plain, l.size) + 8;
    const dur = Math.max(0.2, Math.min(0.8, plain.length * 0.03));
    const clip = `<clipPath id="ln${i}"><rect x="${l.x}" y="${l.y - l.size}" width="0" height="${l.size + 8}"><animate attributeName="width" to="${w}" dur="${dur}s" begin="${begin.toFixed(2)}s" fill="freeze" calcMode="linear"/></rect></clipPath>`;
    begin += dur + 0.12;
    return clip;
  });
  const cursorDelay = (begin + 0.1).toFixed(2);

  const textEls = lines
    .map((l, i) => {
      const fill = l.color ? ` fill="${l.color}"` : "";
      return `<g clip-path="url(#ln${i})"><text x="${l.x}" y="${l.y}" font-family="'Courier New',ui-monospace,monospace" font-size="${l.size}"${fill}>${l.markup}</text></g>`;
    })
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 520" width="1200" height="520" role="img" aria-label="terminal de ${escapeXML(owner)}">
  <defs>
    <style>
      .cur { opacity: 0; animation: blink 1s steps(1) infinite; animation-delay: ${cursorDelay}s; }
      @keyframes blink { 0%,50% {opacity:1} 51%,100% {opacity:0} }
      @media (prefers-reduced-motion: reduce) { .cur { animation: none; opacity: 1; } }
    </style>
    <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="2" fill="#000" opacity=".18"/>
    </pattern>
    ${clips.join("\n    ")}
  </defs>

  <rect width="1200" height="520" rx="12" fill="#0A0E14"/>

  <rect width="1200" height="48" rx="12" fill="#10141B"/>
  <rect y="36" width="1200" height="12" fill="#10141B"/>
  <circle cx="26" cy="24" r="7" fill="#E5484D"/>
  <circle cx="48" cy="24" r="7" fill="#3DD673"/>
  <circle cx="70" cy="24" r="7" fill="#4F86D6"/>
  <text x="600" y="29" text-anchor="middle" font-family="'Courier New',ui-monospace,monospace" font-size="14" fill="#6B7280">${escapeXML(owner)}@github:~</text>
  <line x1="0" y1="48" x2="1200" y2="48" stroke="#232A35" stroke-width="1"/>

  ${textEls}

  <rect class="cur" x="60" y="476" width="11" height="18" fill="#3DD673"/>

  <rect width="1200" height="520" rx="12" fill="url(#scan)" opacity=".05"/>
  <rect x="1" y="1" width="1198" height="518" rx="12" fill="none" stroke="#3DD673" stroke-width="1.5" opacity=".35"/>
</svg>
`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
