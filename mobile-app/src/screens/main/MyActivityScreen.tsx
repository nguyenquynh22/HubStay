import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getPostsByUserId,
  getSavedPosts,
  setPostVisibility,
  toggleSavedPost,
  updatePost,
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
  const [error, setError] = useState("");
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [workingPostId, setWorkingPostId] = useState<number | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const [mine, bookmarks] = await Promise.allSettled([
          getPostsByUserId(userId, sort),
          getSavedPosts(userId),
        ]);
        if (mine.status === "fulfilled") setPosts(mine.value.data || []);
        else throw mine.reason;
        if (bookmarks.status === "fulfilled")
          setSaved(bookmarks.value.data || []);
      } catch (loadError: any) {
        setError(
          loadError?.response?.data?.message ||
            "Không tải được bài đăng của bạn. Vui lòng thử lại.",
        );
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

  const beginEdit = (post: any) => {
    setEditingPost(post);
    setEditTitle(String(post.title || ""));
    setEditDescription(String(post.description || ""));
    setEditPrice(String(post.price ?? ""));
  };

  const saveEdit = async () => {
    const title = editTitle.trim();
    const description = editDescription.trim();
    const price = Number(editPrice.replace(/[^0-9]/g, ""));
    if (
      !title ||
      title.length > 200 ||
      !description ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      Alert.alert(
        "Thông tin chưa hợp lệ",
        "Cần nhập tiêu đề (tối đa 200 ký tự), mô tả và giá lớn hơn 0.",
      );
      return;
    }
    const postId = Number(editingPost?.post_id);
    setWorkingPostId(postId);
    try {
      await updatePost(postId, { title, description, price });
      setPosts((current) =>
        current.map((post) =>
          Number(post.post_id) === postId
            ? { ...post, title, description, price }
            : post,
        ),
      );
      setEditingPost(null);
      Alert.alert("Đã cập nhật", "Thông tin bài đăng đã được lưu.");
    } catch (saveError: any) {
      Alert.alert(
        "Không sửa được bài đăng",
        saveError?.response?.data?.message || "Vui lòng thử lại.",
      );
    } finally {
      setWorkingPostId(null);
    }
  };

  const changeVisibility = (post: any) => {
    const postId = Number(post.post_id);
    const nextStatus = post.status === "HIDDEN" ? "AVAILABLE" : "HIDDEN";
    const showPost = nextStatus === "AVAILABLE";
    Alert.alert(
      showPost ? "Hiện bài đăng?" : "Ẩn bài đăng?",
      showPost
        ? "Bài đăng sẽ xuất hiện lại trong tìm kiếm và khám phá."
        : "Bài đăng sẽ tạm thời không xuất hiện với người dùng khác.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: showPost ? "Hiện bài" : "Ẩn bài",
          style: showPost ? "default" : "destructive",
          onPress: async () => {
            setWorkingPostId(postId);
            try {
              await setPostVisibility(postId, nextStatus);
              setPosts((current) =>
                current.map((item) =>
                  Number(item.post_id) === postId
                    ? { ...item, status: nextStatus }
                    : item,
                ),
              );
            } catch (visibilityError: any) {
              Alert.alert(
                "Không đổi được trạng thái",
                visibilityError?.response?.data?.message || "Vui lòng thử lại.",
              );
            } finally {
              setWorkingPostId(null);
            }
          },
        },
      ],
    );
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
        <>
          {!!error && <Text style={styles.error}>{error}</Text>}
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
                {error ||
                  (tab === "MY_POSTS"
                    ? "Bạn chưa có bài đăng nào"
                    : "Chưa có bài đăng nào được lưu vào yêu thích")}
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <TouchableOpacity
                    style={styles.cardCopy}
                    onPress={() => onSelectPost(item)}
                    disabled={item.status !== "AVAILABLE"}
                    accessibilityRole="button"
                    accessibilityLabel={
                      item.status === "AVAILABLE"
                        ? `Mở bài đăng ${item.title}`
                        : `Bài đăng ${item.title} hiện không hiển thị công khai`
                    }
                    accessibilityState={{
                      disabled: item.status !== "AVAILABLE",
                    }}
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
                    <Text style={styles.status}>
                      Trạng thái:{" "}
                      {item.status === "AVAILABLE"
                        ? "Đang hiển thị"
                        : item.status === "HIDDEN"
                          ? "Đã ẩn"
                          : item.status === "RENTED"
                            ? "Đã cho thuê"
                            : item.status}
                    </Text>
                  </TouchableOpacity>
                  {tab === "MY_POSTS" ? (
                    <View style={styles.postActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => beginEdit(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`Sửa nhanh bài đăng ${item.title}`}
                        disabled={workingPostId === Number(item.post_id)}
                      >
                        <MaterialIcons name="edit" size={21} color="#00685f" />
                      </TouchableOpacity>
                      {item.status === "RENTED" ? (
                        <View style={styles.actionButton}>
                          <MaterialIcons
                            name="lock"
                            size={21}
                            color="#94A3B8"
                          />
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => changeVisibility(item)}
                          accessibilityRole="button"
                          accessibilityLabel={
                            item.status === "HIDDEN"
                              ? "Hiện bài đăng"
                              : "Ẩn bài đăng"
                          }
                          disabled={workingPostId === Number(item.post_id)}
                        >
                          {workingPostId === Number(item.post_id) ? (
                            <ActivityIndicator size="small" color="#00685f" />
                          ) : (
                            <MaterialIcons
                              name={
                                item.status === "HIDDEN"
                                  ? "visibility"
                                  : "visibility-off"
                              }
                              size={22}
                              color="#00685f"
                            />
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
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
        </>
      )}
      <Modal
        visible={!!editingPost}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingPost(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.editModal}>
            <Text style={styles.modalTitle}>Sửa nhanh bài đăng</Text>
            <Text style={styles.inputLabel}>TIÊU ĐỀ</Text>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              maxLength={200}
              style={styles.editInput}
              placeholder="Tiêu đề bài đăng"
            />
            <Text style={styles.inputLabel}>MÔ TẢ</Text>
            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              textAlignVertical="top"
              style={[styles.editInput, styles.descriptionInput]}
              placeholder="Mô tả bài đăng"
            />
            <Text style={styles.inputLabel}>GIÁ (VNĐ)</Text>
            <TextInput
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="numeric"
              style={styles.editInput}
              placeholder="Giá bài đăng"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditingPost(null)}
                disabled={workingPostId !== null}
              >
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveEdit}
                disabled={workingPostId === Number(editingPost?.post_id)}
              >
                {workingPostId === Number(editingPost?.post_id) ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  postActions: { marginLeft: 6, gap: 4 },
  actionButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
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
  error: { color: "#B91C1C", paddingHorizontal: 16, paddingVertical: 8 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  editModal: { padding: 18, backgroundColor: "white", borderRadius: 10 },
  modalTitle: {
    color: "#1E293B",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  inputLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 5,
  },
  editInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 7,
    paddingHorizontal: 11,
    color: "#1E293B",
  },
  descriptionInput: { minHeight: 96, paddingTop: 10 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    minWidth: 76,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: "#475569", fontWeight: "600" },
  saveButton: {
    minWidth: 76,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00685f",
    borderRadius: 7,
  },
  saveText: { color: "white", fontWeight: "700" },
  empty: { textAlign: "center", color: "#94A3B8", padding: 24 },
});
