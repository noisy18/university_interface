"""Render local Jinja pages and stage reusable static files. No API routes."""
from argparse import ArgumentParser
from pathlib import Path
from shutil import copy2, copytree

from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape

HANDOFF = Path(__file__).resolve().parent
REPO = HANDOFF.parent
PREVIEW = HANDOFF / "preview"

RISK_LABELS = {"low": "Низкий риск", "medium": "Средний риск", "high": "Высокий риск"}
VERDICT_LABELS = {
    "spam": "Возможный спам", "phishing": "Возможный фишинг",
    "suspicious": "Подозрительное сообщение", "likely_safe": "Вероятно безопасно",
}
EXAMPLES = {
    "job": "Здравствуйте! Мы одобрили вашу кандидатуру на удалённую работу. Чтобы приступить сегодня, срочно оплатите регистрацию и пришлите скриншот перевода.",
    "education": "Привет! Это сотрудник деканата. Тебе нужно срочно подтвердить студенческий аккаунт по ссылке https://student-check.example, иначе доступ к личному кабинету будет заблокирован сегодня.",
}
SAMPLE = {
    "message": EXAMPLES["education"], "verdict": "phishing", "risk_level": "high",
    "confidence": 0.98, "low_confidence": False, "is_demo": True,
    "explanation": "Отправитель требует срочно подтвердить данные по ссылке и угрожает блокировкой.",
    "detected_signals": [
        {"title": "Требование срочного действия", "description": "Срок и угроза блокировки усиливают давление.", "detected": True},
        {"title": "Ссылка для подтверждения", "description": "Адрес student-check.example служит учебным примером стороннего домена.", "detected": True},
        {"title": "Просьба перевести деньги", "description": "Текст не содержит такой просьбы.", "detected": False},
    ],
    "recommendations": ["Не переходите по ссылке.", "Уточните запрос у деканата через официальный канал."],
}
UNCERTAIN = {
    **SAMPLE,
    "message": "Для обновления учётной записи подтвердите данные в личном кабинете.",
    "verdict": "suspicious", "risk_level": "medium", "confidence": 0.51,
    "low_confidence": True, "detected_signals": [],
    "explanation": "Из сообщения нельзя установить, кто его отправил и зачем запрашивает данные.",
}

def stage_static(target):
    copytree(HANDOFF / "static", target, dirs_exist_ok=True)
    css = target / "css"
    # The existing layout remains in site/. Only relative imports change.
    site_base = (REPO / "site/styles.css").read_text(encoding="utf-8-sig")
    site_base = site_base.replace("../design/practice-4/", "").replace('url("assets/', 'url("../icons/')
    (css / "site-base.css").write_text(site_base, encoding="utf-8")
    copy2(REPO / "site/report.css", css / "site-report.css")
    for name in ("tokens.css", "components.css"):
        copy2(REPO / "design/practice-4" / name, css / name)
    for name in ("inter-latin.woff2", "inter-cyrillic.woff2", "Inter-LICENSE.txt"):
        copy2(REPO / "site/assets" / name, target / "icons" / name)

def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--static-only", action="store_true", help="Stage only static assets for a future integration")
    args = parser.parse_args()
    stage_static(PREVIEW / "static")
    if args.static_only:
        return
    env = Environment(
        loader=FileSystemLoader(HANDOFF / "templates"),
        autoescape=select_autoescape(("html",)),
        undefined=StrictUndefined,
    )
    shared = dict(
        static_url="static", upload_url="index.html", states_url="states.html",
        analyze_url=None, htmx_url=None, demo=True, examples=EXAMPLES,
        risk_labels=RISK_LABELS, verdict_labels=VERDICT_LABELS,
        sample_result=SAMPLE, uncertain_result=UNCERTAIN, result=SAMPLE,
    )
    pages = (
        ("upload", "index.html", "Проверка сообщения"),
        ("result", "result.html", "Результат проверки"),
        ("states", "states.html", "Состояния интерфейса"),
    )
    for page, filename, title in pages:
        template = env.get_template(f"pages/{page}.html")
        (PREVIEW / filename).write_text(template.render(title=title, **shared), encoding="utf-8")
    print("Preview ready: /handoff/preview/")

if __name__ == "__main__":
    main()
