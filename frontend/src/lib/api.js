
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

export async function apiRequest(
  path,
  body,
  token,
  options = {}
) {
  const method =
    options.method || (body === undefined ? "GET" : "POST");

  const headers = {
    Accept: "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    if (Array.isArray(data?.detail)) {
      message = data.detail
        .map((error) => {
          const field = (error.loc || [])
            .filter((part) => part !== "body")
            .join(".");

          return `${field || "Request"}: ${error.msg}`;
        })
        .join("; ");
    } else if (typeof data?.detail === "string") {
      message = data.detail;
    }

    throw new Error(message);
  }

  return data;
}
