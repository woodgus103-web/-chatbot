// 챗봇이 질문마다 제대로 답하는지 확인하는 시험 파일이다. 실행: node test.js
const assert = require("assert");
const { answer: rawAnswer } = require("./server");

// 시험은 항상 같은 시각을 기준으로 한다. (운영시간 중: 2026-10-06 화요일 10시, 한국 시간)
const OPEN = new Date("2026-10-06T10:00:00+09:00");
const answer = (u, baseUrl = "", now = OPEN) => rawAnswer(u, baseUrl, now);

const firstText = (r) => r.template.outputs[0].simpleText.text;
const labels = (r) => r.template.quickReplies.map((q) => q.label);

// 첫 인사: 상위 메뉴 버튼이 나온다
const home = answer("처음으로");
assert(firstText(home).includes("안내 챗봇"));
assert.deepStrictEqual(labels(home), ["장애인일자리사업", "민간일자리 취업지원", "직업평가 문의", "상담사 연결", "처음으로"]);
assert(firstText(answer("")).includes("안내 챗봇"));
assert(firstText(answer("웰컴")).includes("안내 챗봇"));

// 상위 메뉴를 누르면 하위 메뉴 버튼이 나온다
const jobs = answer("장애인일자리사업");
const jobLabels = ["사업 유형", "선발 절차", "참여 조건", "참여 제외 대상", "제출 서류", "모집 기관·기간", "급여·근무시간", "반복참여 제한", "처음으로"];
assert.deepStrictEqual(labels(jobs), jobLabels);

// 버튼 이름 그대로 눌렀을 때
assert(firstText(answer("선발 절차")).includes("모집공고"));
assert(firstText(answer("참여 조건")).includes("만 18세 이상"));
assert(firstText(answer("모집 기관·기간")).includes("의왕시청"));
assert(firstText(answer("모집 기관·기간")).includes("지원형: 4월"));

// 세부 항목에서는 같은 단계의 다른 항목 버튼이 나온다
assert.deepStrictEqual(labels(answer("참여 조건")), jobLabels);

// 새로 추가한 세부 항목
assert(firstText(answer("사업 유형")).includes("계약기간 6개월"));
assert(firstText(answer("제출 서류")).includes("참여신청서"));
assert(firstText(answer("참여 제외 대상")).includes("직장가입자"));
assert(firstText(answer("급여·근무시간")).includes("2,156,880원"));
assert(firstText(answer("반복참여 제한")).includes("최대 2년"));

// 그림 (취업지원 절차)
const withImg = answer("취업지원 절차", "https://example.com");
const imgs = withImg.template.outputs.filter((o) => o.simpleImage);
assert.strictEqual(imgs.length, 2);
assert.strictEqual(imgs[0].simpleImage.imageUrl, "https://example.com/images/employment-general.png");
assert(imgs.every((o) => o.simpleImage.altText.length > 10));
assert(withImg.template.outputs.length <= 3);
assert(answer("취업지원 절차").template.outputs.every((o) => !o.simpleImage));
const fs = require("fs");
for (const o of imgs) assert(fs.existsSync("public/images/" + o.simpleImage.imageUrl.split("/").pop()));

// 민간일자리 취업지원
const empLabels = ["취업지원 소개", "취업지원 절차", "이용 신청 방법", "구직 상담", "취업 알선", "취업 후 적응지도", "구인 업체 안내", "처음으로"];
assert.deepStrictEqual(labels(answer("민간일자리 취업지원")), empLabels);
assert.deepStrictEqual(labels(answer("구직 상담")), empLabels);
assert(firstText(answer("취업지원 소개")).includes("만 19세 이상"));
assert(firstText(answer("취업지원 절차")).includes("현장훈련 및 지원"));
assert(firstText(answer("지원고용은 어떻게 진행돼요")).includes("지원 계획 수립"));
assert(firstText(answer("고용 절차가 궁금해요")).includes("일반고용"));
assert(firstText(answer("고용업무가 뭐예요")).includes("궁금한 점"));
assert(firstText(answer("취업지원이 뭐예요")).includes("만 19세 이상"));
assert(firstText(answer("취업지원 소개")).includes("031-467-7366"));
assert(firstText(answer("참여 조건")).includes("031-467-7361"));
assert.strictEqual(answer("이용 신청 방법").template.outputs[1].basicCard.buttons[0].phoneNumber, "0314677366");
assert(firstText(answer("이용 신청 방법")).includes("상담 일정을 조율"));
assert(firstText(answer("구직 상담")).includes("모의 면접"));
assert(firstText(answer("취업 알선")).includes("구인포털"));
assert(firstText(answer("취업 후 적응지도")).includes("계속 유지"));
assert(firstText(answer("구인 업체 안내")).includes("한국장애인고용공단"));
assert(firstText(answer("이력서 써 주나요")).includes("자기소개서"));
assert(firstText(answer("면접 준비 어떻게 해요")).includes("모의 면접"));
// 직업평가는 문의 번호만 안내한다
assert(firstText(answer("직업평가는 어떻게 받나요")).includes("031-467-7366"));
assert(firstText(answer("직업평가 문의")).includes("031-467-7366"));
assert.strictEqual(answer("직업평가 문의").template.outputs[1].basicCard.buttons[0].phoneNumber, "0314677366");
assert(firstText(answer("장애인 직원을 뽑고 싶은 사업주입니다")).includes("고용제도"));
assert(firstText(answer("취업하고 나서도 도와주나요")).includes("유지"));

