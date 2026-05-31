import { API_BASE } from "../api/api"

export function isAbsoluteUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value)
}

export function resolveApiUrl(value) {
  if (!value) return ""
  if (isAbsoluteUrl(value)) return value
  if (typeof value !== "string") return ""
  if (value.startsWith("data:")) return value
  if (value.startsWith("/")) return `${API_BASE}${value}`
  return `${API_BASE}/${value}`
}

export function resolveUploadUrl(value) {
  if (!value) return ""
  if (isAbsoluteUrl(value)) return value
  if (typeof value !== "string") return ""
  if (value.startsWith("/uploads/")) return `${API_BASE}${value}`
  return `${API_BASE}/uploads/${value}`
}

