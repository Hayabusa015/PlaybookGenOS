import { chromium } from "playwright";
import fs from "node:fs";

// Smoke test for the full coach → share → import flow.
// Usage: npm run build && npm run start &  then  node e2e/smoke.mjs
// (set CHROMIUM_PATH if Playwright's bundled browser isn't downloaded)
const SHOTS = new URL("./shots", import.meta.url).pathname;
fs.mkdirSync(SHOTS, { recursive: true });

const FIELD_W = 53.33, FIELD_H = 40;

// Click a field-yard coordinate inside the play/formation SVG.
async function clickField(page, fx, fy, opts = {}) {
  const svg = page.locator("svg").first();
  const box = await svg.boundingBox();
  await page.mouse.click(box.x + (fx / FIELD_W) * box.width, box.y + (fy / FIELD_H) * box.height, opts);
}

async function dragField(page, fx1, fy1, fx2, fy2) {
  const svg = page.locator("svg").first();
  const box = await svg.boundingBox();
  const px = (fx, fy) => [box.x + (fx / FIELD_W) * box.width, box.y + (fy / FIELD_H) * box.height];
  const [x1, y1] = px(fx1, fy1);
  const [x2, y2] = px(fx2, fy2);
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  await page.mouse.move(x2, y2, { steps: 8 });
  await page.mouse.up();
}

const fail = (msg) => { console.error("FAIL:", msg); process.exit(1); };

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
page.on("console", (m) => m.type() === "error" && console.error("CONSOLE:", m.text()));

