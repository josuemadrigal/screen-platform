import axios from 'axios'

// Sin authStore — esta app no necesita autenticación de admin
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4006'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
})
