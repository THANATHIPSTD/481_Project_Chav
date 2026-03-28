import { LoginForm } from "@/components/login-form"

export default function Login() {
  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('https://img1.pic.in.th/images/11309251.png')" }}
    >
      <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-lg">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}