"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { toast } from "sonner";

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)"
        }
      }
      {...props} />
  );
}

export const ProgressToast = ({ 
  title, 
  description, 
  progress, 
  qrCode, 
  success = false, 
  error = false,
  id 
}) => {
  const handleDismiss = () => {
    toast.dismiss(id);
  };

  return (
    <div className="flex items-start gap-3 p-1 max-w-md">
      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {success && <CheckCircle2 className="size-4 text-green-600 shrink-0" />}
              {error && <XCircle className="size-4 text-red-600 shrink-0" />}
              <div className="font-semibold text-sm truncate">{title}</div>
            </div>
            {description && (
              <div className="text-xs text-muted-foreground mt-1 text-black">{description}</div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 shrink-0"
          >
            <X className="size-3" />
          </Button>
        </div>

        {progress !== undefined && !success && !error && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-muted-foreground text-right">{progress}%</div>
          </div>
        )}

        {qrCode && (
          <div className="text-center pt-2">
            <img 
              src={qrCode} 
              alt="Session QR Code" 
              className="mx-auto max-w-[150px] max-h-[150px] rounded border"
            />
            <p className="text-xs text-muted-foreground mt-1">Scan to start your session</p>
          </div>
        )}
      </div>
    </div>
  );
};

export { Toaster }
