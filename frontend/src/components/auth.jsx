export function getUserRole() {
  const token = localStorage.getItem("token")
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload.role
  } catch {
    return null
  }
}

export function getUserId() {
  const token = localStorage.getItem("token")
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload.id
  } catch {
    return null
  }
}

export function getToken() {
  return localStorage.getItem("token")
}

export function logout() {
  localStorage.removeItem("token")
}
