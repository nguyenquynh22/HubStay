// src/screens/nested/ManageAppointmentsScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { MOCK_APPOINTMENTS, Appointment } from "../../types/mockData";

interface Props {
  onBack: () => void;
}

export default function ManageAppointmentsScreen({ onBack }: Props) {
  const [list, setList] = useState<Appointment[]>(MOCK_APPOINTMENTS);

  const handleUpdate = (id: string, newStatus: "CONFIRMED" | "REJECTED") => {
    setList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: newStatus } : item,
      ),
    );
    Alert.alert(
      "Thành công",
      newStatus === "CONFIRMED"
        ? "Đã xác nhận lịch hẹn!"
        : "Đã từ chối lịch hẹn.",
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>‹ Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Danh Sách Đặt Lịch Xem Phòng</Text>
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 14 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.timeText}>
                ⏰ {item.timeSlot} - Ngày {item.date}
              </Text>
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      item.status === "PENDING"
                        ? "#D97706"
                        : item.status === "CONFIRMED"
                          ? "#16A34A"
                          : "#DC2626",
                  },
                ]}
              >
                {item.status === "PENDING"
                  ? "Chờ xác nhận"
                  : item.status === "CONFIRMED"
                    ? "Đã xác nhận"
                    : "Đã từ chối"}
              </Text>
            </View>

            <Text style={styles.clientName}>
              👤 Khách hẹn: {item.userName} ({item.userPhone})
            </Text>
            <Text style={styles.note}>📝 Ghi chú: {item.note}</Text>

            {item.status === "PENDING" && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.rejectBtn]}
                  onPress={() => handleUpdate(item.id, "REJECTED")}
                >
                  <Text style={styles.btnText}>Từ chối</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.acceptBtn]}
                  onPress={() => handleUpdate(item.id, "CONFIRMED")}
                >
                  <Text style={[styles.btnText, { color: "#FFF" }]}>
                    Xác nhận đón
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    padding: 16,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  backBtn: {
    fontSize: 16,
    color: "#547A8A",
    fontWeight: "bold",
    marginRight: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: "bold" },
  card: {
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 1,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  timeText: { fontWeight: "bold", fontSize: 14, color: "#1F2937" },
  statusText: { fontWeight: "bold", fontSize: 12 },
  clientName: { fontSize: 13, color: "#374151", marginBottom: 4 },
  note: { fontSize: 12, color: "#6B7280", fontStyle: "italic" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  rejectBtn: { backgroundColor: "#F3F4F6" },
  acceptBtn: { backgroundColor: "#6B8FA3" },
  btnText: { fontWeight: "bold", fontSize: 13, color: "#374151" },
});
