import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import { fetchUserDetail } from "../services/people";
import type {
  UserFileData,
  UserEmail,
  UserBooking,
  UserContact,
  UserFeedback,
  UserType,
} from "../services/people";
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
} from "../config/theme";

type Props = NativeStackScreenProps<RootStackParamList, "UserDetail">;

// --- Timeline item types ---

type TimelineItem =
  | { type: "email"; date: string; data: UserEmail }
  | { type: "booking"; date: string; data: UserBooking }
  | { type: "contact"; date: string; data: UserContact }
  | { type: "feedback"; date: string; data: UserFeedback };

// --- Helpers ---

const TYPE_BADGE: Record<
  UserType,
  { label: string; bg: string; text: string }
> = {
  registered: { label: "Registered", bg: "#ecfdf5", text: "#047857" },
  visitor: { label: "Visitor", bg: "#fffbeb", text: "#b45309" },
  contact: { label: "Contact", bg: "#eff6ff", text: "#1d4ed8" },
};

const BOOKING_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: "#ecfdf5", text: "#047857" },
  pending: { bg: "#fffbeb", text: "#b45309" },
  cancelled: { bg: "#fef2f2", text: "#b91c1c" },
  completed: { bg: "#f3f4f6", text: "#4b5563" },
  no_show: { bg: "#fef2f2", text: "#b91c1c" },
};

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBookingTime(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const dateStr = s.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startStr = s.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endStr = e.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr}, ${startStr} - ${endStr}`;
}

function truncate(text: string, max = 120): string {
  if (text.length <= max) return text;
  return text.substring(0, max) + "...";
}

// --- Timeline entry components ---

function EmailEntry({ email }: { email: UserEmail }) {
  return (
    <View style={styles.timelineCard}>
      <View style={styles.timelineHeader}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: email.isOutgoing ? "#eff6ff" : "#f3f4f6",
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: email.isOutgoing ? "#1d4ed8" : "#4b5563" },
            ]}
          >
            {email.isOutgoing ? "Sent" : "Received"}
          </Text>
        </View>
        <Text style={styles.timelineSubject} numberOfLines={1}>
          {email.subject || "(no subject)"}
        </Text>
        <Text style={styles.timelineDate}>
          {formatDateTime(email.receivedAt)}
        </Text>
      </View>
      <Text style={styles.timelineSnippet} numberOfLines={2}>
        {truncate(email.bodyText)}
      </Text>
    </View>
  );
}

function BookingEntry({ booking }: { booking: UserBooking }) {
  const statusColor = BOOKING_STATUS_COLORS[booking.status] || {
    bg: "#f3f4f6",
    text: "#4b5563",
  };
  const title = booking.title.replace(/^Booking:\s*/, "");

  return (
    <View style={styles.timelineCard}>
      <View style={styles.timelineHeader}>
        <View style={[styles.badge, { backgroundColor: "#f5f3ff" }]}>
          <Text style={[styles.badgeText, { color: "#7c3aed" }]}>Booking</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.badgeText, { color: statusColor.text }]}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Text>
        </View>
        <Text style={styles.timelineSubject} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Text style={styles.timelineSnippet}>
        {formatBookingTime(booking.startTime, booking.endTime)}
        {booking.duration ? ` (${booking.duration} min)` : ""}
      </Text>
    </View>
  );
}

function ContactEntry({ contact }: { contact: UserContact }) {
  return (
    <View style={styles.timelineCard}>
      <View style={styles.timelineHeader}>
        <View style={[styles.badge, { backgroundColor: "#eff6ff" }]}>
          <Text style={[styles.badgeText, { color: "#1d4ed8" }]}>Contact</Text>
        </View>
        <Text style={styles.timelineSubject} numberOfLines={1}>
          Contact form submission
        </Text>
        <Text style={styles.timelineDate}>
          {formatDateTime(contact.submittedAt)}
        </Text>
      </View>
      <Text style={styles.timelineSnippet} numberOfLines={2}>
        {truncate(contact.message)}
      </Text>
    </View>
  );
}

function FeedbackEntry({ feedback }: { feedback: UserFeedback }) {
  const isSubmitted = feedback.status === "submitted";

  return (
    <View style={styles.timelineCard}>
      <View style={styles.timelineHeader}>
        <View style={[styles.badge, { backgroundColor: "#f5f3ff" }]}>
          <Text style={[styles.badgeText, { color: "#7c3aed" }]}>
            {isSubmitted ? "Review Submitted" : "Requested Review"}
          </Text>
        </View>
        {isSubmitted && feedback.rating != null && (
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= feedback.rating! ? "star" : "star-outline"}
                size={12}
                color={
                  star <= feedback.rating! ? colors.warning : colors.border
                }
              />
            ))}
          </View>
        )}
        {feedback.approved && (
          <View style={[styles.badge, { backgroundColor: "#ecfdf5" }]}>
            <Text style={[styles.badgeText, { color: "#047857" }]}>
              Approved
            </Text>
          </View>
        )}
      </View>
      {isSubmitted && feedback.message ? (
        <Text style={styles.timelineSnippet} numberOfLines={2}>
          &quot;{truncate(feedback.message)}&quot;
        </Text>
      ) : (
        <Text style={styles.timelineSnippet}>
          Feedback request sent — awaiting response
        </Text>
      )}
    </View>
  );
}

function TimelineEntryView({ item }: { item: TimelineItem }) {
  switch (item.type) {
    case "email":
      return <EmailEntry email={item.data} />;
    case "booking":
      return <BookingEntry booking={item.data} />;
    case "contact":
      return <ContactEntry contact={item.data} />;
    case "feedback":
      return <FeedbackEntry feedback={item.data} />;
  }
}

// --- Screen ---

export default function UserDetailScreen({ navigation, route }: Props) {
  const { userEmail, userName } = route.params;
  const { accessToken, refreshAccessToken } = useAuth();

  const [data, setData] = useState<UserFileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (showLoader = true) => {
      if (!accessToken) return;
      if (showLoader) setIsLoading(true);
      setError(null);

      try {
        let response = await fetchUserDetail(userEmail, accessToken);

        if (
          !response.success &&
          (response.error?.includes("expired") ||
            response.error?.includes("authenticated"))
        ) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            response = await fetchUserDetail(userEmail, newToken);
          }
        }

        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.error || "Failed to load user");
        }
      } catch (err) {
        console.error("[DBG][UserDetailScreen] Error:", err);
        setError("Unable to load user details");
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, refreshAccessToken, userEmail],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [loadData]);

  // Build timeline
  const now = useMemo(() => new Date().toISOString(), []);

  const allItems = useMemo((): TimelineItem[] => {
    if (!data) return [];
    const items: TimelineItem[] = [
      ...data.communications.map(
        (e) => ({ type: "email", date: e.receivedAt, data: e }) as TimelineItem,
      ),
      ...data.bookings.map(
        (b) =>
          ({ type: "booking", date: b.startTime, data: b }) as TimelineItem,
      ),
      ...data.contacts.map(
        (c) =>
          ({ type: "contact", date: c.submittedAt, data: c }) as TimelineItem,
      ),
      ...data.feedbackRequests.map(
        (f) =>
          ({
            type: "feedback",
            date: f.submittedAt || f.createdAt,
            data: f,
          }) as TimelineItem,
      ),
    ];
    return items;
  }, [data]);

  const upcoming = useMemo(
    () =>
      allItems
        .filter((i) => i.date > now)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [allItems, now],
  );

  const past = useMemo(
    () =>
      allItems
        .filter((i) => i.date <= now)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [allItems, now],
  );

  const user = data?.user;
  const typeInfo = user ? TYPE_BADGE[user.userType] : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {userName || "User Details"}
        </Text>
        <View style={styles.headerButton} />
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => loadData()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Profile card */}
          {user && (
            <View style={styles.profileCard}>
              <View style={styles.profileTop}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>
                    {(user.name || user.email)[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{user.name}</Text>
                  <Text style={styles.profileEmail}>{user.email}</Text>
                  {typeInfo && (
                    <View
                      style={[
                        styles.profileTypeBadge,
                        { backgroundColor: typeInfo.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.profileTypeBadgeText,
                          { color: typeInfo.text },
                        ]}
                      >
                        {typeInfo.label}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Stats row */}
              <View style={styles.statsRow}>
                {user.subscribedAt && (
                  <View style={styles.statItem}>
                    <Ionicons
                      name="person-add-outline"
                      size={14}
                      color={colors.textMuted}
                    />
                    <Text style={styles.statText}>
                      Member since {formatDate(user.subscribedAt)}
                    </Text>
                  </View>
                )}
                {user.totalBookings != null && user.totalBookings > 0 && (
                  <View style={styles.statItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={colors.textMuted}
                    />
                    <Text style={styles.statText}>
                      {user.totalBookings} booking
                      {user.totalBookings !== 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
                {user.lastBookingDate && (
                  <View style={styles.statItem}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={colors.textMuted}
                    />
                    <Text style={styles.statText}>
                      Last booking {formatDate(user.lastBookingDate)}
                    </Text>
                  </View>
                )}
                {user.totalContacts != null && user.totalContacts > 0 && (
                  <View style={styles.statItem}>
                    <Ionicons
                      name="chatbubble-outline"
                      size={14}
                      color={colors.textMuted}
                    />
                    <Text style={styles.statText}>
                      {user.totalContacts} contact
                      {user.totalContacts !== 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* No activity */}
          {allItems.length === 0 && (
            <View style={styles.noActivity}>
              <Ionicons name="time-outline" size={40} color={colors.border} />
              <Text style={styles.noActivityText}>
                No activity yet with this user.
              </Text>
            </View>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <View style={styles.timelineSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming</Text>
                <Text style={styles.sectionCount}>{upcoming.length}</Text>
              </View>
              {upcoming.map((item) => (
                <TimelineEntryView
                  key={`${item.type}-${item.data.id}`}
                  item={item}
                />
              ))}
            </View>
          )}

          {/* Past */}
          {past.length > 0 && (
            <View style={styles.timelineSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Past</Text>
                <Text style={styles.sectionCount}>{past.length}</Text>
              </View>
              {past.map((item) => (
                <TimelineEntryView
                  key={`${item.type}-${item.data.id}`}
                  item={item}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
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
  headerButton: {
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
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  // --- Profile card ---
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  profileTop: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
  },
  profileName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  profileTypeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  profileTypeBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  statsRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm + 2,
    gap: spacing.sm,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  // --- No activity ---
  noActivity: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  noActivityText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },

  // --- Timeline sections ---
  timelineSection: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
  },
  sectionCount: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  // --- Timeline card ---
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
    elevation: 1,
  },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  timelineSubject: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMain,
  },
  timelineDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  timelineSnippet: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },

  // --- Badges ---
  badge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
  },

  // --- Stars ---
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
});
