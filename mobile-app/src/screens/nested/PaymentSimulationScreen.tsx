import React, { useEffect, useState } from "react";
import QRCode from "react-native-qrcode-svg";
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
import {
  createTopUp,
  getUserById,
  getTransactionsByUser,
  simulateTopUpSuccess,
} from "../../services/api";

interface Props {
  onBack?: () => void;
  onOpenVip?: () => void;
  onOpenTransactionHistory?: () => void;
  userId: number;
}

const presets = [50000, 100000, 200000];
type PendingTopUp = {
  transaction_id: number;
  transaction_code: string;
  amount: number;
  mock_payment_enabled: boolean;
};

export default function PaymentSimulationScreen({
  onBack,
  onOpenVip,
  onOpenTransactionHistory,
  userId,
}: Props) {
  const [amount, setAmount] = useState("100000");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pendingTopUp, setPendingTopUp] = useState<PendingTopUp | null>(null);
  const [accountName, setAccountName] = useState("");
  const [accountRole, setAccountRole] = useState("");

  const refreshBalance = async () => {
    try {
      const [userResponse, transactionResponse] = await Promise.all([
        getUserById(userId),
        getTransactionsByUser(userId),
      ]);
      setBalance(Number(userResponse.data?.wallet_balance || 0));
      setAccountName(userResponse.data?.full_name || "Người dùng HubStay");
      setAccountRole(userResponse.data?.role || "");
      const pending = (transactionResponse.data || []).find(
        (item: any) =>
          item.transaction_type === "TOP_UP" &&
          item.payment_method === "MOCK_BANK" &&
          item.status === "PENDING",
      );
      setPendingTopUp(
        pending
          ? {
              transaction_id: Number(pending.transaction_id),
              transaction_code: pending.transaction_code,
              amount: Number(pending.amount),
              mock_payment_enabled:
                transactionResponse.mock_payment_enabled === true,
            }
          : null,
      );
    } catch (error) {
      console.error("Không tải được số dư ví:", error);
    }
  };

  useEffect(() => {
    refreshBalance();
  }, [userId]);

  const topUp = async () => {
    const value = Number(amount.replace(/[^0-9]/g, ""));
    if (!Number.isSafeInteger(value) || value < 10000) {
      Alert.alert("Số tiền chưa hợp lệ", "Số tiền nạp tối thiểu là 10.000 đ.");
      return;
    }
    setLoading(true);
    try {
      const created = await createTopUp(userId, value);
      setPendingTopUp({
        ...created.data,
        mock_payment_enabled: created.mock_payment_enabled === true,
      });
      Alert.alert(
        "Đã tạo giao dịch",
        "Giao dịch đang chờ xác nhận thanh toán.",
      );
    } catch (error: any) {
      Alert.alert(
        "Không nạp được",
        error?.response?.data?.message ||
          "Mô phỏng nạp tiền chỉ hoạt động ở môi trường phát triển.",
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmMockPayment = async () => {
    if (!pendingTopUp?.mock_payment_enabled) return;
    setLoading(true);
    try {
      await simulateTopUpSuccess(pendingTopUp.transaction_id);
      await refreshBalance();
      Alert.alert(
        "Bước 4 — Ví đã được cộng tiền",
        `${pendingTopUp.amount.toLocaleString("vi-VN")} đ đã được cộng vào ví demo. Đây không phải giao dịch ngân hàng thật.`,
        [
          { text: "Đóng", style: "cancel" },
          { text: "Xem lịch sử", onPress: onOpenTransactionHistory },
        ],
      );
      setPendingTopUp(null);
    } catch (error: any) {
      Alert.alert(
        "Chưa xác nhận được",
        error?.response?.data?.message || "Giao dịch vẫn đang chờ xử lý.",
      );
    } finally {
      setLoading(false);
    }
  };

  const demoAccountNumber = pendingTopUp
    ? `DEMO-${String(pendingTopUp.transaction_id).padStart(6, "0")}`
    : "";
  const demoQrPayload = pendingTopUp
    ? [
        "HUBSTAY DEMO ONLY - NOT A REAL PAYMENT",
        "Bank: HubStay Demo Bank",
        `Demo account: ${demoAccountNumber}`,
        `Account holder: ${accountName}`,
        `Amount: ${pendingTopUp.amount} VND`,
        `Transfer note: ${pendingTopUp.transaction_code}`,
      ].join("\n")
    : "";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Ví HubStay</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.balance}>
          <Text style={styles.label}>SỐ DƯ KHẢ DỤNG</Text>
          <Text style={styles.balanceValue}>
            {balance.toLocaleString("vi-VN")} đ
          </Text>
        </View>
        <Text style={styles.section}>NẠP TIỀN VÀO VÍ</Text>
        <Text style={styles.stepTitle}>Bước 1 — Nhập số tiền</Text>
        <Text style={styles.note}>
          Ví dụ: 50.000 đ, 100.000 đ, 200.000 đ hoặc nhập số tiền khác.
        </Text>
        <Text style={styles.note}>
          Chưa kết nối ngân hàng thật. Bản demo chỉ cộng tiền sau khi máy chủ
          bật mô phỏng thanh toán; chuyển khoản thật cần xác nhận từ webhook
          ngân hàng/cổng thanh toán.
        </Text>
        <View style={styles.presets}>
          {presets.map((value) => (
            <TouchableOpacity
              key={value}
              onPress={() => setAmount(String(value))}
              style={[
                styles.preset,
                Number(amount) === value && styles.presetSelected,
              ]}
            >
              <Text
                style={[
                  styles.presetText,
                  Number(amount) === value && styles.presetTextSelected,
                ]}
              >
                {value.toLocaleString("vi-VN")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          style={styles.input}
          placeholder="Số tiền khác (VNĐ)"
        />
        <TouchableOpacity
          disabled={loading || !!pendingTopUp}
          onPress={topUp}
          style={styles.button}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Tạo giao dịch nạp tiền</Text>
          )}
        </TouchableOpacity>
        {pendingTopUp && (
          <View style={styles.pendingBox}>
            <Text style={styles.pendingTitle}>Bước 2 — Hiện QR demo</Text>
            <Text style={styles.note}>
              {pendingTopUp.amount.toLocaleString("vi-VN")} đ · Mã:{" "}
              {pendingTopUp.transaction_code}
            </Text>
            <View style={styles.qrFrame}>
              <QRCode value={demoQrPayload} size={184} />
            </View>
            <Text style={styles.qrWarning}>
              QR MÔ PHỎNG — KHÔNG PHẢI THANH TOÁN THẬT
            </Text>
            <View style={styles.transferDetails}>
              <Text style={styles.detailLine}>
                Ngân hàng: HubStay Demo Bank
              </Text>
              <Text style={styles.detailLine}>
                Số tài khoản: {demoAccountNumber}
              </Text>
              <Text style={styles.detailLine}>
                Tên chủ tài khoản: {accountName}
              </Text>
              <Text style={styles.detailLine}>
                Số tiền: {pendingTopUp.amount.toLocaleString("vi-VN")} đ
              </Text>
              <Text style={styles.detailLine}>
                Nội dung: {pendingTopUp.transaction_code}
              </Text>
            </View>
            {pendingTopUp.mock_payment_enabled ? (
              <TouchableOpacity
                disabled={loading}
                onPress={confirmMockPayment}
                style={styles.button}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>
                    Bước 3 — Mô phỏng chuyển thành công
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.note}>
                Máy chủ chưa bật mô phỏng. Không nạp tiền thật vào giao dịch
                này.
              </Text>
            )}
          </View>
        )}
        {accountRole === "LANDLORD" && (
          <TouchableOpacity onPress={onOpenVip} style={styles.vipButton}>
            <Text style={styles.vipText}>Xem gói VIP chủ trọ</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
  balance: { padding: 22, backgroundColor: "#00685f", borderRadius: 12 },
  label: { color: "#C7F0E8", fontSize: 11, fontWeight: "700" },
  balanceValue: {
    color: "white",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 8,
  },
  section: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 24,
    marginBottom: 8,
  },
  note: { color: "#64748B", lineHeight: 20 },
  stepTitle: {
    marginTop: 14,
    marginBottom: 6,
    color: "#1E293B",
    fontWeight: "700",
  },
  presets: { flexDirection: "row", gap: 8, marginTop: 18 },
  preset: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
  },
  presetSelected: { borderColor: "#00685f", backgroundColor: "#E6F5F1" },
  presetText: { color: "#334155", fontWeight: "600", fontSize: 12 },
  presetTextSelected: { color: "#00685f" },
  input: {
    marginTop: 12,
    padding: 14,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    fontSize: 16,
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
  vipButton: {
    minHeight: 48,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#00685f",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  vipText: { color: "#00685f", fontWeight: "700" },
  pendingBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D97706",
    gap: 8,
  },
  pendingTitle: { color: "#92400E", fontWeight: "700" },
  qrFrame: {
    alignSelf: "center",
    padding: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
  },
  qrWarning: {
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: "#7C2D12",
    backgroundColor: "#FFEDD5",
    borderRadius: 12,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  transferDetails: { gap: 5, paddingTop: 4 },
  detailLine: { color: "#334155", fontSize: 13, lineHeight: 19 },
});
