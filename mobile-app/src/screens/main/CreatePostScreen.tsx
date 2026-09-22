// src/screens/main/CreatePostScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Switch,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";

interface Props {
  onCreated: () => void;
  onBack?: () => void;
}

export default function CreatePostScreen({ onCreated, onBack }: Props) {
  // Step State
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [postType, setPostType] = useState<"RENTAL" | "SHARE" | "PASS" | "FIND">("RENTAL");
  const [title, setTitle] = useState("Phòng khép kín sạch đẹp có gác lửng, gần ĐH SPKT");
  const [price, setPrice] = useState("2.800.000");
  const [description, setDescription] = useState(
    "- Phòng diện tích 25m2, mới sơn sửa 100%, gác cao không đụng đầu.\n- Tiện nghi: Điều hòa Inverter, bình nóng lạnh, tủ quần áo.\n- Điện: 3.500đ/kWh, Nước: 25.000đ/khối, Wifi tốc độ cao miễn phí.\n- Giờ giấc tự do, khóa cửa vân tay an toàn."
  );

  // Location State
  const [addressText, setAddressText] = useState("Khu vực Đường Chu Văn An, P. Hiến Nam");
  const [selectedSchool, setSelectedSchool] = useState("ĐH SPKT Hưng Yên");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>({
    lat: 20.9324,
    lng: 106.0081,
  });
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Images & Other Settings
  const [images, setImages] = useState<string[]>([
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500",
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500",
  ]);
  const [enableBooking, setEnableBooking] = useState(true);

  // Hàm lấy vị trí GPS hiện tại (Nút cho phép truy cập vị trí)
  const handleGetCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Quyền truy cập bị từ chối", "Vui lòng cấp quyền vị trí để ứng dụng lấy tọa độ tự động.");
        setLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCoords({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });

      // Lấy tên địa danh tương đối từ tọa độ
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode.length > 0) {
        const place = geocode[0];
        const formattedAddress = `Gần ${place.street || place.name || ""}, ${place.subregion || place.district || ""}`;
        setAddressText(formattedAddress);
      }
      Alert.alert("Thành công", "Đã ghi nhận tọa độ GPS của phòng trọ!");
    } catch (error) {
      Alert.alert("Lỗi", "Không thể lấy vị trí hiện tại. Vui lòng thử lại.");
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !price.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tiêu đề và giá thuê.");
      return;
    }
    Alert.alert("Đăng bài thành công!", "Bài đăng của bạn đã được đưa lên hệ thống.", [
      { text: "OK", onPress: onCreated },
    ]);
  };

  return (
    <View style={styles.safeContainer}>
      {/* 1. TOP APP BAR */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color="#131b2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đăng Tin Phòng Mới</Text>
        <TouchableOpacity style={styles.draftBtn} onPress={onCreated}>
          <Text style={styles.draftText}>Lưu nháp</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 2. STEPPER PROGRESSION BAR */}
        <View style={styles.stepperContainer}>
          <View style={styles.stepperLineBackground} />
          <View style={[styles.stepperLineActive, { width: currentStep === 1 ? "20%" : currentStep === 2 ? "55%" : "90%" }]} />

          {/* Step 1 */}
          <TouchableOpacity style={styles.stepItem} onPress={() => setCurrentStep(1)}>
            <View style={[styles.stepCircle, currentStep >= 1 ? styles.stepActiveCircle : styles.stepInactiveCircle]}>
              <Text style={currentStep >= 1 ? styles.stepActiveText : styles.stepInactiveText}>1</Text>
            </View>
            <Text style={[styles.stepLabel, currentStep === 1 && styles.stepLabelActive]}>Thông tin</Text>
          </TouchableOpacity>

          {/* Step 2 */}
          <TouchableOpacity style={styles.stepItem} onPress={() => setCurrentStep(2)}>
            <View style={[styles.stepCircle, currentStep >= 2 ? styles.stepActiveCircle : styles.stepInactiveCircle]}>
              <Text style={currentStep >= 2 ? styles.stepActiveText : styles.stepInactiveText}>2</Text>
            </View>
            <Text style={[styles.stepLabel, currentStep === 2 && styles.stepLabelActive]}>Hình ảnh</Text>
          </TouchableOpacity>

          {/* Step 3 */}
          <TouchableOpacity style={styles.stepItem} onPress={() => setCurrentStep(3)}>
            <View style={[styles.stepCircle, currentStep >= 3 ? styles.stepActiveCircle : styles.stepInactiveCircle]}>
              <Text style={currentStep >= 3 ? styles.stepActiveText : styles.stepInactiveText}>3</Text>
            </View>
            <Text style={[styles.stepLabel, currentStep === 3 && styles.stepLabelActive]}>Vị trí & Lịch</Text>
          </TouchableOpacity>
        </View>

        {/* 3. VERIFICATION TRUST BANNER */}
        <View style={styles.trustBanner}>
          <MaterialIcons name="verified" size={22} color="#0058be" />
          <View style={styles.trustTextContainer}>
            <Text style={styles.trustTitle}>100% bài đăng được xác minh thực tế</Text>
            <Text style={styles.trustSub}>Hỗ trợ sinh viên tìm trọ an toàn, tránh tin ảo</Text>
          </View>
        </View>

        {/* SECTION 1: HÌNH THỨC ĐĂNG TIN */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>
            Hình thức đăng tin <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.postTypeGrid}>
            {[
              { key: "RENTAL", label: "Cho thuê phòng", sub: "Chính chủ / Môi giới", icon: "apartment" },
              { key: "SHARE", label: "Ở ghép", sub: "Tìm bạn cùng phòng", icon: "group" },
              { key: "PASS", label: "Pass phòng", sub: "Nhượng hợp đồng", icon: "swap-horiz" },
              { key: "FIND", label: "Tìm phòng", sub: "Nhu cầu thuê trọ", icon: "search" },
            ].map((item) => {
              const active = postType === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.postTypeOption, active && styles.postTypeOptionActive]}
                  onPress={() => setPostType(item.key as any)}
                >
                  <MaterialIcons name={item.icon as any} size={20} color={active ? "#00685f" : "#6d7a77"} />
                  <View style={styles.postTypeOptionText}>
                    <Text style={[styles.postTypeTitle, active && styles.postTypeTitleActive]}>{item.label}</Text>
                    <Text style={[styles.postTypeSub, active && styles.postTypeSubActive]}>{item.sub}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SECTION 2: UPLOAD HÌNH ẢNH */}
        <View style={styles.cardSection}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>
              Hình ảnh phòng trọ <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.badgeCount}>{images.length}/6 ảnh</Text>
          </View>
          <Text style={styles.helperText}>Đăng tối thiểu 2-3 ảnh sắc nét gồm gác xép, toilet và lối đi.</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
            {images.map((url, idx) => (
              <View key={idx} style={styles.imageThumbContainer}>
                <Image source={{ uri: url }} style={styles.imageThumb} />
                {idx === 0 && <Text style={styles.coverTag}>Ảnh bìa</Text>}
                <TouchableOpacity
                  style={styles.removeImgBtn}
                  onPress={() => setImages(images.filter((_, i) => i !== idx))}
                >
                  <MaterialIcons name="close" size={14} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.uploadBtn}>
              <MaterialIcons name="add-photo-alternate" size={28} color="#00685f" />
              <Text style={styles.uploadBtnText}>Thêm ảnh</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* SECTION 3: TIÊU ĐỀ & MÔ TẢ CHI TIẾT (KIỂU BÀI ĐĂNG FB) */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>
            Tiêu đề tin đăng <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ví dụ: Phòng sáng, gần trường ĐH SPKT"
            placeholderTextColor="#9AAAB0"
          />

          <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
            Mô tả chi tiết phòng trọ <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            placeholder="Viết đầy đủ thông tin: Diện tích, điện nước, nội thất, tiện ích xung quanh, giờ giấc..."
            placeholderTextColor="#9AAAB0"
            textAlignVertical="top"
          />
        </View>

        {/* SECTION 4: GIÁ THUÊ & CHI PHÍ */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>
            Giá thuê phòng <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.priceInputWrapper}>
            <TextInput
              style={styles.priceInput}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="2.800.000"
            />
            <Text style={styles.currencySuffix}>đ / tháng</Text>
          </View>

          <View style={styles.insightBox}>
            <MaterialIcons name="insights" size={18} color="#00685f" />
            <Text style={styles.insightText}>
              Giá phổ biến quanh khu vực này: <Text style={styles.insightBold}>2.2 - 3.2 tr/tháng</Text>
            </Text>
          </View>
        </View>

        {/* SECTION 5: VỊ TRÍ TƯƠNG ĐỐI & TRƯỜNG ĐẠI HỌC (TẮT NHẬP TỌA ĐỘ THỦ CÔNG) */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>
            Vị trí & Trường ĐH gần nhất <Text style={styles.required}>*</Text>
          </Text>

          {/* GPS Location Button */}
          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={handleGetCurrentLocation}
            disabled={loadingLocation}
          >
            {loadingLocation ? (
              <ActivityIndicator color="#00685f" />
            ) : (
              <>
                <MaterialIcons name="my-location" size={20} color="#00685f" />
                <Text style={styles.gpsBtnText}>
                  {coords ? "Cập nhật lại tọa độ GPS hiện tại" : "Lấy vị tríGPS phòng trọ hiện tại"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {coords && (
            <View style={styles.coordsBadge}>
              <MaterialIcons name="check-circle" size={14} color="#16A34A" />
              <Text style={styles.coordsText}>
                Đã ghim tọa độ: ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
              </Text>
            </View>
          )}

          {/* Address Relative Input */}
          <Text style={styles.subInputLabel}>Địa chỉ tương đối / Tên đường</Text>
          <View style={styles.inputWithIcon}>
            <MaterialIcons name="pin-drop" size={20} color="#6d7a77" style={styles.inputIcon} />
            <TextInput
              style={styles.inputInner}
              value={addressText}
              onChangeText={setAddressText}
              placeholder="Ví dụ: Gần ngõ 64 Đường Chu Văn An..."
              placeholderTextColor="#9AAAB0"
            />
          </View>

          {/* Nearest School Select */}
          <Text style={styles.subInputLabel}>Địa điểm nổi tiếng lân cận (dễ tìm)</Text>
          <View style={styles.inputWithIcon}>
            <MaterialIcons name="school" size={20} color="#0058be" style={styles.inputIcon} />
            <TextInput
              style={styles.inputInner}
              value={selectedSchool}
              onChangeText={setSelectedSchool}
              placeholder="VD: ĐH SPKT Hưng Yên"
            />
          </View>
        </View>

        {/* SECTION 6: ĐẶT LỊCH XEM PHÒNG */}
        <View style={styles.cardSection}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.sectionLabel}>Bật đặt lịch xem phòng</Text>
              <Text style={styles.helperText}>Cho phép sinh viên hẹn giờ qua app</Text>
            </View>
            <Switch
              value={enableBooking}
              onValueChange={setEnableBooking}
              trackColor={{ false: "#bcc9c6", true: "#89f5e7" }}
              thumbColor={enableBooking ? "#00685f" : "#f4f3f4"}
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FIXED BOTTOM ACTION BAR */}
      <View style={styles.bottomDock}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>Tiếp tục & Đăng bài ngay</Text>
          <MaterialIcons name="check-circle" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#faf8ff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#eaedff",
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#131b2e",
  },
  draftBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  draftText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#00685f",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },

  /* Stepper */
  stepperContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 16,
    position: "relative",
    paddingHorizontal: 20,
  },
  stepperLineBackground: {
    position: "absolute",
    left: 40,
    right: 40,
    top: 14,
    height: 2,
    backgroundColor: "#e2e7ff",
    zIndex: 0,
  },
  stepperLineActive: {
    position: "absolute",
    left: 40,
    top: 14,
    height: 2,
    backgroundColor: "#00685f",
    zIndex: 0,
  },
  stepItem: {
    alignItems: "center",
    zIndex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepActiveCircle: {
    backgroundColor: "#00685f",
  },
  stepInactiveCircle: {
    backgroundColor: "#e2e7ff",
  },
  stepActiveText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  stepInactiveText: {
    color: "#3d4947",
    fontSize: 12,
    fontWeight: "600",
  },
  stepLabel: {
    fontSize: 11,
    color: "#6d7a77",
    marginTop: 4,
  },
  stepLabelActive: {
    color: "#00685f",
    fontWeight: "700",
  },

  /* Trust Banner */
  trustBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eaedff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  trustTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  trustTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#131b2e",
  },
  trustSub: {
    fontSize: 11,
    color: "#6d7a77",
    marginTop: 2,
  },

  /* Sections Card */
  cardSection: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e7ff",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#131b2e",
    marginBottom: 8,
  },
  required: {
    color: "#ba1a1a",
  },
  helperText: {
    fontSize: 12,
    color: "#6d7a77",
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  /* Post Type Grid */
  postTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  postTypeOption: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bcc9c6",
    backgroundColor: "#ffffff",
  },
  postTypeOptionActive: {
    borderColor: "#00685f",
    backgroundColor: "#f4fffc",
  },
  postTypeOptionText: {
    marginLeft: 6,
    flex: 1,
  },
  postTypeTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#131b2e",
  },
  postTypeTitleActive: {
    color: "#00685f",
  },
  postTypeSub: {
    fontSize: 10,
    color: "#6d7a77",
  },
  postTypeSubActive: {
    color: "#008378",
  },

  /* Image Upload */
  badgeCount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#00685f",
    backgroundColor: "#eaedff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  imageRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  imageThumbContainer: {
    position: "relative",
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    overflow: "hidden",
  },
  imageThumb: {
    width: "100%",
    height: "100%",
  },
  coverTag: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,104,95,0.85)",
    color: "#fff",
    fontSize: 9,
    textAlign: "center",
    paddingVertical: 2,
    fontWeight: "700",
  },
  removeImgBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#00685f",
    borderStyle: "dashed",
    backgroundColor: "#f2f3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#00685f",
    marginTop: 2,
  },

  /* Form Inputs */
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bcc9c6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#131b2e",
  },
  textArea: {
    minHeight: 100,
  },
  priceInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bcc9c6",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#00685f",
    paddingVertical: 10,
  },
  currencySuffix: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6d7a77",
  },
  insightBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f3ff",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  insightText: {
    fontSize: 12,
    color: "#3d4947",
    marginLeft: 6,
  },
  insightBold: {
    fontWeight: "700",
    color: "#00685f",
  },

  /* Location Section */
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eaedff",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#adc6ff",
    marginBottom: 8,
  },
  gpsBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00685f",
    marginLeft: 6,
  },
  coordsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  coordsText: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "600",
    marginLeft: 4,
  },
  subInputLabel: {
    fontSize: 12,
    color: "#3d4947",
    marginTop: 8,
    marginBottom: 4,
    fontWeight: "600",
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bcc9c6",
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
  },
  inputIcon: {
    marginRight: 6,
  },
  inputInner: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: "#131b2e",
  },

  /* Bottom Dock */
  bottomDock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eaedff",
  },
  submitBtn: {
    backgroundColor: "#00685f",
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
})