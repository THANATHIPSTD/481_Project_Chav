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

function saveToken(token: string) {
  localStorage.setItem("token", token)
  localStorage.setItem("auth_token", token)
}

async function login(payload: LoginPayload) {
  const response = await api.post("/auth/login", payload)
  const token = response.data?.access_token ?? response.data?.token
  if (!token) {
    throw new Error("Token was not returned by the server")
  }
  saveToken(token)
  return {
    token,
    username: response.data?.username as string | undefined,
  }
}

async function register(payload: RegisterPayload) {
  return api.post("/auth/register", payload)
}

export const authService = {
  login,
  register,
  extractErrorMessage,
}
