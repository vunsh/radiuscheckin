export class CheckInAPI {
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_ROOT_URL;
    this.apiKey = process.env.NEXT_PUBLIC_API_KEY;
  }

  async startCheckIn(studentId, qrCodeUrl = null) {
    try {
      console.log("[CheckInAPI] Starting check-in for studentId:", studentId);
      const response = await fetch(`${this.baseUrl}/api/check-in/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          studentId: studentId,
          qrCodeUrl: qrCodeUrl
        })
      });

      console.log("[CheckInAPI] Response status:", response.status);

      if (!response.ok) {
        console.error("[CheckInAPI] Check-in failed:", response.statusText);
        throw new Error(`Check-in failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("[CheckInAPI] Check-in started, jobId:", data.jobId);
      return data.jobId;
    } catch (error) {
      console.error('Error starting check-in:', error);
      throw error;
    }
  }

  async fetchQRCodeImage(qrCodeUrl, studentId = null) {
    try {
      const response = await fetch('/api/qr-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrCodeUrl, studentId })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch QR code image: ${response.statusText}`);
      }

      const data = await response.json();
      
      // If it's a PDF that needs conversion, handle client-side conversion
      if (data.isPdf && data.requiresConversion) {
        return await this.convertPdfToImage(data.qrCodeUrl);
      }
      
      return data.imageData;
    } catch (error) {
      console.error('Error fetching QR code image:', error);
      throw error;
    }
  }

  async convertPdfToImage(qrCodeUrl) {
    try {
      console.log("[CheckInAPI] Converting PDF to image client-side");
      
      // Get PDF data from the convert-pdf endpoint
      const response = await fetch('/api/convert-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrCodeUrl })
      });

      if (!response.ok) {
        throw new Error(`Failed to get PDF data: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.imageData) {
        // If it's already an image, return it
        return data.imageData;
      }
      
      if (data.pdfData && data.isPdf) {
        // Convert PDF to image using pdfjs-dist
        const pdfData = Uint8Array.from(atob(data.pdfData), c => c.charCodeAt(0));
        return await this.renderPdfToCanvas(pdfData);
      }
      
      throw new Error('No valid data received for conversion');
    } catch (error) {
      console.error('Error converting PDF to image:', error);
      throw error;
    }
  }

  async renderPdfToCanvas(pdfData) {
    try {
      // Dynamic import of pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set up the worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();

      console.log("[CheckInAPI] Loading PDF document");
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      
      console.log("[CheckInAPI] Getting first page");
      const page = await pdf.getPage(1);
      
      const scale = 2; // Higher scale for better quality
      const viewport = page.getViewport({ scale });
      
      console.log("[CheckInAPI] Creating canvas");
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      console.log("[CheckInAPI] Rendering PDF page to canvas");
      await page.render(renderContext).promise;
      
      console.log("[CheckInAPI] Converting canvas to base64");
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error rendering PDF to canvas:', error);
      throw new Error(`Failed to render PDF: ${error.message}`);
    }
  }

  createStreamConnection(jobId, onUpdate, onError, onComplete) {
    const url = `${this.baseUrl}/api/check-in/stream?jobId=${jobId}&apiKey=${this.apiKey}`;
    console.log("[CheckInAPI] Opening stream connection to:", url);

    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log("[CheckInAPI] Stream connection opened");
    };

    eventSource.onmessage = (event) => {
      try {
        console.log("[CheckInAPI] Stream message received:", event.data);
        const data = JSON.parse(event.data);
        onUpdate(data);

        if (data.done || data.error) {
          if (data.error) {
            console.error("[CheckInAPI] Stream error received:", data.error);
            onError(data.error);
          } else {
            console.log("[CheckInAPI] Stream complete:", data);
            onComplete(data);
          }
          eventSource.close();
        }
      } catch (error) {
        console.error('Error parsing stream data:', error);
        onError('Failed to parse response');
        eventSource.close();
      }
    };

    eventSource.onerror = (error) => {
      console.error('Stream error:', error);
      onError('Connection error');
      eventSource.close();
    };

    return eventSource;
  }
}

export const checkInAPI = new CheckInAPI();

export class MassQRProcessingAPI {
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_ROOT_URL;
    this.apiKey = process.env.NEXT_PUBLIC_API_KEY;
  }

  async startMassProcessing(fileId, accessToken, refreshToken, userEmail) {
    try {
      console.log("[MassQRProcessingAPI] Starting mass processing for fileId:", fileId);
      const response = await fetch(`${this.baseUrl}/api/qr-codes/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify({
          fileId,
          accessToken,
          refreshToken,
          userEmail
        })
      });

      console.log("[MassQRProcessingAPI] Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[MassQRProcessingAPI] Processing failed:", errorData);
        throw new Error(errorData.error || `Processing failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("[MassQRProcessingAPI] Processing started, jobId:", data.jobId);
      return data.jobId;
    } catch (error) {
      console.error('Error starting mass processing:', error);
      throw error;
    }
  }

  createMassProcessingStream(jobId, onUpdate, onError, onComplete) {
    const url = `${this.baseUrl}/api/qr-codes/upload/stream?jobId=${jobId}&apiKey=${this.apiKey}`;
    console.log("[MassQRProcessingAPI] Opening stream connection to:", url);

    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log("[MassQRProcessingAPI] Stream connection opened");
    };

    eventSource.onmessage = (event) => {
      try {
        console.log("[MassQRProcessingAPI] Stream message received:", event.data);
        const data = JSON.parse(event.data);
        onUpdate(data);

        if (data.done || data.error) {
          if (data.error) {
            console.error("[MassQRProcessingAPI] Stream error received:", data.error);
            onError(data.error);
          } else {
            console.log("[MassQRProcessingAPI] Stream complete:", data);
            onComplete(data);
          }
          eventSource.close();
        }
      } catch (error) {
        console.error('Error parsing stream data:', error);
        onError('Failed to parse response');
        eventSource.close();
      }
    };

    eventSource.onerror = (error) => {
      console.error('Stream error:', error);
      onError('Connection error');
      eventSource.close();
    };

    return eventSource;
  }
}

export const massQRProcessingAPI = new MassQRProcessingAPI();
