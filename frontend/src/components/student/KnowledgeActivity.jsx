import { BookOpen, Globe2, Loader2, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const COPY = {
  "en-IN": {
    title: "Checking trusted sources",
    subtitle: "College documents and approved websites",
    docs: "PDF RAG",
    web: "Official Web",
  },
  "te-IN": {
    title: "నమ్మదగిన సమాచారాన్ని పరిశీలిస్తున్నాను",
    subtitle: "కళాశాల పత్రాలు మరియు అనుమతించిన వెబ్‌సైట్లు",
    docs: "PDF RAG",
    web: "అధికారిక వెబ్",
  },
};

export default function KnowledgeActivity({
  visible = false,
  languageCode = "en-IN",
}) {
  if (!visible) return null;

  const copy = COPY[languageCode] ?? COPY["en-IN"];

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-2 sm:gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-9 sm:w-9">
        <Search className="h-4 w-4 animate-pulse motion-reduce:animate-none" />
      </div>

      <Card className="w-full min-w-0 max-w-sm gap-3 rounded-2xl border px-3 py-3 shadow-sm sm:px-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" />
          <span className="text-sm font-medium leading-5">{copy.title}</span>
        </div>

        <p className="text-xs text-muted-foreground">{copy.subtitle}</p>

        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <BookOpen className="h-3 w-3" />
            {copy.docs}
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <Globe2 className="h-3 w-3" />
            {copy.web}
          </Badge>
        </div>

        <div className="flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70 motion-reduce:animate-none"
              style={{ animationDelay: `${index * 160}ms` }}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}