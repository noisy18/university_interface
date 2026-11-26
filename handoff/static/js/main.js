const rules = [
  [/https?:\/\/|www\.|\b[a-z0-9-]+\.(?:ru|com|net|org|example)\b/iu, "Ссылка на внешний сайт", "Проверьте адрес через официальный канал."],
  [/(?:код.{0,15}(?:смс|sms)|парол|пин-код|паспортн|реквизит)/iu, "Упоминание конфиденциальных данных", "Не сообщайте пароли, коды или реквизиты в переписке."],
  [/(?:срочн|немедленно|заблокир|последний шанс)/iu, "Признаки давления", "Проверьте информацию перед любыми действиями."],
  [/(?:оплат|предоплат|внесите|переведите|перевод денег)/iu, "Возможная просьба об оплате", "Уточните запрос через известный вам канал связи."],
];

for (const control of document.querySelectorAll("[data-dialog]")) {
  control.addEventListener("click", () => document.getElementById(control.dataset.dialog).showModal());
}

const form = document.querySelector("[data-analyzer]");
if (form) initAnalyzer(form);

function initAnalyzer(form) {
  const field = form.elements.message;
  const submit = form.querySelector("[type=submit]");
  const error = document.getElementById(field.id.replace(/message$/, "error"));
  const counter = form.querySelector("[data-counter]");
  const output = document.querySelector("#analysis-output");
  const presets = [...document.querySelectorAll("[data-example]")];
  const demoFailure = document.querySelector("[data-demo-error]");
  const remote = form.hasAttribute("hx-post");
  let pending = false;
  let timer;

  function update() {
    field.setCustomValidity(field.value.trim() ? "" : "Вставьте сообщение, чтобы начать проверку.");
    field.removeAttribute("aria-invalid");
    error.hidden = true;
    counter.value = `${field.value.length} / ${field.maxLength}`;
  }

  function render(name) {
    output.replaceChildren(document.getElementById(name + "-fragment").content.cloneNode(true));
  }

  function setPending(active) {
    pending = active;
    submit.disabled = active;
    field.readOnly = active;
    presets.forEach(button => { button.disabled = active; });
    submit.setAttribute("aria-busy", String(active));
    output.setAttribute("aria-busy", String(active));
  }

  function showError() {
    setPending(false);
    render("error");
    output.querySelector(".saved-message").hidden = false;
    output.querySelector("[data-saved-message]").textContent = field.value;
    output.focus();
  }

  function renderLocalResult(message) {
    render("result");
    const matches = rules.filter(([pattern]) => pattern.test(message));
    const short = message.length < 5;
    const risk = matches.length > 1 ? "high" : matches.length || short ? "medium" : "low";
    const riskLabel = { high: "Высокий риск", medium: "Средний риск", low: "Низкий риск" };
    const titles = { high: "Обнаружены признаки риска", medium: short ? "Недостаточно данных" : "Подозрительное сообщение", low: "Явных признаков мошенничества не обнаружено" };
    const icon = { high: "warning.svg", medium: "block.svg", low: "low-shield.svg" };
    const explanations = {
      high: "Локальные правила нашли несколько признаков. Проверьте отправителя и назначение сообщения.",
      medium: short ? "Сообщение слишком короткое. Добавьте контекст, если он доступен." : "Найден один признак. Для выводов нужен дополнительный контекст.",
      low: "Локальные правила не обнаружили явных признаков в этом тексте.",
    };
    const find = selector => output.querySelector(selector);
    find("[data-checked-message]").textContent = message;
    find(".verdict").dataset.risk = risk;
    find("[data-result-risk]").dataset.risk = risk;
    find("[data-result-risk]").textContent = riskLabel[risk];
    find("[data-result-verdict]").textContent = titles[risk];
    find("[data-result-explanation]").textContent = explanations[risk];
    find("[data-confidence]").textContent = "Уверенность модели недоступна · проверка по локальным правилам";
    const verdictIcon = find("[data-verdict-icon]");
    verdictIcon.src = verdictIcon.dataset.icons + icon[risk];
    const demoNotice = find(".result-state > [data-tone=warning]");
    demoNotice.textContent = "Локальная демонстрация по текстовым правилам.";
    const list = find("[data-result-signals]");
    list.replaceChildren(...matches.map(([, title, description]) => {
      const card = document.getElementById("signal-fragment").content.cloneNode(true);
      card.querySelector("[data-signal-title]").textContent = title;
      card.querySelector("[data-signal-description]").textContent = description;
      return card;
    }));
    list.hidden = !matches.length;
    find("[data-no-signals]").hidden = !!matches.length;
    find("[data-no-signals]").textContent = "Локальные правила не нашли совпадений.";
    const recommendations = find("[data-result-recommendations]");
    recommendations.firstElementChild.textContent = risk === "low"
      ? "Если запрос необычный, уточните его у отправителя через известный канал."
      : "Не выполняйте запрос до проверки отправителя через официальный канал.";
    recommendations.lastElementChild.textContent = "Не отправляйте пароли, коды подтверждения и платёжные данные.";
    output.focus();
  }

  field.addEventListener("input", update);
  field.addEventListener("invalid", () => {
    field.setAttribute("aria-invalid", "true");
    error.textContent = field.validationMessage;
    error.hidden = false;
  });
  for (const button of presets) {
    button.addEventListener("click", () => {
      field.value = button.dataset.example;
      update();
      field.focus();
    });
  }
  update();
  if (!remote) submit.disabled = false;

  form.addEventListener("submit", event => {
    if (pending || (!remote && !output)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (remote) return;
    event.preventDefault();
    const message = field.value.trim();
    render("loading");
    setPending(true);
    output.focus();
    timer = window.setTimeout(() => {
      if (demoFailure?.checked) {
        demoFailure.checked = false;
        showError();
      } else {
        setPending(false);
        renderLocalResult(message);
      }
    }, 900);
  }, true);

  output?.addEventListener("click", event => {
    if (!event.target.closest("[data-cancel]")) return;
    clearTimeout(timer);
    if (remote) form.dispatchEvent(new Event("htmx:abort", { bubbles: true }));
    setPending(false);
    output.replaceChildren();
    field.focus();
  });

  if (remote) {
    form.addEventListener("htmx:beforeRequest", () => {
      render("loading");
      setPending(true);
    });
    form.addEventListener("htmx:afterRequest", event => {
      setPending(false);
      if (!event.detail.successful && output.firstElementChild) showError();
    });
    output.addEventListener("htmx:afterSwap", () => output.focus());
  }
}
