import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import type { NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { fetchCalendarEvents } from "../services/calendar";
import type { CalendarItem } from "../services/calendar";
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
} from "../config/theme";

// --- Date helpers ---

const INITIAL_PAST_DAYS = 14;
const INITIAL_FUTURE_DAYS = 30;
const LOAD_MORE_DAYS = 14;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isToday(date: Date): boolean {
  return toDateKey(date) === toDateKey(new Date());
}

function formatDayHeader(date: Date): string {
  const today = new Date();
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);

  if (toDateKey(date) === toDateKey(today)) return "Today";
  if (toDateKey(date) === toDateKey(yesterday)) return "Yesterday";
  if (toDateKey(date) === toDateKey(tomorrow)) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatDaySubheader(date: Date): string {
  if (isToday(date)) {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  return date.toLocaleDateString("en-US", { year: "numeric" });
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remaining = mins % 60;
  return remaining > 0 ? `${hrs}h ${remaining}m` : `${hrs}h`;
}

function getStatusColor(status?: string): string {
  switch (status) {
    case "pending":
    case "pending_payment":
      return colors.warning;
    case "cancelled":
    case "no_show":
      return colors.error;
    case "completed":
      return colors.success;
    default:
      return colors.primary;
  }
}

function getStatusLabel(status?: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "pending_payment":
      return "Awaiting Payment";
    case "cancelled":
      return "Cancelled";
    case "completed":
      return "Completed";
    case "no_show":
      return "No Show";
    default:
      return "Scheduled";
  }
}

// --- Types ---

interface DayData {
  dateKey: string;
  date: Date;
  events: CalendarItem[];
}

// --- Generate date range ---

