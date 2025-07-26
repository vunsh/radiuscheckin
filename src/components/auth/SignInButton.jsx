"use client"

import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"
import Link from "next/link"

export function SignInButton() {
  const { data: session } = useSession()

  if (session) {
    return (
      <Link href="/administrator" className="w-full sm:w-auto">
        <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto text-base py-3 rounded-lg">
          <LogIn className="size-4" />
          Administrator
        </Button>
      </Link>
    )
  }

  return (
    <Button 
      onClick={() => signIn("google", { callbackUrl: "/administrator" })}
      variant="outline"
      size="lg"
      className="gap-2 w-full sm:w-auto text-base py-3 rounded-lg"
    >
      <LogIn className="size-4" />
      Administrator
    </Button>
  )
}
