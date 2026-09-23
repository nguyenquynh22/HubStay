import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Share,
  Alert,
  Linking,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Mock Data Bài đăng (Giả lập nhận dữ liệu từ CreatePostScreen)
const MOCK_POST = {
  id: "post_101",
  postType: "RENTAL", // 'RENTAL' | 'SHARE' | 'PASS' | 'FIND'
  postTypeLabel: "CHO THUÊ",
  title: "Phòng khép kín sạch đẹp có gác lửng, gần ĐH SPKT",
  price: "2.800.000 đ/tháng",
  address: "Gần ngõ 64 Đường Chu Văn An, P. Hiến Nam, TP. Hưng Yên",
  nearestSchool: "ĐH SPKT Hưng Yên (cách ~400m)",
  description:
    "- Phòng diện tích 25m2, mới sơn sửa 100%, gác cao không đụng đầu.\n- Tiện nghi: Điều hòa Inverter, bình nóng lạnh, tủ quần áo.\n- Điện: 3.500đ/kWh, Nước: 25.000đ/khối, Wifi tốc độ cao miễn phí.\n- Giờ giấc tự do, khóa cửa vân tay an toàn.",
  images: [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
  ],
  author: {
    name: "Nguyễn Văn Đan",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    isVerified: true, // Trạng thái xác minh
    phone: "0987654321",
    joinedDate: "Tháng 03/2024",
  },
  coords: {
    lat: 20.9324,
    lng: 106.0081,
  },
  enableBooking: true,
  createdAt: "2 giờ trước",
};

interface Props {
  onBack?: () => void;
  onNavigateToChat?: (authorId: string) => void;
  onNavigateToBooking?: (postId: string) => void;
  onReport?: () => void;
  onOpenChat: () => void;
  post?: any;
}

