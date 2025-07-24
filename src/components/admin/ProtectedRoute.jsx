"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { isApprovedUser } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { SignInButton } from "@/components/auth/SignInButton"
import { ShieldX, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"

export function ProtectedRoute({ children }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="container mx-auto max-w-4xl pt-20">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="container mx-auto max-w-md pt-20">
          <Card>
            <CardHeader className="text-center">
              <UserX className="size-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Please sign in to access the administrator panel
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <SignInButton />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!isApprovedUser(session.user?.email)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="container mx-auto max-w-md pt-20">
          <Card>
            <CardHeader className="text-center">
              <ShieldX className="size-12 mx-auto text-destructive mb-4" />
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                Your account ({session.user?.email}) is not authorized to access this area
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <ShieldX className="size-4" />
                <AlertDescription>
                  Contact your administrator to request access to this panel.
                </AlertDescription>
              </Alert>
              <Button onClick={() => signOut()} variant="outline" className="mt-4 w-full">
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return children
}
