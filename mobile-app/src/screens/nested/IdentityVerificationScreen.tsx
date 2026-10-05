import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getVerificationsByUser, submitVerification } from "../../services/api";

interface Props {
  onBack: () => void;
  userId?: number;
  onVerified?: () => void;
}

const accountTypes = ["STUDENT", "WORKER", "LANDLORD"] as const;

export default function IdentityVerificationScreen({
  onBack,
  userId = 1,
  onVerified,
}: Props) {
  const [accountType, setAccountType] =
    useState<(typeof accountTypes)[number]>("STUDENT");
  const [frontUrl, setFrontUrl] = useState("");
  const [backUrl, setBackUrl] = useState("");
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    const response = await getVerificationsByUser(userId);
    setRequest(response.data?.[0] || null);
  };

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const submit = async () => {
    if (!frontUrl.trim()) {
      Alert.alert("Thiếu giấy tờ", "Vui lòng cung cấp liên kết ảnh mặt trước.");
      return;
    }
    setSubmitting(true);
    try {
      await submitVerification({
        user_id: userId,
        account_type: accountType,
        front_card_url: frontUrl.trim(),
        back_card_url: backUrl.trim() || null,
      });
      await refresh();
      Alert.alert(
        "Đã gửi yêu cầu",
        "Hồ sơ KYC đang chờ quản trị viên xét duyệt.",
      );
    } catch (error: any) {
      Alert.alert(
        "Không gửi được",
        error?.response?.data?.message ||
          "Kiểm tra liên kết giấy tờ và thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel =
    request?.status === "APPROVED"
      ? "Đã xác minh"
      : request?.status === "REJECTED"
        ? "Cần gửi lại hồ sơ"
        : request?.status === "PENDING"
          ? "Đang chờ xét duyệt"
          : "Chưa gửi hồ sơ";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Xác minh tài khoản</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color="#00685f" />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.status}>
            <Text style={styles.statusLabel}>TRẠNG THÁI</Text>
            <Text style={styles.statusValue}>{statusLabel}</Text>
            {request?.reviewer_note ? (
              <Text style={styles.note}>{request.reviewer_note}</Text>
            ) : null}
          </View>
          {request?.status !== "PENDING" && request?.status !== "APPROVED" && (
            <>
              <Text style={styles.section}>LOẠI TÀI KHOẢN</Text>
              <View style={styles.types}>
                {accountTypes.map((item) => (
                  <TouchableOpacity
                    key={item}
                    onPress={() => setAccountType(item)}
                    style={[
                      styles.type,
                      accountType === item && styles.typeSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        accountType === item && styles.typeTextSelected,
                      ]}
                    >
                      {item === "STUDENT"
                        ? "Sinh viên"
                        : item === "WORKER"
                          ? "Người đi làm"
                          : "Chủ trọ"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.section}>GIẤY TỜ XÁC MINH</Text>
              <TextInput
                value={frontUrl}
                onChangeText={setFrontUrl}
                autoCapitalize="none"
                placeholder="Liên kết ảnh mặt trước (bắt buộc)"
                style={styles.input}
              />
              <TextInput
                value={backUrl}
                onChangeText={setBackUrl}
                autoCapitalize="none"
                placeholder="Liên kết ảnh mặt sau (nếu có)"
                style={styles.input}
              />
              <TouchableOpacity
                disabled={submitting}
                onPress={submit}
                style={styles.button}
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Gửi hồ sơ xác minh</Text>
                )}
              </TouchableOpacity>
            </>
          )}
          <Text style={styles.note}>
            Hình ảnh cần được lưu trên dịch vụ lưu trữ riêng tư đã cấu hình cho
            dự án. Không dùng liên kết công khai chứa giấy tờ cá nhân.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  back: { color: "#00685f", fontWeight: "600" },
  heading: { fontSize: 18, fontWeight: "700", marginTop: 10, color: "#1E293B" },
  content: { padding: 20 },
  status: {
    padding: 16,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
  },
  statusLabel: { color: "#64748B", fontSize: 11, fontWeight: "700" },
  statusValue: {
    marginTop: 6,
    color: "#00685f",
    fontSize: 18,
    fontWeight: "700",
  },
  section: {
    marginTop: 22,
    marginBottom: 8,
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  types: { flexDirection: "row", gap: 8 },
  type: {
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
  },
  typeSelected: { borderColor: "#00685f", backgroundColor: "#E6F5F1" },
  typeText: { color: "#475569", fontSize: 12, fontWeight: "600" },
  typeTextSelected: { color: "#00685f" },
  input: {
    marginTop: 8,
    padding: 13,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
  },
  button: {
    minHeight: 48,
    marginTop: 16,
    backgroundColor: "#00685f",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "white", fontWeight: "700" },
  note: { marginTop: 14, color: "#64748B", fontSize: 12, lineHeight: 18 },
});
