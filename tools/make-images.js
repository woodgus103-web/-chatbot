// 고용 서비스 절차 그림을 만드는 도구이다. (챗봇 운영에는 필요 없고, 그림을 다시 만들 때만 쓴다.)
// 필요한 것: playwright, @fontsource/noto-sans-kr (글꼴, OFL 라이선스)
// 실행 예: FONT_CSS_DIR=/경로/node_modules/@fontsource/noto-sans-kr node tools/make-images.js
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const FONT_DIR = process.env.FONT_CSS_DIR;
if (!FONT_DIR) throw new Error("FONT_CSS_DIR 환경변수에 글꼴 폴더를 지정해 주세요.");
const OUT_DIR = path.join(__dirname, "..", "public", "images");

const NOTE = "사업체 쪽에서는 지역사회 사업체 개발, 사업체 정보 분석, 직무 분석을 거쳐 구직자와의 적합성을 비교합니다.";

const sheets = [
  {
    file: "employment-general.png",
    title: "일반고용 절차",
    color: "#1F4E8C",
    steps: [
      { text: "구직장애인 특성 분석" },
      { text: "구직 욕구 조사" },
      { text: "적합성 비교 분석", note: NOTE },
      { text: "면접" },
      { text: "취업", last: true },
    ],
  },
  {
    file: "employment-support.png",
    title: "지원고용 절차",
    color: "#1B6B5A",
    steps: [
      { text: "구직장애인 특성 분석\n구직 욕구 조사" },
      { text: "적합성 비교 분석", note: NOTE },
      { text: "지원 계획 수립" },
      { text: "면접 및 배치" },
      { text: "현장훈련 및 지원" },
      { text: "취업", last: true },
    ],
  },
];

function html(sheet) {
  const items = sheet.steps
    .map((s, i) => {
      const box = `<div class="step ${s.last ? "last" : ""}"><span class="num">${i + 1}</span><span class="txt">${s.text.replace(/\n/g, "<br>")}</span></div>`;
      const note = s.note ? `<div class="note">${s.note}</div>` : "";
      const arrow = i < sheet.steps.length - 1 ? `<div class="arrow">▼</div>` : "";
      return box + note + arrow;
    })
    .join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="file://${FONT_DIR}/500.css">
<link rel="stylesheet" href="file://${FONT_DIR}/700.css">
<style>
  :root { --c: ${sheet.color}; }
  * { box-sizing: border-box; margin: 0; }
  body { width: 900px; background: #ffffff; font-family: 'Noto Sans KR', sans-serif; color: #1a1a1a; padding: 48px 56px 40px; }
  h1 { font-size: 52px; font-weight: 700; color: var(--c); text-align: center; margin-bottom: 36px; }
  .step { display: flex; align-items: center; gap: 24px; background: #eef3f9; border: 4px solid var(--c); border-radius: 22px; padding: 22px 28px; }
  .step.last { background: var(--c); }
  .step.last .txt { color: #ffffff; }
  .step.last .num { background: #ffffff; color: var(--c); }
  .num { flex: none; width: 60px; height: 60px; border-radius: 50%; background: var(--c); color: #ffffff; font-size: 34px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .txt { font-size: 42px; font-weight: 700; line-height: 1.35; }
  .arrow { text-align: center; color: var(--c); font-size: 34px; line-height: 1.5; }
  .note { margin: 14px 0 0; padding: 16px 22px; font-size: 30px; font-weight: 500; line-height: 1.45; color: #333333; background: #fff8e1; border-left: 8px solid #e0a800; border-radius: 10px; }
  .note + .arrow { margin-top: 4px; }
  footer { margin-top: 30px; text-align: center; font-size: 30px; font-weight: 500; color: #444444; }
</style></head><body>
<h1>${sheet.title}</h1>
${items}
<footer>희망나래장애인복지관 직업지원팀</footer>
</body></html>`;
}

// 카카오 카드(전화·바로가기)에 붙는 작은 그림이다. 카카오 규격상 카드에는 그림이 꼭 있어야 한다. (800×400)
const cards = [
  { file: "card-phone.png", color: "#1F4E8C", icon: "☎", title: "전화로 문의", sub: "희망나래장애인복지관 직업지원팀" },
  { file: "card-form.png", color: "#1B6B5A", icon: '<svg width="140" height="100" viewBox="0 0 140 100"><rect x="4" y="4" width="132" height="92" rx="10" fill="none" stroke="#fff" stroke-width="8"/><path d="M8 12 L70 58 L132 12" fill="none" stroke="#fff" stroke-width="8" stroke-linejoin="round"/></svg>', title: "연락 요청", sub: "희망나래장애인복지관 직업지원팀" },
];

function cardHtml(c) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="file://${FONT_DIR}/500.css">
<link rel="stylesheet" href="file://${FONT_DIR}/700.css">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 800px; height: 400px; background: ${c.color}; color: #ffffff; font-family: 'Noto Sans KR', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
  .icon { font-size: 110px; line-height: 1; }
  .title { font-size: 64px; font-weight: 700; }
  .sub { font-size: 30px; font-weight: 500; opacity: 0.9; }
</style></head><body>
<div class="icon">${c.icon}</div><div class="title">${c.title}</div><div class="sub">${c.sub}</div>
</body></html>`;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const cardPage = await browser.newPage({ viewport: { width: 800, height: 400 }, deviceScaleFactor: 1 });
  for (const c of cards) {
    const tmp = path.join(OUT_DIR, "_tmp.html");
    fs.writeFileSync(tmp, cardHtml(c), "utf8");
    await cardPage.goto("file://" + tmp);
    await cardPage.evaluate(() => document.fonts.ready);
    await cardPage.waitForTimeout(500);
    await cardPage.screenshot({ path: path.join(OUT_DIR, c.file) });
    fs.unlinkSync(tmp);
    console.log("저장:", c.file);
  }
  const page = await browser.newPage({ viewport: { width: 900, height: 800 }, deviceScaleFactor: 1 });
  for (const sheet of sheets) {
    const tmp = path.join(OUT_DIR, "_tmp.html");
    fs.writeFileSync(tmp, html(sheet), "utf8");
    await page.goto("file://" + tmp);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, sheet.file), fullPage: true });
    fs.unlinkSync(tmp);
    console.log("저장:", sheet.file);
  }
  await browser.close();
})();
