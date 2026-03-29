import { LoginForm } from "@/components/login-form"
import { motion } from "framer-motion"

export default function Login() {
  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('https://img1.pic.in.th/images/11309251.png')" }}
    >
      <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-12">
        <motion.div 
          className="w-full max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <LoginForm />
        </motion.div>
      </div>
    </div>
  )
}