import api from "@/services/api"
import type { UpdateProfilePayload, UserProfile } from "@/types/profile"

interface RawProfileResponse {
  id?: string | number
  username?: string
  first_name?: string
  last_name?: string
  preferences?: string
  created_at?: string
}

interface RawUpdateProfileResponse {
  message?: string
  first_name?: string
  last_name?: string
}

function normalizeProfile(profile: RawProfileResponse): UserProfile {
  return {
    id: String(profile.id ?? ""),
    username: profile.username ?? "",
    firstName: profile.first_name ?? "",
    lastName: profile.last_name ?? "",
    preferences: profile.preferences ?? "",
    createdAt: profile.created_at,
  }
}

async function getProfile(): Promise<UserProfile> {
  const response = await api.get<RawProfileResponse>("/auth/me")
  return normalizeProfile(response.data)
}

async function updateProfile(payload: UpdateProfilePayload) {
  const response = await api.put<RawUpdateProfileResponse>("/auth/update-profile", {
    first_name: payload.firstName,
    last_name: payload.lastName,
  })

  return {
    message: response.data.message ?? "Profile updated successfully!",
    firstName: response.data.first_name ?? payload.firstName,
    lastName: response.data.last_name ?? payload.lastName,
  }
}

export const profileService = {
  getProfile,
  updateProfile,
}
