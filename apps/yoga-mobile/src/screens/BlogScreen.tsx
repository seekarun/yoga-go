import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { Video, ResizeMode } from "expo-av";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../config/api";
import { colors, spacing, fontSize, fontWeight } from "../config/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CF_SUBDOMAIN = "iq7mgkvtb3bwxqf5"; // Cloudflare Stream subdomain

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function BackIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={colors.white}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={colors.white}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HeartIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
        stroke={colors.textMuted}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CommentIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
        stroke={colors.textMuted}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface PostMedia {
  type: "image" | "video";
  url: string;
}

// Check if URL is a Cloudflare Stream video ID (not a full URL)
const isCloudflareVideoId = (url: string): boolean => {
  return !url.startsWith("http") && url.length === 32;
};

// Get HLS manifest URL for Cloudflare Stream video
const getCloudflareVideoHlsUrl = (videoId: string): string => {
  return `https://customer-${CF_SUBDOMAIN}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
};

interface Post {
  id: string;
  content: string;
  media?: PostMedia[];
  status: "draft" | "published";
  publishedAt?: string;
  createdAt: string;
  updatedAt?: string;
  likeCount: number;
  commentCount: number;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Get video URL helper
const getVideoUrl = (url: string): string => {
  if (isCloudflareVideoId(url)) {
    return getCloudflareVideoHlsUrl(url);
  }
  // If it's already a full URL (cloudflarestream.com iframe URL), convert to HLS
  if (url.includes("cloudflarestream.com") && url.includes("/iframe")) {
    const videoId = url.split("/").slice(-2)[0];
    return getCloudflareVideoHlsUrl(videoId);
  }
  return url;
};

// Play icon overlay
function PlayIcon({ size = 60 }: { size?: number }) {
  return (
    <View
      style={[
        styles.playIconContainer,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Svg
        width={size * 0.4}
        height={size * 0.4}
        viewBox="0 0 24 24"
        fill={colors.white}
      >
        <Path d="M8 5v14l11-7z" />
      </Svg>
    </View>
  );
}

// Video item with tap-to-play
function VideoItem({ url }: { url: string }) {
  const videoRef = React.useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={togglePlay}
      style={styles.videoContainer}
    >
      <Video
        ref={videoRef}
        source={{ uri: getVideoUrl(url) }}
        style={styles.videoPlayer}
        resizeMode={ResizeMode.CONTAIN}
        isLooping
        shouldPlay={false}
        onPlaybackStatusUpdate={(status) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
          }
        }}
      />
      {!isPlaying && <PlayIcon />}
    </TouchableOpacity>
  );
}

// Media carousel component for swipeable images/videos
function MediaCarousel({ media }: { media: PostMedia[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const slideIndex = Math.round(
        event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
      );
      setActiveIndex(slideIndex);
    },
    [],
  );

  const renderMediaItem = ({ item }: { item: PostMedia }) => {
    return (
      <View style={styles.mediaSlide}>
        {item.type === "image" ? (
          <Image
            source={{ uri: item.url }}
            style={styles.mediaImage}
            resizeMode="contain"
          />
        ) : (
          <VideoItem url={item.url} />
        )}
      </View>
    );
  };

  return (
    <View style={styles.mediaContainer}>
      <FlatList
        data={media}
        renderItem={renderMediaItem}
        keyExtractor={(_, index) => index.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      />
      {/* Pagination dots */}
      {media.length > 1 && (
        <View style={styles.paginationContainer}>
          {media.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === activeIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default function BlogScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { accessToken } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!accessToken) {
      setError("Not authenticated");
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/data/app/expert/me/blog`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (data.success && data.data) {
        setPosts(data.data);
      } else {
        setError(data.error || "Failed to load posts");
      }
    } catch (err) {
      console.error("[DBG][BlogScreen] Error fetching posts:", err);
      setError("Failed to connect to server");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchPosts();
    });
    return unsubscribe;
  }, [navigation, fetchPosts]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchPosts();
  }, [fetchPosts]);

  const renderPostItem = ({ item }: { item: Post }) => (
    <View style={styles.postContainer}>
      {/* Media carousel */}
      {item.media && item.media.length > 0 && (
        <MediaCarousel media={item.media} />
      )}

      {/* Post content */}
      <View style={styles.postContent}>
        {/* Actions row */}
        <View style={styles.actionsRow}>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton}>
              <HeartIcon />
              <Text style={styles.actionCount}>{item.likeCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <CommentIcon />
              <Text style={styles.actionCount}>{item.commentCount}</Text>
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.statusBadge,
              item.status === "published"
                ? styles.statusPublished
                : styles.statusDraft,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.status === "published"
                  ? styles.statusTextPublished
                  : styles.statusTextDraft,
              ]}
            >
              {item.status === "published" ? "Published" : "Draft"}
            </Text>
          </View>
        </View>

        {/* Content text */}
        {item.content && <Text style={styles.contentText}>{item.content}</Text>}

        {/* Timestamp */}
        <Text style={styles.timestamp}>
          {formatRelativeTime(item.publishedAt || item.createdAt)}
        </Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Posts</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Posts</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("CreateBlog")}
        >
          <PlusIcon size={20} />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchPosts} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPostItem}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={
          posts.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to create your first post
            </Text>
          </View>
        }
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
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.white,
    marginLeft: spacing.sm,
  },
  headerSpacer: {
    width: 40,
  },
  addButton: {
    padding: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    padding: spacing.md,
    margin: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  retryText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  postContainer: {
    backgroundColor: colors.surface,
  },
  mediaContainer: {
    position: "relative",
    backgroundColor: "#6B7280", // gray-500 for 50% gray
  },
  mediaSlide: {
    width: SCREEN_WIDTH,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },
  videoContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  playIconContainer: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  paginationContainer: {
    position: "absolute",
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
    marginHorizontal: 3,
  },
  paginationDotActive: {
    backgroundColor: colors.white,
  },
  postContent: {
    padding: spacing.md,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  actionCount: {
    marginLeft: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  statusPublished: {
    backgroundColor: colors.highlight + "20",
  },
  statusDraft: {
    backgroundColor: colors.textMuted + "20",
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  statusTextPublished: {
    color: colors.highlight,
  },
  statusTextDraft: {
    color: colors.textMuted,
  },
  contentText: {
    fontSize: fontSize.md,
    color: colors.textBody,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  separator: {
    height: spacing.lg,
    backgroundColor: colors.bgMain,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.textBody,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: "center",
  },
});