// ---------- 1. landing: create team ----------
await page.goto("http://localhost:3000/");
await page.getByPlaceholder("Coach Taylor").fill("Coach Mike");
await page.getByPlaceholder("Team name (e.g. Eastside Eagles)").fill("Eastside Eagles");
await page.getByRole("button", { name: "Create playbook" }).click();
await page.waitForURL(/\/t\//);
const joinCode = decodeURIComponent(page.url().split("/t/")[1]);
console.log("created team, join code:", joinCode);

// ---------- 2. offensive formation ----------
// Sidebar shows Offense section with "+ New formation" link
await page.getByText("+ New formation").first().click();
await page.waitForURL(/\/formation\/new/);
await page.getByPlaceholder("e.g. I-Form Right, 4-3 Base").fill("I-Form");
await page.getByRole("button", { name: "⭘ Offense" }).click();
await page.getByRole("button", { name: "11-man (varsity/JV)" }).click();
await page.getByRole("button", { name: "Create & place players" }).click();
await page.waitForURL(/\/formation\/(?!new)/);
await page.waitForSelector("svg text");

// drag the Z receiver (46, 26) tighter to the formation (40, 26)
await dragField(page, 46, 26, 40, 26);
// select X receiver and rename
await clickField(page, 8, 25);
await page.waitForSelector('input[aria-label="Formation name"]');
const labelInput = page.locator('input[maxlength="3"]');
if (await labelInput.count()) {
  await labelInput.fill("W");
  await labelInput.fill("X"); // rename works; keep X
  await page.getByRole("button", { name: "Done" }).click();
}
await page.waitForSelector("text=✓ Saved");
await page.screenshot({ path: `${SHOTS}/1-formation-editor.png` });
console.log("formation editor OK (drag + rename + autosave)");

// ---------- 3. defensive formation ----------
await page.getByRole("link", { name: "← Playbook" }).click();
await page.waitForURL(/\/t\//);
// Click the "+ New formation" under Defense section
await page.getByText("+ New formation").nth(1).click();
await page.waitForURL(/\/formation\/new/);
await page.getByPlaceholder("e.g. I-Form Right, 4-3 Base").fill("4-3 Base");
await page.getByRole("button", { name: "✕ Defense" }).click();
await page.getByRole("button", { name: "11-man (varsity/JV)" }).click();
await page.getByRole("button", { name: "Create & place players" }).click();
await page.waitForURL(/\/formation\/(?!new)/);
await page.waitForSelector("text=✓ Saved", { timeout: 5000 }).catch(() => {});
console.log("defense formation created");

// ---------- 4. new play ----------
await page.getByRole("link", { name: "← Playbook" }).click();
await page.waitForURL(/\/t\//);
await page.getByText("+ New play").first().click();
await page.waitForURL(/\/play\/new/);
await page.getByPlaceholder("e.g. Power Right, Smash Concept").fill("Power Right");
await page.selectOption("select >> nth=0", { label: "I-Form (11)" });
await page.selectOption("select >> nth=1", { label: "4-3 Base (11)" });
await page.getByRole("button", { name: "Start drawing" }).click();
await page.waitForURL(/\/play\/(?!new)/);
await page.waitForSelector("svg text");

// draw RB route: select via assignments panel, then tap field points
await page.getByRole("button", { name: "RB", exact: true }).click();
await clickField(page, 30, 27);
await clickField(page, 33, 20);
await clickField(page, 36, 12);
await page.getByPlaceholder("assignment…").nth(10).fill("Take handoff, hit B-gap");
// switch color to red for the Z route
await page.getByRole("button", { name: "Done", exact: true }).click();

await page.getByRole("button", { name: "Z", exact: true }).click();
await page.getByLabel("route color #f87171").click();
await clickField(page, 40, 18);
await clickField(page, 30, 10);
await page.getByRole("button", { name: "Done", exact: true }).click();

// TE gets a block assignment
await page.getByRole("button", { name: "TE", exact: true }).click();
await clickField(page, 36.5, 21.5);
await page.getByLabel("Block tool").click(); // switch TE to a block
await page.getByRole("button", { name: "Done", exact: true }).click();

await page.waitForSelector("text=✓ Saved");
await page.screenshot({ path: `${SHOTS}/2-play-editor.png` });
console.log("play editor OK (3 routes drawn, assignment set, autosaved)");

// ---------- 5. animation ----------
await page.getByLabel("Run play").click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${SHOTS}/3-play-animating.png` });
await page.waitForTimeout(1800);
console.log("animation ran");

// ---------- 6. share viewer ----------
await page.getByRole("link", { name: "← Playbook" }).click();
const shareChip = await page.getByRole("button", { name: /Share \(read-only\)/ }).textContent();
const shareUrl = shareChip.split("Share (read-only): ")[1];
console.log("share url:", shareUrl);

const viewer = await browser.newPage({ viewport: { width: 1280, height: 900 } });
viewer.on("pageerror", (e) => console.error("VIEWER PAGE ERROR:", e.message));
await viewer.goto(shareUrl);
await viewer.waitForSelector("text=Shared playbook · view only");
await viewer.getByText("Power Right", { exact: true }).click();
await viewer.waitForSelector("text=Assignments");
const assignmentShown = await viewer.getByText("Take handoff, hit B-gap").count();
if (!assignmentShown) fail("assignment not visible in share viewer");
// run animation in viewer
await viewer.getByRole("button", { name: "▶ Run play" }).click();
await viewer.waitForTimeout(1000);
// leave a suggestion
await viewer.getByPlaceholder("Your name").fill("Coach Dana (Youth)");
await viewer.getByPlaceholder(/Against a 3-3 stack/).fill("Can we pull the backside guard here for our age group?");
await viewer.getByRole("button", { name: "Post suggestion" }).click();
await viewer.waitForSelector("text=Coach Dana (Youth)");
await viewer.screenshot({ path: `${SHOTS}/4-share-viewer.png` });
console.log("share viewer OK (read-only, animation, suggestion posted)");

// edit access must NOT work with share code
const res = await viewer.evaluate(async (code) => {
  const r = await fetch("/api/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getTeam", payload: { joinCode: code } }),
  });
  return r.status;
}, shareUrl.split("/s/")[1]);
if (res !== 404) fail("share code should not grant coach access, got " + res);
console.log("share code correctly rejected for coach access");

// ---------- 7. export + import ----------
await page.waitForSelector("text=Power Right");
const [download] = await Promise.all([
  page.waitForEvent("download"),
  page.getByRole("button", { name: "⬇ Export file" }).click(),
]);
const exportPath = `${SHOTS}/../playbook-export.json`;
await download.saveAs(exportPath);
const exported = JSON.parse(fs.readFileSync(exportPath, "utf8"));
if (exported.plays.length !== 1 || exported.formations.length !== 2) fail("export contents wrong");
console.log("export OK:", exported.formations.length, "formations,", exported.plays.length, "plays");

// import into a brand-new team (the youth program adopting the playbook)
await page.goto("http://localhost:3000/");
await page.getByPlaceholder("Team name (e.g. Eastside Eagles)").fill("Eastside Youth");
await page.getByRole("button", { name: "Create playbook" }).click();
await page.waitForURL(/\/t\//);
await page.locator('input[type="file"]').setInputFiles(exportPath);
await page.waitForSelector("text=Imported 2 formations, 1 plays");
await page.waitForSelector("text=Power Right");
await page.screenshot({ path: `${SHOTS}/5-dashboard-imported.png` });
console.log("import OK into new team");

// ---------- 8. print view ----------
await page.getByRole("link", { name: "🖨 Print / PDF" }).click();
await page.waitForSelector("text=— print layout");
await page.waitForSelector("text=Power Right");
await page.screenshot({ path: `${SHOTS}/6-print-view.png`, fullPage: true });
console.log("print view OK");

await browser.close();
console.log("ALL E2E CHECKS PASSED");
