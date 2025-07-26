export class CheckInAPI {
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_ROOT_URL;
    this.apiKey = process.env.NEXT_PUBLIC_API_KEY;
  }

  async startCheckIn(studentId) {
    try {
      console.log("[CheckInAPI] Starting check-in for studentId:", studentId);
      const response = await fetch(`${this.baseUrl}/api/check-in/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          studentId: studentId
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
