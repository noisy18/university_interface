const page = document.querySelector("main");
const key = "stopspam-check";
const examples = {
  education: "Привет! Это сотрудник деканата. Тебе нужно срочно подтвердить студенческий аккаунт по ссылке https://student-check.example, иначе доступ к личному кабинету будет заблокирован сегодня.",
  job: "Здравствуйте! Мы одобрили вашу кандидатуру на удалённую работу. Чтобы приступить сегодня, срочно оплатите регистрацию и пришлите скриншот перевода.",
};
const rules = [
  [/https?:\/\/|www\.|\b[a-z0-9-]+\.(?:ru|com|net|org|example)\b/iu, "Ссылка на внешний сайт", "Проверьте адрес через официальный канал."],
  [/(?:код.{0,15}(?:смс|sms)|парол|пин-код|паспортн|реквизит)/iu, "Упоминание конфиденциальных данных", "Не сообщайте пароли, коды или реквизиты в переписке."],
  [/(?:срочн|немедленно|заблокир|последний шанс)/iu, "Признаки давления", "Проверьте информацию перед любыми действиями."],
  [/(?:оплат|предоплат|внесите|переведите|перевод денег)/iu, "Возможная просьба об оплате", "Уточните запрос через известный вам канал связи."],
];

for (const button of document.querySelectorAll("[data-dialog]")) {
  button.addEventListener("click", () => document.getElementById(button.dataset.dialog).showModal());
}

function readCheck() {
  try { return JSON.parse(sessionStorage.getItem(key)); }
  catch { return null; }
}

const form = document.querySelector("#analyzer");
if (form) {
  const message = document.querySelector("#message");
  const counter = document.querySelector("#counter");
  const validation = document.querySelector("#message-error");
  const submit = form.querySelector("[type=submit]");
  const showError = text => {
    validation.hidden = !text;
    validation.textContent = text;
    message.setAttribute("aria-invalid", String(Boolean(text)));
    if (text) message.focus();
  };
  const update = () => {
    showError("");
    counter.value = `${message.value.length} / ${message.maxLength}`;
  };
  const previous = readCheck();
  if (previous?.stage === "pending") message.value = previous.text;
  try { sessionStorage.removeItem(key); } catch {}
  update();
  window.addEventListener("pageshow", () => {
    submit.disabled = false;
    submit.removeAttribute("aria-busy");
  });

  message.addEventListener("input", update);
  for (const button of document.querySelectorAll("[data-example]")) {
    button.addEventListener("click", () => {
      message.value = examples[button.dataset.example];
      update();
      message.focus();
      message.setSelectionRange(message.value.length, message.value.length);
    });
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    const text = message.value.trim();
    if (submit.disabled) return;
    if (!text || message.value.length > message.maxLength) {
      showError(text ? "Сократите сообщение до 4000 символов." : "Вставьте сообщение, чтобы начать проверку.");
      return;
    }
    try {
      sessionStorage.setItem(key, JSON.stringify({ text, stage: "pending" }));
      submit.disabled = true;
      submit.setAttribute("aria-busy", "true");
      location.assign(form.action);
    } catch {
      showError("Браузер запретил временное хранение данных вкладки. Разрешите хранение и попробуйте снова.");
    }
  });
}

const check = form ? null : readCheck();
if (page.hasAttribute("data-analysis")) {
  const card = document.querySelector(".progress-card");
  const title = document.querySelector("#progress-title");
  const status = document.querySelector("#loader");
  const notice = document.querySelector("#analysis-error");
  const saved = document.querySelector(".saved-message");
  const progress = document.querySelector("#demo-progress");
  const error = document.querySelector("#demo-error");
  const retry = document.querySelector("#retry");
  let timer;

  function setProgress(failed, reason = "Демонстрационный сбой. Повторите проверку, чтобы продолжить.") {
    clearTimeout(timer);
    card.toggleAttribute("data-error", failed);
    title.textContent = failed ? "Не удалось проверить сообщение" : "Анализируем сообщение";
    status.dataset.stage = failed ? "waiting" : "running";
    status.textContent = failed ? "Анализ остановлен" : "Формируем отчёт безопасности…";
    notice.hidden = !failed;
    notice.textContent = failed ? reason : "";
    saved.hidden = !failed || !check?.text;
    progress.setAttribute("aria-pressed", String(!failed));
    error.setAttribute("aria-pressed", String(failed));
    retry.hidden = !failed;
    progress.disabled = !failed && check?.stage === "pending";
    if (!failed && check?.stage === "pending") {
      timer = setTimeout(() => {
        const matches = rules.filter(([pattern]) => pattern.test(check.text)).length;
        const risk = matches > 1 ? "high" : matches === 1 || check.text.length < 5 ? "medium" : "low";
        status.dataset.stage = "done";
        status.textContent = "Проверка завершена";
        try {
          sessionStorage.setItem(key, JSON.stringify({ ...check, stage: "result", risk }));
          location.replace(risk === "low" ? "result-low.html" : "result-high.html");
        } catch { setProgress(true, "Браузер не сохранил результат. Попробуйте повторить проверку."); }
      }, 1100);
    }
  }

  progress.addEventListener("click", () => setProgress(false));
  error.addEventListener("click", () => setProgress(true));
  retry.addEventListener("click", () => setProgress(false));
  if (check?.stage === "pending") {
    saved.querySelector("p").textContent = check.text;
  }
  setProgress(false);
}

if (check?.stage === "result" && page.dataset.report === (check.risk === "low" ? "low" : "high")) {
  document.querySelector("[data-demo-label]").hidden = true;
  document.querySelector(".confidence").textContent = "Уверенность модели недоступна · локальная проверка по текстовым правилам";
  document.querySelector("#checked-message").textContent = `«${check.text}»`;
  document.querySelector("#snippet-length").textContent = `${check.text.length} симв.`;
  for (const sample of page.querySelectorAll("[data-sample]")) sample.hidden = true;

  if (check.risk !== "low") {
    document.querySelector("[data-sample]").replaceWith("Результат проверки");
    document.querySelector("#verdict-title").textContent = "Обнаружены признаки риска";
    document.querySelector("#verdict-description").textContent = "Локальная проверка выявила признаки, которые стоит изучить перед тем, как действовать.";
    const findings = document.querySelector("#risk-findings");
    const matches = rules.filter(([pattern]) => pattern.test(check.text));
    if (check.risk === "medium") {
      page.querySelector(".verdict").dataset.risk = "medium";
      const badge = page.querySelector(".badge");
      badge.dataset.risk = "medium";
      badge.textContent = "Средний риск";
      page.querySelector(".severity p").textContent = "Нужна дополнительная проверка";
      page.querySelector("#verdict-title").textContent = matches.length ? "Подозрительное сообщение" : "Недостаточно данных";
      page.querySelector("#verdict-description").textContent = matches.length ? "Обнаружен один признак. Проверьте отправителя через официальный канал." : "Сообщение слишком короткое для однозначной оценки. Добавьте контекст или уточните запрос у отправителя.";
    }
    const template = findings.firstElementChild.cloneNode(true);
    template.querySelector(".finding-icon").remove();
    findings.replaceChildren(...(matches.length ? matches : [[null, "Недостаточно контекста", "Проверьте сообщение целиком, если оно доступно."]]).map(([, heading, copy]) => {
      const item = template.cloneNode(true);
      item.querySelector("h3").textContent = heading;
      item.querySelector("p").textContent = copy;
      return item;
    }));
  } else {
    document.querySelector("#report-timing").textContent = "Проверено только что";
  }
}
