import { BookOpen, ExternalLink, Globe2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const BASE_CHIP =
  "inline-flex max-w-full min-h-9 items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-left text-xs leading-5 font-normal transition-colors";

function isSafeWebUrl(url) {
  if (typeof url !== "string") return false;

  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function SourceContent({ source, citation, title, isWeb, showLink }) {
  return (
    <>
      {isWeb ? (
        <Globe2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}

      <span className="min-w-0 break-words">
        <strong className="font-semibold">{citation}</strong>{" "}
        {title}
        {!isWeb &&
          source.page_number != null &&
          ` · Page ${source.page_number}`}
      </span>

      {showLink && (
        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
    </>
  );
}

export default function AnswerSources({ sources = [] }) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="answer-sources-heading" className="space-y-2 border-t pt-3">
      <h3
        id="answer-sources-heading"
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
      >
        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
        Sources
      </h3>

      <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {sources.map((source, index) => {
          const isWeb = source.source_type === "web";
          const citation = source.citation || `[${index + 1}]`;
          const title = source.document_title || "College information";
          const validUrl = isWeb && isSafeWebUrl(source.url);
          const key = `${source.url ?? source.document_id ?? citation}-${index}`;

          if (validUrl) {
            return (
              <li key={key} className="w-full sm:w-auto">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${citation} ${title} (opens in a new tab)`}
                  className={`${BASE_CHIP} w-full sm:w-auto hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  <SourceContent
                    source={source}
                    citation={citation}
                    title={title}
                    isWeb
                    showLink
                  />
                </a>
              </li>
            );
          }

          return (
            <li key={key} className="w-full sm:w-auto">
              <Badge
                variant="secondary"
                className={`${BASE_CHIP} h-auto w-full whitespace-normal rounded-lg border-transparent sm:w-auto`}
              >
                <SourceContent
                  source={source}
                  citation={citation}
                  title={title}
                  isWeb={isWeb}
                  showLink={false}
                />
              </Badge>
            </li>
          );
        })}
      </ul>
    </section>
  );
}