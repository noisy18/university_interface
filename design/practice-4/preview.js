const view = new URLSearchParams(location.search).get("view");
const current = ["system", "components", "empty", "stress"].includes(view) ? view : "system";
document.querySelector("#preview").append(document.getElementById(current).content.cloneNode(true));
document.querySelector(`nav a[href="?view=${current}"]`).setAttribute("aria-current", "page");

if (current === "system") {
  const colors = {
    "bg-primary": "Основной фон", "bg-subtle": "Карточки признаков", "bg-header": "Шапка", "bg-accent": "Синий фон",
    "text-primary": "Основной текст", "text-secondary": "Вторичный текст", "text-muted": "Подписи",
    accent: "Акцент", "accent-bright": "Кнопка отправки", "border-default": "Границы",
    "status-success": "Успех", "status-success-bg": "Фон успеха", "status-warning": "Предупреждение",
    "status-warning-bg": "Фон предупреждения", "status-error": "Ошибка", "status-error-bg": "Фон ошибки",
  };
  const css = getComputedStyle(document.documentElement);
  for (const [name, label] of Object.entries(colors)) {
    const item = document.createElement("li");
    const sample = document.createElement("div");
    sample.className = "swatch-sample";
    sample.style.setProperty("--swatch", `var(--${name})`);
    const caption = document.createElement("div");
    caption.className = "swatch-label";
    caption.textContent = `${label} · ${css.getPropertyValue("--" + name).trim()}`;
    item.append(sample, caption);
    document.querySelector("#swatches").append(item);
  }
  for (const value of [4, 8, 12, 16, 24, 32, 48, 64, 96]) {
    const item = document.createElement("li");
    const bar = document.createElement("span");
    bar.style.setProperty("--sample-size", `var(--space-${value})`);
    item.append(bar, `${value} px`);
    document.querySelector("#spacing").append(item);
  }
  for (const [name, value] of [["sm", 8], ["md", 12], ["lg", 16]]) {
    const sample = document.createElement("span");
    sample.className = "radii-sample";
    sample.style.setProperty("--sample-radius", `var(--radius-${name})`);
    sample.textContent = `${value} px`;
    document.querySelector("#radii").append(sample);
  }
}

if (current === "stress") {
  const select = document.querySelector("#fixture");
  const longSender = "МежуниверситетскийКоординационныйОтделАкадемическойМобильностиИЦифровыхСервисов".repeat(3);
  const message = "Для обновления учётной записи подтвердите данные в личном кабинете.";
  const explanation = "Формулировка сообщения допускает несколько трактовок. Сверьте канал связи с контактами в официальном справочнике университета и уточните, относится ли запрос к вашей учётной записи. ";
  function render() {
    const mode = select.value;
    const high = mode === "high";
    const risk = high ? "high" : "medium";
    const badge = document.querySelector("#fixture-risk");
    document.querySelector("#fixture-report").dataset.risk = risk;
    badge.dataset.risk = risk;
    badge.textContent = high ? "Высокий риск" : "Средний риск";
    document.querySelector("#fixture-title").textContent = high ? "Возможный фишинг" : "Однозначный вердикт недоступен";
    document.querySelector("#fixture-confidence").textContent = `Уверенность модели (демо) — ${high ? 98 : 51}%`;
    document.querySelector("#sender").textContent = "Отправитель — " + (["sender", "uncertain"].includes(mode) ? longSender : "Учебный отдел");
    document.querySelector("#fixture-message").textContent = mode === "links"
      ? Array.from({ length: 24 }, (_, i) => `https://university-check.example/${"account-review-".repeat(5)}${i}`).join("\n")
      : high ? "Срочно подтвердите пароль по ссылке https://student-check.example, иначе аккаунт будет заблокирован." : message;
    document.querySelector("#fixture-copy").textContent = explanation.repeat(mode === "long" ? 16 : mode === "uncertain" ? 3 : 1);
  }
  select.addEventListener("change", render);
  render();
}
