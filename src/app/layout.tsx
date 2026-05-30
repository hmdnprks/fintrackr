import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import { VaultProvider } from '@/context/VaultContext'
import ChatBubble from '@/components/ChatBubble'
import NavBar from '@/components/NavBar'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

const poppins = Poppins({
  weight: ['400', '600'],
  subsets: ['latin'],
  display: 'swap'
});

export const metadata: Metadata = {
  title: "FinTrackr — Personal Finance Dashboard",
  description:
    "Import Mandiri e-Statements, categorize transactions automatically, and visualize your finances locally.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fintrackr",
  },
  other: {
    "theme-color": "#2563eb",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body className={`${poppins.className} antialiased`}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

          <NavBar />

          {/* Pages manage their own padding — no extra wrapper here */}
          <VaultProvider>
            {children}
          </VaultProvider>

          <ChatBubble />

        </div>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
