import { ProtectedRoute } from "@/components/admin/ProtectedRoute"
import { DataDisplay } from "@/components/admin/DataDisplay"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Database } from "lucide-react"
import { Profile } from "@/components/auth/Profile"

export default function AdministratorPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-2 sm:p-4">
        <div className="max-w-full sm:container mx-auto space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-full sm:w-auto">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Shield className="size-6 text-primary" />
                  Administrator Panel
                </CardTitle>
                <CardDescription>
                  Manage student data and QR codes for the RadiusCheckIn system
                </CardDescription>
              </div>
              <Profile />
            </CardHeader>
          </Card>

          <DataDisplay />

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground py-4">
            <div className="flex items-center justify-center gap-2">
              <Database className="size-4" />
              Data sourced from Google Sheets
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
