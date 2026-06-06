const storage = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const tests = {
  phq9: {
    name: "PHQ-9 抑郁筛查",
    options: ["完全没有", "有几天", "一半以上时间", "几乎每天"],
    questions: [
      "做事时提不起劲或没有兴趣",
      "感到心情低落、沮丧或绝望",
      "入睡困难、睡不安稳或睡眠过多",
      "感觉疲倦或没有活力",
      "食欲不振或吃太多",
      "觉得自己很糟，或觉得自己让自己或家人失望",
      "难以集中注意力，例如看报纸或看电视时",
      "行动或说话慢到别人能察觉，或坐立不安",
      "出现不如死掉或伤害自己的念头"
    ],
    level(score) {
      if (score <= 4) return "较少抑郁症状";
      if (score <= 9) return "轻度抑郁症状";
      if (score <= 14) return "中度抑郁症状";
      if (score <= 19) return "中重度抑郁症状";
      return "重度抑郁症状，建议尽快寻求专业帮助";
    }
  },
  gad7: {
    name: "GAD-7 焦虑筛查",
    options: ["完全没有", "有几天", "一半以上时间", "几乎每天"],
    questions: [
      "感到紧张、焦虑或急切",
      "不能停止或控制担忧",
      "对各种各样的事情担忧过多",
      "很难放松下来",
      "坐立不安，以至于难以安静坐着",
      "变得容易烦恼或急躁",
      "感到好像有什么可怕的事情会发生"
    ],
    level(score) {
      if (score <= 4) return "较少焦虑症状";
      if (score <= 9) return "轻度焦虑症状";
      if (score <= 14) return "中度焦虑症状";
      return "重度焦虑症状，建议进一步专业评估";
    }
  },
  pss10: {
    name: "PSS-10 压力知觉量表",
    options: ["从不", "偶尔", "有时", "经常", "总是"],
    questions: [
      "因为发生意外的事情而感到心烦",
      "觉得无法控制生活中重要的事情",
      "感到紧张和压力",
      "有信心处理个人问题",
      "觉得事情正按自己的想法发展",
      "发现自己无法应付必须做的事情",
      "能够控制生活中的烦心事",
      "觉得一切都在掌控之中",
      "因为无法控制的事情而生气",
      "觉得困难堆积到无法克服"
    ],
    reverse: [3, 4, 6, 7],
    level(score) {
      if (score <= 13) return "低压力水平";
      if (score <= 26) return "中等压力水平";
      return "高压力水平，建议增加支持并考虑咨询";
    }
  }
};

function initBooking() {
  const form = document.querySelector("#bookingForm");
  if (!form) return;
  const status = document.querySelector("#bookingStatus");
  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const records = storage.get("yc_bookings", []);
    records.unshift({ ...data, createdAt: new Date().toLocaleString("zh-CN") });
    storage.set("yc_bookings", records);
    status.textContent = "预约信息已保存，咨询助理将根据记录与你确认。";
    form.reset();
  });
}

function initTeamBookingLinks() {
  const counselor = document.querySelector("#bookingCounselor");
  if (!counselor) return;
  const params = new URLSearchParams(location.search);
  const name = params.get("counselor");
  if (name) counselor.value = name;
}

function currentVisitor() {
  return storage.get("yc_current_visitor", null);
}

function renderCurrentVisitor() {
  const box = document.querySelector("#currentVisitor");
  if (!box) return;
  const visitor = currentVisitor();
  box.textContent = visitor ? `当前来访者：${visitor.name}（${visitor.contact}）` : "当前未登录";
}

function renderRecords(records) {
  const list = document.querySelector("#recordsList");
  if (!list) return;
  if (!records.length) {
    list.textContent = "暂无记录";
    return;
  }
  list.innerHTML = records.map(record => `
    <div class="record-item">
      <strong>${record.testName}：${record.score} 分 / ${record.level}</strong>
      <span>来访者：${record.visitorName}｜联系方式：${record.contact}</span>
      <span>时间：${record.createdAt}</span>
    </div>
  `).join("");
}

function buildTest() {
  const select = document.querySelector("#testSelect");
  const form = document.querySelector("#testForm");
  const result = document.querySelector("#testResult");
  if (!select || !form) return;
  const selected = tests[select.value];
  if (result) result.textContent = "";
  form.innerHTML = selected.questions.map((question, index) => {
    const options = selected.options.map((label, value) => `
      <label>
        <input type="radio" name="q${index}" value="${value}" required>
        ${label}
      </label>
    `).join("");
    return `
      <div class="question">
        <p>${index + 1}. ${question}</p>
        <div class="options">${options}</div>
      </div>
    `;
  }).join("") + '<button class="button primary" type="submit">提交测试并保存</button>';
}

function initTests() {
  const accountForm = document.querySelector("#accountForm");
  const testSelect = document.querySelector("#testSelect");
  const testForm = document.querySelector("#testForm");
  if (!accountForm || !testSelect || !testForm) return;

  accountForm.addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(accountForm);
    const visitor = {
      name: form.get("visitorName").trim(),
      contact: form.get("visitorContact").trim()
    };
    const visitors = storage.get("yc_visitors", []);
    if (!visitors.some(item => item.contact === visitor.contact)) {
      visitors.push(visitor);
      storage.set("yc_visitors", visitors);
    }
    storage.set("yc_current_visitor", visitor);
    renderCurrentVisitor();
    accountForm.reset();
  });

  document.querySelector("#clearVisitor")?.addEventListener("click", () => {
    localStorage.removeItem("yc_current_visitor");
    renderCurrentVisitor();
  });

  testSelect.addEventListener("change", buildTest);
  document.querySelector("#startTest")?.addEventListener("click", buildTest);

  testForm.addEventListener("submit", event => {
    event.preventDefault();
    const visitor = currentVisitor();
    const result = document.querySelector("#testResult");
    if (!visitor) {
      result.textContent = "请先注册或登录来访者信息，再提交测试。";
      return;
    }
    const selected = tests[testSelect.value];
    const form = new FormData(testForm);
    let score = 0;
    selected.questions.forEach((_, index) => {
      let value = Number(form.get(`q${index}`));
      if (selected.reverse?.includes(index)) value = selected.options.length - 1 - value;
      score += value;
    });
    const record = {
      testName: selected.name,
      score,
      level: selected.level(score),
      visitorName: visitor.name,
      contact: visitor.contact,
      createdAt: new Date().toLocaleString("zh-CN")
    };
    const records = storage.get("yc_test_records", []);
    records.unshift(record);
    storage.set("yc_test_records", records);
    result.textContent = `${selected.name}结果：${score} 分，${record.level}。结果已保存。`;
    renderRecords(records.filter(item => item.contact === visitor.contact));
  });

  document.querySelector("#showVisitorRecords")?.addEventListener("click", () => {
    const visitor = currentVisitor();
    if (!visitor) {
      renderRecords([]);
      document.querySelector("#recordsList").textContent = "请先登录来访者信息。";
      return;
    }
    renderRecords(storage.get("yc_test_records", []).filter(item => item.contact === visitor.contact));
  });

  document.querySelector("#showCounselorRecords")?.addEventListener("click", () => {
    const pin = prompt("请输入咨询师查看 PIN（原型默认：0620）");
    if (pin !== "0620") {
      document.querySelector("#recordsList").textContent = "PIN 不正确，无法查看全部记录。";
      return;
    }
    renderRecords(storage.get("yc_test_records", []));
  });

  renderCurrentVisitor();
  buildTest();
}

initBooking();
initTeamBookingLinks();
initTests();
