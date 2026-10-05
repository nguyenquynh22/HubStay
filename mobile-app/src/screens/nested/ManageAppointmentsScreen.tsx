import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  createAppointment,
  getLandlordAppointments,
  getPostsByUserId,
  getTenantAppointments,
  updateAppointment,
} from "../../services/api";

interface Props {
  onBack: () => void;
  userId: number;
  mode: "landlord" | "tenant";
}

const dateInputValue = (value: any) => String(value || "").slice(0, 10);
const timeInputValue = (value: any) => String(value || "").slice(0, 5);
const displayDate = (value: any) => {
  const date = dateInputValue(value);
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
};

export default function ManageAppointmentsScreen({
  onBack,
  userId,
  mode,
}: Props) {
  const isLandlord = mode === "landlord";
  const [appointments, setAppointments] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showExternalForm, setShowExternalForm] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [externalDate, setExternalDate] = useState("");
  const [externalTime, setExternalTime] = useState("");
  const [externalGuestName, setExternalGuestName] = useState("");
  const [externalGuestPhone, setExternalGuestPhone] = useState("");
  const [externalNote, setExternalNote] = useState("");
  const [savingExternal, setSavingExternal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const appointmentRequest = isLandlord
          ? getLandlordAppointments(userId, sort)
          : getTenantAppointments(userId, sort);
        const [appointmentResponse, postResponse] = await Promise.all([
          appointmentRequest,
          isLandlord ? getPostsByUserId(userId) : Promise.resolve(null),
        ]);
        setAppointments(appointmentResponse.data || []);
        setPosts(postResponse?.data || []);
      } catch (requestError: any) {
        setError(
          requestError?.response?.data?.message ||
            "Không tải được lịch hẹn. Kiểm tra kết nối máy chủ.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isLandlord, sort, userId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (
    appointmentId: number,
    status: "CONFIRMED" | "CANCELLED",
  ) => {
    try {
      await updateAppointment(appointmentId, { actor_id: userId, status });
      await load(true);
    } catch (requestError: any) {
      Alert.alert(
        "Không cập nhật được",
        requestError?.response?.data?.message || "Vui lòng thử lại.",
      );
    }
  };

  const beginReschedule = (item: any) => {
    setEditingId(Number(item.appointment_id));
    setEditDate(dateInputValue(item.appointment_date));
    setEditTime(timeInputValue(item.appointment_time));
  };

  const saveReschedule = async (appointmentId: number) => {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(editDate.trim()) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(editTime.trim())
    ) {
      Alert.alert(
        "Thông tin chưa hợp lệ",
        "Nhập ngày YYYY-MM-DD và giờ đến HH:mm.",
      );
      return;
    }
    setSavingEdit(true);
    try {
      await updateAppointment(appointmentId, {
        actor_id: userId,
        appointment_date: editDate.trim(),
        appointment_time: editTime.trim(),
      });
      setEditingId(null);
      await load(true);
    } catch (requestError: any) {
      Alert.alert(
        "Không đổi được lịch",
        requestError?.response?.data?.message || "Vui lòng thử lại.",
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const addExternalAppointment = async () => {
    if (!selectedPostId) {
      Alert.alert("Chọn bài đăng", "Chọn bài đăng gắn với lịch hẹn này.");
      return;
    }
    if (!externalGuestName.trim() || !externalGuestPhone.trim()) {
      Alert.alert("Thiếu thông tin khách", "Nhập tên và số điện thoại khách.");
      return;
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(externalDate.trim()) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(externalTime.trim())
    ) {
      Alert.alert(
        "Thông tin chưa hợp lệ",
        "Nhập ngày YYYY-MM-DD và giờ đến HH:mm.",
      );
      return;
    }
    setSavingExternal(true);
    try {
      await createAppointment({
        post_id: selectedPostId,
        owner_id: userId,
        source: "EXTERNAL",
        guest_name: externalGuestName.trim(),
        guest_phone: externalGuestPhone.trim(),
        appointment_date: externalDate.trim(),
        appointment_time: externalTime.trim(),
        note: externalNote.trim() || undefined,
      });
      setShowExternalForm(false);
      setSelectedPostId(null);
      setExternalDate("");
      setExternalTime("");
      setExternalGuestName("");
      setExternalGuestPhone("");
      setExternalNote("");
      await load(true);
    } catch (requestError: any) {
      Alert.alert(
        "Không thêm được lịch",
        requestError?.response?.data?.message || "Vui lòng thử lại.",
      );
    } finally {
      setSavingExternal(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <MaterialIcons name="arrow-back" size={22} color="#00685f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isLandlord ? "Lịch hẹn bài đăng của tôi" : "Lịch xem phòng của tôi"}
        </Text>
        <TouchableOpacity
          onPress={() => load(true)}
          accessibilityRole="button"
          accessibilityLabel="Tải lại lịch hẹn"
        >
          <MaterialIcons name="refresh" size={22} color="#00685f" />
        </TouchableOpacity>
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sắp theo thời điểm đặt</Text>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() =>
            setSort((current) => (current === "newest" ? "oldest" : "newest"))
          }
        >
          <MaterialIcons name="swap-vert" size={18} color="#00685f" />
          <Text style={styles.sortText}>
            {sort === "newest" ? "Mới nhất" : "Cũ nhất"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
          />
        }
      >
        {isLandlord && (
          <View style={styles.externalSection}>
            <TouchableOpacity
              style={styles.addExternalButton}
              onPress={() => setShowExternalForm((visible) => !visible)}
            >
              <MaterialIcons
                name={showExternalForm ? "close" : "add"}
                size={20}
                color="#fff"
              />
              <Text style={styles.addExternalText}>
                {showExternalForm
                  ? "Đóng biểu mẫu"
                  : "Thêm lịch đã hẹn ngoài app"}
              </Text>
            </TouchableOpacity>
            {showExternalForm && (
              <View style={styles.form}>
                <Text style={styles.formTitle}>
                  Ghi nhận lịch hẹn bên ngoài
                </Text>
                <Text style={styles.label}>Bài đăng</Text>
                {posts.length ? (
                  posts.map((post) => (
                    <TouchableOpacity
                      key={post.post_id}
                      style={[
                        styles.postOption,
                        selectedPostId === Number(post.post_id) &&
                          styles.postOptionSelected,
                      ]}
                      onPress={() => setSelectedPostId(Number(post.post_id))}
                    >
                      <Text style={styles.postOptionText} numberOfLines={2}>
                        {post.title}
                      </Text>
                      {selectedPostId === Number(post.post_id) && (
                        <MaterialIcons name="check" size={18} color="#00685f" />
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.helper}>
                    Bạn chưa có bài đăng để gắn lịch.
                  </Text>
                )}
                <Text style={styles.label}>Tên khách</Text>
                <TextInput
                  value={externalGuestName}
                  onChangeText={setExternalGuestName}
                  placeholder="Họ tên khách đến xem"
                  style={styles.input}
                  maxLength={100}
                />
                <Text style={styles.label}>Số điện thoại khách</Text>
                <TextInput
                  value={externalGuestPhone}
                  onChangeText={setExternalGuestPhone}
                  placeholder="Số điện thoại liên hệ"
                  style={styles.input}
                  keyboardType="phone-pad"
                  maxLength={20}
                />
                <Text style={styles.label}>Ngày đến</Text>
                <TextInput
                  value={externalDate}
                  onChangeText={setExternalDate}
                  placeholder="YYYY-MM-DD"
                  style={styles.input}
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={styles.label}>Giờ đến</Text>
                <TextInput
                  value={externalTime}
                  onChangeText={setExternalTime}
                  placeholder="HH:mm"
                  style={styles.input}
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={styles.label}>Ghi chú</Text>
                <TextInput
                  value={externalNote}
                  onChangeText={setExternalNote}
                  placeholder="Khách đặt qua nền tảng khác..."
                  style={[styles.input, styles.noteInput]}
                  multiline
                />
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={addExternalAppointment}
                  disabled={savingExternal}
                >
                  {savingExternal ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Lưu lịch hẹn</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {loading ? (
          <ActivityIndicator style={styles.loading} color="#00685f" />
        ) : null}
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!loading && !error && appointments.length === 0 && (
          <Text style={styles.empty}>
            {isLandlord
              ? "Chưa có lịch hẹn cho bài đăng của bạn."
              : "Bạn chưa đặt lịch xem phòng nào."}
          </Text>
        )}
        {appointments.map((item) => {
          const statusLabel =
            item.status === "PENDING"
              ? "Chờ xác nhận"
              : item.status === "CONFIRMED"
                ? "Đã xác nhận"
                : item.status === "REJECTED"
                  ? "Bị từ chối"
                  : "Đã hủy";
          const statusColor =
            item.status === "PENDING"
              ? "#9a5b18"
              : item.status === "CONFIRMED"
                ? "#16734b"
                : "#a8332a";
          const isActive =
            item.status === "PENDING" || item.status === "CONFIRMED";
          const isEditing = editingId === Number(item.appointment_id);
          return (
            <View key={item.appointment_id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardHeading}>
                  <Text style={styles.postTitle}>
                    {item.post_title || "Bài đăng"}
                  </Text>
                  <Text style={[styles.status, { color: statusColor }]}>
                    {statusLabel}
                  </Text>
                </View>
                <Text style={styles.address}>{item.post_address}</Text>
              </View>
              <View style={styles.appointmentTime}>
                <MaterialIcons name="event" size={19} color="#00685f" />
                <Text style={styles.timeText}>
                  {displayDate(item.appointment_date)} ·{" "}
                  {timeInputValue(item.appointment_time)}
                </Text>
              </View>
              <Text style={styles.person}>
                {isLandlord
                  ? item.source === "EXTERNAL"
                    ? `Khách ngoài app: ${item.guest_name || "Chưa có tên"}${item.guest_phone ? ` · ${item.guest_phone}` : ""}`
                    : `Người đặt: ${item.tenant_name || `#${item.tenant_id}`}${item.tenant_phone ? ` · ${item.tenant_phone}` : ""}`
                  : `Chủ trọ: ${item.landlord_name || `#${item.landlord_id}`}`}
              </Text>
              {!!item.note && (
                <Text style={styles.noteText}>Ghi chú: {item.note}</Text>
              )}
              {!!item.created_at && (
                <Text style={styles.createdAt}>
                  Đặt lúc {new Date(item.created_at).toLocaleString("vi-VN")}
                </Text>
              )}

              {isEditing ? (
                <View style={styles.rescheduleForm}>
                  <TextInput
                    value={editDate}
                    onChangeText={setEditDate}
                    placeholder="YYYY-MM-DD"
                    style={styles.input}
                    keyboardType="numbers-and-punctuation"
                  />
                  <TextInput
                    value={editTime}
                    onChangeText={setEditTime}
                    placeholder="HH:mm"
                    style={styles.input}
                    keyboardType="numbers-and-punctuation"
                  />
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => setEditingId(null)}
                    >
                      <Text style={styles.secondaryText}>Bỏ qua</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() =>
                        saveReschedule(Number(item.appointment_id))
                      }
                      disabled={savingEdit}
                    >
                      {savingEdit ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.primaryText}>Lưu giờ mới</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : isActive ? (
                <View style={styles.actions}>
                  {isLandlord && item.status === "PENDING" && (
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() =>
                        changeStatus(Number(item.appointment_id), "CONFIRMED")
                      }
                    >
                      <Text style={styles.primaryText}>Chấp nhận</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => beginReschedule(item)}
                  >
                    <Text style={styles.secondaryText}>Đổi ngày/giờ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() =>
                      changeStatus(Number(item.appointment_id), "CANCELLED")
                    }
                  >
                    <Text style={styles.cancelText}>Hủy lịch</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7f5" },
  header: {
    minHeight: 56,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#dce5e1",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#18332d",
    paddingHorizontal: 8,
  },
  sortRow: {
    minHeight: 46,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  sortLabel: { color: "#64736e", fontSize: 12 },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 6,
  },
  sortText: { color: "#00685f", fontSize: 13, fontWeight: "700" },
  content: { padding: 14, paddingBottom: 28, gap: 12 },
  externalSection: { gap: 10 },
  addExternalButton: {
    minHeight: 44,
    backgroundColor: "#00685f",
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  addExternalText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  form: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 7,
    gap: 8,
    borderWidth: 1,
    borderColor: "#dce5e1",
  },
  formTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#18332d",
    marginBottom: 3,
  },
  label: { color: "#53635e", fontSize: 12, fontWeight: "600", marginTop: 4 },
  postOption: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#dce5e1",
    borderRadius: 6,
    paddingHorizontal: 10,
  },
  postOptionSelected: { borderColor: "#00685f", backgroundColor: "#eef7f3" },
  postOptionText: {
    flex: 1,
    color: "#263a34",
    fontSize: 12,
    paddingVertical: 8,
  },
  helper: { color: "#77847f", fontSize: 12 },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#d3ded9",
    borderRadius: 6,
    paddingHorizontal: 10,
    color: "#18332d",
    backgroundColor: "#fff",
  },
  noteInput: { minHeight: 72, textAlignVertical: "top", paddingTop: 10 },
  saveButton: {
    minHeight: 42,
    backgroundColor: "#00685f",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveButtonText: { color: "#fff", fontWeight: "700" },
  loading: { marginTop: 26 },
  error: {
    color: "#a8332a",
    backgroundColor: "#fff1ef",
    padding: 12,
    borderRadius: 6,
  },
  empty: { textAlign: "center", paddingVertical: 30, color: "#65746e" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 7,
    padding: 13,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e0e7e3",
  },
  cardTop: { gap: 4 },
  cardHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  postTitle: { flex: 1, color: "#18332d", fontSize: 14, fontWeight: "700" },
  status: { fontSize: 11, fontWeight: "700" },
  address: { color: "#6c7974", fontSize: 11 },
  appointmentTime: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: "#edf0ee",
    paddingTop: 7,
  },
  timeText: { color: "#18332d", fontWeight: "700", fontSize: 14 },
  person: { color: "#43524d", fontSize: 12 },
  noteText: { color: "#65746e", fontSize: 12, lineHeight: 18 },
  createdAt: { color: "#87918d", fontSize: 10 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 3 },
  primaryButton: {
    flexGrow: 1,
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#00685f",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  secondaryButton: {
    flexGrow: 1,
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#aabbb4",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: "#38584f", fontWeight: "700", fontSize: 12 },
  cancelButton: {
    flexGrow: 1,
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#fff0ee",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: "#a8332a", fontWeight: "700", fontSize: 12 },
  rescheduleForm: { gap: 8, marginTop: 4 },
});
