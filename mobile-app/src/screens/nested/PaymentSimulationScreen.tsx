import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface Props {
  onBack?: () => void;
}

const paymentMethods = [
  { id: "VIETQR", label: "VietQR", note: "Quét mã thanh toán" },
  { id: "MOMO", label: "Momo", note: "Chuyển qua ví điện tử" },
  { id: "BANK", label: "Ngân hàng", note: "Chuyển khoản ngân hàng" },
] as const;

export default function PaymentSimulationScreen({ onBack }: Props) {
  const [selectedMethod, setSelectedMethod] =
    useState<(typeof paymentMethods)[number]["id"]>("VIETQR");

  const orderSummary = useMemo(() => {
    const amount = 2200000;
    const depositFee = 0.1 * amount;
    const serviceFee = 50000;
    const total = amount + depositFee + serviceFee;

    return { amount, depositFee, serviceFee, total };
  }, []);

  const handleConfirmPayment = () => {
    Alert.alert(
      "Xác nhận thanh toán",
      `Bạn sẽ thanh toán ${orderSummary.total.toLocaleString("vi-VN")} đ bằng ${
        paymentMethods.find((item) => item.id === selectedMethod)?.label
      }.

      Hệ thống sẽ ghi nhận giao dịch như một giả lập đang thực hiện.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: () =>
            Alert.alert(
              "Thanh toán thành công",
              "Giao dịch mẫu đã được tạo thành công. Bạn có thể xem trong lịch sử thanh toán.",
            ),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={22} color="#131b2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mô phỏng thanh toán</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.cardPrimary}>
          <Text style={styles.sectionLabel}>Đơn đặt cọc phòng</Text>
          <Text style={styles.postTitle}>
            Phòng trọ khép kín full đồ gần trường
          </Text>
          <Text style={styles.metaText}>Địa chỉ: Dân Tiến, Khoái Châu</Text>
          <Text style={styles.metaText}>Chủ trọ: Bảo Anh</Text>
          <Text style={styles.amount}>
            {orderSummary.amount.toLocaleString("vi-VN")} đ
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          {paymentMethods.map((method) => {
            const isSelected = selectedMethod === method.id;
            return (
              <TouchableOpacity
                key={method.id}
                activeOpacity={0.8}
                style={[
                  styles.methodItem,
                  isSelected && styles.methodItemSelected,
                ]}
                onPress={() => setSelectedMethod(method.id)}
              >
                <View style={styles.methodLeft}>
                  <View
                    style={[styles.radio, isSelected && styles.radioSelected]}
                  />
                  <View>
                    <Text style={styles.methodLabel}>{method.label}</Text>
                    <Text style={styles.methodNote}>{method.note}</Text>
                  </View>
                </View>
                <MaterialIcons
                  name={isSelected ? "check-circle" : "radio-button-unchecked"}
                  size={22}
                  color={isSelected ? "#00685f" : "#9CA3AF"}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mã QR thanh toán</Text>
          <View style={styles.qrBox}>
            <Text style={styles.qrCode}>QR</Text>
          </View>
          <Text style={styles.qrHint}>
            Vui lòng quét mã để xác nhận thanh toán.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tóm tắt chi phí</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Giá phòng</Text>
            <Text style={styles.summaryValue}>
              {orderSummary.amount.toLocaleString("vi-VN")} đ
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Đặt cọc</Text>
            <Text style={styles.summaryValue}>
              {orderSummary.depositFee.toLocaleString("vi-VN")} đ
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phí dịch vụ</Text>
            <Text style={styles.summaryValue}>
              {orderSummary.serviceFee.toLocaleString("vi-VN")} đ
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Tổng thanh toán</Text>
            <Text style={styles.totalValue}>
              {orderSummary.total.toLocaleString("vi-VN")} đ
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.payButton}
          onPress={handleConfirmPayment}
        >
          <Text style={styles.payButtonText}>Xác nhận thanh toán</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  backButton: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#131b2e" },
  content: { padding: 16, paddingBottom: 32 },
  cardPrimary: {
    backgroundColor: "#00685f",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  sectionLabel: {
    color: "#D1FAE5",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  postTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  metaText: {
    color: "#E6FFFB",
    marginTop: 6,
    fontSize: 12,
  },
  amount: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 14,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  methodItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#F9FAFB",
  },
  methodItemSelected: {
    borderColor: "#00685f",
    backgroundColor: "#ECFDF5",
  },
  methodLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  radio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    marginRight: 10,
  },
  radioSelected: {
    borderColor: "#00685f",
    backgroundColor: "#00685f",
  },
  methodLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
  methodNote: { marginTop: 2, fontSize: 11, color: "#6B7280" },
  qrBox: {
    width: 180,
    height: 180,
    backgroundColor: "#E5E7EB",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 10,
  },
  qrCode: {
    color: "#1F2937",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 2,
  },
  qrHint: { textAlign: "center", color: "#6B7280", fontSize: 12 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: { color: "#6B7280", fontSize: 13 },
  summaryValue: { color: "#111827", fontSize: 13, fontWeight: "600" },
  totalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
  },
  totalLabel: { color: "#111827", fontSize: 14, fontWeight: "700" },
  totalValue: { color: "#00685f", fontSize: 16, fontWeight: "800" },
  payButton: {
    backgroundColor: "#00685f",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },
  payButtonText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
