import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import type { CalendarItem } from "../services/calendar";
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
} from "../config/theme";

type Props = NativeStackScreenProps<RootStackParamList, "EventDetail">;

// --- Helpers ---

function formatFullDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} minutes`;
  const hrs = Math.floor(mins / 60);
  const remaining = mins % 60;
  return remaining > 0
    ? `${hrs}h ${remaining}m`
    : `${hrs} hour${hrs !== 1 ? "s" : ""}`;
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

// --- Detail row component ---

function DetailRow({
  icon,
  iconColor,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.detailRow}>
      <View style={styles.detailIconContainer}>
        <Ionicons name={icon} size={20} color={iconColor || colors.textMuted} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text
          style={[styles.detailValue, onPress && { color: colors.primary }]}
          numberOfLines={3}
        >
          {value}
        </Text>
      </View>
      {onPress && (
        <Ionicons
          name="open-outline"
          size={16}
          color={colors.primary}
          style={styles.detailChevron}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

// --- Screen ---

export default function EventDetailScreen({ navigation, route }: Props) {
  const { event } = route.params;
  const status = event.extendedProps?.status;
  const isCancelled = status === "cancelled";
  const eventColor = isCancelled
    ? colors.textMuted
    : event.color || colors.primary;

  const handleMeetingLink = () => {
    if (event.extendedProps?.meetingLink) {
      Linking.openURL(event.extendedProps.meetingLink);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Event Details
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Event color banner */}
        <View style={[styles.colorBanner, { backgroundColor: eventColor }]} />

        {/* Title + status */}
        <View style={styles.titleSection}>
          <Text
            style={[
              styles.eventTitle,
              isCancelled && styles.eventTitleCancelled,
            ]}
          >
            {event.title}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(status) + "18" },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(status) }]}
            >
              {getStatusLabel(status)}
            </Text>
          </View>
        </View>

        {/* Details card */}
        <View style={styles.detailsCard}>
          {/* Date & Time */}
          <DetailRow
            icon="calendar-outline"
            label="Date"
            value={formatFullDate(event.start)}
          />

          <View style={styles.detailDivider} />

          <DetailRow
            icon="time-outline"
            label="Time"
            value={
              event.allDay
                ? "All day"
                : `${formatTime(event.start)} – ${formatTime(event.end)}`
            }
          />

          {!event.allDay && (
            <>
              <View style={styles.detailDivider} />
              <DetailRow
                icon="hourglass-outline"
                label="Duration"
                value={formatDuration(event.start, event.end)}
              />
            </>
          )}

          {/* Source */}
          {event.extendedProps?.source && (
            <>
              <View style={styles.detailDivider} />
              <DetailRow
                icon="globe-outline"
                label="Source"
                value={event.extendedProps.source}
              />
            </>
          )}
        </View>

        {/* Description */}
        {event.extendedProps?.description && (
          <View style={styles.detailsCard}>
            <DetailRow
              icon="document-text-outline"
              label="Description"
              value={event.extendedProps.description}
            />
          </View>
        )}

        {/* Location */}
        {event.extendedProps?.location && (
          <View style={styles.detailsCard}>
            <DetailRow
              icon="location-outline"
              label="Location"
              value={event.extendedProps.location}
            />
          </View>
        )}

        {/* Meeting Link */}
        {event.extendedProps?.meetingLink && (
          <View style={styles.detailsCard}>
            <DetailRow
              icon="videocam-outline"
              iconColor={colors.primary}
              label="Meeting Link"
              value={event.extendedProps.meetingLink}
              onPress={handleMeetingLink}
            />
          </View>
        )}

        {/* Attendees */}
        {event.extendedProps?.attendees &&
          event.extendedProps.attendees.length > 0 && (
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={colors.textMuted}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>
                    Attendees ({event.extendedProps.attendees.length})
                  </Text>
                </View>
              </View>
              <View style={styles.attendeesList}>
                {event.extendedProps.attendees.map((attendee, idx) => (
                  <View
                    key={`${attendee.email}-${idx}`}
                    style={styles.attendeeRow}
                  >
                    <View style={styles.attendeeAvatar}>
                      <Text style={styles.attendeeInitial}>
                        {(attendee.name || attendee.email)[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.attendeeInfo}>
                      {attendee.name && (
                        <Text style={styles.attendeeName}>{attendee.name}</Text>
                      )}
                      <Text style={styles.attendeeEmail}>{attendee.email}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

        {/* Join meeting button */}
        {event.extendedProps?.meetingLink && !isCancelled && (
          <TouchableOpacity
            style={styles.joinButton}
            onPress={handleMeetingLink}
            activeOpacity={0.8}
          >
            <Ionicons name="videocam" size={20} color={colors.white} />
            <Text style={styles.joinButtonText}>Join Meeting</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
    textAlign: "center",
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  // --- Color banner ---
  colorBanner: {
    height: 6,
    borderRadius: 3,
  },

  // --- Title section ---
  titleSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  eventTitle: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
    lineHeight: 30,
  },
  eventTitleCancelled: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: 4,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },

  // --- Details card ---
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm + 2,
  },
  detailIconContainer: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: fontSize.md,
    color: colors.textMain,
    lineHeight: 22,
  },
  detailChevron: {
    marginTop: spacing.md,
  },
  detailDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm + 2,
    marginLeft: 28 + spacing.sm + 2,
  },

  // --- Attendees ---
  attendeesList: {
    marginTop: spacing.sm,
    marginLeft: 28 + spacing.sm + 2,
    gap: spacing.sm,
  },
  attendeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  attendeeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  attendeeInitial: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMain,
  },
  attendeeEmail: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  // --- Join button ---
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
  },
  joinButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
