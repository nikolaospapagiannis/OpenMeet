import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppDispatch, RootState } from '../../store';
import {
  fetchMeetings,
  searchMeetings,
  setSearchQuery,
  downloadForOffline,
} from '../../store/slices/meetingsSlice';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useOfflineSync } from '../../hooks/useOfflineSync';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function MeetingsListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();

  const { meetings, loading, searchQuery } = useSelector(
    (state: RootState) => state.meetings
  );
  const { isOnline, isSyncing } = useOfflineSync();

  const [refreshing, setRefreshing] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  useEffect(() => {
    // Load meetings on mount
    dispatch(fetchMeetings());
  }, [dispatch]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchQuery.trim()) {
        dispatch(setSearchQuery(localSearchQuery));
        dispatch(searchMeetings(localSearchQuery));
      } else {
        dispatch(setSearchQuery(''));
        dispatch(fetchMeetings());
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearchQuery, dispatch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchMeetings());
    setRefreshing(false);
  };

  const handleMeetingPress = (meetingId: string) => {
    navigation.navigate('MeetingDetail', { meetingId });
  };

  const handleDownloadOffline = (meetingId: string) => {
    dispatch(downloadForOffline(meetingId));
  };

  const renderMeetingItem = ({ item }: { item: any }) => {
    const formattedDate = new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const durationMinutes = Math.round(item.duration / 60);

    return (
      <TouchableOpacity
        style={styles.meetingCard}
        onPress={() => handleMeetingPress(item.id)}>
        <View style={styles.meetingHeader}>
          <Text style={styles.meetingTitle}>{item.title}</Text>
          {item.isOfflineAvailable && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>Offline</Text>
            </View>
          )}
        </View>

        <Text style={styles.meetingDate}>{formattedDate}</Text>

        <View style={styles.meetingMeta}>
          <Text style={styles.metaText}>{durationMinutes} min</Text>
          <Text style={styles.metaSeparator}>•</Text>
          <Text style={styles.metaText}>
            {item.participants.length} participants
          </Text>
        </View>

        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 3).map((tag: string, index: number) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {item.downloadProgress !== undefined &&
          item.downloadProgress > 0 &&
          item.downloadProgress < 100 && (
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${item.downloadProgress}%` },
                ]}
              />
            </View>
          )}

        {!item.isOfflineAvailable && isOnline && (
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => handleDownloadOffline(item.id)}>
            <Text style={styles.downloadButtonText}>Download for Offline</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meetings</Text>
        {!isOnline && (
          <View style={styles.offlineIndicator}>
            <Text style={styles.offlineText}>Offline Mode</Text>
          </View>
        )}
        {isSyncing && (
          <View style={styles.syncIndicator}>
            <ActivityIndicator size="small" color="#6366f1" />
            <Text style={styles.syncText}>Syncing...</Text>
          </View>
        )}
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search meetings..."
          value={localSearchQuery}
          onChangeText={setLocalSearchQuery}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={meetings}
          renderItem={renderMeetingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#6366f1']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {localSearchQuery
                  ? 'No meetings found'
                  : 'No meetings yet'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  offlineIndicator: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  offlineText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },
  syncIndicator: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6366f1',
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  meetingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  meetingTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  offlineBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  offlineBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  meetingDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  meetingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 14,
    color: '#6b7280',
  },
  metaSeparator: {
    marginHorizontal: 8,
    color: '#d1d5db',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  downloadButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    alignItems: 'center',
  },
  downloadButtonText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
});

export default MeetingsListScreen;
