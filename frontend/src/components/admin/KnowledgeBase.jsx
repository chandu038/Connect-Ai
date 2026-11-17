import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Archive,
  BookOpen,
  CheckCircle2,
  Clock3,
  FilePenLine,
  FileText,
  FolderOpen,
  Loader2,
  MoreVertical,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const DOCUMENT_API = `${API_URL}/api/v1/admin/documents`;

// ==========================================
// API HELPER
// ==========================================

async function documentRequest(path, token, method = "GET", body = null) {
  if (!token) {
    throw new Error("Admin session expired. Please log in again.");
  }

  const isFormData = body instanceof FormData;

  const response = await fetch(`${DOCUMENT_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== null && !isFormData ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== null
      ? { body: isFormData ? body : JSON.stringify(body) }
      : {}),
  });

  const result = await response.json().catch(() => ({}));

  if (response.status === 401) {
    throw new Error("Unauthorized. Please log in again.");
  }

  if (response.status === 403) {
    throw new Error("Only Admin accounts can manage documents.");
  }

  if (!response.ok) {
    const detail = result.detail;
    let message = `Request failed (${response.status})`;

    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail)) {
      message = detail
        .map((item) => item.msg)
        .filter(Boolean)
        .join(", ");
    }

    throw new Error(message);
  }

  return result;
}

// ==========================================
// DOCUMENT HELPERS
// ==========================================

function getDocumentId(doc) {
  return doc?.id ?? doc?.document_id;
}

function getDocumentTitle(doc) {
  return doc?.title || doc?.name || "Untitled document";
}

function formatDate(value) {
  if (!value) return "Upload date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Upload date unavailable";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ==========================================
// STATUS BADGE
// ==========================================

function StatusBadge({ status }) {
  if (status === "published") {
    return (
      <Badge className="rounded-full bg-slate-950 text-white">Published</Badge>
    );
  }

  if (status === "archived") {
    return (
      <Badge variant="secondary" className="rounded-full">
        Archived
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="rounded-full">
      {status === "draft" ? "Draft" : status || "Unknown"}
    </Badge>
  );
}

// ==========================================
// ACTION POPUP
// ==========================================

function ActionPopup({ open, title, description, busy, onClose, children }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current?.();
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll(
            "button:not([disabled]), input:not([disabled])"
          )
        );

        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    const focusFrame = requestAnimationFrame(() => {
      const preferred = dialogRef.current?.querySelector("input:not([disabled])");
      const fallback = dialogRef.current?.querySelector("button:not([disabled])");
      (preferred || fallback)?.focus();
    });

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);

      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (!busy && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border bg-background p-5 text-foreground shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted sm:hidden" aria-hidden="true" />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={busy}
            onClick={onClose}
            aria-label="Close popup"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-5 sm:mt-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ==========================================
// MAIN KNOWLEDGE BASE
// ==========================================

export default function KnowledgeBase({ token }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);

  const [busyId, setBusyId] = useState(null);

  const [selected, setSelected] = useState(null);
  const [popupType, setPopupType] = useState(null);
  const [newName, setNewName] = useState("");

  const menuRefs = useRef({});
  const aliveRef = useRef(true);

  // ========================================
  // FETCH
  // ========================================

  const fetchDocuments = useCallback(
    async (showRefreshing = false) => {
      if (!token) {
        setDocuments([]);
        setLoading(false);
        return;
      }

      if (showRefreshing) setRefreshing(true);

      try {
        const response = await documentRequest("", token);
        if (!aliveRef.current) return;

        const items = Array.isArray(response)
          ? response
          : Array.isArray(response?.documents)
            ? response.documents
            : Array.isArray(response?.items)
              ? response.items
              : [];

        setDocuments(items);
      } catch (error) {
        if (aliveRef.current) toast.error(error.message);
      } finally {
        if (aliveRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [token]
  );

  useEffect(() => {
    aliveRef.current = true;
    fetchDocuments();

    return () => {
      aliveRef.current = false;
    };
  }, [fetchDocuments]);

  // ========================================
  // CLOSE MENUS ON OUTSIDE TAP
  // ========================================

  useEffect(() => {
    function handleOutsideClick(event) {
      Object.values(menuRefs.current).forEach((menu) => {
        if (menu?.open && !menu.contains(event.target)) {
          menu.open = false;
        }
      });
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, []);

  // ========================================
  // POPUP HELPERS
  // ========================================

  function openPopup(type, doc) {
    const id = getDocumentId(doc);
    const menu = menuRefs.current[id];
    if (menu) menu.open = false;

    setSelected(doc);
    setNewName(getDocumentTitle(doc));
    setPopupType(type);
  }

  function closePopup() {
    if (busyId !== null) return;

    setPopupType(null);
    setSelected(null);
    setNewName("");
  }

  // ========================================
  // UPLOAD
  // ========================================

  async function uploadDocument(event) {
    event.preventDefault();
    if (!file || uploading) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are supported.");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      await documentRequest("/upload", token, "POST", formData);

      toast.success("PDF uploaded successfully. Process and publish it next.");

      setFile(null);
      setFileKey((value) => value + 1);
      await fetchDocuments();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  }

  // ========================================
  // RENAME
  // ========================================

  async function renameDocument() {
    if (!selected || busyId !== null) return;

    const title = newName.trim();

    if (!title || title.length > 255) {
      toast.error("Document name must contain 1–255 characters.");
      return;
    }

    const id = getDocumentId(selected);
    setBusyId(id);

    try {
      const result = await documentRequest(`/${id}`, token, "PATCH", { title });

      setDocuments((previous) =>
        previous.map((doc) =>
          getDocumentId(doc) === id ? { ...doc, title: result.title || title } : doc
        )
      );

      setPopupType(null);
      setSelected(null);
      setNewName("");

      toast.success("Document name updated successfully");
      await fetchDocuments();
    } catch (error) {
      toast.error(`Rename failed: ${error.message}`);
    } finally {
      setBusyId(null);
    }
  }

  // ========================================
  // ARCHIVE
  // ========================================

  async function archiveDocument() {
    if (!selected || busyId !== null) return;

    const id = getDocumentId(selected);
    setBusyId(id);

    try {
      await documentRequest(`/${id}/archive`, token, "POST");

      setDocuments((previous) =>
        previous.map((doc) =>
          getDocumentId(doc) === id ? { ...doc, status: "archived" } : doc
        )
      );

      setPopupType(null);
      setSelected(null);

      toast.success("Document archived successfully");
      await fetchDocuments();
    } catch (error) {
      toast.error(`Archive failed: ${error.message}`);
    } finally {
      setBusyId(null);
    }
  }

  // ========================================
  // DELETE
  // ========================================

  async function deleteDocument() {
    if (!selected || busyId !== null) return;

    const id = getDocumentId(selected);
    setBusyId(id);

    try {
      await documentRequest(`/${id}`, token, "DELETE");

      setDocuments((previous) => previous.filter((doc) => getDocumentId(doc) !== id));

      setPopupType(null);
      setSelected(null);

      toast.success("Document and embeddings deleted");
      await fetchDocuments();
    } catch (error) {
      toast.error(`Delete failed: ${error.message}`);
    } finally {
      setBusyId(null);
    }
  }

  // ========================================
  // PROCESS / PUBLISH
  // ========================================

  async function processDocument(doc) {
    if (busyId !== null) return;

    const id = getDocumentId(doc);
    setBusyId(id);

    try {
      await documentRequest(`/${id}/process`, token, "POST");
      toast.success("Document processed successfully");
      await fetchDocuments();
    } catch (error) {
      toast.error(`Processing failed: ${error.message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function publishDocument(doc) {
    if (busyId !== null) return;

    const id = getDocumentId(doc);
    setBusyId(id);

    try {
      await documentRequest(`/${id}/publish`, token, "POST");
      toast.success("Document published successfully");
      await fetchDocuments();
    } catch (error) {
      toast.error(`Publish failed: ${error.message}`);
    } finally {
      setBusyId(null);
    }
  }

  // ========================================
  // COUNTS
  // ========================================

  const publishedCount = documents.filter((doc) => doc.status === "published").length;
  const archivedCount = documents.filter((doc) => doc.status === "archived").length;
  const operationBusy = busyId !== null;

  // ========================================
  // UI
  // ========================================

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 py-2 sm:space-y-5 sm:py-4">

      {/* HEADER AND UPLOAD */}
      <Card className="rounded-2xl sm:rounded-3xl">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <BookOpen className="h-5 w-5 shrink-0" />
            Knowledge Base
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Manage official college admission documents used by Connect-Ai.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-4 pt-0 sm:space-y-5 sm:p-6 sm:pt-0">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Badge variant="outline">{documents.length} Documents</Badge>
            <Badge variant="outline">{publishedCount} Published</Badge>
            <Badge variant="outline">{archivedCount} Archived</Badge>
          </div>

          <form
            onSubmit={uploadDocument}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="knowledge-file" className="text-sm">
                Upload college PDF
              </Label>

              <div className="flex items-center gap-2">
                <Input
                  key={fileKey}
                  id="knowledge-file"
                  type="file"
                  accept=".pdf,application/pdf"
                  disabled={uploading}
                  className="min-w-0 text-sm file:mr-3 file:text-sm"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />

                {file && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    aria-label="Clear selected PDF"
                    disabled={uploading}
                    onClick={() => {
                      setFile(null);
                      setFileKey((value) => value + 1);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="h-10 w-full gap-2 sm:w-auto"
              disabled={!file || uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload PDF
            </Button>
          </form>

          <p className="text-xs text-muted-foreground">
            Upload a PDF, process it to create embeddings, then publish it to make information
            available to students.
          </p>
        </CardContent>
      </Card>

      {/* DOCUMENT LIST */}
      <Card className="rounded-2xl sm:rounded-3xl">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FolderOpen className="h-5 w-5 shrink-0" />
              Uploaded Documents
            </CardTitle>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 sm:h-8"
              disabled={refreshing}
              onClick={() => fetchDocuments(true)}
            >
              <RefreshCw
                className={`h-4 w-4 sm:mr-2 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`}
              />
              <span className="sr-only sm:not-sr-only">Refresh</span>
            </Button>
          </div>

          <CardDescription className="text-xs sm:text-sm">
            Manage uploaded PDFs using the menu on each item.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
          {loading && (
            <div
              role="status"
              className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"
            >
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              Loading documents...
            </div>
          )}

          {!loading && documents.length === 0 && (
            <div className="py-10 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
            </div>
          )}

          {!loading &&
            documents.map((doc) => {
              const id = getDocumentId(doc);
              const title = getDocumentTitle(doc);
              const busy = busyId === id;
              const isDraft = doc.status === "draft";
              const isPublished = doc.status === "published";
              const canPublish = isDraft && Number(doc.total_embeddings || 0) > 0;

              return (
                <div
                  key={id}
                  className="flex min-w-0 items-start gap-3 rounded-xl border p-3 sm:p-4"
                >
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 sm:hidden">
                      <StatusBadge status={doc.status} />
                    </div>

                    <p className="break-words text-sm font-semibold leading-snug">{title}</p>

                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5 shrink-0" />
                      {formatDate(doc.uploaded_at || doc.created_at)}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {doc.total_chunks || 0} chunks
                      {" · "}
                      {doc.total_embeddings || 0} embeddings
                    </p>

                    {isDraft && (
                      <div className="grid grid-cols-2 gap-2 pt-2 sm:flex sm:flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs sm:h-8"
                          disabled={operationBusy}
                          onClick={() => processDocument(doc)}
                        >
                          {busy ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
                          ) : (
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                          )}
                          Process
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          className="h-9 text-xs sm:h-8"
                          disabled={!canPublish || operationBusy}
                          onClick={() => publishDocument(doc)}
                        >
                          <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                          Publish
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <div className="hidden sm:block">
                      <StatusBadge status={doc.status} />
                    </div>

                    <details
                      ref={(element) => {
                        if (element) {
                          menuRefs.current[id] = element;
                        } else {
                          delete menuRefs.current[id];
                        }
                      }}
                      className="relative"
                    >
                      <summary
                        aria-label={`Manage ${title}`}
                        className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:w-9 [&::-webkit-details-marker]:hidden"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                        ) : (
                          <MoreVertical className="h-4 w-4" />
                        )}
                      </summary>

                      <div className="absolute bottom-full right-0 z-[100] mb-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-1 text-popover-foreground shadow-xl">
                        <button
                          type="button"
                          disabled={operationBusy}
                          className="flex min-h-10 w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
                          onClick={() => openPopup("rename", doc)}
                        >
                          <FilePenLine className="mr-2 h-4 w-4" />
                          Edit Name
                        </button>

                        {isPublished && (
                          <button
                            type="button"
                            disabled={operationBusy}
                            className="flex min-h-10 w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
                            onClick={() => openPopup("archive", doc)}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </button>
                        )}

                        <div className="my-1 border-t" />

                        <button
                          type="button"
                          disabled={operationBusy}
                          className="flex min-h-10 w-full items-center rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-accent disabled:opacity-50"
                          onClick={() => openPopup("delete", doc)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </details>
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* RENAME */}
      <ActionPopup
        open={popupType === "rename"}
        title="Edit document name"
        description="Change the displayed name without modifying the PDF or its embeddings."
        busy={operationBusy}
        onClose={closePopup}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            renameDocument();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="rename-document">Document name</Label>
            <Input
              id="rename-document"
              value={newName}
              maxLength={255}
              disabled={operationBusy}
              className="h-10 text-base sm:text-sm"
              onChange={(event) => setNewName(event.target.value)}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={operationBusy}
              onClick={closePopup}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={
                operationBusy ||
                !newName.trim() ||
                newName.trim() === getDocumentTitle(selected)
              }
            >
              {operationBusy && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </ActionPopup>

      {/* ARCHIVE */}
      <ActionPopup
        open={popupType === "archive"}
        title="Archive this document?"
        description={`Archive "${getDocumentTitle(selected)}"? Students will no longer retrieve information from this PDF. Its embeddings will remain stored.`}
        busy={operationBusy}
        onClose={closePopup}
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={operationBusy}
            onClick={closePopup}
          >
            Cancel
          </Button>

          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={operationBusy}
            onClick={archiveDocument}
          >
            {operationBusy && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
            )}
            <Archive className="mr-2 h-4 w-4" />
            Archive Document
          </Button>
        </div>
      </ActionPopup>

      {/* DELETE */}
      <ActionPopup
        open={popupType === "delete"}
        title="Permanently delete this document?"
        description={`Delete "${getDocumentTitle(selected)}" and its database chunks and embeddings? This cannot be undone through the Knowledge Base. The original PDF is retained separately by your current backend.`}
        busy={operationBusy}
        onClose={closePopup}
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={operationBusy}
            onClick={closePopup}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={operationBusy}
            onClick={deleteDocument}
          >
            {operationBusy && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
            )}
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Permanently
          </Button>
        </div>
      </ActionPopup>
    </div>
  );
}