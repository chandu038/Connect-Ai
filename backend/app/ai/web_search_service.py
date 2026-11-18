
"""
Official SIETK website search.

Uses Tavily and restricts results to approved domains.
"""

import logging
from urllib.parse import urlsplit

import httpx

from app.core.config import settings


logger = logging.getLogger(__name__)

TAVILY_ENDPOINT = "https://api.tavily.com/search"


def normalized_allowed_domains() -> list[str]:
    domains = []

    for raw in settings.web_allowed_domains:
        domain = raw.strip().lower().strip(".")

        if not domain:
            continue

        if any(
            character in domain
            for character in ("/", ":", "*", " ")
        ):
            continue

        if domain not in domains:
            domains.append(domain)

    return domains


def is_approved_url(
    url: str,
    allowed_domains: list[str],
) -> bool:
    try:
        parsed = urlsplit(url.strip())

        if parsed.scheme != "https":
            return False

        if parsed.username or parsed.password:
            return False

        if parsed.port not in (None, 443):
            return False

        hostname = (parsed.hostname or "").lower().rstrip(".")

        if not hostname:
            return False

        return any(
            hostname == domain
            or hostname.endswith("." + domain)
            for domain in allowed_domains
        )

    except (ValueError, AttributeError):
        return False


def search_official_web(
    question: str,
    max_results: int | None = None,
) -> list[dict]:

    if not settings.web_search_ready:
        logger.info(
            "Official website search is not configured"
        )
        return []

    allowed_domains = normalized_allowed_domains()

    if not allowed_domains:
        return []

    question = question.strip()[:400]

    if not question:
        return []

    # Do not force "admissions" into unrelated queries.
    query = (
        f"{settings.COLLEGE_OFFICIAL_NAME.strip()} "
        f"{question}"
    )[:500]

    result_limit = max(
        1,
        min(
            max_results
            or settings.WEB_SEARCH_MAX_RESULTS,
            5,
        ),
    )

    payload = {
        "query": query,
        "topic": "general",
        "search_depth": "basic",
        "max_results": result_limit,
        "include_domains": allowed_domains,
        "include_domains_mode": "restrict",
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
                    "Authorization": (
                        f"Bearer {settings.TAVILY_API_KEY}"
                    ),
                    "Content-Type": "application/json",
                },
                json=payload,
            )

            response.raise_for_status()
            data = response.json()

    except (httpx.HTTPError, ValueError):
        logger.exception(
            "Official SIETK website search failed"
        )
        return []

    if not isinstance(data, dict):
        return []

    results = data.get("results")

    if not isinstance(results, list):
        return []

    cleaned = []
    seen_urls = set()

    for item in results:
        if not isinstance(item, dict):
            continue

        url = str(
            item.get("url") or ""
        ).strip()

        title = str(
            item.get("title") or ""
        ).strip()

        content = str(
            item.get("content") or ""
        ).strip()

        if not is_approved_url(
            url,
            allowed_domains,
        ):
            continue

        if not title or not content:
            continue

        if url in seen_urls:
            continue

        seen_urls.add(url)

        cleaned.append({
            "title": title[:250],
            "url": url,
            "content": content[:4000],
        })

        if len(cleaned) >= result_limit:
            break

    return cleaned
