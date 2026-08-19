import { chromium } from "@playwright/test";

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await (
  await browser.newContext({ viewport: { width: 1600, height: 1000 } })
).newPage();
await page.goto("http://localhost:4500/run-in-browser.html", { waitUntil: "networkidle" });
await page.waitForSelector("#model-summary:not([hidden])");
await page.click("#generate");
await page.waitForSelector("#result.is-shown .tally");
await page.click("#run");
await page.waitForSelector("#stage.is-shown");
console.log("iframe box:", JSON.stringify(await (await page.$("#frame")).boundingBox()));
console.log(
  "content width:",
  await page.evaluate(() => document.querySelector(".content").getBoundingClientRect().width)
);
const frame = await (await page.$("#frame")).contentFrame();
await frame.waitForSelector(".login__form", { timeout: 240000 });
await frame.fill("#email", "admin@admin.com");
await frame.fill("#password", "admin");
await frame.click(".login__form button[type=submit]");
await frame.waitForSelector(".shell__nav", { timeout: 90000 });
console.log("app inner width:", await frame.evaluate(() => window.innerWidth));
await frame.click('a[data-route="/entity/account"]');
await frame.waitForSelector(".toolbar .button--primary");
await frame.click(".toolbar .button--primary");
await frame.waitForSelector(".form__grid", { timeout: 20000 });
const info = await frame.evaluate(() => {
  const el = document.getElementById("field-name");
  if (!el)
    return {
      found: false,
      ids: [...document.querySelectorAll(".field__input")].map((e) => e.id).slice(0, 6),
    };
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return {
    found: true,
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    display: cs.display,
    visibility: cs.visibility,
    disabled: el.disabled,
    docH: document.documentElement.scrollHeight,
    winH: window.innerHeight,
  };
});
console.log("field-name:", JSON.stringify(info));
try {
  await frame.fill("#field-name", "Probe Co", { timeout: 12000 });
  console.log("fill: OK");
} catch (e) {
  console.log("fill FAILED:", e.message.split("\n").slice(0, 4).join(" | "));
}
await page.screenshot({ path: "/tmp/qa/probe.png" });
await browser.close();
