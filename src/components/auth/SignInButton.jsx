"use client"

import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"
import Link from "next/link"

export function SignInButton() {
  const { data: session } = useSession()

  if (session) {
    return (
      <Link href="/administrator">
        <Button variant="outline" size="sm" className="gap-2">
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
      size="sm"
      className="gap-2"
    >
      <LogIn className="size-4" />
      Administrator
    </Button>
  )
}
