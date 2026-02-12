import type { Config } from "tailwindcss"

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-poppins)"],
      },
    },
  },
  plugins: [],
} satisfies Config
