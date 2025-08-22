"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { UserCheck, Calendar, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { checkInAPI } from "@/lib/api/checkin"
import regions from "@/lib/regions.json"
import { toast } from "sonner"

export function CheckInModal({ student, open, onClose, onConfirm }) {
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [checkInState, setCheckInState] = useState("idle") // "idle", "processing", "completed", "error"
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const [qrCodeImage, setQrCodeImage] = useState("")
  const [error, setError] = useState("")
  const [loadingQRImage, setLoadingQRImage] = useState(false)
  const eventSourceRef = useRef(null)
  const hasStartedRef = useRef(false)

  const missingQRCode = !student?.studentId || student?.studentId.trim() === ""

  useEffect(() => {
    if (!open || !student) return
    setCurrentTime(new Date())
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [open, student])

  useEffect(() => {
    if (!open || !student) {
      setCheckInState("idle")
      setProgress(0)
      setStatusMessage("")
      setQrCodeImage("")
      setError("")
      setLoadingQRImage(false)
      hasStartedRef.current = false
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      return
    }
    
    if (missingQRCode) {
      setError("No QR code found for this student.")
      setQrCodeImage("")
      setLoadingQRImage(false)
      setCheckInState("idle") 
    } else {
      const fetchQRImage = async () => {
        setLoadingQRImage(true)
        setError("") 
        setCheckInState("idle") 
        
        try {
          const imageData = await checkInAPI.fetchQRCodeImage(undefined, student?.studentId)
          if (imageData && imageData.length > 50) { 
            setQrCodeImage(imageData)
            setError("")
          } else {
            setError("No QR code found for this student.")
            setQrCodeImage("")
          }
        } catch (error) {
          console.log("QR fetch failed:", error.message)
          setError("No QR code found for this student.")
          setQrCodeImage("")
        } finally {
          setLoadingQRImage(false)
        }
      }
      
      fetchQRImage()
    }
  }, [open, student, missingQRCode])

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleConfirmCheckIn = async () => {
    if (missingQRCode || checkInState === "processing" || hasStartedRef.current) return

    hasStartedRef.current = true
    try {
      setCheckInState("processing")
      setProgress(0)
      setStatusMessage("Initializing check-in process...")
      setError("")

      // Derive region from student's center using regions.json
      let region = null
      if (student?.center) {
        for (const [regionKey, info] of Object.entries(regions)) {
          if (info?.centers?.some(c => c.trim().toLowerCase() === student.center.trim().toLowerCase())) {
            region = regionKey
            break
          }
        }
      }

      const jobId = await checkInAPI.startCheckIn(student?.studentId, null, region)

      setProgress(10)
      setStatusMessage("Starting check-in process...")

      eventSourceRef.current = checkInAPI.createStreamConnection(
        jobId,
        (data) => {
          const newProgress = data.progress || 50
          setProgress(newProgress)
          
          const message = data.message || data.status || "Processing check-in..."
          setStatusMessage(message)
          
          if (data.qrCode) {
            checkInAPI.fetchQRCodeImage(data.qrCode)
              .then(imageData => setQrCodeImage(imageData))
              .catch(console.error)
          }
        },
        (error) => {
          setCheckInState("error")
          setError(error)
          setProgress(100)
          if (eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
          }
          toast.error("Check-in failed", { description: error })
        },
        (data) => {
          setCheckInState("completed")
          setProgress(100)
          
          // Use data.message for completion message
          const completionMessage = data.message || "Check-in completed successfully!"
          setStatusMessage(completionMessage)
          
          if (data.qrCode) {
            checkInAPI.fetchQRCodeImage(data.qrCode)
              .then(imageData => setQrCodeImage(imageData))
              .catch(console.error)
          }
          if (eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
          }
          toast.success(`${student?.firstName || ''} ${student?.lastName || ''} Checked In!`, {
            description: completionMessage
          })
        }
      )
    } catch (error) {
      setCheckInState("error")
      setError(error.message || "Failed to start check-in")
      setProgress(100)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      toast.error("Check-in failed", { description: error.message || "Failed to start check-in" })
    }
  }

  const handleClose = () => {
    if (checkInState === "processing") {
      return
    }
    onClose()
  }

  const isProcessing = checkInState === "processing"
  const isCompleted = checkInState === "completed"
  const hasError = checkInState === "error" || missingQRCode || !!error

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="
          w-full
          max-w-[95vw]
          sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl
          p-0 rounded-2xl shadow-2xl border bg-card
          max-h-[95vh]
          overflow-y-auto
        "
        style={{
          maxHeight: '95vh',
          width: '100%',
        }}
      >
        <Card className="w-full rounded-2xl border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <DialogHeader className="text-center space-y-4 pt-6 px-6">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center shadow-sm">
                {isProcessing && <Loader2 className="size-8 md:size-10 text-primary animate-spin" />}
                {isCompleted && <CheckCircle2 className="size-8 md:size-10 text-green-600" />}
                {hasError && <AlertCircle className="size-8 md:size-10 text-red-600" />}
                {!isProcessing && !isCompleted && !hasError && <UserCheck className="size-8 md:size-10 text-primary" />}
              </div>
              <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight">
                {isCompleted ? "Check-In Complete!" : isProcessing ? "Checking In..." : "Confirm Check-In"}
              </DialogTitle>
              <DialogDescription className="text-sm md:text-base font-medium text-muted-foreground">
                {isCompleted
                  ? `${student?.firstName || ''} ${student?.lastName || ''} has been successfully checked in`
                  : isProcessing
                    ? statusMessage
                    : "Please confirm you want to check in this student"}
              </DialogDescription>
            </DialogHeader>

            <Separator className="my-4 w-full" />

            <div className="space-y-6 px-4 sm:px-6 pb-6 pt-2">
              <div className="flex flex-col items-center gap-2">
                <h3 className="text-lg md:text-xl font-bold text-primary tracking-tight">
                  {student?.firstName || ''} {student?.lastName || ''}
                </h3>
                {student?.lastAttendance && (
                  <div className="text-xs md:text-sm text-muted-foreground font-medium">
                    <span className="font-bold">Last Attendance:</span> {student.lastAttendance}
                  </div>
                )}
              </div>

              {!isProcessing && !isCompleted && (
                <div className="bg-muted rounded-xl p-4 md:p-5 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 text-sm md:text-base font-semibold text-primary">
                    <Calendar className="size-4 md:size-5" />
                    Check-in Date & Time
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-sm md:text-base font-medium text-muted-foreground">
                      {formatDate(currentTime)}
                    </div>
                    <div className="text-lg md:text-xl font-mono font-extrabold text-primary tracking-widest bg-background px-4 py-2 rounded-md shadow border border-primary/10">
                      {formatTime(currentTime)}
                    </div>
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="space-y-3">
                  <Progress value={progress} className="h-2 rounded-full" />
                  <div className="text-center text-xs md:text-sm text-muted-foreground">
                    {progress}% &mdash; {statusMessage}
                  </div>
                </div>
              )}

              {(qrCodeImage || (!missingQRCode && student?.qrCode)) && (isCompleted || isProcessing) && !missingQRCode && (
                <div className="flex flex-col items-center gap-2 bg-muted rounded-xl p-4 shadow-inner">
                  <div className="font-semibold text-sm md:text-base mb-1">Session QR Code</div>
                  <div className="flex justify-center">
                    {loadingQRImage ? (
                      <div
                        className="
                          flex items-center justify-center
                          w-[70vw] h-[70vw] max-w-[220px] max-h-[220px]
                          sm:w-[320px] sm:h-[320px] sm:max-w-[320px] sm:max-h-[320px]
                          md:w-[350px] md:h-[350px] md:max-w-[350px] md:max-h-[350px]
                          bg-muted rounded-md shadow
                        "
                      >
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      </div>
                    ) : qrCodeImage && qrCodeImage.length > 50 ? (
                      <img
                        src={qrCodeImage}
                        alt="Session QR Code"
                        className="
                          rounded-md shadow
                          w-[70vw] h-[70vw] max-w-[220px] max-h-[220px]
                          sm:w-[320px] sm:h-[320px] sm:max-w-[320px] sm:max-h-[320px]
                          md:w-[350px] md:h-[350px] md:max-w-[350px] md:max-h-[350px]
                        "
                        style={{ objectFit: 'contain' }}
                        onError={(e) => {
                          console.error("[CheckInModal] Image failed to load:", e)
                          console.error("[CheckInModal] Image src:", qrCodeImage.substring(0, 100))
                        }}
                        onLoad={() => {
                          console.log("[CheckInModal] Image loaded successfully")
                        }}
                      />
                    ) : (
                      <div className="
                        flex items-center justify-center
                        w-[70vw] h-[70vw] max-w-[220px] max-h-[220px]
                        sm:w-[320px] sm:h-[320px] sm:max-w-[320px] sm:max-h-[320px]
                        md:w-[350px] md:h-[350px] md:max-w-[350px] md:max-h-[350px]
                        bg-amber-50 rounded-md border border-amber-200
                      ">
                        <div className="text-center p-4">
                          <span className="text-sm text-amber-700">QR code will appear after processing</span>
                          <div className="text-xs text-amber-600 mt-1">
                            Student ID: {student?.studentId || 'N/A'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Scan to start your session</p>
                </div>
              )}

              {(missingQRCode || error) && !isProcessing && !isCompleted && (
                <div className="flex flex-col items-center justify-center gap-2 bg-red-50 border border-red-200 rounded-lg p-4 mt-2 max-w-xs md:max-w-md mx-auto">
                  <AlertCircle className="size-6 md:size-7 text-red-500" />
                  <div className="text-sm md:text-base font-bold text-red-700">
                    Cannot Check In
                  </div>
                  <div className="text-xs md:text-sm text-red-700 text-center">
                    {(!student?.studentId || student?.studentId.trim() === "") ? (
                      <>
                        This student does not have a valid student ID.<br />
                        Please contact the center director for help.
                      </>
                    ) : (
                      <>
                        This student does not have a QR code on file and cannot check in.<br />
                        Please show this message to a center director for assistance.
                      </>
                    )}
                  </div>
                </div>
              )}

            </div>

            <Separator className="mb-0" />

            <DialogFooter className="flex gap-2 px-6 pb-6 pt-4">
              {!isProcessing && !isCompleted && (
                <Button
                  onClick={handleConfirmCheckIn}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white h-16 md:h-20 min-h-[56px] text-base md:text-lg font-bold rounded-md shadow"
                  size="lg"
                  disabled={missingQRCode || !!error}
                >
                  <UserCheck className="size-5 md:size-6 mr-2" />
                  Check In
                </Button>
              )}
              
              <Button
                variant={isCompleted ? "default" : "outline"}
                onClick={handleClose}
                className={`flex-1 h-16 md:h-20 min-h-[56px] text-base md:text-lg font-bold rounded-md shadow ${isCompleted ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""}`}
                size="lg"
                disabled={isProcessing}
              >
                {isCompleted ? "Done" : "Cancel"}
              </Button>
            </DialogFooter>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}