import axios from "axios"

export const API_BASE = (import.meta.env.VITE_API_URL || "https://college-buddy-kvns.onrender.com").trim()

const API = axios.create({
  baseURL: API_BASE
})

export default API
