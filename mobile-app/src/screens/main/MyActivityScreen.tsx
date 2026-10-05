import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getPostsByUserId,
  getSavedPosts,
  toggleSavedPost,
} from "../../services/api";

interface Props {
  onOpenManageAppointments: () => void;
  onSelectPost: (post: any) => void;
  userId: number;
  canManageAppointments: boolean;
}

export default function MyActivityScreen({
  onOpenManageAppointments,
  onSelectPost,
  userId,
  canManageAppointments,
}: Props) {
  const [tab, setTab] = useState<"MY_POSTS" | "SAVED">("MY_POSTS");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [posts, setPosts] = useState<any[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingPostId, setSavingPostId] = useState<number | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const [mine, bookmarks] = await Promise.all([
          getPostsByUserId(userId, sort),
          getSavedPosts(userId),
        ]);
        setPosts(mine.data || []);
        setSaved(bookmarks.data || []);
      } catch (error) {
        console.error("Không tải được hoạt động", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [sort, userId],
  );

  useEffect(() => {
    load();
  }, [load]);
  const rows = tab === "MY_POSTS" ? posts : saved;

  const removeSavedPost = async (postId: number) => {
    setSavingPostId(postId);
    try {
      const result = await toggleSavedPost(userId, postId);
      if (!result.data?.saved) {
        setSaved((current) =>
          current.filter((post) => Number(post.post_id) !== postId),
        );
      }
    } catch (error) {
      console.error("Không thể bỏ lưu bài đăng", error);
    } finally {
      setSavingPostId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(
          [
            ["MY_POSTS", "Bài đăng của tôi"],
            ["SAVED", "Yêu thích"],
          ] as const
        ).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.active]}
          >
            <Text style={[styles.tabText, tab === key && styles.activeText]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === "MY_POSTS" && (
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Thời gian đăng</Text>
          <TouchableOpacity
            onPress={() =>
              setSort((current) => (current === "newest" ? "oldest" : "newest"))
            }
            style={styles.sortButton}
          >
            <Text style={styles.sortButtonText}>
              {sort === "newest" ? "Mới nhất ↓" : "Cũ nhất ↑"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {canManageAppointments && (
        <TouchableOpacity
          onPress={onOpenManageAppointments}
          style={styles.appointments}
        >
          <Text style={styles.appointmentText}>Lịch hẹn xem phòng ›</Text>
        </TouchableOpacity>
      )}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color="#00685f" />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.post_id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === "MY_POSTS"
                ? "Bạn chưa có bài đăng nào"
                : "Chưa có bài đăng nào được lưu vào yêu thích"}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <TouchableOpacity
                  style={styles.cardCopy}
                  onPress={() => onSelectPost(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Mở bài đăng ${item.title}`}
                >
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.price}>
                    {Number(item.price).toLocaleString("vi-VN")} đ/tháng
                  </Text>
                  <Text style={styles.address}>
                    {item.address || item.address_detail}
                  </Text>
                  <Text style={styles.date}>
                    Đăng ngày:{" "}
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString("vi-VN")
                      : "—"}
                  </Text>
                  <Text style={styles.status}>Trạng thái: {item.status}</Text>
                </TouchableOpacity>
                {tab === "SAVED" && (
                  <TouchableOpacity
                    style={styles.removeSaved}
                    onPress={() => removeSavedPost(Number(item.post_id))}
                    disabled={savingPostId === Number(item.post_id)}
                    accessibilityRole="button"
                    accessibilityLabel="Bỏ lưu bài đăng"
                  >
                    {savingPostId === Number(item.post_id) ? (
                      <ActivityIndicator size="small" color="#00685f" />
                    ) : (
                      <MaterialIcons
                        name="bookmark"
                        size={22}
                        color="#00685f"
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  tabs: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  tab: { flex: 1, padding: 14, alignItems: "center" },
  active: { borderBottomWidth: 2, borderColor: "#00685f" },
  tabText: { color: "#64748B" },
  activeText: { color: "#00685f", fontWeight: "700" },
  sortRow: {
    marginHorizontal: 12,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sortLabel: { color: "#64748B", fontSize: 13 },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#E8F0F3",
  },
  sortButtonText: { color: "#00685f", fontSize: 12, fontWeight: "700" },
  appointments: {
    margin: 12,
    padding: 13,
    backgroundColor: "#E8F0F3",
    borderRadius: 9,
  },
  appointmentText: { color: "#405D6B", fontWeight: "700" },
  list: { padding: 12, flexGrow: 1 },
  card: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start" },
  cardCopy: { flex: 1 },
  removeSaved: {
    minWidth: 40,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  price: { color: "#00685f", fontWeight: "700", marginTop: 5 },
  address: { color: "#64748B", marginTop: 4 },
  date: { color: "#64748B", fontSize: 12, marginTop: 6 },
  status: { color: "#64748B", fontSize: 12, marginTop: 5 },
  empty: { textAlign: "center", color: "#94A3B8", padding: 24 },
});
