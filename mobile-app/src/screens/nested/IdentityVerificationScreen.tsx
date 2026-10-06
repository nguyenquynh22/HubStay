import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getVerificationsByUser, submitVerification } from "../../services/api";

interface Props {
  onBack: () => void;
  userId: number;
  onVerified?: () => void;
}

const accountTypes = ["STUDENT", "WORKER", "LANDLORD"] as const;

type KycImage = {
  dataUri: string;
  previewUri: string;
};

export default function IdentityVerificationScreen({
  onBack,
  userId,
  onVerified,
}: Props) {
  const [accountType, setAccountType] =
    useState<(typeof accountTypes)[number]>("STUDENT");
  const [frontImage, setFrontImage] = useState<KycImage | null>(null);
  const [backImage, setBackImage] = useState<KycImage | null>(null);
  const [selfieImage, setSelfieImage] = useState<KycImage | null>(null);
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

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
    if (submitting) return;
    setSubmitFeedback(null);
    if (
      !Number.isInteger(userId) ||
      userId < 1 ||
      !accountTypes.includes(accountType) ||
      !frontImage ||
      !selfieImage
    ) {
      const missingFields = [
        !Number.isInteger(userId) || userId < 1 ? "tài khoản đăng nhập hợp lệ" : "",
        !accountTypes.includes(accountType) ? "loại tài khoản" : "",
        !frontImage ? "ảnh mặt trước giấy tờ" : "",
        !selfieImage ? "ảnh chân dung" : "",
      ].filter(Boolean);
      const message = `Vui lòng bổ sung: ${missingFields.join(", ")}.`;
      setSubmitFeedback({ kind: "error", message });
      Alert.alert("Hồ sơ chưa đầy đủ", message);
      return;
    }
    setSubmitting(true);
    try {
      const response = await submitVerification({
        user_id: userId,
        account_type: accountType,
        front_image: frontImage.dataUri,
        back_image: backImage?.dataUri ?? null,
        selfie_image: selfieImage.dataUri,
      });
      const successMessage =
        response?.message || "Hồ sơ KYC đã được gửi và đang chờ xét duyệt.";
      setSubmitFeedback({ kind: "success", message: successMessage });
      try {
        await refresh();
      } catch (refreshError) {
        console.error("[KYC] Gửi hồ sơ thành công nhưng không tải lại được trạng thái.", refreshError);
        setSubmitFeedback({
          kind: "success",
          message: `${successMessage} Không tải lại được trạng thái; hãy mở lại màn hình sau.`,
        });
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const serverMessage = error?.response?.data?.message;
      const message = serverMessage
        ? `HTTP ${status ?? "?"}: ${serverMessage}`
        : status
          ? `Máy chủ trả lỗi HTTP ${status}. Vui lòng báo quản trị viên kèm mã lỗi này.`
          : "Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ API rồi thử lại.";
      console.error("[KYC] Gửi hồ sơ thất bại", {
        userId,
        accountType,
        httpStatus: status ?? null,
        response: error?.response?.data ?? null,
        message: error?.message,
      });
      console.error(
        "[KYC] Nội dung phản hồi API:",
        JSON.stringify(error?.response?.data ?? null),
      );
      setSubmitFeedback({ kind: "error", message });
      Alert.alert(
        "Không gửi được",
        message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const pickKycImage = async (
    setImage: React.Dispatch<React.SetStateAction<KycImage | null>>,
    source: "camera" | "library",
    cameraType: ImagePicker.CameraType = ImagePicker.CameraType.back,
  ) => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Cần quyền camera", "Cho phép camera để chụp ảnh xác minh.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          cameraType,
          allowsEditing: true,
          aspect: cameraType === ImagePicker.CameraType.front ? [1, 1] : [4, 3],
          quality: 0.65,
          base64: true,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Cần quyền thư viện ảnh", "Cho phép truy cập ảnh để chọn giấy tờ xác minh.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.65,
          base64: true,
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        });
      }
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) {
        Alert.alert("Không đọc được ảnh", "Hãy chọn hoặc chụp lại ảnh.");
        return;
      }
      if (asset.base64.length * 0.75 > 5 * 1024 * 1024) {
        Alert.alert("Ảnh quá lớn", "Mỗi ảnh phải nhỏ hơn 5 MB. Hãy chọn hoặc chụp lại.");
        return;
      }
      const mimeType = asset.mimeType || "image/jpeg";
      if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
        Alert.alert("Định dạng không hỗ trợ", "Ảnh cần ở định dạng JPG, PNG hoặc WebP.");
        return;
      }
      setImage({
        dataUri: `data:${mimeType};base64,${asset.base64}`,
        previewUri: asset.uri,
      });
    } catch {
      Alert.alert(
        source === "camera" ? "Không mở được camera" : "Không mở được thư viện ảnh",
        "Hãy thử lại sau.",
      );
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
          {submitFeedback ? (
            <View
              accessibilityRole="alert"
              style={[
                styles.submitFeedback,
                submitFeedback.kind === "success"
                  ? styles.submitSuccess
                  : styles.submitError,
              ]}
            >
              <Text
                style={[
                  styles.submitFeedbackTitle,
                  submitFeedback.kind === "success"
                    ? styles.submitSuccessText
                    : styles.submitErrorText,
                ]}
              >
                {submitFeedback.kind === "success"
                  ? "GỬI HỒ SƠ THÀNH CÔNG"
                  : "CHƯA GỬI ĐƯỢC HỒ SƠ"}
              </Text>
              <Text style={styles.submitFeedbackMessage}>
                {submitFeedback.message}
              </Text>
            </View>
          ) : null}
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
              <Text style={styles.note}>Mặt trước bắt buộc; mặt sau không bắt buộc.</Text>
              <Text style={styles.imageLabel}>Mặt trước (bắt buộc)</Text>
              {frontImage ? (
                <Image source={{ uri: frontImage.previewUri }} style={styles.documentPreview} />
              ) : null}
              <View style={styles.imageActions}>
                <TouchableOpacity
                  disabled={submitting}
                  onPress={() => void pickKycImage(setFrontImage, "camera")}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Chụp ảnh</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={submitting}
                  onPress={() => void pickKycImage(setFrontImage, "library")}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Chọn từ album</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.imageLabel}>Mặt sau (không bắt buộc)</Text>
              {backImage ? (
                <Image source={{ uri: backImage.previewUri }} style={styles.documentPreview} />
              ) : null}
              <View style={styles.imageActions}>
                <TouchableOpacity
                  disabled={submitting}
                  onPress={() => void pickKycImage(setBackImage, "camera")}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Chụp ảnh</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={submitting}
                  onPress={() => void pickKycImage(setBackImage, "library")}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Chọn từ album</Text>
                </TouchableOpacity>
                {backImage ? (
                  <TouchableOpacity
                    disabled={submitting}
                    onPress={() => setBackImage(null)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>Bỏ ảnh</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text style={styles.section}>ẢNH CHÂN DUNG XÁC MINH</Text>
              <Text style={styles.note}>
                Chụp trực tiếp bằng camera trước, chỉ một người, nhìn thẳng vào camera và đủ sáng.
              </Text>
              {selfieImage ? (
                <Image source={{ uri: selfieImage.previewUri }} style={styles.selfiePreview} />
              ) : null}
              <View style={styles.imageActions}>
                <TouchableOpacity
                  disabled={submitting}
                  onPress={() => void pickKycImage(setSelfieImage, "camera", ImagePicker.CameraType.front)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>
                    {selfieImage ? "Chụp lại" : "Chụp chân dung"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={submitting}
                  onPress={() => void pickKycImage(setSelfieImage, "library")}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Chọn từ album</Text>
                </TouchableOpacity>
              </View>
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
            Ảnh giấy tờ và chân dung được lưu riêng tư trên máy chủ; chỉ quản trị viên đã đăng nhập mới xem được.
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
  submitFeedback: { marginTop: 12, padding: 14, borderRadius: 8 },
  submitSuccess: { backgroundColor: "#E6F5F1" },
  submitError: { backgroundColor: "#FEF2F2" },
  submitFeedbackTitle: { fontSize: 11, fontWeight: "800" },
  submitSuccessText: { color: "#00685f" },
  submitErrorText: { color: "#B91C1C" },
  submitFeedbackMessage: { marginTop: 5, color: "#334155", fontSize: 13, lineHeight: 19 },
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
  imageLabel: { marginTop: 14, color: "#334155", fontSize: 13, fontWeight: "600" },
  documentPreview: {
    width: "100%",
    height: 180,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  imageActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  selfiePreview: {
    width: 180,
    height: 180,
    alignSelf: "center",
    marginTop: 12,
    borderRadius: 90,
    backgroundColor: "#E2E8F0",
  },
  removeButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: { color: "#B91C1C", fontWeight: "600" },
  secondaryButton: {
    minHeight: 44,
    marginTop: 12,
    backgroundColor: "#E6F5F1",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: { color: "#00685f", fontWeight: "700" },
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
