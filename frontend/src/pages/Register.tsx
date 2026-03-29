import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { authService } from "@/services/AuthService"

export default function Register() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const navigate = useNavigate()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)

    try {
      await authService.register({
        username,
        password,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      })

      // Auto-login so preferences save has a JWT
      await authService.login({ username, password })

      setMessage("Register successful. Tell us your preferences to personalize your feed.")
      setTimeout(() => navigate("/preferences", { replace: true }), 2500)
    } catch (registerError) {
      console.error("Register error:", registerError)
      setError(authService.extractErrorMessage(registerError, "Register failed. Username may already exist."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('https://img1.pic.in.th/images/11309251.png')" }}
    >
      <div className="flex min-h-screen w-full items-center justify-center px-6 py-10 md:px-12">
        <motion.div
          className="w-full max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Card className="relative overflow-hidden rounded-[2.5rem] border-white/50 bg-white/65 shadow-[0_30px_120px_-70px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
            <AnimatePresence mode="wait">
              {message ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.4 }}
                  className="flex min-h-[400px] flex-col items-center justify-center space-y-6 p-10 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
                  >
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
                      <CheckCircle2 className="h-12 w-12" />
                    </div>
                  </motion.div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-semibold tracking-tight">Success!</h3>
                    <p className="text-lg text-zinc-600">
                      Welcome to the club. Let's personalize your experience.
                    </p>
                  </div>
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-400 mt-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <CardHeader className="space-y-3 px-10 pt-10 pb-4">
                    <CardTitle className="text-3xl tracking-tight">Create account</CardTitle>
                    <CardDescription className="text-base">Register a new account to continue</CardDescription>
                  </CardHeader>
                  <CardContent className="px-10 pb-10">
                    <form onSubmit={handleRegister}>
                      <FieldGroup className="space-y-5">
                        <Field>
                          <FieldLabel htmlFor="username">Username</FieldLabel>
                          <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                        </Field>

                        <Field>
                          <FieldLabel htmlFor="password">Password</FieldLabel>
                          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </Field>

                        <Field>
                          <FieldLabel htmlFor="firstName">First name (optional)</FieldLabel>
                          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                        </Field>

                        <Field>
                          <FieldLabel htmlFor="lastName">Last name (optional)</FieldLabel>
                          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </Field>

                        {error && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                            <Field>
                              <FieldDescription className="rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-red-700">
                                {error}
                              </FieldDescription>
                            </Field>
                          </motion.div>
                        )}

                        <Field className="space-y-4 pt-1">
                          <Button type="submit" className="h-11 w-full rounded-xl bg-black text-white hover:bg-zinc-800" disabled={loading}>
                            {loading ? (
                              <>
                                <Loader2 className="mr-2 size-4 animate-spin" />
                                Registering...
                              </>
                            ) : (
                              <>
                                Register <ArrowRight className="ml-2 size-4" />
                              </>
                            )}
                          </Button>
                          <FieldDescription className="text-center">
                            Already have an account? <Link to="/login" className="font-medium text-ink underline-offset-4 hover:underline">Login</Link>
                          </FieldDescription>
                        </Field>
                      </FieldGroup>
                    </form>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
