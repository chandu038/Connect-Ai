"""Official SIETK website search through Tavily, restricted to approved domains."""
import logging
from urllib.parse import urlsplit

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

TAVILY_ENDPOINT = "https://api.tavily.com/search"


def get_allowed_domains() -> list[str]:
    """Accept either a list or a comma-separated string from settings."""
    raw = settings.web_allowed_domains
    if isinstance(raw, str):
        raw = raw.split(",")

    domains: list[str] = []
    for item in raw or []:
        domain = str(item).strip().lower()
        domain = domain.removeprefix("https://").removeprefix("http://")
        domain = domain.split("/")[0].strip(".")
        if domain.startswith("www."):
            domain = domain[4:]
        if domain and domain not in domains:
            domains.append(domain)
    return domains


def is_approved_url(url: str, allowed_domains: list[str]) -> bool:
    try:
        parsed = urlsplit(url.strip())
        port = parsed.port
    except ValueError:
        return False

    if parsed.scheme != "https" or parsed.username or parsed.password:
        return False
    if port not in (None, 443):
        return False

    hostname = (parsed.hostname or "").lower().rstrip(".")
    if not hostname:
        return False

    return any(
        hostname == domain or hostname.endswith("." + domain)
        for domain in allowed_domains
    )


def search_official_web(question: str, max_results: int | None = None) -> list[dict]:
    if not settings.web_search_ready:
        logger.warning(
            "Web search skipped: web_search_ready is False. "
            "Check TAVILY_API_KEY and the allowed domains setting."
        )
        return []

    allowed_domains = get_allowed_domains()
    if not allowed_domains:
        logger.warning("Web search skipped: no allowed domains configured")
        return []

    question = " ".join(question.split())[:400]
    if not question:
        return []

    query = f"{settings.COLLEGE_OFFICIAL_NAME.strip()} {question}"[:500]

    result_limit = max(1, min(max_results or settings.WEB_SEARCH_MAX_RESULTS, 5))

    payload = {
        "query": query,
        "topic": "general",
        "search_depth": "basic",
        "max_results": result_limit,
        "include_domains": allowed_domains,
        "include_answer": False,
        "include_raw_content": False,
        "include_images": False,
    }

    try:
        with httpx.Client(
            timeout=settings.WEB_SEARCH_TIMEOUT_SECONDS,
            follow_redirects=False,
        ) as client:
            response = client.post(
                TAVILY_ENDPOINT,
                headers={
                    "Authorization": f"Bearer {settings.TAVILY_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            if response.status_code >= 400:
                logger.error(
                    "Tavily search failed with HTTP %s: %s",
                    response.status_code,
                    response.text[:300],
                )
                return []
            data = response.json()

    except httpx.HTTPError:
        logger.exception("Tavily request failed")
        return []
    except ValueError:
        logger.exception("Tavily returned invalid JSON")
        return []

    results = data.get("results") if isinstance(data, dict) else None
    if not isinstance(results, list):
        logger.error("Tavily response had no results list: %s", str(data)[:300])
        return []

    cleaned: list[dict] = []
    seen_urls: set[str] = set()

    for item in results:
        if not isinstance(item, dict):
            continue

        url = str(item.get("url") or "").strip()
        title = str(item.get("title") or "").strip()
        content = str(item.get("content") or "").strip()

        if not is_approved_url(url, allowed_domains):
            continue
        if not title or not content or url in seen_urls:
            continue

        seen_urls.add(url)
        cleaned.append({
            "title": title[:250],
            "url": url,
            "content": content[:4000],
        })

        if len(cleaned) >= result_limit:
            break

    logger.info(
        "Tavily returned %d raw results, %d approved",
        len(results),
        len(cleaned),
    )
    return cleaned