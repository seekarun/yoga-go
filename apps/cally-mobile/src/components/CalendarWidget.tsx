import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { fetchTodayEvents } from "../services/calendar";
import type { CalendarItem } from "../services/calendar";
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
} from "../config/theme";

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getStatusColor(status?: string): string {
  switch (status) {
    case "pending":
      return colors.warning;
    case "cancelled":
      return colors.error;
    default:
      return colors.success;
  }
}

function getStatusLabel(status?: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "cancelled":
      return "Cancelled";
    case "completed":
      return "Completed";
    default:
      return "Scheduled";
  }
}

export default function CalendarWidget() {
  const { accessToken, refreshAccessToken } = useAuth();
  const [events, setEvents] = useState<CalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      let response = await fetchTodayEvents(accessToken);

      // If unauthorized, try refreshing the token
      if (!response.success && response.error?.includes("expired")) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetchTodayEvents(newToken);
        }
      }

      if (response.success && response.data) {
        setEvents(response.data);
      } else {
        setError(response.error || "Failed to load events");
      }
    } catch (err) {
      console.error("[CalendarWidget] Error:", err);
      setError("Unable to load calendar");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const today = new Date();
  const dateString = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Schedule</Text>
        <Text style={styles.date}>{dateString}</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity onPress={loadEvents} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No appointments today</Text>
          <Text style={styles.emptySubtext}>Enjoy your free day!</Text>
        </View>
      ) : (
        <View style={styles.eventsList}>
          {events.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <View
                style={[
                  styles.eventColorBar,
                  { backgroundColor: event.color || colors.primary },
                ]}
              />
              <View style={styles.eventDetails}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {event.title}
                </Text>
                <Text style={styles.eventTime}>
                  {event.allDay
                    ? "All day"
                    : `${formatTime(event.start)} - ${formatTime(event.end)}`}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      getStatusColor(event.extendedProps?.status) + "20",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: getStatusColor(event.extendedProps?.status),
                    },
                  ]}
                >
                  {getStatusLabel(event.extendedProps?.status)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  retryButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  retryText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  eventsList: {
    gap: spacing.sm,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm + 4,
  },
  eventColorBar: {
    width: 3,
    height: 36,
    borderRadius: 2,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textMain,
  },
  eventTime: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
