import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppDispatch, RootState } from '../../store';
import {
  fetchMeetingDetail,
  toggleActionItemComplete,
  updateMeetingTags,
} from '../../store/slices/meetingsSlice';
import { RootStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type MeetingDetailRouteProp = RouteProp<RootStackParamList, 'MeetingDetail'>;

function MeetingDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<MeetingDetailRouteProp>();
  const dispatch = useDispatch<AppDispatch>();

  const { meetingId } = route.params;
  const { selectedMeeting, loading } = useSelector(
    (state: RootState) => state.meetings
  );

  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'actions'>(
    'transcript'
  );

  useEffect(() => {
    dispatch(fetchMeetingDetail(meetingId));
  }, [dispatch, meetingId]);

  const handlePlayAudio = () => {
    if (selectedMeeting?.audioUrl) {
      navigation.navigate('AudioPlayer', {
        meetingId: selectedMeeting.id,
        audioUrl: selectedMeeting.audioUrl,
      });
    } else {
      Alert.alert('Error', 'Audio not available for this meeting');
    }
  };

  const handleToggleActionItem = (actionItemId: string, completed: boolean) => {
    dispatch(
      toggleActionItemComplete({
        meetingId,
        actionItemId,
        completed: !completed,
      })
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!selectedMeeting) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Meeting not found</Text>
      </View>
    );
  }

  const formattedDate = new Date(selectedMeeting.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const durationMinutes = Math.round(selectedMeeting.duration / 60);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>{selectedMeeting.title}</Text>
          <Text style={styles.date}>{formattedDate}</Text>

          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Duration</Text>
              <Text style={styles.metaValue}>{durationMinutes} min</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Participants</Text>
              <Text style={styles.metaValue}>
                {selectedMeeting.participants.length}
              </Text>
            </View>
          </View>

          {/* Tags */}
          {selectedMeeting.tags && selectedMeeting.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {selectedMeeting.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {selectedMeeting.audioUrl && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handlePlayAudio}>
                <Text style={styles.primaryButtonText}>Play Recording</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'transcript' && styles.activeTab]}
            onPress={() => setActiveTab('transcript')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'transcript' && styles.activeTabText,
              ]}>
              Transcript
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'summary' && styles.activeTab]}
            onPress={() => setActiveTab('summary')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'summary' && styles.activeTabText,
              ]}>
              Summary
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'actions' && styles.activeTab]}
            onPress={() => setActiveTab('actions')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'actions' && styles.activeTabText,
              ]}>
              Action Items
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'transcript' && (
            <View style={styles.section}>
              {selectedMeeting.transcript ? (
                <Text style={styles.transcriptText}>
                  {selectedMeeting.transcript}
                </Text>
              ) : (
                <Text style={styles.emptyText}>
                  Transcript not available yet
                </Text>
              )}
            </View>
          )}

          {activeTab === 'summary' && (
            <View style={styles.section}>
              {selectedMeeting.summary ? (
                <Text style={styles.summaryText}>{selectedMeeting.summary}</Text>
              ) : (
                <Text style={styles.emptyText}>Summary not available yet</Text>
              )}
            </View>
          )}

          {activeTab === 'actions' && (
            <View style={styles.section}>
              {selectedMeeting.actionItems &&
              selectedMeeting.actionItems.length > 0 ? (
                selectedMeeting.actionItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.actionItem}
                    onPress={() =>
                      handleToggleActionItem(item.id, item.completed)
                    }>
                    <View
                      style={[
                        styles.checkbox,
                        item.completed && styles.checkboxChecked,
                      ]}>
                      {item.completed && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <View style={styles.actionItemContent}>
                      <Text
                        style={[
                          styles.actionItemText,
                          item.completed && styles.actionItemTextCompleted,
                        ]}>
                        {item.text}
                      </Text>
                      {item.assignee && (
                        <Text style={styles.assigneeText}>
                          Assigned to: {item.assignee}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>No action items</Text>
              )}
            </View>
          )}
        </View>

        {/* Participants List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Participants</Text>
          {selectedMeeting.participants.map((participant, index) => (
            <View key={index} style={styles.participantItem}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {participant.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.participantName}>{participant}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metaItem: {
    marginRight: 24,
  },
  metaLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#6366f1',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  transcriptText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 40,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionItemContent: {
    flex: 1,
  },
  actionItemText: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 4,
  },
  actionItemTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  assigneeText: {
    fontSize: 13,
    color: '#6b7280',
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  participantName: {
    fontSize: 15,
    color: '#374151',
  },
});

export default MeetingDetailScreen;
