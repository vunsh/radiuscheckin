"use client"

import { useState } from "react"
import { useSession, signIn } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, User, AlertCircle, CheckCircle2, Loader2, FileStack } from "lucide-react"
import { toast } from "sonner"

export function QRUploadTab({ onNavigateToMassUpload }) {
  const { data: session } = useSession()
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [studentMatch, setStudentMatch] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFileSelect = (selectedFile) => {
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
      setStudentMatch(null)
    } else {
      toast.error("Please select a PDF file")
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/upload-qr', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setStudentMatch(result)
      toast.success("Student found! Please confirm the details.")

    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.message || "Failed to process QR code")
    } finally {
      setUploading(false)
    }
  }

  const handleConfirm = async () => {
    if (!file || !studentMatch) return

    if (!session?.accessToken || session?.error === "RefreshAccessTokenError") {
      toast.error("Authentication expired", {
        description: "Please sign out and sign in again to refresh your Google Drive access."
      })
      return
    }

    setConfirming(true)
    try {
      const safeName = studentMatch.studentInfo.fullName.replace(/[^a-zA-Z0-9-_]/g, "_")
      const filename = `${studentMatch.studentInfo.studentId || 'student'}_${safeName}_QR_${Date.now()}.pdf`
      
      const pdfFile = new File([file], filename, { type: 'application/pdf' })

      const formData = new FormData()
      formData.append('file', pdfFile)
      formData.append('studentName', studentMatch.studentInfo.fullName)
      formData.append('rowIndex', studentMatch.studentInfo.rowIndex.toString())

      const response = await fetch('/api/admin/confirm-qr-upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Authentication expired", {
            description: "Please sign out and sign in again to refresh your access.",
            action: {
              label: "Re-authenticate",
              onClick: () => signIn("google")
            }
          })
          return
        }
        throw new Error(result.error || 'Confirmation failed')
      }

      toast.success(result.message)
      
      // Reset form
      setFile(null)
      setStudentMatch(null)
    } catch (error) {
      console.error('Confirmation error:', error)
      toast.error(error.message || "Failed to confirm QR code upload")
    } finally {
      setConfirming(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setStudentMatch(null)
  }

  return (
    <div className="space-y-6">
      {/* Mass Upload Button */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <FileStack className="size-5" />
            Bulk QR Code Processing
          </CardTitle>
          <CardDescription className="text-blue-600 dark:text-blue-400">
            Upload a large PDF containing multiple QR codes for batch processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={onNavigateToMassUpload}
            className="w-full"
            variant="outline"
          >
            <FileStack className="size-4 mr-2" />
            Go to Mass Upload
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            Upload QR Code PDF
          </CardTitle>
          <CardDescription>
            Upload a PDF containing a student's QR code. The PDF will be stored directly and converted to an image when displayed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!studentMatch && (
            <>
              <div
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 transition-colors cursor-pointer select-none
                  ${dragActive 
                    ? 'border-primary bg-primary/10'
                    : 'border-muted-foreground/25 hover:border-primary/60 hover:bg-muted/50'
                  }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('qr-upload-input')?.click()}
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    document.getElementById('qr-upload-input')?.click()
                  }
                }}
                style={{ outline: dragActive ? '2px solid var(--primary)' : 'none' }}
              >
                <FileText className="mx-auto h-14 w-14 text-primary mb-4" />
                <div className="space-y-1">
                  <p className="text-lg font-semibold">
                    Drag & drop your PDF here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or <span className="underline text-primary font-medium">click to select</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only PDF files are accepted - will be stored as PDF and converted to image when displayed
                  </p>
                </div>
                <Input
                  id="qr-upload-input"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  className="hidden"
                  tabIndex={-1}
                />
              </div>

              {file && (
                <>
                  <Alert>
                    <FileText className="size-4" />
                    <AlertDescription>
                      <strong>Selected file:</strong> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </AlertDescription>
                  </Alert>
                </>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleUpload} 
                  disabled={!file || uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="size-4 mr-2" />
                      Process PDF
                    </>
                  )}
                </Button>
                {file && (
                  <Button variant="outline" onClick={resetForm}>
                    Clear
                  </Button>
                )}
              </div>
            </>
          )}

          {studentMatch && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="size-4" />
                <AlertDescription>
                  <strong>Student Found!</strong> Please confirm the details below are correct.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="size-5" />
                    Student Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Student Name</label>
                      <p className="text-lg font-semibold">{studentMatch.studentInfo.fullName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Student ID</label>
                      <p className="text-lg font-semibold">{studentMatch.studentInfo.studentId || 'N/A'}</p>
                    </div>
                  </div>

                  {studentMatch.hasExistingQR && (
                    <Alert variant="destructive">
                      <AlertCircle className="size-4" />
                      <AlertDescription>
                        <strong>Warning:</strong> This student already has a QR code in the system. Proceeding will replace their current QR code.
                        {studentMatch.existingQRUrl && (
                          <>
                            <br />
                            <a href={studentMatch.existingQRUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                              View current QR code
                            </a>
                          </>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">QR Code Status</label>
                    <div className="mt-1">
                      <Badge variant={studentMatch.hasExistingQR ? "destructive" : "secondary"}>
                        {studentMatch.hasExistingQR ? "Has QR Code (will be replaced)" : "No QR Code"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Show the PDF file info */}
              {file && (
                <div className="border rounded-lg overflow-hidden bg-white">
                  <div className="p-2 bg-muted text-sm font-medium flex items-center gap-2">
                    <FileText className="size-4" />
                    PDF File (ready for upload)
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • PDF Document
                        </p>
                      </div>
                      <FileText className="size-8 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleConfirm} 
                  disabled={confirming || !file}
                  className="flex-1"
                  variant={studentMatch.hasExistingQR ? "destructive" : "default"}
                >
                  {confirming ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Uploading PDF...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4 mr-2" />
                      {studentMatch.hasExistingQR ? "Replace QR Code" : "Upload QR PDF"}
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={resetForm} disabled={confirming}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