function generateDays(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const current = startOfDay(from);
  const end = startOfDay(to);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

// --- Component ---

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function CalendarScreen() {
  const navigation = useNavigation<NavProp>();
  const { accessToken, refreshAccessToken } = useAuth();
  const [days, setDays] = useState<DayData[]>([]);
  const [eventsByDate, setEventsByDate] = useState<
    Record<string, CalendarItem[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const rangeRef = useRef({
    start: addDays(new Date(), -INITIAL_PAST_DAYS),
    end: addDays(new Date(), INITIAL_FUTURE_DAYS),
  });

  // Fetch events for a date range and merge into state
  const fetchEvents = useCallback(
    async (from: Date, to: Date) => {
      if (!accessToken) return;

      try {
        let response = await fetchCalendarEvents(
          accessToken,
          startOfDay(from),
          endOfDay(to),
        );

        if (
          !response.success &&
          (response.error?.includes("expired") ||
            response.error?.includes("authenticated"))
        ) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            response = await fetchCalendarEvents(
              newToken,
              startOfDay(from),
              endOfDay(to),
            );
          }
        }

        if (response.success && response.data) {
          // Group events by date key
          const grouped: Record<string, CalendarItem[]> = {};
          for (const event of response.data) {
            const key = toDateKey(new Date(event.start));
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(event);
          }
          // Sort events within each day by start time
          for (const key of Object.keys(grouped)) {
            grouped[key].sort(
              (a, b) =>
                new Date(a.start).getTime() - new Date(b.start).getTime(),
            );
          }
          setEventsByDate((prev) => ({ ...prev, ...grouped }));
        } else {
          throw new Error(response.error || "Failed to load events");
        }
      } catch (err) {
        console.error("[DBG][CalendarScreen] Fetch error:", err);
        throw err;
      }
    },
    [accessToken, refreshAccessToken],
  );

  // Build days list from range
  const buildDaysList = useCallback(
    (from: Date, to: Date): DayData[] => {
      return generateDays(from, to).map((d) => ({
        dateKey: toDateKey(d),
        date: d,
        events: eventsByDate[toDateKey(d)] || [],
      }));
    },
    [eventsByDate],
  );

  // Initial load
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await fetchEvents(rangeRef.current.start, rangeRef.current.end);
      } catch {
        if (!cancelled) setError("Unable to load calendar");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [fetchEvents]);

  // Rebuild days whenever eventsByDate changes
  useEffect(() => {
    const newDays = buildDaysList(rangeRef.current.start, rangeRef.current.end);
    setDays(newDays);
  }, [eventsByDate, buildDaysList]);

  // Compute today's index for initialScrollIndex
  const todayIndex = days.findIndex((d) => d.dateKey === toDateKey(new Date()));
  const initialIndex = todayIndex >= 0 ? todayIndex : undefined;

  // Load more past days
  const loadPastDays = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const newStart = addDays(rangeRef.current.start, -LOAD_MORE_DAYS);
    try {
      await fetchEvents(newStart, addDays(rangeRef.current.start, -1));
      rangeRef.current.start = newStart;
    } catch {
      // silently fail - user can pull again
    } finally {
      setLoadingMore(false);
    }
  }, [fetchEvents, loadingMore]);

  // Load more future days
  const loadFutureDays = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const newEnd = addDays(rangeRef.current.end, LOAD_MORE_DAYS);
    try {
      await fetchEvents(addDays(rangeRef.current.end, 1), newEnd);
      rangeRef.current.end = newEnd;
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [fetchEvents, loadingMore]);

  // Jump to today
  const scrollToToday = useCallback(() => {
    const todayKey = toDateKey(new Date());
    const idx = days.findIndex((d) => d.dateKey === todayKey);
    if (idx >= 0) {
      flatListRef.current?.scrollToIndex({ index: idx, animated: true });
    }
  }, [days]);

  // Detect scroll near top to load past days
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = e.nativeEvent;
      if (contentOffset.y < 200) {
        loadPastDays();
      }
    },
    [loadPastDays],
  );

  // Full refresh
  const handleRefresh = useCallback(async () => {
    setEventsByDate({});
    rangeRef.current = {
      start: addDays(new Date(), -INITIAL_PAST_DAYS),
      end: addDays(new Date(), INITIAL_FUTURE_DAYS),
    };
    setError(null);
    setIsLoading(true);
    try {
      await fetchEvents(rangeRef.current.start, rangeRef.current.end);
    } catch {
      setError("Unable to load calendar");
    } finally {
      setIsLoading(false);
    }
  }, [fetchEvents]);

  // --- Render event card ---
  const renderEvent = (event: CalendarItem) => {
    const status = event.extendedProps?.status;
    const isCancelled = status === "cancelled";
    const hasLocation = !!event.extendedProps?.location;
    const hasAttendees =
      event.extendedProps?.attendees &&
      event.extendedProps.attendees.length > 0;

    return (
      <TouchableOpacity
        key={event.id}
        style={[styles.eventCard, isCancelled && styles.eventCardCancelled]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate("EventDetail", { event })}
      >
        <View
          style={[
            styles.eventColorStripe,
            {
              backgroundColor: isCancelled
                ? colors.textMuted
                : event.color || colors.primary,
            },
          ]}
        />
        <View style={styles.eventBody}>
          <View style={styles.eventTitleRow}>
            <Text
              style={[
                styles.eventTitle,
                isCancelled && styles.eventTitleCancelled,
              ]}
              numberOfLines={1}
            >
              {event.title}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: getStatusColor(status) + "18",
                },
              ]}
            >
              <Text
                style={[styles.statusText, { color: getStatusColor(status) }]}
              >
                {getStatusLabel(status)}
              </Text>
            </View>
          </View>

          <View style={styles.eventTimeRow}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={styles.eventTimeText}>
              {event.allDay
                ? "All day"
                : `${formatTime(event.start)} – ${formatTime(event.end)}`}
            </Text>
            {!event.allDay && (
              <Text style={styles.eventDuration}>
                ({formatDuration(event.start, event.end)})
              </Text>
            )}
          </View>

          {hasLocation && (
            <View style={styles.eventDetailRow}>
              <Ionicons
                name="location-outline"
                size={13}
                color={colors.textMuted}
              />
              <Text style={styles.eventDetailText} numberOfLines={1}>
                {event.extendedProps!.location}
              </Text>
            </View>
          )}

          {hasAttendees && (
            <View style={styles.eventDetailRow}>
              <Ionicons
                name="people-outline"
                size={13}
                color={colors.textMuted}
              />
              <Text style={styles.eventDetailText} numberOfLines={1}>
                {event
                  .extendedProps!.attendees!.map((a) => a.name || a.email)
                  .join(", ")}
              </Text>
            </View>
          )}

          {event.extendedProps?.meetingLink && (
            <View style={styles.eventDetailRow}>
              <Ionicons
                name="videocam-outline"
                size={13}
                color={colors.primary}
              />
              <Text
                style={[styles.eventDetailText, { color: colors.primary }]}
                numberOfLines={1}
              >
                Video meeting
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // --- Render day section ---
  const renderDay = useCallback(
    ({ item }: { item: DayData }) => {
      const today = isToday(item.date);
      const allDayEvents = item.events.filter((e) => e.allDay);
      const timedEvents = item.events.filter((e) => !e.allDay);

      return (
        <View style={[styles.daySection, today && styles.daySectionToday]}>
          {/* Day header */}
          <View style={styles.dayHeader}>
            <View style={styles.dayDateColumn}>
              <Text style={[styles.dayNumber, today && styles.dayNumberToday]}>
                {item.date.getDate()}
              </Text>
              <Text style={[styles.dayName, today && styles.dayNameToday]}>
                {item.date
                  .toLocaleDateString("en-US", { weekday: "short" })
                  .toUpperCase()}
              </Text>
            </View>
            <View style={styles.dayHeaderRight}>
              <Text
                style={[
                  styles.dayHeaderText,
                  today && styles.dayHeaderTextToday,
                ]}
              >
                {formatDayHeader(item.date)}
              </Text>
              <Text style={styles.daySubheader}>
                {!today ? formatDaySubheader(item.date) : null}
                {item.events.length > 0
                  ? `${item.events.length} event${item.events.length !== 1 ? "s" : ""}`
                  : ""}
              </Text>
            </View>
          </View>

          {/* Events */}
          {item.events.length === 0 ? (
            <View style={styles.noEventsRow}>
              <Text style={styles.noEventsText}>No events</Text>
            </View>
          ) : (
            <View style={styles.eventsList}>
              {allDayEvents.map(renderEvent)}
              {timedEvents.map(renderEvent)}
            </View>
          )}
        </View>
      );
    },
    [renderEvent],
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadMoreContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Calendar</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Calendar</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
        <TouchableOpacity onPress={scrollToToday} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* Day list */}
      <FlatList
        ref={flatListRef}
        data={days}
        renderItem={renderDay}
        keyExtractor={(item) => item.dateKey}
        showsVerticalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        onEndReached={loadFutureDays}
        onEndReachedThreshold={0.5}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        ListFooterComponent={renderFooter}
        initialNumToRender={INITIAL_PAST_DAYS + 7}
        maxToRenderPerBatch={7}
        windowSize={11}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
            });
          }, 200);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgMain,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
  },
  todayButton: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + "12",
  },
  todayButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: "center",
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
  retryText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  loadMoreContainer: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },

  // --- Day section ---
  daySection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  daySectionToday: {
    backgroundColor: colors.primary + "05",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  dayDateColumn: {
    width: 44,
    alignItems: "center",
  },
  dayNumber: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
    lineHeight: 36,
  },
  dayNumberToday: {
    color: colors.primary,
  },
  dayName: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  dayNameToday: {
    color: colors.primary,
  },
  dayHeaderRight: {
    flex: 1,
  },
  dayHeaderText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
  },
  dayHeaderTextToday: {
    color: colors.primary,
  },
  daySubheader: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  noEventsRow: {
    paddingVertical: spacing.sm,
    paddingLeft: 44 + spacing.md,
  },
  noEventsText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: "italic",
  },

  // --- Events ---
  eventsList: {
    paddingLeft: 44 + spacing.md,
    gap: spacing.sm,
  },
  eventCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  eventCardCancelled: {
    opacity: 0.6,
  },
  eventColorStripe: {
    width: 4,
  },
  eventBody: {
    flex: 1,
    padding: spacing.sm + 2,
    paddingLeft: spacing.sm + 4,
    gap: 4,
  },
  eventTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  eventTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textMain,
  },
  eventTitleCancelled: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
  },
  eventTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventTimeText: {
    fontSize: fontSize.sm,
    color: colors.textBody,
  },
  eventDuration: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  eventDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventDetailText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
