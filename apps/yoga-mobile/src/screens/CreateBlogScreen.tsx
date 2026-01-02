import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../config/api";
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
} from "../config/theme";

const MAX_CONTENT_LENGTH = 500;
const MAX_MEDIA_ITEMS = 10;

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

function CameraIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z"
        stroke={colors.primary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 17a4 4 0 100-8 4 4 0 000 8z"
        stroke={colors.primary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function GalleryIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z"
        stroke={colors.primary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21"
        stroke={colors.primary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CloseIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={colors.white}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type VideoStatus = "uploading" | "processing" | "ready" | "error";

interface MediaItem {
  uri: string;
  type: "image" | "video";
  uploading?: boolean;
  uploadedUrl?: string;
  videoStatus?: VideoStatus;
}

export default function CreateBlogScreen() {
  const navigation = useNavigation();
  const { accessToken } = useAuth();
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remainingChars = MAX_CONTENT_LENGTH - content.length;

  const requestPermissions = async () => {
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== "granted" || mediaStatus !== "granted") {
      Alert.alert(
        "Permissions Required",
        "Please grant camera and media library permissions to add photos and videos.",
      );
      return false;
    }
    return true;
  };

  const pickFromGallery = async () => {
    if (media.length >= MAX_MEDIA_ITEMS) {
      Alert.alert(
        "Limit Reached",
        `Maximum ${MAX_MEDIA_ITEMS} media items allowed`,
      );
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const remainingSlots = MAX_MEDIA_ITEMS - media.length;

    try {
      console.log("[DBG][CreateBlogScreen] Opening gallery picker...");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.7,
        videoMaxDuration: 300, // 5 minutes max
      });

      console.log(
        "[DBG][CreateBlogScreen] Picker result:",
        JSON.stringify(result, null, 2),
      );

      if (!result.canceled && result.assets) {
        console.log(
          "[DBG][CreateBlogScreen] Selected assets:",
          result.assets.length,
        );
        const newMedia: MediaItem[] = result.assets.map((asset) => {
          console.log("[DBG][CreateBlogScreen] Asset details:", {
            type: asset.type,
            uri: asset.uri,
            mimeType: asset.mimeType,
            fileName: asset.fileName,
            fileSize: asset.fileSize,
            duration: asset.duration,
          });
          // Check mimeType for more reliable video detection
          const isVideo =
            asset.type === "video" ||
            asset.mimeType?.startsWith("video/") ||
            asset.uri?.includes(".mp4") ||
            asset.uri?.includes(".mov");
          return {
            uri: asset.uri,
            type: isVideo ? "video" : "image",
          };
        });
        setMedia((prev) => [...prev, ...newMedia].slice(0, MAX_MEDIA_ITEMS));
      }
    } catch (err) {
      console.error("[DBG][CreateBlogScreen] Error picking from gallery:", err);
      Alert.alert(
        "Error",
        `Failed to load media: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  const takePhoto = async () => {
    if (media.length >= MAX_MEDIA_ITEMS) {
      Alert.alert(
        "Limit Reached",
        `Maximum ${MAX_MEDIA_ITEMS} media items allowed`,
      );
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.7,
        videoMaxDuration: 300, // 5 minutes max
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log(
          "[DBG][CreateBlogScreen] Camera asset:",
          asset.type,
          asset.uri.substring(0, 50),
        );
        setMedia((prev) => [
          ...prev,
          {
            uri: asset.uri,
            type: asset.type === "video" ? "video" : "image",
          },
        ]);
      }
    } catch (err) {
      console.error("[DBG][CreateBlogScreen] Error with camera:", err);
      Alert.alert("Error", "Failed to capture media. Please try again.");
    }
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImage = async (item: MediaItem): Promise<string | null> => {
    if (!accessToken) return null;

    try {
      const formData = new FormData();
      const filename = item.uri.split("/").pop() || "upload";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("file", {
        uri: item.uri,
        name: filename,
        type,
      } as unknown as Blob);

      const response = await fetch(
        `${API_BASE_URL}/api/cloudflare/images/direct-upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        },
      );

      const data = await response.json();

      if (data.success && data.data?.url) {
        return data.data.url;
      }
      return null;
    } catch (err) {
      console.error("[DBG][CreateBlogScreen] Image upload error:", err);
      return null;
    }
  };

  const uploadVideo = async (item: MediaItem): Promise<string | null> => {
    if (!accessToken) {
      console.error("[DBG][CreateBlogScreen] No access token for video upload");
      return null;
    }

    try {
      console.log(
        "[DBG][CreateBlogScreen] Starting video upload for:",
        item.uri,
      );

      // Step 1: Get upload URL from Cloudflare Stream
      const uploadUrlResponse = await fetch(
        `${API_BASE_URL}/api/cloudflare/upload-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ maxDurationSeconds: 600 }),
        },
      );

      console.log(
        "[DBG][CreateBlogScreen] Upload URL response status:",
        uploadUrlResponse.status,
      );

      const uploadUrlData = await uploadUrlResponse.json();
      console.log(
        "[DBG][CreateBlogScreen] Upload URL data:",
        JSON.stringify(uploadUrlData),
      );

      if (!uploadUrlData.success) {
        console.error(
          "[DBG][CreateBlogScreen] Failed to get upload URL:",
          uploadUrlData.error,
        );
        Alert.alert(
          "Upload Error",
          uploadUrlData.error || "Failed to get upload URL",
        );
        return null;
      }

      const { uploadURL, uid } = uploadUrlData.data;
      console.log("[DBG][CreateBlogScreen] Got upload URL for video:", uid);
      console.log("[DBG][CreateBlogScreen] Upload URL:", uploadURL);

      // Step 2: Upload video to Cloudflare Stream using XHR for better compatibility
      const filename = item.uri.split("/").pop() || "video.mp4";

      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();

        xhr.onload = () => {
          console.log(
            "[DBG][CreateBlogScreen] XHR onload, status:",
            xhr.status,
          );
          console.log(
            "[DBG][CreateBlogScreen] XHR response:",
            xhr.responseText,
          );

          if (xhr.status >= 200 && xhr.status < 300) {
            console.log(
              "[DBG][CreateBlogScreen] Video uploaded, now processing:",
              uid,
            );
            resolve(uid);
          } else {
            console.error(
              "[DBG][CreateBlogScreen] Video upload failed with status:",
              xhr.status,
            );
            Alert.alert(
              "Upload Error",
              `Upload failed with status ${xhr.status}`,
            );
            resolve(null);
          }
        };

        xhr.onerror = (e) => {
          console.error("[DBG][CreateBlogScreen] XHR error:", e);
          Alert.alert("Upload Error", "Network error during upload");
          resolve(null);
        };

        xhr.ontimeout = () => {
          console.error("[DBG][CreateBlogScreen] XHR timeout");
          Alert.alert("Upload Error", "Upload timed out");
          resolve(null);
        };

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            console.log(
              "[DBG][CreateBlogScreen] Upload progress:",
              progress,
              "%",
            );
          }
        };

        const formData = new FormData();
        formData.append("file", {
          uri: item.uri,
          name: filename,
          type: "video/mp4",
        } as unknown as Blob);

        xhr.open("POST", uploadURL);
        xhr.timeout = 300000; // 5 minute timeout for large videos
        xhr.send(formData);
      });
    } catch (err) {
      console.error("[DBG][CreateBlogScreen] Video upload error:", err);
      Alert.alert(
        "Upload Error",
        err instanceof Error ? err.message : "Failed to upload video",
      );
      return null;
    }
  };

  const pollVideoStatus = async (videoId: string): Promise<boolean> => {
    if (!accessToken) return false;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/cloudflare/video-status/${videoId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const data = await response.json();
      if (data.success) {
        return data.data.readyToStream === true;
      }
      return false;
    } catch (err) {
      console.error("[DBG][CreateBlogScreen] Error polling video status:", err);
      return false;
    }
  };

  const waitForVideoProcessing = async (
    videoId: string,
    mediaIndex: number,
  ): Promise<boolean> => {
    const maxAttempts = 60; // 5 minutes max (5 sec intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      setMedia((prev) =>
        prev.map((m, idx) =>
          idx === mediaIndex ? { ...m, videoStatus: "processing" } : m,
        ),
      );

      const isReady = await pollVideoStatus(videoId);
      if (isReady) {
        setMedia((prev) =>
          prev.map((m, idx) =>
            idx === mediaIndex ? { ...m, videoStatus: "ready" } : m,
          ),
        );
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }

    setMedia((prev) =>
      prev.map((m, idx) =>
        idx === mediaIndex ? { ...m, videoStatus: "error" } : m,
      ),
    );
    return false;
  };

  const handlePublish = async (status: "draft" | "published") => {
    if (!content.trim() && media.length === 0) {
      Alert.alert("Error", "Please add some content or media");
      return;
    }

    if (!accessToken) {
      Alert.alert("Error", "Not authenticated");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload all media first
      const uploadedMedia: { type: "image" | "video"; url: string }[] = [];

      for (let i = 0; i < media.length; i++) {
        const item = media[i];
        setMedia((prev) =>
          prev.map((m, idx) => (idx === i ? { ...m, uploading: true } : m)),
        );

        let uploadedUrl: string | null = null;

        if (item.type === "video") {
          // Upload video to Cloudflare Stream
          setMedia((prev) =>
            prev.map((m, idx) =>
              idx === i ? { ...m, videoStatus: "uploading" } : m,
            ),
          );

          uploadedUrl = await uploadVideo(item);

          if (uploadedUrl) {
            // Wait for video to be processed (poll in background)
            // For now, we'll just store the video ID - the web app will handle display
            console.log(
              "[DBG][CreateBlogScreen] Video uploaded with ID:",
              uploadedUrl,
            );
          }
        } else {
          // Upload image to Cloudflare Images
          uploadedUrl = await uploadImage(item);
        }

        if (uploadedUrl) {
          uploadedMedia.push({
            type: item.type,
            url: uploadedUrl,
          });

          setMedia((prev) =>
            prev.map((m, idx) =>
              idx === i
                ? {
                    ...m,
                    uploading: false,
                    uploadedUrl,
                    videoStatus:
                      item.type === "video" ? "processing" : undefined,
                  }
                : m,
            ),
          );
        } else {
          setMedia((prev) =>
            prev.map((m, idx) =>
              idx === i
                ? {
                    ...m,
                    uploading: false,
                    videoStatus: item.type === "video" ? "error" : undefined,
                  }
                : m,
            ),
          );
        }
      }

      // Create post with new format
      const response = await fetch(`${API_BASE_URL}/data/app/expert/me/blog`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          content: content.trim(),
          media: uploadedMedia,
          status,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          "Success",
          status === "published"
            ? "Post published! Videos may take a moment to process."
            : "Draft saved!",
          [{ text: "OK", onPress: () => navigation.goBack() }],
        );
      } else {
        Alert.alert("Error", data.error || "Failed to create post");
      }
    } catch (err) {
      console.error("[DBG][CreateBlogScreen] Error:", err);
      Alert.alert("Error", "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContentChange = (text: string) => {
    if (text.length <= MAX_CONTENT_LENGTH) {
      setContent(text);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity
          style={[
            styles.publishButton,
            isSubmitting && styles.publishButtonDisabled,
          ]}
          onPress={() => handlePublish("published")}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.publishButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView style={styles.scrollView}>
          {/* Media Section - Prominent at Top */}
          <View style={styles.mediaSection}>
            {media.length === 0 ? (
              // Empty state - large tappable area
              <TouchableOpacity
                style={styles.mediaPlaceholder}
                onPress={pickFromGallery}
                activeOpacity={0.8}
              >
                <View style={styles.mediaPlaceholderContent}>
                  <GalleryIcon size={48} />
                  <Text style={styles.mediaPlaceholderTitle}>
                    Add Photos or Videos
                  </Text>
                  <Text style={styles.mediaPlaceholderSubtitle}>
                    Tap to select from gallery
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              // Media preview grid
              <ScrollView
                horizontal
                style={styles.mediaScroll}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mediaScrollContent}
              >
                {media.map((item, index) => (
                  <View key={index} style={styles.mediaItem}>
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.mediaImage}
                    />
                    {item.uploading && (
                      <View style={styles.mediaOverlay}>
                        <ActivityIndicator color={colors.white} />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeMediaButton}
                      onPress={() => removeMedia(index)}
                    >
                      <CloseIcon size={16} />
                    </TouchableOpacity>
                    {item.type === "video" && (
                      <View
                        style={[
                          styles.videoIndicator,
                          item.videoStatus === "processing" &&
                            styles.videoIndicatorProcessing,
                          item.videoStatus === "error" &&
                            styles.videoIndicatorError,
                        ]}
                      >
                        <Text style={styles.videoIndicatorText}>
                          {item.videoStatus === "uploading"
                            ? "Uploading..."
                            : item.videoStatus === "processing"
                              ? "Processing..."
                              : item.videoStatus === "error"
                                ? "Error"
                                : "Video"}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
                {/* Add more button */}
                {media.length < MAX_MEDIA_ITEMS && (
                  <TouchableOpacity
                    style={styles.addMoreButton}
                    onPress={pickFromGallery}
                  >
                    <GalleryIcon size={32} />
                    <Text style={styles.addMoreText}>Add</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}

            {/* Quick action buttons */}
            <View style={styles.mediaActionsRow}>
              <TouchableOpacity
                style={styles.quickMediaButton}
                onPress={takePhoto}
              >
                <CameraIcon size={20} />
                <Text style={styles.quickMediaButtonText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickMediaButton}
                onPress={pickFromGallery}
              >
                <GalleryIcon size={20} />
                <Text style={styles.quickMediaButtonText}>Gallery</Text>
              </TouchableOpacity>
              <Text style={styles.mediaCount}>
                {media.length}/{MAX_MEDIA_ITEMS}
              </Text>
            </View>
          </View>

          {/* Content Input - Below Media */}
          <View style={styles.contentContainer}>
            <TextInput
              style={styles.contentInput}
              placeholder="Write a caption..."
              placeholderTextColor={colors.textMuted}
              value={content}
              onChangeText={handleContentChange}
              multiline
              textAlignVertical="top"
            />
            <Text
              style={[
                styles.charCounter,
                remainingChars < 50 && styles.charCounterWarning,
              ]}
            >
              {remainingChars}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.draftButton}
          onPress={() => handlePublish("draft")}
          disabled={isSubmitting}
        >
          <Text style={styles.draftButtonText}>Save as Draft</Text>
        </TouchableOpacity>
      </View>
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
  publishButton: {
    backgroundColor: colors.primaryHover,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 70,
    alignItems: "center",
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  // Media section styles
  mediaSection: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mediaPlaceholder: {
    aspectRatio: 1.2,
    backgroundColor: colors.bgMain,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mediaPlaceholderContent: {
    alignItems: "center",
  },
  mediaPlaceholderTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginTop: spacing.md,
  },
  mediaPlaceholderSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  mediaScroll: {
    backgroundColor: colors.surface,
  },
  mediaScrollContent: {
    padding: spacing.md,
  },
  mediaItem: {
    width: 120,
    height: 120,
    marginRight: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: "hidden",
    position: "relative",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  removeMediaButton: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 14,
    padding: 6,
  },
  videoIndicator: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  videoIndicatorProcessing: {
    backgroundColor: "#EAB308",
  },
  videoIndicatorError: {
    backgroundColor: "#EF4444",
  },
  videoIndicatorText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  addMoreButton: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bgMain,
  },
  addMoreText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: spacing.xs,
    fontWeight: fontWeight.medium,
  },
  mediaActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quickMediaButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: spacing.lg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  quickMediaButtonText: {
    marginLeft: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  mediaCount: {
    marginLeft: "auto",
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  // Content input styles
  contentContainer: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  contentInput: {
    fontSize: fontSize.md,
    color: colors.textBody,
    minHeight: 100,
    lineHeight: 24,
  },
  charCounter: {
    textAlign: "right",
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  charCounterWarning: {
    color: "#EAB308",
  },
  // Bottom actions
  bottomActions: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  draftButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  draftButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
});
