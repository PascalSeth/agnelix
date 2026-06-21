import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { InviteAcceptForm } from "./invite-accept-form"

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const session = await auth()
  const { token } = await params

  const invite = await prisma.teamInvite.findUnique({
    where: { token },
    include: {
      owner: {
        select: {
          name: true,
          email: true,
          agencyName: true,
          agencyLogo: true,
        },
      },
    },
  })

  if (!invite) {
    notFound()
  }

  // If not logged in, redirect to sign-in with redirect parameter
  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/invite/${token}`)
  }

  return (
    <div className="relative min-h-screen bg-[#050508] flex items-center justify-center p-6 text-white overflow-hidden">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[900px] rounded-full bg-indigo-700/10 blur-[150px]" />
      </div>
      
      <div className="relative z-10 w-full max-w-md">
        <InviteAcceptForm invite={invite} session={session} />
      </div>
    </div>
  )
}