// 문장으로 물었을 때(키워드 찾기)
assert(firstText(answer("장애인일자리 선발 절차가 어떻게 되나요?")).includes("서류심사"));
assert(firstText(answer("지원형은 언제 모집해요?")).includes("지원형: 4월"));
assert(firstText(answer("의왕시 안 살아도 신청할 수 있나요")).includes("의왕시에 거주"));
assert(firstText(answer("일자리사업이 뭐예요")).includes("직접 입력"));
assert(firstText(answer("지원형은 계약기간이 얼마나 돼요?")).includes("계약기간 6개월"));
assert(firstText(answer("월급은 얼마예요?")).includes("2,156,880원"));
assert(firstText(answer("직장가입자인데 신청해도 되나요")).includes("직장가입자"));
assert(firstText(answer("어떤 서류를 준비해야 하나요")).includes("참여신청서"));
assert(firstText(answer("작년에도 했는데 올해 또 참여할 수 있나요")).includes("최대 2년"));
assert(firstText(answer("동점이면 누가 먼저 뽑혀요")).includes("1순위"));

// 연락 요청: 양식 주소를 바꿔 가며 시험한다. (시험 뒤에는 content.json을 원래대로 되돌린다.)
const fsx = require("fs");
const savedContent = fsx.readFileSync("content.json", "utf8");
function withFormAddress(address, fn) {
  const data = JSON.parse(savedContent);
  data.메뉴.find((m) => m.제목 === "연락 요청").링크.주소 = address;
  fsx.writeFileSync("content.json", JSON.stringify(data));
  try {
    fn();
  } finally {
    fsx.writeFileSync("content.json", savedContent);
  }
}
// 1) 양식 주소가 없으면 준비 중 안내와 전화 카드
withFormAddress("", () => {
  const apply = answer("연락 요청");
  assert(firstText(apply).includes("준비 중"));
  assert(apply.template.outputs[1].basicCard.buttons[0].action === "phone");
  assert(firstText(answer("주말에 연락 주세요")).includes("준비 중"));
  assert(firstText(answer("콜백 부탁드려요")).includes("준비 중"));
});
// 2) https 주소가 아니면 사용하지 않는다
withFormAddress("http://example.com/form", () => {
  assert(firstText(answer("연락 요청")).includes("준비 중"));
});
// 3) https 주소가 있으면 양식 바로가기 카드가 붙는다
withFormAddress("https://example.com/form", () => {
  const r = answer("연락 요청");
  assert(firstText(r).includes("개인정보 수집·이용 동의"));
  assert.strictEqual(r.template.outputs[1].basicCard.buttons[0].webLinkUrl, "https://example.com/form");
  assert.strictEqual(r.template.outputs[1].basicCard.buttons[0].action, "webLink");
});
// 4) 실제로 설정된 주소는 https로 시작해야 한다
const realLink = JSON.parse(savedContent).메뉴.find((m) => m.제목 === "연락 요청").링크.주소;
assert(realLink === "" || realLink.startsWith("https://"), "연락 요청 양식 주소 형식 오류");
if (realLink) assert.strictEqual(answer("연락 요청").template.outputs[1].basicCard.buttons[0].webLinkUrl, realLink);

