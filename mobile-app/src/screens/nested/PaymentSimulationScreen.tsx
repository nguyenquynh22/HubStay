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
import {
  createTopUp,
  getUserById,
  simulateTopUpSuccess,
} from "../../services/api";

interface Props {
  onBack?: () => void;
  onOpenVip?: () => void;
  userId?: number;
}

const presets = [100000, 500000, 1000000];

export default function PaymentSimulationScreen({
  onBack,
  onOpenVip,
  userId = 1,
}: Props) {
  const [amount, setAmount] = useState("500000");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshBalance = async () => {
    try {
      const response = await getUserById(userId);
      setBalance(Number(response.data?.wallet_balance || 0));
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
      await simulateTopUpSuccess(created.data.transaction_id);
      await refreshBalance();
      Alert.alert(
        "Nạp tiền thành công",
        `${value.toLocaleString("vi-VN")} đ đã được cộng vào ví demo.`,
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
        <Text style={styles.section}>NẠP TIỀN THỬ NGHIỆM</Text>
        <Text style={styles.note}>
          Giao dịch được mô phỏng và chỉ khả dụng khi backend chạy ở môi trường
          phát triển.
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
          disabled={loading}
          onPress={topUp}
          style={styles.button}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Nạp vào ví demo</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onOpenVip} style={styles.vipButton}>
          <Text style={styles.vipText}>Xem gói VIP chủ trọ</Text>
        </TouchableOpacity>
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
});
