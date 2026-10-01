// 검토용 문서를 만든다. 실행: node export-review.js
// content.json의 모든 안내 문구를 읽기 쉬운 형태로 모아 "검토용_안내문구.md" 파일로 저장한다.
const fs = require("fs");
const content = JSON.parse(fs.readFileSync("content.json", "utf8"));
const org = content.기관;
const fill = (t) => t.replace(/\{(.+?)\}/g, (w, k) => org[k] ?? w);
const lines = [`# ${org.이름} ${org.팀} 안내 챗봇 검토용 문구`, "", "※ 이 문서는 content.json에서 자동으로 만든 것이다. 고칠 곳은 이 문서에 표시해 알려주면 된다.", ""];
const walk = (items, depth) => {
  for (const m of items) {
    lines.push(`${"#".repeat(depth)} ${m.제목}`, "", fill(m.답변), "");
    if (m.전화버튼) lines.push(`(전화 걸기 버튼: ${org.문의번호})`, "");
    if (m.하위) walk(m.하위, depth + 1);
  }
};
lines.push("## 첫 인사", "", fill(content.첫인사), "", "## 답을 찾지 못했을 때", "", fill(content.답변못찾음), "");
walk(content.메뉴, 2);
fs.writeFileSync("검토용_안내문구.md", lines.join("\n"), "utf8");
console.log("검토용_안내문구.md 저장 완료");
