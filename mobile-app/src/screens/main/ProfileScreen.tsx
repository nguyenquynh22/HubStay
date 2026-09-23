// src/screens/main/ProfileScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { getUserById } from "../../services/api";

interface Props {
  onVerifyPress?: () => void;
  onOpenTransactionHistory?: () => void;
  onOpenPaymentSimulation?: () => void;
  userId?: number;
}

export default function ProfileScreen({
  onVerifyPress,
  onOpenTransactionHistory,
  onOpenPaymentSimulation,
  userId = 1,
}: Props) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const res = await getUserById(userId);
      if (res.success && res.data) {
        setUser(res.data);
      }
    } catch (error) {
      console.error("Lỗi tải thông tin cá nhân:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserProfile();
  };

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: () => console.log("Logged out"),
      },
    ]);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B8FA3" />
      </View>
    );
  }

  const isVerified = user?.is_verified === 1;
  const avatarUri =
    user?.avatar_url ||
    "https://via.placeholder.com/150/00B14F/ffffff?text=User";

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.profileHeader}>
        <Image source={{ uri: avatarUri }} style={styles.avatar} />
        <Text style={styles.userName}>{user?.full_name || "Người dùng"}</Text>
        <Text style={styles.userRole}>{user?.role || "STUDENT"}</Text>
        <Text style={styles.userEmail}>{user?.email || ""}</Text>

        <View style={styles.badgeContainer}>
          {isVerified ? (
            <View style={[styles.badge, styles.verifiedBadge]}>
              <Text style={styles.verifiedBadgeText}>
                ✓ Tài khoản đã xác thực Uy tín
              </Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.unverifiedBadge]}>
              <Text style={styles.unverifiedBadgeText}>
                ⚠️ Chưa xác thực Danh tính
              </Text>
            </View>
          )}
        </View>
      </View>

      {!isVerified && (
        <TouchableOpacity style={styles.verifyBanner} onPress={onVerifyPress}>
          <View style={styles.verifyBannerContent}>
            <Text style={styles.verifyBannerTitle}>
              🛡️ Xác thực tài khoản ngay
            </Text>
            <Text style={styles.verifyBannerSub}>
              Tải lên CCCD/Thẻ Sinh viên để nhận Badge Tích Xanh & ưu tiên hiển
              thị bài đăng.
            </Text>
          </View>
          <Text style={styles.verifyArrow}>›</Text>
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tài khoản & Bảo mật</Text>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>👤 Cập nhật thông tin cá nhân</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={onVerifyPress}>
          <Text style={styles.menuText}>🪪 Yêu cầu xác thực (CCCD/Thẻ SV)</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={onOpenTransactionHistory}>
          <Text style={styles.menuText}>💳 Lịch sử giao dịch</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={onOpenPaymentSimulation}>
          <Text style={styles.menuText}>🧾 Mô phỏng thanh toán</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>🔒 Đổi mật khẩu</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ứng dụng & Hỗ trợ</Text>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>🔔 Cài đặt thông báo</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>🎧 Trung tâm trợ giúp & Báo lỗi</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>📄 Điều khoản & Chính sách bảo mật</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Phiên bản HubStay v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  profileHeader: {
    backgroundColor: "#FFF",
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
  userName: { fontSize: 18, fontWeight: "bold", color: "#1F2937" },
  userRole: {
    fontSize: 13,
    color: "#6B8FA3",
    fontWeight: "bold",
    marginTop: 2,
  },
  userEmail: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  badgeContainer: { marginTop: 10 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  verifiedBadge: { backgroundColor: "#DCFCE7" },
  verifiedBadgeText: { color: "#16A34A", fontSize: 12, fontWeight: "bold" },
  unverifiedBadge: { backgroundColor: "#FEF3C7" },
  unverifiedBadgeText: { color: "#B45309", fontSize: 12, fontWeight: "bold" },
  verifyBanner: {
    margin: 14,
    backgroundColor: "#E8F0F3",
    borderRadius: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D6E3E8",
  },
  verifyBannerContent: { flex: 1 },
  verifyBannerTitle: { fontWeight: "bold", color: "#405D6B", fontSize: 14 },
  verifyBannerSub: { fontSize: 12, color: "#547A8A", marginTop: 4 },
  verifyArrow: {
    fontSize: 22,
    color: "#547A8A",
    fontWeight: "bold",
    marginLeft: 8,
  },
  section: {
    backgroundColor: "#FFF",
    marginTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 6,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuText: { fontSize: 14, color: "#374151" },
  menuArrow: { fontSize: 16, color: "#9CA3AF" },
  logoutBtn: {
    margin: 16,
    backgroundColor: "#FEE2E2",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  logoutText: { color: "#DC2626", fontWeight: "bold", fontSize: 14 },
  versionText: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 11,
    marginBottom: 30,
  },
});
