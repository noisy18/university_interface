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
  const update = () => {
    message.setCustomValidity("");
    counter.value = `${message.value.length} / ${message.maxLength}`;
  };
  const previous = readCheck();
  if (previous?.stage === "pending") message.value = previous.text;
  try { sessionStorage.removeItem(key); } catch {}
  update();

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
    if (!text) {
      message.setCustomValidity("Вставьте сообщение для проверки.");
      message.reportValidity();
      return;
    }
    try {
      sessionStorage.setItem(key, JSON.stringify({ text, stage: "pending" }));
      location.assign(form.action);
    } catch {
      message.setCustomValidity("Браузер запретил временное хранение данных вкладки.");
      message.reportValidity();
    }
  });
}

const check = form ? null : readCheck();
if (page.hasAttribute("data-analysis")) {
  const card = document.querySelector(".progress-card");
  const title = document.querySelector("#progress-title");
  const status = document.querySelector(".progress-status");
  const progress = document.querySelector("#demo-progress");
  const error = document.querySelector("#demo-error");
  const retry = document.querySelector("#retry");
  let timer;

  function setProgress(failed) {
    clearTimeout(timer);
    card.toggleAttribute("data-error", failed);
    title.textContent = failed ? "Не удалось проверить сообщение" : "Проверяем сообщение";
    status.textContent = failed ? "Произошёл сбой при проверке" : "Формирование отчета безопасности…";
    progress.setAttribute("aria-pressed", String(!failed));
    error.setAttribute("aria-pressed", String(failed));
    retry.hidden = !failed;
    if (!failed && check?.stage === "pending") {
      timer = setTimeout(() => {
        const risk = rules.some(([pattern]) => pattern.test(check.text)) ? "high" : "low";
        try {
          sessionStorage.setItem(key, JSON.stringify({ ...check, stage: "result", risk }));
          location.replace(`result-${risk}.html`);
        } catch { setProgress(true); }
      }, 1100);
    }
  }

  progress.addEventListener("click", () => setProgress(false));
  error.addEventListener("click", () => setProgress(true));
  retry.addEventListener("click", () => setProgress(false));
  if (check?.stage === "pending") {
    document.querySelector(".connection p:first-child").lastChild.textContent = "Проверка в браузере";
    document.querySelector(".connection p:last-child").textContent = "Текст временно хранится в этой вкладке и очищается при новой проверке.";
  }
  setProgress(false);
}

if (check?.stage === "result" && page.dataset.report === check.risk) {
  document.querySelector("#checked-message").textContent = `«${check.text}»`;
  document.querySelector("#snippet-length").textContent = `${check.text.length} симв.`;
  for (const sample of page.querySelectorAll("[data-sample]")) sample.hidden = true;

  if (check.risk === "high") {
    document.querySelector("[data-sample]").replaceWith("Результат проверки");
    document.querySelector("#verdict-title").textContent = "Обнаружены признаки риска";
    document.querySelector("#verdict-description").textContent = "Локальная проверка выявила признаки, которые стоит изучить перед тем, как действовать.";
    const findings = document.querySelector("#risk-findings");
    const template = findings.firstElementChild.cloneNode(true);
    template.querySelector(".finding-icon").remove();
    findings.replaceChildren(...rules.filter(([pattern]) => pattern.test(check.text)).map(([, heading, copy]) => {
      const item = template.cloneNode(true);
      item.querySelector("h3").textContent = heading;
      item.querySelector("p").textContent = copy;
      return item;
    }));
  } else {
    document.querySelector("#report-timing").textContent = "Проверено только что";
  }
}
