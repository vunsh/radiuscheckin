
//legacy component
"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { FolderOpen, CheckCircle2, AlertCircle, Lock, Folder } from "lucide-react"
import { toast } from "sonner"

export function FolderPicker({ onFolderValidated, isValidated, validatedFolder }) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [folders, setFolders] = useState([])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (session?.accessToken && !isValidated) {
      loadUserFolders()
    }
  }, [session?.accessToken, isValidated])

  const loadUserFolders = async () => {
    if (!session?.accessToken) return

    setLoading(true)
    setError("")

    try {
      const response = await fetch('/api/admin/drive/folders', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load folders')
      }

      const data = await response.json()
      setFolders(data.folders || [])
    } catch (err) {
      setError(err.message || "Failed to load Google Drive folders")
      toast.error("Failed to load folders", {
        description: "Please check your Google Drive permissions"
      })
    } finally {
      setLoading(false)
    }
  }

  const validateFolder = async (folder) => {
    if (!session?.accessToken) return

    setLoading(true)
    setError("")

    try {
      const response = await fetch('/api/admin/drive/validate-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({ folderId: folder.id })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Folder validation failed')
      }

      if (result.isValid) {
        setSelectedFolder(folder)
        onFolderValidated(folder)
        toast.success("Folder validated successfully!", {
          description: `You can now upload QR codes to "${folder.name}"`
        })
      } else {
        throw new Error(result.error || 'Invalid folder selected')
      }
    } catch (err) {
      setError(err.message || "Folder validation failed")
      toast.error("Invalid folder", {
        description: err.message || "Please select the correct QR codes folder"
      })
    } finally {
      setLoading(false)
    }
  }

  if (isValidated && validatedFolder) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle2 className="size-5" />
            Folder Validated
          </CardTitle>
          <CardDescription className="text-green-600 dark:text-green-400">
            QR codes will be uploaded to the validated folder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border">
            <div className="flex items-center gap-3">
              <Folder className="size-5 text-blue-600" />
              <div>
                <p className="font-medium">{validatedFolder.name}</p>
                <p className="text-sm text-muted-foreground">ID: {validatedFolder.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success" className="bg-green-100 text-green-800 border-green-200">
                <Lock className="size-3 mr-1" />
                Validated
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="size-5" />
          Select QR Codes Folder
        </CardTitle>
        <CardDescription>
          Choose the correct Google Drive folder for uploading QR codes. You must select the designated QR codes folder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!session?.accessToken && (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertDescription>
              Please sign out and sign in again to access Google Drive folders.
            </AlertDescription>
          </Alert>
        )}

        {session?.accessToken && (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Available folders in your Google Drive
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadUserFolders}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : folders.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="size-5 text-blue-600" />
                      <div>
                        <p className="font-medium">{folder.name}</p>
                        <p className="text-xs text-muted-foreground">ID: {folder.id}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => validateFolder(folder)}
                      disabled={loading}
                    >
                      Select
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="size-12 mx-auto mb-4 opacity-50" />
                <p>No folders found in your Google Drive</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadUserFolders}
                  disabled={loading}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            )}
          </>
        )}

        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Important:</strong> You must select the designated QR codes folder. 
            Selecting any other folder will result in an error.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
