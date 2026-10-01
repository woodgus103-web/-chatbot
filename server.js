// 희망나래장애인복지관 직업지원팀 안내 챗봇 서버
// 카카오톡 채널 챗봇(스킬 서버)으로 동작한다. 별도 설치 없이 Node.js만 있으면 실행된다.
// 안내 문구는 content.json에서만 고치면 되고, 이 파일은 고치지 않아도 된다.

const http = require("http");
const fs = require("fs");
const path = require("path");

const CONTENT_PATH = path.join(__dirname, "content.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = process.env.PORT || 3000;
const HOME_WORDS = ["처음으로", "시작", "메뉴", "안녕", "안녕하세요", "도움말", "웰컴", "welcome", "Welcome"];

function loadContent() {
  // 요청마다 다시 읽어서, 내용을 고치면 서버를 다시 켜지 않아도 반영된다.
  return JSON.parse(fs.readFileSync(CONTENT_PATH, "utf8"));
}

function fillTemplate(text, org) {
  return text.replace(/\{(.+?)\}/g, (whole, key) => org[key] ?? whole);
}

// 메뉴를 한 줄로 펼치면서 각 항목이 어느 메뉴 아래에 있는지(부모)를 기록한다.
function flatten(items, parent = null, out = []) {
  for (const item of items) {
    out.push({ item, parent });
    if (item.하위) flatten(item.하위, item, out);
  }
  return out;
}

const squash = (s) => s.replace(/\s+/g, "");

// 지금이 운영시간인지 확인한다. 한국 시간(UTC+9) 기준이며, 요일·시간·휴무일은 content.json의 "운영"에서 정한다.
function isOpenNow(content, now) {
  const op = content.운영;
  if (!op) return true;
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const date = kst.toISOString().slice(0, 10);
  const minutes = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
  if (!op.요일.includes(kst.getUTCDay())) return false;
  if ((op.휴무일 || []).includes(date)) return false;
  return minutes >= toMin(op.시작) && minutes < toMin(op.끝);
}

function buttonsFor(items, open = true, afterHoursItem = null) {
  // 운영시간 외에만 보이는 버튼(연락 요청)은 운영시간 중에는 숨기고, 운영시간 외에는 모든 화면에 붙인다.
  let shown = items.filter((m) => !(m.운영시간외에만표시 && open));
  if (!open && afterHoursItem && !shown.includes(afterHoursItem)) shown = [...shown, afterHoursItem];
  // 카카오 규칙: 버튼 이름은 14자 이하, 최대 10개. '처음으로' 버튼 한 자리를 남긴다.
  const list = shown.slice(0, 9).map((m) => ({
    label: m.제목,
    action: "message",
    messageText: m.제목,
  }));
  list.push({ label: "처음으로", action: "message", messageText: "처음으로" });
  return list;
}

function reply(outputs, buttons) {
  return { version: "2.0", template: { outputs, quickReplies: buttons } };
}

function text(t) {
  return { simpleText: { text: t.slice(0, 1000) } };
}

function imageOutput(baseUrl, img) {
  return { simpleImage: { imageUrl: `${baseUrl}/images/${encodeURIComponent(img.파일)}`, altText: img.설명 } };
}

function linkCard(link) {
  return {
    basicCard: {
      title: link.카드제목,
      description: link.카드설명,
      buttons: [{ action: "webLink", label: link.버튼, webLinkUrl: link.주소 }],
    },
  };
}

function callCard(org, key = "문의번호") {
  const number = org[key];
  return {
    basicCard: {
      title: `${org.이름} ${org.팀}`,
      description: `문의 전화 ${number}\n${org.운영시간}`,
      buttons: [{ action: "phone", label: "전화 걸기", phoneNumber: number.replace(/-/g, "") }],
    },
  };
}

function findNode(nodes, utterance) {
  const u = squash(utterance);
  // 1순위: 버튼 이름과 정확히 같은 경우
  const exact = nodes.find((n) => squash(n.item.제목) === u);
  if (exact) return exact;
  // 2순위: 키워드가 문장 안에 들어 있는 경우.
  // 세부 항목(하위 메뉴가 없는 항목)을 먼저 찾고, 없을 때만 상위 메뉴를 고른다.
  const pick = (candidates) => {
    let best = null;
    let bestScore = 0;
    for (const n of candidates) {
      const score = n.item.키워드
        .map(squash)
        .filter((k) => u.includes(k))
        .reduce((sum, k) => sum + k.length, 0);
      if (score > bestScore) {
        best = n;
        bestScore = score;
      }
    }
    return best;
  };
  return pick(nodes.filter((n) => !n.item.하위)) || pick(nodes.filter((n) => n.item.하위));
}

// 운영시간 외에 전화번호를 안내하는 답변에는 안내 문구를 덧붙인다.
function withNotice(base, content, org, open) {
  if (open || !content.운영시간외안내) return base;
  const notice = fillTemplate(content.운영시간외안내, org);
  return `${base.slice(0, Math.max(0, 1000 - notice.length - 2))}\n\n${notice}`;
}

function answer(utterance, baseUrl = "", now = new Date()) {
  const content = loadContent();
  const org = content.기관;
  const top = content.메뉴;
  const open = isOpenNow(content, now);
  const flat = flatten(top);
  const afterHours = (flat.find((n) => n.item.운영시간외에만표시) || {}).item || null;
  const u = (utterance || "").trim();

  if (!u || HOME_WORDS.includes(u)) {
    return reply([text(withNotice(content.첫인사, content, org, open))], buttonsFor(top, open, afterHours));
  }

  const node = findNode(flat, u);
  if (!node) {
    return reply([text(withNotice(fillTemplate(content.답변못찾음, org), content, org, open)), callCard(org)], buttonsFor(top, open, afterHours));
  }

  const { item, parent } = node;
  const hasPhone = item.전화버튼 || /\{(고용)?문의번호\}/.test(item.답변);
  const base = fillTemplate(item.답변, org);
  let outputs = [text(hasPhone && !item.운영시간외에만표시 ? withNotice(base, content, org, open) : base)];
  // 외부 링크(예: 연락 요청 양식)가 있으면 카드로 붙인다. 주소가 https로 시작하지 않으면 '준비 중' 안내를 보낸다.
  if (item.링크) {
    if (/^https:\/\//.test(item.링크.주소 || "")) outputs.push(linkCard(item.링크));
    else outputs = [text(fillTemplate(item.링크.준비중답변, org)), callCard(org)];
  }
  // 그림이 있으면 글 안내 뒤에 붙인다. 글이 먼저 나가므로 그림이 안 보이는 환경에서도 내용을 알 수 있다.
  if (baseUrl && item.이미지) for (const img of item.이미지) outputs.push(imageOutput(baseUrl, img));
  if (item.전화버튼) outputs.push(callCard(org, item.문의번호키 || (parent && parent.문의번호키) || "문의번호"));

  // 하위 메뉴가 있으면 그 메뉴를, 없으면 같은 단계의 다른 메뉴를 버튼으로 보여준다.
  const buttons = item.하위 ? buttonsFor(item.하위, open, afterHours) : buttonsFor(parent ? parent.하위 : top, open, afterHours);
  return reply(outputs, buttons);
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("희망나래장애인복지관 직업지원팀 챗봇 서버가 켜져 있습니다.");
  }
  if (req.method === "GET" && req.url.startsWith("/images/")) {
    // public/images 폴더 안의 파일만 내보낸다. (폴더 밖 접근 차단)
    const name = path.basename(decodeURIComponent(req.url.slice("/images/".length).split("?")[0]));
    const file = path.join(PUBLIC_DIR, "images", name);
    if (!/\.(png|jpg|jpeg)$/i.test(name) || !fs.existsSync(file)) {
      res.writeHead(404);
      return res.end();
    }
    const type = /\.png$/i.test(name) ? "image/png" : "image/jpeg";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "public, max-age=3600" });
    return fs.createReadStream(file).pipe(res);
  }
  if (req.method === "POST" && req.url === "/skill") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      let utterance = "";
      try {
        utterance = JSON.parse(body).userRequest.utterance;
      } catch (e) {
        // 형식이 다르면 빈 문장으로 보고 첫 인사를 보낸다.
      }
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      const base = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `https://${req.headers["x-forwarded-host"] || req.headers.host}`;
      res.end(JSON.stringify(answer(utterance, base)));
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`챗봇 서버 실행 중: http://localhost:${PORT}`));
}

module.exports = { answer };
