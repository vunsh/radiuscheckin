"use client"

import { useSession, signOut } from "next-auth/react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Home, LogOut, User } from "lucide-react"
import { useRouter } from "next/navigation"

export function Profile() {
  const { data: session } = useSession()
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="lg" className="gap-2 w-full sm:w-auto text-base py-3 rounded-lg">
          <Avatar className="size-7">
            <AvatarImage src={session?.user?.image} alt={session?.user?.name} />
            <AvatarFallback>{session?.user?.name?.[0]}</AvatarFallback>
          </Avatar>
          <span className="hidden md:inline">{session?.user?.name}</span>
          <User className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px] w-full sm:w-56">
        <DropdownMenuItem onClick={() => router.push("/")} className="flex items-center gap-2">
          <Home className="size-4" />
          Back to Home
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => signOut()} className="flex items-center gap-2">
          <LogOut className="size-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
