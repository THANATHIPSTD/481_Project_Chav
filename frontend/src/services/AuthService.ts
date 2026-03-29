import { isAxiosError } from "axios"

import api from "@/services/api"
import type { LoginPayload, RegisterPayload } from "@/types/auth";

function extractErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const apiError = error.response?.data as { error?: string; message?: string } | undefined
    return apiError?.error || apiError?.message || fallback
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

function saveToken(token: string, username?: string) {
  localStorage.setItem("token", token)
  localStorage.setItem("auth_token", token)
  if (username) {
    localStorage.setItem("username", username)
  }
}

function isAuthenticated() {
  return Boolean(localStorage.getItem("token"))
}

function normalizeNextPath(nextPath?: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/"
  }
  return nextPath
}

function buildLoginPath(nextPath: string) {
  const params = new URLSearchParams({
    next: normalizeNextPath(nextPath),
  })
  return `/login?${params.toString()}`
}

async function login(payload: LoginPayload) {
  const response = await api.post("/auth/login", payload)
  const token = response.data?.access_token ?? response.data?.token
  if (!token) {
    throw new Error("Token was not returned by the server")
  }
  const username = response.data?.username
  saveToken(token, username)
  return {
    token,
    username,
  }
}

async function register(payload: RegisterPayload) {
  return api.post("/auth/register", payload)
}

function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("auth_token")
  localStorage.removeItem("username")
}

export const authService = {
  login,
  register,
  logout,
  isAuthenticated,
  normalizeNextPath,
  buildLoginPath,
  extractErrorMessage,
}
