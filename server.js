// 희망나래장애인복지관 직업지원팀 안내 챗봇 서버
// 카카오톡 채널 챗봇(스킬 서버)으로 동작한다. 별도 설치 없이 Node.js만 있으면 실행된다.
// 안내 문구는 content.json에서만 고치면 되고, 이 파일은 고치지 않아도 된다.

const http = require("http");
const fs = require("fs");
const path = require("path");

const CONTENT_PATH = path.join(__dirname, "content.json");
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

function buttonsFor(items) {
  // 카카오 규칙: 버튼 이름은 14자 이하, 최대 10개. '처음으로' 버튼 한 자리를 남긴다.
  const list = items.slice(0, 9).map((m) => ({
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

function callCard(org) {
  return {
    basicCard: {
      title: `${org.이름} ${org.팀}`,
      description: `문의 전화 ${org.문의번호}\n${org.운영시간}`,
      buttons: [{ action: "phone", label: "전화 걸기", phoneNumber: org.문의번호.replace(/-/g, "") }],
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

function answer(utterance) {
  const content = loadContent();
  const org = content.기관;
  const top = content.메뉴;
  const u = (utterance || "").trim();

  if (!u || HOME_WORDS.includes(u)) return reply([text(content.첫인사)], buttonsFor(top));

  const node = findNode(flatten(top), u);
  if (!node) return reply([text(fillTemplate(content.답변못찾음, org)), callCard(org)], buttonsFor(top));

  const { item, parent } = node;
  const outputs = [text(fillTemplate(item.답변, org))];
  if (item.전화버튼) outputs.push(callCard(org));

  // 하위 메뉴가 있으면 그 메뉴를, 없으면 같은 단계의 다른 메뉴를 버튼으로 보여준다.
  const buttons = item.하위 ? buttonsFor(item.하위) : buttonsFor(parent ? parent.하위 : top);
  return reply(outputs, buttons);
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("희망나래장애인복지관 직업지원팀 챗봇 서버가 켜져 있습니다.");
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
      res.end(JSON.stringify(answer(utterance)));
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
