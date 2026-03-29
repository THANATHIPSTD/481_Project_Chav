export interface UserProfile {
  id: string
  username: string
  firstName: string
  lastName: string
  preferences: string
  createdAt?: string
}

export interface UpdateProfilePayload {
  firstName: string
  lastName: string
}