// 전화 버튼
const call = answer("상담사 연결");
assert.strictEqual(call.template.outputs[1].basicCard.buttons[0].phoneNumber, "0314677361");
assert(answer("이용 신청 방법").template.outputs[1].basicCard);

// 모르는 질문은 안내 후 전화 카드
const unknown = answer("오늘 날씨 어때요");
assert(firstText(unknown).includes("찾지 못했습니다"));
assert(unknown.template.outputs[1].basicCard);

// 카카오 규칙 확인: 모든 답변에서 버튼 이름 14자 이하, 10개 이하, 글자 수 1000자 이하
for (const q of ["처음으로", "장애인일자리사업", ...jobLabels.slice(0, -1), "민간일자리 취업지원", ...empLabels.slice(0, -1), "직업평가 문의", "연락 요청", "상담사 연결"]) {
  const r = answer(q);
  assert(r.template.quickReplies.length <= 10);
  r.template.quickReplies.forEach((b) => assert(b.label.length <= 14, b.label));
  assert(firstText(r).length <= 1000);
}

// ---- 운영시간 처리 ----
const CLOSED_TIMES = {
  "평일 저녁": "2026-10-06T19:00:00+09:00",
  "평일 새벽": "2026-10-07T08:59:00+09:00",
  "18시 정각": "2026-10-06T18:00:00+09:00",
  "일요일": "2026-10-04T10:00:00+09:00",
  "토요일": "2026-10-10T10:00:00+09:00",
  "한글날(휴무일)": "2026-10-09T10:00:00+09:00",
};
const OPEN_TIMES = { "9시 정각": "2026-10-06T09:00:00+09:00", "17시 59분": "2026-10-06T17:59:00+09:00" };
const hasAfter = (r) => labels(r).includes("연락 요청");
for (const [name, iso] of Object.entries(OPEN_TIMES)) {
  assert(!hasAfter(answer("처음으로", "", new Date(iso))), name);
  assert(!firstText(answer("처음으로", "", new Date(iso))).includes("운영시간이 아닙니다"), name);
}
for (const [name, iso] of Object.entries(CLOSED_TIMES)) {
  const now = new Date(iso);
  // 첫 화면: 연락 요청 버튼과 안내 문구가 나온다
  const h = answer("처음으로", "", now);
  assert(hasAfter(h), name);
  assert(firstText(h).includes("운영시간이 아닙니다"), name);
  // 전화번호를 안내하는 답변에는 안내 문구가 붙고, 모든 화면에 연락 요청 버튼이 있다
  for (const q of ["참여 조건", "급여·근무시간", "취업지원 소개", "이용 신청 방법", "직업평가 문의", "상담사 연결", "구인 업체 안내", "오늘 날씨 어때요"]) {
    const r = answer(q, "", now);
    assert(firstText(r).includes("'연락 요청'을 남겨 주세요"), `${name}/${q}`);
    assert(hasAfter(r), `${name}/${q}`);
  }
  // 전화번호가 없는 안내에는 문구를 붙이지 않지만 버튼은 있다
  const noPhone = answer("사업 유형", "", now);
  assert(!firstText(noPhone).includes("운영시간이 아닙니다"), name);
  assert(hasAfter(noPhone), name);
  // 연락 요청 답변 자체에는 안내 문구를 붙이지 않는다
  assert(!firstText(answer("연락 요청", "", now)).includes("운영시간이 아닙니다"), name);
  // 카카오 규칙: 버튼 10개 이하, 이름 14자 이하, 글자 1000자 이하
  for (const q of ["처음으로", "장애인일자리사업", ...jobLabels.slice(0, -1), "민간일자리 취업지원", ...empLabels.slice(0, -1), "직업평가 문의", "연락 요청", "상담사 연결", "오늘 날씨 어때요"]) {
    const r = answer(q, "https://example.com", now);
    assert(r.template.quickReplies.length <= 10, `${name}/${q}`);
    r.template.quickReplies.forEach((b) => assert(b.label.length <= 14, b.label));
    r.template.outputs.filter((o) => o.simpleText).forEach((o) => assert(o.simpleText.text.length <= 1000, `${name}/${q}`));
    assert(r.template.outputs.length <= 3, `${name}/${q}`);
  }
}
// 운영시간 중에도 직접 입력하면 연락 요청 안내를 볼 수 있다
assert(firstText(answer("연락 요청")).includes("개인정보 수집·이용 동의") || firstText(answer("연락 요청")).includes("준비 중"));

console.log("모든 시험을 통과했다.");
