// src/screens/main/MyActivityScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { getPostsByUserId } from "../../services/api";
import { MOCK_APPOINTMENTS } from "../../types/mockData";

interface Props {
  onOpenManageAppointments: () => void;
  userId?: number; // Nhận userId từ AuthContext/Props (Mặc định = 1)
}

export default function MyActivityScreen({
  onOpenManageAppointments,
  userId = 1, // Tạm thời xài id: 1 làm mẫu
}: Props) {
  const [activeTopTab, setActiveTopTab] = useState<"MY_POSTS" | "SAVED">(
    "MY_POSTS"
  );
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const pendingCount = MOCK_APPOINTMENTS.filter(
    (a) => a.status === "PENDING"
  ).length;

  // Hàm gọi API lấy bài đăng của người dùng
  const fetchMyPosts = async () => {
    try {
      setLoading(true);
      const res = await getPostsByUserId(userId);
      if (res.success) {
        setMyPosts(res.data);
      }
    } catch (error) {
      console.error("Lỗi tải bài đăng của tôi:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTopTab === "MY_POSTS") {
      fetchMyPosts();
    }
  }, [userId, activeTopTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyPosts();
  };

  const renderPostItem = ({ item }: { item: any }) => (
    <View style={styles.postCard}>
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postPrice}>
        Giá: {Number(item.price).toLocaleString("vi-VN")} đ/tháng
      </Text>
      <Text style={styles.postStatus}>
        Trạng thái:{" "}
        <Text style={{ color: "#6B8FA3", fontWeight: "bold" }}>
          {item.status === "AVAILABLE" ? "Đang hiển thị" : item.status}
        </Text>
      </Text>

      {/* Lối vào Lịch Hẹn Xem Phòng */}
      <TouchableOpacity
        style={styles.appointmentBtn}
        onPress={onOpenManageAppointments}
      >
        <View style={styles.btnRow}>
          <Text style={styles.btnText}>📅 Lịch hẹn xem phòng</Text>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
        <Text style={{ color: "#6B7280" }}>›</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Tab Bar */}
      <View style={styles.topTabBar}>
        <TouchableOpacity
          style={[
            styles.topTab,
            activeTopTab === "MY_POSTS" && styles.activeTopTab,
          ]}
          onPress={() => setActiveTopTab("MY_POSTS")}
        >
          <Text
            style={[
              styles.topTabText,
              activeTopTab === "MY_POSTS" && styles.activeTopTabText,
            ]}
          >
            Bài đăng của tôi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.topTab,
            activeTopTab === "SAVED" && styles.activeTopTab,
          ]}
          onPress={() => setActiveTopTab("SAVED")}
        >
          <Text
            style={[
              styles.topTabText,
              activeTopTab === "SAVED" && styles.activeTopTabText,
            ]}
          >
            Đã lưu
          </Text>
        </TouchableOpacity>
      </View>

      {/* Nội dung Tab */}
      {activeTopTab === "MY_POSTS" ? (
        loading && !refreshing ? (
          <ActivityIndicator size="large" color="#6B8FA3" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={myPosts}
            keyExtractor={(item) => item.post_id.toString()}
            renderItem={renderPostItem}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={{ color: "#9CA3AF" }}>Bạn chưa có bài đăng nào</Text>
              </View>
            }
          />
        )
      ) : (
        <View style={styles.center}>
          <Text style={{ color: "#9CA3AF" }}>Chưa có bài viết nào được lưu</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  topTabBar: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  topTab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  activeTopTab: { borderBottomWidth: 2, borderColor: "#6B8FA3" },
  topTabText: { fontSize: 14, color: "#6B7280" },
  activeTopTabText: { color: "#6B8FA3", fontWeight: "bold" },
  content: { padding: 14 },
  postCard: {
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  postTitle: { fontSize: 15, fontWeight: "bold", color: "#1F2937" },
  postPrice: { fontSize: 13, color: "#D97706", fontWeight: "600", marginTop: 4 },
  postStatus: { fontSize: 12, color: "#4B5563", marginVertical: 6 },
  appointmentBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#EAF5F1",
    padding: 12,
    borderRadius: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#D6E3E8",
  },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: { fontWeight: "bold", color: "#205F55", fontSize: 13 },
  badge: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 40 },
});