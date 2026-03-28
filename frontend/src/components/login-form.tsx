import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authService } from "@/services/AuthService"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await authService.login({
        username,
        password,
      })
      navigate("/")
    } catch (loginError) {
      console.error("Login error:", loginError)
      setError(authService.extractErrorMessage(loginError, "Invalid credentials. Please try again."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-8", className)} {...props}>
      <Card className="overflow-hidden rounded-[2.5rem] border-white/50 bg-white/65 shadow-[0_30px_120px_-70px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
        <CardHeader className="space-y-3 px-10 pt-10 pb-5">
          <CardTitle className="text-3xl tracking-tight">Login to your account</CardTitle>
          <CardDescription className="text-base">
            Enter your username and password to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="px-10 pb-10">
          <form onSubmit={handleLogin}>
            <FieldGroup className="space-y-5">
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="your-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 rounded-xl border-white/60 bg-white/80 text-sm text-ink shadow-inner shadow-white/30 backdrop-blur focus-visible:ring-2 focus-visible:ring-ink"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl border-white/60 bg-white/80 text-sm text-ink shadow-inner shadow-white/30 backdrop-blur focus-visible:ring-2 focus-visible:ring-ink"
                  required
                />
              </Field>
              {error && (
                <Field>
                  <FieldDescription className="rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-red-700">
                    {error}
                  </FieldDescription>
                </Field>
              )}
              <Field className="space-y-4 pt-1">
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-black text-white hover:bg-zinc-800"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      Login <ArrowRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account? <Link to="/register" className="font-medium text-ink underline-offset-4 hover:underline">Sign up</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
