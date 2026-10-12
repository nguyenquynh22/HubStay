import React, { useEffect, useState } from "react";
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
  getSubscriptionsByUser,
  getUserById,
  getVipPackages,
  purchaseVip,
} from "../../services/api";

interface VipPackage {
  package_name: string;
  months: number;
  price: number;
}

interface Props {
  onBack?: () => void;
  onOpenWallet?: () => void;
  onVerifyPress?: () => void;
  userId: number;
}

export default function VipPackagesScreen({
  onBack,
  onOpenWallet,
  onVerifyPress,
  userId,
}: Props) {
  const [packages, setPackages] = useState<VipPackage[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const refresh = async () => {
    const [packageResponse, userResponse, subscriptionResponse] =
      await Promise.all([
        getVipPackages(),
        getUserById(userId),
        getSubscriptionsByUser(userId),
      ]);
    const options = packageResponse.data || [];
    setPackages(options);
    setSelected((current) =>
      options.some((item: VipPackage) => item.package_name === current)
        ? current
        : options[0]?.package_name || "",
    );
    setUser(userResponse.data);
    setBalance(Number(userResponse.data?.wallet_balance || 0));
    setSubscriptions(subscriptionResponse.data || []);
  };

  useEffect(() => {
    refresh()
      .catch((error) =>
        Alert.alert(
          "Không tải được gói VIP",
          error?.response?.data?.message || "Kiểm tra kết nối API.",
        ),
      )
      .finally(() => setLoading(false));
  }, [userId]);

  const selectedPackage = packages.find(
    (item) => item.package_name === selected,
  );
  const isVerified = Number(user?.is_verified) === 1;
  const isLandlord = user?.role === "LANDLORD";
  const isVipActive =
    Number(user?.is_vip) === 1 &&
    (!user?.vip_expires_at || new Date(user.vip_expires_at) > new Date());
  const insufficientBalance =
    !!selectedPackage && balance < Number(selectedPackage.price);

  const handlePrimaryAction = () => {
    if (!isLandlord) {
      Alert.alert("Gói VIP", "Gói VIP chỉ dành cho tài khoản chủ trọ.");
      return;
    }
    if (!isVerified) {
      onVerifyPress?.();
      return;
    }
    if (insufficientBalance) {
      onOpenWallet?.();
      return;
    }
    void buy();
  };

  const buy = async () => {
    if (!selectedPackage || selectedPackage.price <= 0) return;
    setPurchasing(true);
    try {
      await purchaseVip(userId, selectedPackage.package_name);
      await refresh();
      Alert.alert(
        "Đăng ký thành công",
        "Gói VIP đã được kích hoạt và ghi vào lịch sử giao dịch.",
        [{ text: "Đóng", onPress: onBack }],
      );
    } catch (error: any) {
      const response = error?.response?.data;
      Alert.alert(
        response?.required_action === "VERIFY_KYC"
          ? "Cần xác minh KYC"
          : "Không mua được gói",
        response?.message || "Kiểm tra số dư ví và thử lại.",
      );
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>‹ Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Gói VIP</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color="#00685f" />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>SỐ DƯ VÍ</Text>
            <Text style={styles.balance}>
              {balance.toLocaleString("vi-VN")} đ
            </Text>
            <Text style={styles.description}>
              Gói VIP giúp chủ trọ tăng khả năng tiếp cận người tìm phòng.
            </Text>
            {isVipActive && user?.vip_expires_at && (
              <Text style={styles.expiry}>
                Đang hoạt động đến{" "}
                {new Date(user.vip_expires_at).toLocaleDateString("vi-VN")}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onOpenWallet} style={styles.walletLink}>
            <Text style={styles.walletLinkText}>Nạp tiền vào ví</Text>
            <Text style={styles.walletBalance}>
              {balance.toLocaleString("vi-VN")} đ
            </Text>
          </TouchableOpacity>
          <Text style={styles.section}>THỜI HẠN</Text>
          {packages.map((item) => (
            <TouchableOpacity
              key={item.package_name}
              onPress={() => setSelected(item.package_name)}
              style={[
                styles.plan,
                selected === item.package_name && styles.planSelected,
              ]}
            >
              <View
                style={[
                  styles.radio,
                  selected === item.package_name && styles.radioSelected,
                ]}
              />
              <Text style={styles.planName}>
                {item.months === 12 ? "12 tháng" : `${item.months} tháng`}
              </Text>
              <Text style={styles.price}>
                {item.price > 0
                  ? `${Number(item.price).toLocaleString("vi-VN")} đ`
                  : "Chưa cấu hình giá"}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            disabled={
              !isLandlord ||
              purchasing ||
              !selectedPackage ||
              selectedPackage.price <= 0
            }
            onPress={handlePrimaryAction}
            style={[
              styles.button,
              (!isLandlord ||
                purchasing ||
                !selectedPackage ||
                selectedPackage.price <= 0) &&
                styles.buttonDisabled,
            ]}
          >
            {purchasing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>
                {!isLandlord
                  ? "VIP chỉ dành cho chủ trọ"
                  : !isVerified
                    ? "Xác minh KYC để tiếp tục"
                    : insufficientBalance
                      ? "Nạp tiền vào ví"
                      : isVipActive
                        ? "Thanh toán và gia hạn VIP"
                        : "Thanh toán và đăng ký VIP"}
              </Text>
            )}
          </TouchableOpacity>
          <Text style={styles.footnote}>
            Thanh toán bằng số dư ví. KYC phải được duyệt và số dư phải đủ. Nếu
            VIP còn hạn, thời hạn gói mới được cộng nối tiếp.
          </Text>
          <Text style={styles.section}>LỊCH SỬ ĐĂNG KÝ</Text>
          {subscriptions.length === 0 ? (
            <Text style={styles.historyEmpty}>Chưa có lịch sử gói VIP.</Text>
          ) : (
            subscriptions.map((item) => (
              <TouchableOpacity
                key={item.subscription_id}
                onPress={() =>
                  packages.some(
                    (plan) => plan.package_name === item.package_name,
                  ) && setSelected(item.package_name)
                }
                style={styles.historyRow}
              >
                <View style={styles.historyCopy}>
                  <Text style={styles.historyName}>{item.package_name}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.start_date).toLocaleDateString("vi-VN")} -{" "}
                    {new Date(item.end_date).toLocaleDateString("vi-VN")}
                  </Text>
                </View>
                <Text style={styles.historyStatus}>
                  {new Date(item.end_date) > new Date() ? "Còn hạn" : "Hết hạn"}
                </Text>
              </TouchableOpacity>
            ))
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
  summary: { padding: 20, backgroundColor: "#00685f", borderRadius: 10 },
  summaryLabel: { color: "#C7F0E8", fontSize: 11, fontWeight: "700" },
  balance: { marginTop: 7, color: "white", fontSize: 25, fontWeight: "800" },
  description: { marginTop: 8, color: "white", lineHeight: 20 },
  expiry: { marginTop: 8, color: "#D1FAE5", fontWeight: "700" },
  walletLink: {
    marginTop: 12,
    minHeight: 46,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
  },
  walletLinkText: { color: "#00685f", fontWeight: "700" },
  walletBalance: { color: "#334155", fontWeight: "700" },
  section: {
    marginTop: 24,
    marginBottom: 8,
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  plan: {
    minHeight: 60,
    marginBottom: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
  },
  planSelected: { borderColor: "#00685f", backgroundColor: "#E6F5F1" },
  radio: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: "#94A3B8",
    borderRadius: 9,
    marginRight: 12,
  },
  radioSelected: { borderColor: "#00685f", backgroundColor: "#00685f" },
  planName: { flex: 1, color: "#1E293B", fontWeight: "700" },
  price: { color: "#00685f", fontWeight: "700", fontSize: 12 },
  button: {
    minHeight: 48,
    marginTop: 12,
    backgroundColor: "#00685f",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { backgroundColor: "#94A3B8" },
  buttonText: { color: "white", fontWeight: "700" },
  footnote: { marginTop: 12, color: "#64748B", fontSize: 12, lineHeight: 18 },
  historyEmpty: { color: "#64748B", paddingVertical: 14 },
  historyRow: {
    minHeight: 62,
    marginBottom: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
  },
  historyCopy: { flex: 1 },
  historyName: { color: "#1E293B", fontWeight: "700" },
  historyDate: { color: "#64748B", fontSize: 11, marginTop: 4 },
  historyStatus: { color: "#00685f", fontSize: 12, fontWeight: "700" },
});
