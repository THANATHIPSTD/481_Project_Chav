/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Inter Variable'", "Inter", "system-ui", "-apple-system", "sans-serif"],
        heading: ["'Inter Variable'", "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        canvas: "#f7f7f7",
        surface: "#ffffff",
        ink: "#0b0b0b",
      },
      borderRadius: {
        lg: "14px",
        xl: "18px",
        "2xl": "22px",
      },
    },
  },
  plugins: [],
}