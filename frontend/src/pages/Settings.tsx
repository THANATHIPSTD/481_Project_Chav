import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldGroup, FieldDescription } from "@/components/ui/field"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, User as UserIcon } from "lucide-react"
import { authService } from "@/services/AuthService"
import { profileService } from "@/services/profileService"

export default function Settings() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })

  useEffect(() => {
    async function fetchProfile() {
      try {
        const profile = await profileService.getProfile()
        setFirstName(profile.firstName)
        setLastName(profile.lastName)
        setUsername(profile.username || localStorage.getItem("username") || "")
      } catch {
        setMessage({ type: "error", text: "Failed to load profile data." })
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: "", text: "" })

    try {
      const response = await profileService.updateProfile({
        firstName,
        lastName,
      })
      setMessage({ type: "success", text: response.message })
    } catch (err) {
      setMessage({ 
        type: "error", 
        text: authService.extractErrorMessage(err, "Failed to update profile") 
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen font-sans text-zinc-900 relative bg-transparent">
      {/* Fixed Background Layer with Conditional Blur Overlay */}
      <div 
        className="fixed inset-0 z-[-1] bg-cover bg-center bg-no-repeat transition-transform duration-700"
        style={{ backgroundImage: "url('https://img1.pic.in.th/images/11309251.png')" }}
      >
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
      </div>

      <main className="relative z-10 mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Account Settings</h1>
          <p className="mt-2 text-zinc-500">Manage your profile information and preferences.</p>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : (
          <Card className="overflow-hidden rounded-[2rem] border border-zinc-200/60 bg-white shadow-sm">
            <CardHeader className="border-b border-zinc-100 bg-zinc-50/50 px-8 py-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600">
                  <UserIcon className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle className="text-xl">Profile Details</CardTitle>
                  <CardDescription>Update your personal information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit}>
                <FieldGroup className="space-y-6">
                  <Field>
                    <FieldLabel htmlFor="username">Username</FieldLabel>
                    <Input 
                      id="username" 
                      value={username} 
                      disabled 
                      className="bg-zinc-50 text-zinc-500 cursor-not-allowed"
                    />
                    <FieldDescription>Username cannot be changed</FieldDescription>
                  </Field>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="firstName">First name</FieldLabel>
                      <Input 
                        id="firstName" 
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)} 
                        placeholder="Your first name"
                        className="rounded-xl"
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                      <Input 
                        id="lastName" 
                        value={lastName} 
                        onChange={(e) => setLastName(e.target.value)} 
                        placeholder="Your last name"
                        className="rounded-xl"
                      />
                    </Field>
                  </div>

                  {message.text && (
                    <div className={`rounded-xl px-4 py-3 text-sm ${
                      message.type === "success" 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}>
                      {message.text}
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      disabled={saving}
                      className="rounded-xl bg-black px-6 text-white hover:bg-zinc-800 h-11"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
