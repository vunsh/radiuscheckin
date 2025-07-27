"use client"

import { useState, useRef, useEffect } from "react"
import { useSession, signIn } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, User, AlertCircle, CheckCircle2, Loader2, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import * as pdfjsLib from 'pdfjs-dist'

// pdfjs-dist worker that handles setting up the image
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();


 }

export function QRUploadTab() {
  const { data: session } = useSession()
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [studentMatch, setStudentMatch] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [pdfCanvas, setPdfCanvas] = useState(null)
  const [imageBlob, setImageBlob] = useState(null)
  const [renderingPdf, setRenderingPdf] = useState(false)
  const canvasRef = useRef(null)
  const [shouldRenderPdf, setShouldRenderPdf] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)

  const [imageDataUrl, setImageDataUrl] = useState(null)

  useEffect(() => {
    if (shouldRenderPdf && pendingFile && canvasRef.current) {
      renderPdfToCanvas(pendingFile)
      setShouldRenderPdf(false)
      setPendingFile(null)
    }
  }, [shouldRenderPdf, pendingFile, canvasRef.current])

  const renderPdfToCanvas = async (pdfFile) => {
    setRenderingPdf(true);
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);

      const scale = 2.0;
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error("Canvas ref not available");
      }

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Failed to get canvas context");
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      setPdfCanvas(canvas);

      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error("❌ Failed to convert canvas to image blob");
        }
        setImageBlob(blob);

        // Also set the preview data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageDataUrl(reader.result);
        };
        reader.readAsDataURL(blob);
      }, "image/png", 0.95);

    } catch (err) {
      console.error("Error rendering PDF:", err);
      toast.error("Failed to render PDF preview");
      throw err;
    } finally {
      setRenderingPdf(false);
    }
  };


  const handleFileSelect = (selectedFile) => {
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
      setStudentMatch(null)
      setPendingFile(selectedFile)
      setShouldRenderPdf(true)
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
    if (!imageBlob || !studentMatch) return

    if (!session?.accessToken || session?.error === "RefreshAccessTokenError") {
      toast.error("Authentication expired", {
        description: "Please sign out and sign in again to refresh your Google Drive access."
      })
      return
    }

    setConfirming(true)
    try {
      const safeName = studentMatch.studentInfo.fullName.replace(/[^a-zA-Z0-9-_]/g, "_")
      const filename = `${studentMatch.studentInfo.studentId || 'student'}_${safeName}_QR_${Date.now()}.png`
      
      const imageFile = new File([imageBlob], filename, { type: 'image/png' })
      
      const formData = new FormData()
      formData.append('file', imageFile)
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
      setPdfCanvas(null)
      setImageBlob(null)
      setImageDataUrl(null)
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
    setPdfCanvas(null)
    setImageBlob(null)
    setImageDataUrl(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            Upload QR Code PDF
          </CardTitle>
          <CardDescription>
            Upload a PDF containing a student's QR code. The system will convert it to an image and link it to their profile.
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
                    Only PDF files are accepted - will be converted to image
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
                      {renderingPdf && <span className="ml-2 text-amber-600">Converting to image...</span>}
                    </AlertDescription>
                  </Alert>
                  
                  {renderingPdf && (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="size-8 animate-spin text-primary" />
                      <span className="ml-2">Rendering PDF...</span>
                    </div>
                  )}
                  {/* Always render the canvas so ref is available for PDF rendering */}
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <div className="p-2 bg-muted text-sm font-medium flex items-center gap-2">
                      <ImageIcon className="size-4" />
                      PDF Preview (will be uploaded as image)
                    </div>
                    <div className="p-4 flex justify-center">
                      <canvas
                        ref={canvasRef}
                        className="max-w-full max-h-96 border rounded shadow-sm"
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleUpload} 
                  disabled={!file || uploading || renderingPdf}
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
                        <strong>Warning:</strong> This student already has a QR code linked. Proceeding will override their current QR code.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Current QR Code Status</label>
                    <div className="mt-1">
                      <Badge variant={studentMatch.hasExistingQR ? "destructive" : "secondary"}>
                        {studentMatch.hasExistingQR ? "Has QR Code (will be replaced)" : "No QR Code"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Show the actual image that will be uploaded */}
              {imageDataUrl && (
                <div className="border rounded-lg overflow-hidden bg-white">
                  <div className="p-2 bg-muted text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="size-4" />
                    QR Code Image (ready for upload)
                  </div>
                  <div className="p-4 flex justify-center">
                    <img
                      src={imageDataUrl}
                      alt="QR Code Preview"
                      className="max-w-full max-h-96 border rounded shadow-sm"
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleConfirm} 
                  disabled={confirming || !imageBlob}
                  className="flex-1"
                  variant={studentMatch.hasExistingQR ? "destructive" : "default"}
                >
                  {confirming ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Uploading Image...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4 mr-2" />
                      {studentMatch.hasExistingQR ? "Replace QR Code" : "Upload QR Image"}
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
