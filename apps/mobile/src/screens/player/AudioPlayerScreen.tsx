import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Slider,
  Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import Video from 'react-native-video';
import { RootStackParamList } from '../../navigation/AppNavigator';

type AudioPlayerRouteProp = RouteProp<RootStackParamList, 'AudioPlayer'>;

interface VideoProgress {
  currentTime: number;
  playableDuration: number;
  seekableDuration: number;
}

interface VideoLoad {
  duration: number;
}

function AudioPlayerScreen() {
  const route = useRoute<AudioPlayerRouteProp>();
  const { meetingId, audioUrl } = route.params;

  const videoRef = useRef<Video>(null);

  const [paused, setPaused] = useState(true);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      setPaused(true);
    };
  }, []);

  const handleLoad = (data: VideoLoad) => {
    setDuration(data.duration);
    setLoading(false);
  };

  const handleProgress = (data: VideoProgress) => {
    if (!seeking) {
      setCurrentTime(data.currentTime);
    }
  };

  const handleEnd = () => {
    setPaused(true);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.seek(0);
    }
  };

  const handleError = (error: any) => {
    console.error('Video playback error:', error);
    Alert.alert('Playback Error', 'Failed to load audio. Please try again.');
    setLoading(false);
  };

  const togglePlayPause = () => {
    setPaused(!paused);
  };

  const handleSeek = (value: number) => {
    if (videoRef.current) {
      videoRef.current.seek(value);
      setCurrentTime(value);
    }
    setSeeking(false);
  };

  const handleSeekStart = () => {
    setSeeking(true);
  };

  const skipBackward = () => {
    const newTime = Math.max(0, currentTime - 10);
    if (videoRef.current) {
      videoRef.current.seek(newTime);
      setCurrentTime(newTime);
    }
  };

  const skipForward = () => {
    const newTime = Math.min(duration, currentTime + 10);
    if (videoRef.current) {
      videoRef.current.seek(newTime);
      setCurrentTime(newTime);
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Hidden video player for audio playback */}
      <Video
        ref={videoRef}
        source={{ uri: audioUrl }}
        paused={paused}
        rate={playbackRate}
        volume={1.0}
        onLoad={handleLoad}
        onProgress={handleProgress}
        onEnd={handleEnd}
        onError={handleError}
        style={styles.hiddenVideo}
        audioOnly={true}
        playInBackground={true}
        playWhenInactive={true}
      />

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading audio...</Text>
          </View>
        ) : (
          <>
            {/* Waveform placeholder - could be replaced with actual waveform visualization */}
            <View style={styles.waveformContainer}>
              <View style={styles.waveform}>
                {Array.from({ length: 50 }).map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.waveformBar,
                      {
                        height: Math.random() * 60 + 20,
                        backgroundColor:
                          (currentTime / duration) * 50 > index
                            ? '#6366f1'
                            : '#d1d5db',
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Time display */}
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            {/* Seek bar */}
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration}
              value={currentTime}
              onValueChange={setCurrentTime}
              onSlidingStart={handleSeekStart}
              onSlidingComplete={handleSeek}
              minimumTrackTintColor="#6366f1"
              maximumTrackTintColor="#d1d5db"
              thumbTintColor="#6366f1"
            />

            {/* Playback controls */}
            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={cyclePlaybackRate}>
                <Text style={styles.rateText}>{playbackRate}x</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={skipBackward}>
                <Text style={styles.controlText}>-10s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playButton}
                onPress={togglePlayPause}>
                <Text style={styles.playButtonText}>{paused ? '▶' : '⏸'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={skipForward}>
                <Text style={styles.controlText}>+10s</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlButton}>
                <Text style={styles.controlText}>...</Text>
              </TouchableOpacity>
            </View>

            {/* Additional info */}
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Tap the waveform to jump to specific parts
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  hiddenVideo: {
    width: 0,
    height: 0,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  waveformContainer: {
    height: 120,
    marginBottom: 24,
    justifyContent: 'center',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#d1d5db',
    borderRadius: 1.5,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 24,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  controlText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  rateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  playButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  infoContainer: {
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default AudioPlayerScreen;
