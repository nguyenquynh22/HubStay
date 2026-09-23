import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { MOCK_TRANSACTIONS, Transaction } from "../../types/mockData";

interface Props {
  onBack?: () => void;
}

export default function TransactionHistoryScreen({ onBack }: Props) {
  const summary = useMemo(() => {
    const total = MOCK_TRANSACTIONS.reduce((sum, item) => sum + item.amount, 0);
    const success = MOCK_TRANSACTIONS.filter(
      (item) => item.status === "SUCCESS",
    ).length;
    return { total, success };
  }, []);       

  const renderItem = ({ item }: { item: Transaction }) => {
    const statusColor =
      item.status === "SUCCESS"
        ? "#16A34A"
        : item.status === "PENDING"
          ? "#D97706"
          : "#DC2626";

    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{item.postTitle}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}22` },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status === "SUCCESS"
                ? "Thành công"
                : item.status === "PENDING"
                  ? "Chờ xử lý"
                  : "Thất bại"}
            </Text>
          </View>
        </View>

        <Text style={styles.amount}>
          {item.amount.toLocaleString("vi-VN")} đ
        </Text>
        <Text style={styles.meta}>Phương thức: {item.method}</Text>
        <Text style={styles.meta}>Mô tả: {item.description}</Text>
        <Text style={styles.meta}>Ngày: {item.date}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#131b2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử giao dịch</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Tổng giá trị</Text>
        <Text style={styles.summaryValue}>
          {summary.total.toLocaleString("vi-VN")} đ
        </Text>
        <Text style={styles.summarySub}>
          Đã xử lý thành công: {summary.success} giao dịch
        </Text>
      </View>

      <FlatList
        data={MOCK_TRANSACTIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
        }
      />
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
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#131b2e" },
  summaryCard: {
    margin: 16,
    borderRadius: 14,
    backgroundColor: "#00685f",
    padding: 16,
  },
  summaryLabel: { color: "#D1FAE5", fontSize: 12, fontWeight: "600" },
  summaryValue: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
  },
  summarySub: {
    marginTop: 6,
    color: "#E6FFFB",
    fontSize: 12,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  title: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: { fontSize: 10, fontWeight: "700" },
  amount: {
    marginTop: 10,
    color: "#00685f",
    fontSize: 18,
    fontWeight: "800",
  },
  meta: { marginTop: 6, fontSize: 12, color: "#6B7280" },
  emptyText: { textAlign: "center", color: "#9CA3AF", marginTop: 20 },
});
