import axios from 'axios'
import { API_URL } from './config'

// Sin authStore — esta app no necesita autenticación de admin

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
})
