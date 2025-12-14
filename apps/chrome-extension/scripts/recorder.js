/**
 * Recorder Utility Script
 * Handles audio recording, processing, and real-time transcription
 */

// Logger utility for production-safe logging
const Logger = {
  log: (message, data) => {
    if (!('update_url' in chrome.runtime.getManifest())) {
      console.log(`[OpenMeet] ${message}`, data || '');
    }
  },
  error: (message, error) => {
    if (!('update_url' in chrome.runtime.getManifest())) {
      console.error(`[OpenMeet Error] ${message}`, error);
    }
  },
  warn: (message, data) => {
    if (!('update_url' in chrome.runtime.getManifest())) {
      console.warn(`[OpenMeet Warning] ${message}`, data || '');
    }
  }
};

class MeetingRecorder {
  constructor(options = {}) {
    this.options = {
      sampleRate: options.sampleRate || 16000,
      channels: options.channels || 1,
      mimeType: options.mimeType || 'audio/webm',
      chunkInterval: options.chunkInterval || 1000,
      language: options.language || 'en-US',
      ...options
    };

    this.mediaRecorder = null;
    this.audioContext = null;
    this.audioStream = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.startTime = null;
    this.audioProcessor = null;
    this.silenceDetector = null;
  }

  /**
   * Start recording audio
   */
  async startRecording() {
    if (this.isRecording) {
      Logger.warn('Recording already in progress');
      return false;
    }

    try {
      // Request audio permission
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.options.sampleRate,
          channelCount: this.options.channels
        },
        video: false
      });

      // Setup audio context for processing
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.options.sampleRate
      });

      // Create audio nodes
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      const analyzer = this.audioContext.createAnalyser();
      analyzer.fftSize = 2048;

      // Create script processor for real-time audio processing
      this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      // Connect nodes
      source.connect(analyzer);
      analyzer.connect(this.audioProcessor);
      this.audioProcessor.connect(this.audioContext.destination);

      // Setup silence detection
      this.setupSilenceDetection(analyzer);

      // Setup media recorder
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: this.options.mimeType,
        audioBitsPerSecond: 128000
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.onAudioChunk(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.onRecordingStop();
      };

      this.mediaRecorder.onerror = (error) => {
        Logger.error('MediaRecorder error', error);
        this.stopRecording();
      };

      // Start recording
      this.mediaRecorder.start(this.options.chunkInterval);
      this.isRecording = true;
      this.startTime = Date.now();

      Logger.log('Recording started');
      return true;
    } catch (error) {
      Logger.error('Failed to start recording', error);
      this.cleanup();
      return false;
    }
  }

  /**
   * Stop recording
   */
  stopRecording() {
    if (!this.isRecording) {
      Logger.warn('No recording in progress');
      return null;
    }

    this.isRecording = false;

    // Stop media recorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Calculate duration
    const duration = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;

    // Create final audio blob
    const audioBlob = new Blob(this.audioChunks, { type: this.options.mimeType });
    
    // Cleanup
    this.cleanup();

    Logger.log(`Recording stopped. Duration: ${duration}s`);

    return {
      blob: audioBlob,
      duration: duration,
      mimeType: this.options.mimeType,
      sampleRate: this.options.sampleRate,
      chunks: this.audioChunks.length
    };
  }

  /**
   * Setup silence detection
   */
  setupSilenceDetection(analyzer) {
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let silenceStart = null;
    const silenceThreshold = 30; // dB threshold for silence
    const silenceDuration = 2000; // ms of silence before triggering

    const checkSilence = () => {
      if (!this.isRecording) return;

      analyzer.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      
      if (average < silenceThreshold) {
        if (!silenceStart) {
          silenceStart = Date.now();
        } else if (Date.now() - silenceStart > silenceDuration) {
          this.onSilenceDetected(Date.now() - silenceStart);
          silenceStart = null;
        }
      } else {
        if (silenceStart) {
          silenceStart = null;
        }
        this.onSpeechDetected(average);
      }

      requestAnimationFrame(checkSilence);
    };

    checkSilence();
  }

  /**
   * Process audio for real-time transcription
   */
  processAudioForTranscription(audioData) {
    // Convert audio data to format suitable for transcription
    // This would typically involve:
    // 1. Resampling to required rate (usually 16kHz)
    // 2. Converting to required format (usually 16-bit PCM)
    // 3. Chunking for streaming transcription

    const pcmData = this.convertToPCM(audioData);
    return pcmData;
  }

  /**
   * Convert audio to PCM format
   */
  convertToPCM(audioBuffer) {
    // Simple conversion to 16-bit PCM
    const length = audioBuffer.length;
    const pcmData = new Int16Array(length);

    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, audioBuffer[i]));
      pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }

    return pcmData;
  }

  /**
   * Get audio levels for visualization
   */
  getAudioLevels() {
    if (!this.audioContext || !this.isRecording) {
      return { level: 0, peak: 0 };
    }

    const analyzer = this.audioContext.createAnalyser();
    analyzer.fftSize = 256;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyzer.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / bufferLength;
    const peak = Math.max(...dataArray);

    return {
      level: average / 255,
      peak: peak / 255
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Stop all tracks
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Disconnect audio processor
    if (this.audioProcessor) {
      this.audioProcessor.disconnect();
      this.audioProcessor = null;
    }

    // Clear chunks
    this.audioChunks = [];
    this.startTime = null;
  }

  /**
   * Event handlers (to be overridden)
   */
  onAudioChunk(chunk) {
    // Override this method to handle audio chunks
    // e.g., send to server for real-time transcription
  }

  onRecordingStop() {
    // Override this method to handle recording stop
  }

  onSilenceDetected(duration) {
    // Override this method to handle silence detection
  }

  onSpeechDetected(level) {
    // Override this method to handle speech detection
  }

  /**
   * Download recording as file
   */
  downloadRecording(filename = 'recording.webm') {
    const audioBlob = new Blob(this.audioChunks, { type: this.options.mimeType });
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Convert recording to base64
   */
  async toBase64() {
    const audioBlob = new Blob(this.audioChunks, { type: this.options.mimeType });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  }

  /**
   * Get recording statistics
   */
  getStatistics() {
    if (!this.isRecording) {
      return null;
    }

    const duration = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
    const sizeInBytes = this.audioChunks.reduce((total, chunk) => total + chunk.size, 0);

    return {
      duration: duration,
      sizeInBytes: sizeInBytes,
      sizeInMB: (sizeInBytes / (1024 * 1024)).toFixed(2),
      chunks: this.audioChunks.length,
      bitrate: this.calculateBitrate(sizeInBytes, duration),
      isRecording: this.isRecording
    };
  }

  /**
   * Calculate bitrate
   */
  calculateBitrate(bytes, seconds) {
    if (seconds === 0) return 0;
    const bits = bytes * 8;
    const bitrate = bits / seconds;
    return Math.round(bitrate);
  }
}

/**
 * Enhanced recorder with transcription support
 */
class TranscriptionRecorder extends MeetingRecorder {
  constructor(options = {}) {
    super(options);
    
    this.transcriptionService = options.transcriptionService || null;
    this.transcriptionBuffer = [];
    this.transcriptionResults = [];
    this.speakerIdentification = options.speakerIdentification || false;
    this.currentSpeaker = null;
  }

  /**
   * Override onAudioChunk to handle transcription
   */
  async onAudioChunk(chunk) {
    super.onAudioChunk(chunk);

    if (this.transcriptionService) {
      try {
        // Convert chunk to base64
        const base64Audio = await this.chunkToBase64(chunk);
        
        // Send for transcription
        const result = await this.transcriptionService.transcribe({
          audio: base64Audio,
          language: this.options.language,
          speakerIdentification: this.speakerIdentification
        });

        if (result && result.text) {
          this.onTranscriptionResult(result);
        }
      } catch (error) {
        Logger.error('Transcription error', error);
      }
    }
  }

  /**
   * Convert chunk to base64
   */
  async chunkToBase64(chunk) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(chunk);
    });
  }

  /**
   * Handle transcription result
   */
  onTranscriptionResult(result) {
    const transcriptionSegment = {
      text: result.text,
      speaker: result.speaker || this.currentSpeaker || 'Unknown',
      timestamp: Date.now(),
      confidence: result.confidence || 0,
      isFinal: result.isFinal || false
    };

    this.transcriptionResults.push(transcriptionSegment);

    // Emit event for UI update
    if (typeof this.onTranscript === 'function') {
      this.onTranscript(transcriptionSegment);
    }
  }

  /**
   * Get full transcript
   */
  getTranscript() {
    return this.transcriptionResults.map(segment => ({
      speaker: segment.speaker,
      text: segment.text,
      timestamp: segment.timestamp
    }));
  }

  /**
   * Export transcript as text
   */
  exportTranscriptAsText() {
    let transcript = '';
    let currentSpeaker = null;

    this.transcriptionResults.forEach(segment => {
      if (segment.speaker !== currentSpeaker) {
        transcript += `\n${segment.speaker}:\n`;
        currentSpeaker = segment.speaker;
      }
      transcript += `${segment.text} `;
    });

    return transcript.trim();
  }

  /**
   * Export transcript as SRT
   */
  exportTranscriptAsSRT() {
    let srt = '';
    let index = 1;

    this.transcriptionResults.forEach((segment, i) => {
      const startTime = this.formatSRTTime(segment.timestamp - this.startTime);
      const endTime = this.formatSRTTime(
        i < this.transcriptionResults.length - 1 
          ? this.transcriptionResults[i + 1].timestamp - this.startTime
          : segment.timestamp - this.startTime + 2000
      );

      srt += `${index}\n`;
      srt += `${startTime} --> ${endTime}\n`;
      srt += `${segment.speaker}: ${segment.text}\n\n`;
      index++;
    });

    return srt;
  }

  /**
   * Format time for SRT
   */
  formatSRTTime(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
  }

  /**
   * Set current speaker
   */
  setSpeaker(speaker) {
    this.currentSpeaker = speaker;
  }

  /**
   * Event handler for transcript updates
   */
  onTranscript(segment) {
    // Override this method to handle transcript updates
  }
}

// Export for use in content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MeetingRecorder, TranscriptionRecorder };
}
