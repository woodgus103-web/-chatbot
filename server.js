// 희망나래장애인복지관 직업지원팀 안내 챗봇 서버
// 카카오톡 채널 챗봇(스킬 서버)으로 동작한다. 별도 설치 없이 Node.js만 있으면 실행된다.
// 안내 문구는 content.json에서만 고치면 되고, 이 파일은 고치지 않아도 된다.

const http = require("http");
const fs = require("fs");
const path = require("path");

const CONTENT_PATH = path.join(__dirname, "content.json");
const PORT = process.env.PORT || 3000;
const HOME_WORDS = ["처음으로", "시작", "메뉴", "안녕", "안녕하세요", "도움말"];

function loadContent() {
  // 요청마다 다시 읽어서, 내용을 고치면 서버를 다시 켜지 않아도 반영된다.
  return JSON.parse(fs.readFileSync(CONTENT_PATH, "utf8"));
}

function fillTemplate(text, org) {
  return text.replace(/\{(.+?)\}/g, (whole, key) => org[key] ?? whole);
}

function quickReplies(content) {
  // 카카오 규칙: 버튼 이름은 14자 이하, 최대 10개
  const items = content.메뉴.map((m) => ({
    label: m.제목,
    action: "message",
    messageText: m.제목,
  }));
  items.push({ label: "처음으로", action: "message", messageText: "처음으로" });
  return items.slice(0, 10);
}

function reply(outputs, content) {
  return {
    version: "2.0",
    template: { outputs, quickReplies: quickReplies(content) },
  };
}

function text(t) {
  return { simpleText: { text: t.slice(0, 1000) } };
}

function callCard(org) {
  return {
    basicCard: {
      title: `${org.이름} ${org.팀}`,
      description: `대표번호 ${org.대표번호}\n${org.운영시간}`,
      buttons: [{ action: "phone", label: "전화 걸기", phoneNumber: org.대표번호.replace(/-/g, "") }],
    },
  };
}

function findMenu(content, utterance) {
  const u = utterance.replace(/\s+/g, "");
  // 1순위: 버튼 이름과 정확히 같은 경우
  const exact = content.메뉴.find((m) => m.제목.replace(/\s+/g, "") === u);
  if (exact) return exact;
  // 2순위: 키워드가 문장 안에 들어 있는 경우. 맞은 키워드가 가장 많고 긴 항목을 고른다.
  let best = null;
  let bestScore = 0;
  for (const m of content.메뉴) {
    const score = m.키워드
      .map((k) => k.replace(/\s+/g, ""))
      .filter((k) => u.includes(k))
      .reduce((sum, k) => sum + k.length, 0);
    if (score > bestScore) {
      best = m;
      bestScore = score;
    }
  }
  return best;
}

function answer(utterance) {
  const content = loadContent();
  const org = content.기관;
  const u = (utterance || "").trim();

  if (!u || HOME_WORDS.includes(u)) return reply([text(content.첫인사)], content);

  const menu = findMenu(content, u);
  if (!menu) return reply([text(fillTemplate(content.답변못찾음, org)), callCard(org)], content);

  const outputs = [text(fillTemplate(menu.답변, org))];
  if (menu.전화버튼) outputs.push(callCard(org));
  return reply(outputs, content);
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
