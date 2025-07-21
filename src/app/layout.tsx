import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '水泳コーチAI',
  description: 'AIがあなたの泳ぎをアドバイス',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <header className="header">
          <h1>🏊‍♂️ 水泳コーチAI</h1>
        </header>
        <main className="main-container">
          {children}
        </main>
        <footer className="footer">
          <p>© 2024 水泳部 AI コーチシステム</p>
        </footer>
      </body>
    </html>
  )
}
