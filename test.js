// 챗봇이 질문마다 제대로 답하는지 확인하는 시험 파일이다. 실행: node test.js
const assert = require("assert");
const { answer } = require("./server");

const firstText = (r) => r.template.outputs[0].simpleText.text;

// 첫 인사
assert(firstText(answer("처음으로")).includes("안내 챗봇"));
assert(firstText(answer("")).includes("안내 챗봇"));

// 버튼 이름 그대로 눌렀을 때
assert(firstText(answer("직업평가")).includes("직업평가는"));

// 문장으로 물었을 때(키워드 찾기)
assert(firstText(answer("면접 준비 어떻게 해요")).includes("면접"));
assert(firstText(answer("이력서 쓰는 거 도와주나요?")).includes("이력서"));

// 전화 버튼
const call = answer("상담사 연결");
assert.strictEqual(call.template.outputs[1].basicCard.buttons[0].phoneNumber, "0314677300");

// 모르는 질문은 안내 후 전화 카드
const unknown = answer("오늘 날씨 어때요");
assert(firstText(unknown).includes("찾지 못했습니다"));
assert(unknown.template.outputs[1].basicCard);

// 카카오 규칙 확인: 버튼 이름 14자 이하, 10개 이하
const qr = answer("처음으로").template.quickReplies;
assert(qr.length <= 10);
qr.forEach((q) => assert(q.label.length <= 14, q.label));

console.log("모든 시험을 통과했다.");
