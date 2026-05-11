import { BottomNav } from '@/components/layout/BottomNav'

export const metadata = { title: 'Profil — NorskCoach' }

export default function ProfilePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-nc-bg">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-5 py-10 text-center">
        <div className="text-4xl mb-4">👤</div>
        <h1 className="text-xl font-extrabold text-white mb-2">Profil</h1>
        <p className="text-sm text-white/30">
          Kommer snart — logg inn for å lagre fremgangen din.
        </p>
      </main>
      <BottomNav active="profile" />
    </div>
  )
}