export default function PostDetailScreen({
  onBack,
  onNavigateToChat,
  onNavigateToBooking,
  onReport,
  onOpenChat,
  post,
}: Props) {
  const currentPost = post || MOCK_POST;

  // 1. Image Slider State
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // 2. Interaction State
  const [isSaved, setIsSaved] = useState(false);
  const [likes, setLikes] = useState(18);
  const [dislikes, setDislikes] = useState(1);
  const [userReaction, setUserReaction] = useState<"like" | "dislike" | null>(
    null,
  );
  const [roomStatus, setRoomStatus] = useState<"AVAILABLE" | "RENTED">(
    currentPost.status || "AVAILABLE",
  );
  const [hostConfirmed, setHostConfirmed] = useState(false);
  const [viewerConfirmed, setViewerConfirmed] = useState(false);

  // 3. Map View Toggle State
  const [showMap, setShowMap] = useState(false);

  const distanceKm = (() => {
    const toLat = currentPost.coords?.lat ?? 20.9324;
    const toLng = currentPost.coords?.lng ?? 106.0081;
    const latDelta = ((toLat - 20.9324) * Math.PI) / 180;
    const lngDelta = ((toLng - 106.0081) * Math.PI) / 180;
    const a =
      Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
      Math.cos((20.9324 * Math.PI) / 180) *
        Math.cos((toLat * Math.PI) / 180) *
        Math.sin(lngDelta / 2) *
        Math.sin(lngDelta / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((6371 * c).toFixed(1));
  })();

  // Next / Previous image controls
  const handlePrevImage = () => {
    if (currentImgIndex > 0) {
      setCurrentImgIndex((prev) => prev - 1);
    }
  };

  const handleNextImage = () => {
    if (currentImgIndex < MOCK_POST.images.length - 1) {
      setCurrentImgIndex((prev) => prev + 1);
    }
  };

  // Chia sẻ bài viết
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Xem phòng trọ này nè: ${MOCK_POST.title} - Giá: ${MOCK_POST.price}`,
      });
    } catch (error) {
      console.log("Error sharing:", error);
    }
  };

  // Xử lý Thích / Không thích
  const handleLike = () => {
    if (userReaction === "like") {
      setUserReaction(null);
      setLikes((prev) => prev - 1);
    } else {
      if (userReaction === "dislike") {
        setDislikes((prev) => prev - 1);
      }
      setUserReaction("like");
      setLikes((prev) => prev + 1);
    }
  };

  const handleDislike = () => {
    if (userReaction === "dislike") {
      setUserReaction(null);
      setDislikes((prev) => prev - 1);
    } else {
      if (userReaction === "like") {
        setLikes((prev) => prev - 1);
      }
      setUserReaction("dislike");
      setDislikes((prev) => prev + 1);
    }
  };

  // Mở ứng dụng Google Maps bên ngoài khi nhấn xem bản đồ
  const handleOpenExternalMap = () => {
    if (MOCK_POST.coords) {
      const url = `https://www.google.com/maps/search/?api=1&query=${MOCK_POST.coords.lat},${MOCK_POST.coords.lng}`;
      Linking.openURL(url);
    }
  };

  // Báo cáo bài đăng
  const handleReport = () => {
    if (onReport) {
      onReport();
      return;
    }

    Alert.alert(
      "Báo cáo bài đăng",
      "Bạn muốn báo cáo bài đăng này vì lý do gì?",
      [
        {
          text: "Thông tin sai sự thật",
          onPress: () => sendReport("Sai thông tin"),
        },
        {
          text: "Lừa đảo / Phòng không có thật",
          onPress: () => sendReport("Lừa đảo"),
        },
        { text: "Giá phòng không đúng", onPress: () => sendReport("Sai giá") },
        { text: "Hủy", style: "cancel" },
      ],
    );
  };

  const sendReport = (reason: string) => {
    Alert.alert(
      "Cảm ơn bạn",
      `Báo cáo (${reason}) đã được gửi đến ban quản trị.`,
    );
  };

  const handleViewerConfirm = () => {
    if (roomStatus === "RENTED") return;
    setViewerConfirmed(true);
    if (hostConfirmed) {
      setRoomStatus("RENTED");
      Alert.alert(
        "Đã ẩn bài đăng",
        "Cả hai bên đã xác nhận phòng này đã được thuê. Bài đăng sẽ không hiển thị nữa.",
      );
      return;
    }
    Alert.alert(
      "Đã lưu xác nhận",
      "Bạn đã xác nhận thuê phòng. Chủ trọ sẽ kiểm tra và xác nhận lại để ẩn bài đăng.",
    );
  };

  const handleHostConfirm = () => {
    if (roomStatus === "RENTED") return;
    setHostConfirmed(true);
    if (viewerConfirmed) {
      setRoomStatus("RENTED");
      Alert.alert(
        "Đã ẩn bài đăng",
        "Chủ trọ và người xem đã xác nhận phòng đã có người thuê. Bài đăng sẽ bị ẩn khỏi danh sách tìm kiếm.",
      );
      return;
    }
    Alert.alert(
      "Đã xác nhận",
      "Bạn đã xác nhận phòng này đã được thuê. Hệ thống sẽ ẩn bài đăng khi cả hai xác nhận đồng ý.",
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* 1. KHU VỰC HÌNH ẢNH BANNER + NÚT CHỨC NĂNG FLOATING */}
        <View style={styles.imageHeaderContainer}>
          <Image
            source={{ uri: MOCK_POST.images[currentImgIndex] }}
            style={styles.mainImage}
            resizeMode="cover"
          />

          {/* Tag loại tin (VD: CHO THUÊ / Ở GHÉP) */}
          <View style={styles.postTypeBadge}>
            <Text style={styles.postTypeBadgeText}>
              {MOCK_POST.postTypeLabel}
            </Text>
          </View>

          {/* Nút Back (Góc trái) */}
          <TouchableOpacity
            style={[styles.circleBtn, styles.backBtn]}
            onPress={onBack}
          >
            <MaterialIcons name="arrow-back" size={22} color="#131b2e" />
          </TouchableOpacity>

          {/* Nhóm nút Share & Lưu (Góc phải) */}
          <View style={styles.topRightActions}>
            <TouchableOpacity style={styles.circleBtn} onPress={handleShare}>
              <MaterialIcons name="share" size={20} color="#131b2e" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => setIsSaved(!isSaved)}
            >
              <MaterialIcons
                name={isSaved ? "bookmark" : "bookmark-border"}
                size={22}
                color={isSaved ? "#00685f" : "#131b2e"}
              />
            </TouchableOpacity>
          </View>

          {/* Nút Điều hướng Next / Prev Ảnh */}
          {currentImgIndex > 0 && (
            <TouchableOpacity
              style={[styles.navArrowBtn, styles.prevBtn]}
              onPress={handlePrevImage}
            >
              <MaterialIcons name="chevron-left" size={28} color="#ffffff" />
            </TouchableOpacity>
          )}

          {currentImgIndex < MOCK_POST.images.length - 1 && (
            <TouchableOpacity
              style={[styles.navArrowBtn, styles.nextBtn]}
              onPress={handleNextImage}
            >
              <MaterialIcons name="chevron-right" size={28} color="#ffffff" />
            </TouchableOpacity>
          )}

          {/* Chỉ số ảnh (Ví dụ: 2/6) */}
          <View style={styles.imageCounterBadge}>
            <MaterialIcons name="photo-camera" size={14} color="#ffffff" />
            <Text style={styles.imageCounterText}>
              {currentImgIndex + 1}/{MOCK_POST.images.length}
            </Text>
          </View>
        </View>

        {/* 2. NỘI DUNG CHÍNH BÀI ĐĂNG */}
        <View style={styles.contentContainer}>
          {/* Giá & Thời gian */}
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{MOCK_POST.price}</Text>
            <Text style={styles.timeText}>{MOCK_POST.createdAt}</Text>
          </View>

          {/* Tiêu đề */}
          <Text style={styles.titleText}>{MOCK_POST.title}</Text>

          {/* Địa chỉ & Trường lân cận */}
          <View style={styles.locationContainer}>
            <View style={styles.iconInfoRow}>
              <MaterialIcons name="place" size={18} color="#00685f" />
              <Text style={styles.locationText}>{MOCK_POST.address}</Text>
            </View>
            <View style={styles.iconInfoRow}>
              <MaterialIcons name="school" size={18} color="#0058be" />
              <Text style={styles.schoolText}>{MOCK_POST.nearestSchool}</Text>
            </View>
            <View style={styles.distanceRow}>
              <MaterialIcons name="directions-walk" size={18} color="#0f766e" />
              <Text style={styles.distanceText}>
                Cách trường {distanceKm.toFixed(1)} km
              </Text>
            </View>
          </View>

          {roomStatus === "RENTED" && (
            <View style={styles.rentedBanner}>
              <MaterialIcons name="info" size={18} color="#b45309" />
              <Text style={styles.rentedText}>
                Phòng này đã được xác nhận đã có người thuê và đã được ẩn khỏi
                danh sách tìm kiếm.
              </Text>
            </View>
          )}

          {roomStatus !== "RENTED" && (
            <View style={styles.confirmationCard}>
              <Text style={styles.confirmTitle}>Xác nhận thuê / đã thuê</Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={styles.confirmBtnPrimary}
                  onPress={handleViewerConfirm}
                >
                  <Text style={styles.confirmBtnText}>Xác nhận thuê</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtnSecondary}
                  onPress={handleHostConfirm}
                >
                  <Text style={styles.confirmBtnSecondaryText}>
                    Phòng này đã được thuê
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 3. THÔNG TIN NGƯỜI ĐĂNG & TRẠNG THÁI XÁC THỰC */}
          <View style={styles.authorCard}>
            <Image
              source={{ uri: MOCK_POST.author.avatar }}
              style={styles.avatar}
            />
            <View style={styles.authorDetails}>
              <View style={styles.authorNameRow}>
                <Text style={styles.authorName}>{MOCK_POST.author.name}</Text>
                {MOCK_POST.author.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <MaterialIcons name="verified" size={14} color="#00685f" />
                    <Text style={styles.verifiedText}>Đã xác minh</Text>
                  </View>
                )}
              </View>
              <Text style={styles.authorSubText}>
                Tham gia: {MOCK_POST.author.joinedDate}
              </Text>
            </View>
          </View>

          {/* 4. MÔ TẢ CHI TIẾT */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Mô tả phòng trọ</Text>
            <Text style={styles.descriptionText}>{MOCK_POST.description}</Text>
          </View>

          {/* 5. VỊ TRÍ TRÊN BẢN ĐỒ (KHUNG MAP BẮT SỰ KIỆN NHẤN LÀ HIỆN) */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Vị trí & Khu vực</Text>
            {!showMap ? (
              <TouchableOpacity
                style={styles.mapPlaceholder}
                onPress={() => setShowMap(true)}
              >
                <MaterialIcons name="map" size={36} color="#00685f" />
                <Text style={styles.mapPlaceholderText}>
                  Nhấn để xem bản đồ khu vực phòng trọ
                </Text>
                <Text style={styles.mapSubText}>
                  Vị trí chính xác sẽ được bảo mật bán kính ~100m
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.activeMapContainer}>
                {/* Giả lập khung Map view */}
                <View style={styles.mockMapView}>
                  <MaterialIcons name="location-on" size={40} color="#BA1A1A" />
                  <Text style={styles.mockMapPinText}>Khu vực phòng trọ</Text>
                </View>
                <TouchableOpacity
                  style={styles.externalMapBtn}
                  onPress={handleOpenExternalMap}
                >
                  <MaterialIcons name="directions" size={18} color="#00685f" />
                  <Text style={styles.externalMapBtnText}>
                    Mở trong Google Maps
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 6. LƯỢT TIÊU CỰC / TÍCH CỰC & NÚT BÁO CÁO */}
          <View style={styles.reactionRow}>
            <View style={styles.likeDislikeGroup}>
              <TouchableOpacity
                style={[
                  styles.reactionBtn,
                  userReaction === "like" && styles.activeLikeBtn,
                ]}
                onPress={handleLike}
              >
                <MaterialIcons
                  name="thumb-up"
                  size={18}
                  color={userReaction === "like" ? "#00685f" : "#6d7a77"}
                />
                <Text
                  style={[
                    styles.reactionText,
                    userReaction === "like" && styles.activeLikeText,
                  ]}
                >
                  {likes}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.reactionBtn,
                  userReaction === "dislike" && styles.activeDislikeBtn,
                ]}
                onPress={handleDislike}
              >
                <MaterialIcons
                  name="thumb-down"
                  size={18}
                  color={userReaction === "dislike" ? "#ba1a1a" : "#6d7a77"}
                />
                <Text
                  style={[
                    styles.reactionText,
                    userReaction === "dislike" && styles.activeDislikeText,
                  ]}
                >
                  {dislikes}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Nút báo cáo bài đăng */}
            <TouchableOpacity style={styles.reportBtn} onPress={handleReport}>
              <MaterialIcons name="flag" size={18} color="#ba1a1a" />
              <Text style={styles.reportText}>Báo cáo tin</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 7. FIXED BOTTOM ACTION BAR (CHAT & ĐẶT LỊCH) */}
      <View style={styles.bottomDock}>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() =>
            onNavigateToChat && onNavigateToChat(MOCK_POST.author.name)
          }
        >
          <MaterialIcons name="chat" size={20} color="#00685f" />
          <Text style={styles.chatBtnText}>Nhắn tin</Text>
        </TouchableOpacity>

        {MOCK_POST.enableBooking && (
          <TouchableOpacity
            style={styles.bookingBtn}
            onPress={() =>
              onNavigateToBooking && onNavigateToBooking(MOCK_POST.id)
            }
          >
            <MaterialIcons name="event" size={20} color="#ffffff" />
            <Text style={styles.bookingBtnText}>Đặt lịch xem phòng</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf8ff",
  },

  /* Header Image Banner */
  imageHeaderContainer: {
    width: SCREEN_WIDTH,
    height: 280,
    position: "relative",
    backgroundColor: "#131b2e",
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  postTypeBadge: {
    position: "absolute",
    top: 44,
    left: 60,
    backgroundColor: "#00685f",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  postTypeBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  backBtn: {
    position: "absolute",
    top: 40,
    left: 14,
  },
  topRightActions: {
    position: "absolute",
    top: 40,
    right: 14,
    flexDirection: "row",
    gap: 8,
  },
  navArrowBtn: {
    position: "absolute",
    top: "45%",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    padding: 4,
  },
  prevBtn: {
    left: 10,
  },
  nextBtn: {
    right: 10,
  },
  imageCounterBadge: {
    position: "absolute",
    bottom: 12,
    right: 14,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  imageCounterText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },

  /* Main Body Content */
  contentContainer: {
    padding: 16,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  priceText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#00685f",
  },
  timeText: {
    fontSize: 12,
    color: "#6d7a77",
  },
  titleText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#131b2e",
    lineHeight: 24,
    marginBottom: 12,
  },

  /* Location Info */
  locationContainer: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e7ff",
    gap: 8,
    marginBottom: 16,
  },
  iconInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationText: {
    fontSize: 13,
    color: "#131b2e",
    flex: 1,
    fontWeight: "500",
  },
  schoolText: {
    fontSize: 13,
    color: "#0058be",
    flex: 1,
    fontWeight: "600",
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  distanceText: {
    fontSize: 13,
    color: "#0f766e",
    fontWeight: "700",
  },
  rentedBanner: {
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  rentedText: {
    flex: 1,
    color: "#92400E",
    fontSize: 12,
    fontWeight: "600",
  },
  confirmationCard: {
    backgroundColor: "#EAF5F1",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#CDE9E0",
  },
  confirmTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },
  confirmButtons: {
    gap: 8,
  },
  confirmBtnPrimary: {
    backgroundColor: "#00685f",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  confirmBtnSecondary: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#00685f",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  confirmBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  confirmBtnSecondaryText: {
    color: "#00685f",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Author Card */
  authorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e7ff",
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  authorDetails: {
    marginLeft: 12,
    flex: 1,
  },
  authorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  authorName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#131b2e",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e6f4f2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#00685f",
  },
  authorSubText: {
    fontSize: 11,
    color: "#6d7a77",
    marginTop: 2,
  },

  /* Section Blocks */
  sectionBlock: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e7ff",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#131b2e",
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: "#3d4947",
    lineHeight: 22,
  },

  /* Map Container */
  mapPlaceholder: {
    height: 120,
    backgroundColor: "#f2f3ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#adc6ff",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  mapPlaceholderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#00685f",
    marginTop: 6,
  },
  mapSubText: {
    fontSize: 11,
    color: "#6d7a77",
    marginTop: 2,
  },
  activeMapContainer: {
    borderRadius: 8,
    overflow: "hidden",
  },
  mockMapView: {
    height: 140,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  mockMapPinText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#BA1A1A",
    marginTop: 4,
  },
  externalMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    backgroundColor: "#f4fffc",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#e2e7ff",
  },
  externalMapBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00685f",
  },

  /* Reactions & Report */
  reactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    paddingHorizontal: 4,
  },
  likeDislikeGroup: {
    flexDirection: "row",
    gap: 8,
  },
  reactionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#bcc9c6",
  },
  activeLikeBtn: {
    borderColor: "#00685f",
    backgroundColor: "#e6f4f2",
  },
  activeDislikeBtn: {
    borderColor: "#ba1a1a",
    backgroundColor: "#fde8e8",
  },
  reactionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6d7a77",
  },
  activeLikeText: {
    color: "#00685f",
  },
  activeDislikeText: {
    color: "#ba1a1a",
  },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  reportText: {
    fontSize: 12,
    color: "#ba1a1a",
    fontWeight: "600",
  },

  /* Bottom Actions Dock */
  bottomDock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#eaedff",
    flexDirection: "row",
    gap: 12,
  },
  chatBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#00685f",
    backgroundColor: "#f4fffc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  chatBtnText: {
    color: "#00685f",
    fontSize: 14,
    fontWeight: "700",
  },
  bookingBtn: {
    flex: 1.4,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#00685f",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  bookingBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
