import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getRentalRequests,
  markPostRented,
  updateRentalRequest,
} from "../../services/api";

interface RentalRequest {
  request_id: number;
  post_id: number;
  tenant_id: number;
  tenant_name: string | null;
  tenant_phone: string | null;
  post_title: string;
  post_status: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  note: string | null;
  is_landlord: number;
  created_at: string;
}

interface Props {
  onBack?: () => void;
  userId: number;
}

const statusLabel: Record<RentalRequest["status"], string> = {
  PENDING: "Đang chờ",
  ACCEPTED: "Đã chấp nhận",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
};

export default function RentalRequestsScreen({ onBack, userId }: Props) {
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const response = await getRentalRequests(userId);
    setRequests(response.data || []);
  }, [userId]);

  useEffect(() => {
    refresh()
      .catch((error) =>
        Alert.alert(
          "Không tải được yêu cầu",
          error?.response?.data?.message || "Kiểm tra kết nối API.",
        ),
      )
      .finally(() => setLoading(false));
  }, [refresh]);

  const update = async (
    item: RentalRequest,
    status: "ACCEPTED" | "REJECTED" | "CANCELLED",
  ) => {
    setBusyId(item.request_id);
    try {
      await updateRentalRequest(item.request_id, userId, status);
      await refresh();
    } catch (error: any) {
      Alert.alert(
        "Không cập nhật được",
        error?.response?.data?.message || "Vui lòng thử lại.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const rentOut = async (postId: number) => {
    setBusyId(postId);
    try {
      await markPostRented(postId, userId);
      await refresh();
      Alert.alert(
        "Đã chốt trọ",
        "Bài đăng đã chuyển sang trạng thái đã cho thuê và các cuộc trò chuyện đã được khóa.",
      );
    } catch (error: any) {
      Alert.alert(
        "Không cập nhật được",
        error?.response?.data?.message || "Vui lòng thử lại.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Yêu cầu thuê</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color="#00685f" />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {requests.length === 0 ? (
            <Text style={styles.empty}>Chưa có yêu cầu thuê</Text>
          ) : (
            requests.map((item) => {
              const landlord = Number(item.is_landlord) === 1;
              return (
                <View key={item.request_id} style={styles.item}>
                  <View style={styles.row}>
                    <Text style={styles.title}>{item.post_title}</Text>
                    <Text
                      style={[
                        styles.status,
                        item.status === "PENDING" && styles.pending,
                      ]}
                    >
                      {statusLabel[item.status]}
                    </Text>
                  </View>
                  <Text style={styles.meta}>
                    {landlord
                      ? `Người thuê: ${item.tenant_name || "Người dùng"}`
                      : "Chủ trọ đang xem xét yêu cầu của bạn"}
                  </Text>
                  {landlord && item.tenant_phone ? (
                    <Text style={styles.meta}>
                      Điện thoại: {item.tenant_phone}
                    </Text>
                  ) : null}
                  {item.note ? (
                    <Text style={styles.meta}>Ghi chú: {item.note}</Text>
                  ) : null}
                  <Text style={styles.date}>
                    {new Date(item.created_at).toLocaleDateString("vi-VN")}
                  </Text>
                  {item.status === "PENDING" && (
                    <View style={styles.actions}>
                      {landlord ? (
                        <>
                          <TouchableOpacity
                            disabled={busyId === item.request_id}
                            onPress={() => update(item, "REJECTED")}
                            style={styles.secondary}
                          >
                            <Text style={styles.secondaryText}>Từ chối</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            disabled={busyId === item.request_id}
                            onPress={() => update(item, "ACCEPTED")}
                            style={styles.primary}
                          >
                            <Text style={styles.primaryText}>
                              Chấp nhận thuê
                            </Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          disabled={busyId === item.request_id}
                          onPress={() => update(item, "CANCELLED")}
                          style={styles.secondary}
                        >
                          <Text style={styles.secondaryText}>Hủy yêu cầu</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  {landlord && item.post_status === "AVAILABLE" && (
                    <TouchableOpacity
                      disabled={busyId === item.post_id}
                      onPress={() => rentOut(item.post_id)}
                      style={styles.rentOut}
                    >
                      <Text style={styles.primaryText}>
                        Xác nhận đã cho thuê
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  back: { color: "#00685f", fontWeight: "600" },
  heading: { fontSize: 18, fontWeight: "700", marginTop: 10, color: "#1E293B" },
  content: { padding: 16 },
  item: {
    padding: 15,
    marginBottom: 10,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  title: { flex: 1, color: "#1E293B", fontWeight: "700", fontSize: 14 },
  status: { color: "#475569", fontSize: 11, fontWeight: "700" },
  pending: { color: "#B45309" },
  meta: { marginTop: 7, color: "#475569", fontSize: 12, lineHeight: 18 },
  date: { marginTop: 8, color: "#94A3B8", fontSize: 11 },
  actions: { flexDirection: "row", gap: 8, marginTop: 14 },
  primary: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00685f",
    borderRadius: 7,
  },
  primaryText: { color: "white", fontSize: 12, fontWeight: "700" },
  secondary: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 7,
  },
  secondaryText: { color: "#475569", fontSize: 12, fontWeight: "700" },
  rentOut: {
    minHeight: 42,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9B302A",
    borderRadius: 7,
  },
  empty: { textAlign: "center", color: "#64748B", marginTop: 30 },
});
