// 챗봇이 질문마다 제대로 답하는지 확인하는 시험 파일이다. 실행: node test.js
const assert = require("assert");
const { answer } = require("./server");

const firstText = (r) => r.template.outputs[0].simpleText.text;
const labels = (r) => r.template.quickReplies.map((q) => q.label);

// 첫 인사: 상위 메뉴 버튼이 나온다
const home = answer("처음으로");
assert(firstText(home).includes("안내 챗봇"));
assert.deepStrictEqual(labels(home), ["장애인일자리사업", "고용업무", "상담사 연결", "처음으로"]);
assert(firstText(answer("")).includes("안내 챗봇"));
assert(firstText(answer("웰컴")).includes("안내 챗봇"));

// 상위 메뉴를 누르면 하위 메뉴 버튼이 나온다
const jobs = answer("장애인일자리사업");
const jobLabels = ["사업 유형", "선발 절차", "참여 조건", "참여 제외 대상", "제출 서류", "모집 기관", "모집 기간", "급여·근무시간", "반복참여 제한", "처음으로"];
assert.deepStrictEqual(labels(jobs), jobLabels);

// 버튼 이름 그대로 눌렀을 때
assert(firstText(answer("선발 절차")).includes("모집공고"));
assert(firstText(answer("참여 조건")).includes("만 18세 이상"));
assert(firstText(answer("모집 기관")).includes("의왕시청"));
assert(firstText(answer("모집 기간")).includes("지원형: 4월"));

// 세부 항목에서는 같은 단계의 다른 항목 버튼이 나온다
assert.deepStrictEqual(labels(answer("참여 조건")), jobLabels);

// 새로 추가한 세부 항목
assert(firstText(answer("사업 유형")).includes("계약기간 6개월"));
assert(firstText(answer("제출 서류")).includes("참여신청서"));
assert(firstText(answer("참여 제외 대상")).includes("직장가입자"));
assert(firstText(answer("급여·근무시간")).includes("2,156,880원"));
assert(firstText(answer("반복참여 제한")).includes("최대 2년"));

// 고용업무
const empLabels = ["고용업무 소개", "이용 신청 방법", "직업평가", "구직 상담", "취업 알선", "취업 후 적응지도", "구인 업체 안내", "처음으로"];
assert.deepStrictEqual(labels(answer("고용업무")), empLabels);
assert.deepStrictEqual(labels(answer("구직 상담")), empLabels);
assert(firstText(answer("고용업무 소개")).includes("만 19세 이상"));
assert(firstText(answer("이용 신청 방법")).includes("상담 일정을 조율"));
assert(firstText(answer("구직 상담")).includes("모의 면접"));
assert(firstText(answer("취업 알선")).includes("구인포털"));
assert(firstText(answer("취업 후 적응지도")).includes("계속 유지"));
assert(firstText(answer("구인 업체 안내")).includes("한국장애인고용공단"));
assert(firstText(answer("이력서 써 주나요")).includes("자기소개서"));
assert(firstText(answer("면접 준비 어떻게 해요")).includes("모의 면접"));
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

// 전화 버튼
const call = answer("상담사 연결");
assert.strictEqual(call.template.outputs[1].basicCard.buttons[0].phoneNumber, "0314677361");
assert(answer("이용 신청 방법").template.outputs[1].basicCard);
assert(answer("직업평가").template.outputs[1].basicCard);

// 모르는 질문은 안내 후 전화 카드
const unknown = answer("오늘 날씨 어때요");
assert(firstText(unknown).includes("찾지 못했습니다"));
assert(unknown.template.outputs[1].basicCard);

// 카카오 규칙 확인: 모든 답변에서 버튼 이름 14자 이하, 10개 이하, 글자 수 1000자 이하
for (const q of ["처음으로", "장애인일자리사업", ...jobLabels.slice(0, -1), "고용업무", ...empLabels.slice(0, -1), "상담사 연결"]) {
  const r = answer(q);
  assert(r.template.quickReplies.length <= 10);
  r.template.quickReplies.forEach((b) => assert(b.label.length <= 14, b.label));
  assert(firstText(r).length <= 1000);
}

console.log("모든 시험을 통과했다.");
