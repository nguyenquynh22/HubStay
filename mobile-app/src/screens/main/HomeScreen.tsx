// src/screens/main/HomeScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { MOCK_POSTS, Post } from "../../types/mockData";

interface Props {
  onSelectPost: (post: Post) => void;
  onOpenNotifications?: () => void;
}

export default function HomeScreen({ onSelectPost, onOpenNotifications }: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* 1. BRAND HEADER (Logo, Tên App, Badge SV & Icon Thông Báo) */}
      <View style={styles.topAppBar}>
        <View style={styles.brandContainer}>
          <View style={styles.brandTitleRow}>
            {/* Logo Icon */}
            <MaterialIcons name="roofing" size={28} color="#00685f" />
            
            {/* Tên App */}
            <Text style={styles.brandName}>HubStay</Text>
            
          </View>
          <Text style={styles.brandSlogan}>Tìm trọ & Ở ghép sinh viên</Text>
        </View>

        {/* Nút Notification có badge đỏ */}
        <TouchableOpacity 
          style={styles.notificationBtn} 
          onPress={onOpenNotifications}
          activeOpacity={0.7}
        >
          <MaterialIcons name="notifications-none" size={24} color="#3d4947" />
          <View style={styles.unreadDot} />
        </TouchableOpacity>
      </View>

      {/* 2. CHỌN TRƯỜNG / KHU VỰC */}
      <View style={styles.locationSelectorContainer}>
        <TouchableOpacity style={styles.locationSelector} activeOpacity={0.8}>
          <View style={styles.locationLeft}>
            <MaterialIcons name="location-on" size={20} color="#0058be" />
            <View style={styles.locationTextGroup}>
              <Text style={styles.locationLabel}>TRƯỜNG ĐANG XEM</Text>
              <Text style={styles.locationName}>Đại học SPKT Hưng Yên (UTEHY)</Text>
            </View>
          </View>
          <View style={styles.locationRight}>
            <Text style={styles.changeText}>Đổi</Text>
            <MaterialIcons name="keyboard-arrow-down" size={18} color="#00685f" />
          </View>
        </TouchableOpacity>
      </View>

      {/* 3. SEARCH BAR */}
      <View style={styles.searchContainer}>
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.9}>
          <MaterialIcons name="search" size={20} color="#6d7a77" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>Tìm theo tên trường, bán kính 2km...</Text>
          <View style={styles.tuneBtn}>
            <MaterialIcons name="tune" size={18} color="#6d7a77" />
          </View>
        </TouchableOpacity>
      </View>

      {/* 4. LIST BÀI ĐĂNG */}
      <FlatList
        data={MOCK_POSTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => onSelectPost(item)}
          >
            {/* Ảnh thumbnail */}
            <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />

            {/* Nội dung bài đăng */}
            <View style={styles.cardContent}>
              {/* Badge loại tin & xác minh */}
              <View style={styles.badgeRow}>
                {item.badge && <Text style={styles.badge}>{item.badge}</Text>}
                {item.isVerifiedHost && (
                  <View style={styles.verifiedTag}>
                    <MaterialIcons name="check-circle" size={12} color="#16A34A" />
                    <Text style={styles.verifiedText}>Đã xác minh</Text>
                  </View>
                )}
              </View>

              {/* Tiêu đề */}
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>

              {/* Giá */}
              <Text style={styles.price}>{item.price}</Text>

              {/* Địa chỉ */}
              <View style={styles.addressRow}>
                <MaterialIcons name="place" size={14} color="#6B7280" />
                <Text style={styles.address} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  /* Top App Bar */
  topAppBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "#ffffff",
  },
  brandContainer: {
    flexDirection: "column",
  },
  brandTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#00685f",
    marginLeft: 6,
    letterSpacing: -0.5,
  },
  svBadge: {
    backgroundColor: "#89f5e7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  svBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#00201d",
  },
  brandSlogan: {
    fontSize: 11,
    color: "#6d7a77",
    marginTop: 2,
    fontWeight: "500",
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f2f3ff",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#ba1a1a",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },

  /* Location Selector */
  locationSelectorContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#ffffff",
  },
  locationSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#eaedff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  locationLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  locationTextGroup: {
    marginLeft: 8,
  },
  locationLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#6d7a77",
    letterSpacing: 0.5,
  },
  locationName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#131b2e",
  },
  locationRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#00685f",
    marginRight: 2,
  },

  /* Search Header */
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
  },
  tuneBtn: {
    padding: 2,
  },

  /* Item List */
  listContent: {
    padding: 12,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    flexDirection: "row",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardImage: { 
    width: 110, 
    height: 110,
    resizeMode: "cover",
  },
  cardContent: { 
    flex: 1, 
    padding: 10,
    justifyContent: "space-between",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    backgroundColor: "#E0F2FE",
    color: "#0369A1",
    fontSize: 10,
    fontWeight: "bold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  verifiedText: {
    color: "#15803D",
    fontSize: 10,
    fontWeight: "bold",
  },
  title: { 
    fontSize: 14, 
    fontWeight: "bold", 
    color: "#1F2937",
    marginTop: 2,
  },
  price: {
    fontSize: 14,
    color: "#00685f",
    fontWeight: "bold",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  address: { 
    fontSize: 12, 
    color: "#6B7280",
    marginLeft: 2,
    flex: 1,
  },
});