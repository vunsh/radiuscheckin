"use client"

import { useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, FileStack, Upload, AlertTriangle, CheckCircle2, Loader2, AlertCircle, Users, TrendingUp, TrendingDown } from "lucide-react"
import { toast } from "sonner"

export function MassQRUploadTab({ onBack }) {
  const { data: session } = useSession()
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [fileId, setFileId] = useState(null)
  const [processComplete, setProcessComplete] = useState(false)
  const [processError, setProcessError] = useState(null)
  const [currentStream, setCurrentStream] = useState(null)
  const [statusMessage, setStatusMessage] = useState("")
  const [processSummary, setProcessSummary] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileSelect = (selectedFile) => {
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
      setUploaded(false)
      setFileId(null)
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

  const uploadToR2 = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)

    try {
      // First, clear existing data
      const clearResponse = await fetch('/api/admin/r2/clear', {
        method: 'POST'
      })

      if (!clearResponse.ok) {
        throw new Error('Failed to clear existing data')
      }

      // Generate unique file ID
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const generatedFileId = `mass_qr_${timestamp}_${sanitizedName}`

      // Ask server for a presigned PUT URL
      const presignRes = await fetch('/api/admin/r2/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: generatedFileId, contentType: file.type })
      })
      if (!presignRes.ok) {
        const err = await presignRes.json()
        throw new Error(err.error || 'Failed to get upload URL')
      }

      const { url } = await presignRes.json()

      // Upload directly to R2 via XHR to track progress
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', url)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100)
            setProgress(pct)
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        }
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.send(file)
      })

      setFileId(generatedFileId)
      setUploaded(true)
      setProgress(100)
      toast.success('File uploaded successfully to R2 storage')

    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.message || "Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

  const startProcessing = async () => {
    if (!fileId || !session?.accessToken) return

    if (session?.error === "RefreshAccessTokenError") {
      toast.error("Authentication expired", {
        description: "Please sign out and sign in again to refresh your Google Drive access."
      })
      return
    }

    setProcessing(true)
    setProgress(0)
    setProcessError(null)
    setProcessComplete(false)
    setStatusMessage("Initializing...")
    setProcessSummary(null)

    try {
      console.log("[MassQRUpload] Starting mass processing for fileId:", fileId)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_ROOT_URL}/api/qr-codes/upload`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY
        },
        body: JSON.stringify({ 
          fileId,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          userEmail: session.user.email
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start processing')
      }

      const result = await response.json()
      console.log("[MassQRUpload] Processing started, jobId:", result.jobId)
      
      if (result.jobId) {
        monitorJobProgress(result.jobId)
        toast.success("Mass processing started successfully!")
      } else {
        throw new Error("No job ID returned from server")
      }
      
    } catch (error) {
      console.error('Processing error:', error)
      toast.error(error.message || "Failed to start processing")
      setProcessing(false)
      setProcessError(error.message)
    }
  }

  const monitorJobProgress = (jobId) => {
    console.log("[MassQRUpload] Starting stream monitoring for jobId:", jobId)
    
    const streamUrl = `${process.env.NEXT_PUBLIC_API_ROOT_URL}/api/qr-codes/upload/stream?jobId=${jobId}&apiKey=${process.env.NEXT_PUBLIC_API_KEY}`
    
    const eventSource = new EventSource(streamUrl)
    setCurrentStream(eventSource)

    eventSource.onopen = () => {
      console.log("[MassQRUpload] Stream connection opened")
      setStatusMessage("Connected to processing server...")
    }

    eventSource.onmessage = (event) => {
      try {
        console.log("[MassQRUpload] Stream message received:", event.data)
        const data = JSON.parse(event.data)
        
        if (data.progress !== undefined) {
          setProgress(Math.min(100, Math.max(0, data.progress)))
        }

        if (data.message) {
          setStatusMessage(data.message)
        } else if (data.status) {
          setStatusMessage(data.status)
        }

        if (data.done) {
          setProcessing(false)
          setProgress(100)
          setProcessComplete(true)
          
          // Store the summary if provided
          if (data.summary) {
            setProcessSummary(data.summary)
          }
          
          const message = data.message || 'Mass QR code processing completed!'
          setStatusMessage(message)
          
          toast.success(message, {
            description: data.summary 
              ? `${data.summary.successfulUploads} successful, ${data.summary.failedUploads} failed uploads`
              : "Processing complete"
          })
          eventSource.close()
          setCurrentStream(null)
        }

        // Handle errors
        if (data.error) {
          setProcessing(false)
          setProcessError(data.error)
          const errorMsg = `Processing failed: ${data.error}`
          setStatusMessage(errorMsg)
          toast.error(errorMsg, {
            description: data.details || "Please check the logs and try again."
          })
          eventSource.close()
          setCurrentStream(null)
        }
      } catch (error) {
        console.error('Error parsing progress data:', error)
        toast.error("Failed to parse progress update")
      }
    }

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error)
      setProcessing(false)
      toast.error("Lost connection to processing server", {
        description: "The stream connection was interrupted."
      })
      eventSource.close()
      setCurrentStream(null)
    }
  }

  const cancelProcessing = () => {
    if (currentStream) {
      currentStream.close()
      setCurrentStream(null)
    }
    setProcessing(false)
    setProgress(0)
    toast.info("Processing cancelled")
  }

  const resetForm = () => {
    if (currentStream) {
      currentStream.close()
      setCurrentStream(null)
    }
    setFile(null)
    setUploaded(false)
    setProcessing(false)
    setProgress(0)
    setFileId(null)
    setProcessComplete(false)
    setProcessError(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="size-4 mr-2" />
              Back to Single Upload
            </Button>
          </div>
          <CardTitle className="flex items-center gap-2">
            <FileStack className="size-5" />
            Mass QR Code Upload
          </CardTitle>
          <CardDescription>
            Upload a large PDF containing multiple QR codes for batch processing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="default" className="border-amber-100 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200 py-2 px-3 text-sm">
            <AlertTriangle className="size-4 mr-2 inline" />
            <AlertDescription>
              This process will take some time and requires your Google Drive permissions to upload QR codes.
            </AlertDescription>
          </Alert>

          {!uploaded && !processComplete && (
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
                onClick={() => fileInputRef.current?.click()}
              >
                <FileStack className="mx-auto h-14 w-14 text-primary mb-4" />
                <div className="space-y-1">
                  <p className="text-lg font-semibold">
                    Drop combined QR Codes PDF here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or <span className="underline text-primary font-medium">click to select</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only PDF files are accepted.
                  </p>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  className="hidden"
                />
              </div>

              {file && (
                <Alert>
                  <FileStack className="size-4" />
                  <AlertDescription>
                    <strong>Selected file:</strong> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={uploadToR2} 
                  disabled={!file || uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Uploading file...
                    </>
                  ) : (
                    <>
                      <Upload className="size-4 mr-2" />
                      Upload to Server
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

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading to R2 Storage...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {uploaded && !processing && !processComplete && !processError && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="size-4" />
                <AlertDescription>
                  <strong>Upload Complete!</strong> File ready for mass processing with ID: {fileId}
                </AlertDescription>
              </Alert>

              {!session?.accessToken && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>
                    <strong>Authentication Required:</strong> Please sign out and sign in again to refresh your Google Drive access for uploading QR codes.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={startProcessing} 
                  className="flex-1"
                  disabled={!session?.accessToken || session?.error === "RefreshAccessTokenError"}
                >
                  <FileStack className="size-4 mr-2" />
                  Start Mass Processing
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Upload Different File
                </Button>
              </div>
            </div>
          )}

          {processing && (
            <div className="space-y-4">
              <Alert>
                <Loader2 className="size-4 animate-spin" />
                <AlertDescription>
                  <strong>Processing...</strong> Your file is being processed. QR codes are being extracted and uploaded to Google Drive.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing QR codes...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
                <div className="text-center text-xs text-muted-foreground">
                  {statusMessage}
                </div>
              </div>

              <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                <AlertDescription>
                  <strong>Note:</strong> This process may take several minutes depending on the size of your PDF. 
                  Please keep this page open until processing is complete.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button variant="outline" onClick={cancelProcessing} className="flex-1">
                  Cancel Processing
                </Button>
              </div>
            </div>
          )}

          {processComplete && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="size-4" />
                <AlertDescription>
                  <strong>Processing Complete!</strong> Mass QR code processing has finished.
                </AlertDescription>
              </Alert>

              {/* Processing Summary */}
              {processSummary && (
                <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="size-5" />
                      Processing Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {processSummary.totalStudentsInPdf}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Students Found
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {processSummary.matchedStudents}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Students Matched
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                          <TrendingUp className="size-5" />
                          {processSummary.successfulUploads}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Successful Uploads
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
                          <TrendingDown className="size-5" />
                          {processSummary.failedUploads}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Failed Uploads
                        </div>
                      </div>
                    </div>

                    {processSummary.successfulUploads > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                            <CheckCircle2 className="size-4" />
                            Successfully Uploaded ({processSummary.successfulUploads})
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {processSummary.uploadedStudents.map((studentName, index) => (
                              <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                                {studentName}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {processSummary.failedUploads > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                            <AlertCircle className="size-4" />
                            Failed Uploads ({processSummary.failedUploads})
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {processSummary.failedStudents.map((studentName, index) => (
                              <Badge key={index} variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                                {studentName}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2">
                <Button onClick={resetForm} className="flex-1">
                  <Upload className="size-4 mr-2" />
                  Process Another File
                </Button>
                <Button variant="outline" onClick={onBack}>
                  Back to Upload
                </Button>
              </div>
            </div>
          )}

          {processError && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>
                  <strong>Processing Failed:</strong> {processError}
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={() => {
                  setProcessError(null)
                  setProgress(0)
                }} className="flex-1">
                  <FileStack className="size-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Upload Different File
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
