// src/navigation/MainTabNavigator.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { StickyVerificationBanner } from "../components/StickyVerificationBanner";

import HomeScreen from "../screens/main/HomeScreen";
import ChatListScreen from "../screens/main/ChatListScreen";
import CreatePostScreen from "../screens/main/CreatePostScreen";
import MyActivityScreen from "../screens/main/MyActivityScreen";
import ProfileScreen from "../screens/main/ProfileScreen";

interface Props {
  onVerifyPress: () => void;
  onOpenManageAppointments: () => void;
  onSelectPost: (post: any) => void;
  onOpenChat: () => void;
  onOpenCreate: () => void;
}

export const MainTabNavigator: React.FC<Props> = ({
  onVerifyPress,
  onOpenManageAppointments,
  onSelectPost,
  onOpenChat,
  onOpenCreate,
}) => {
  const [currentTab, setCurrentTab] = useState<
    "HOME" | "CHAT" | "CREATE" | "ACTIVITY" | "PROFILE"
  >("HOME");

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Dải Banner Xác Thực Cố Định */}
      <StickyVerificationBanner
        isVerified={false}
        onVerifyPress={onVerifyPress}
      />

      {/* 2. Vùng Nội Dung Thay Đổi Theo Tab */}
      <View style={styles.body}>
        {currentTab === "HOME" && <HomeScreen onSelectPost={onSelectPost} />}
        {currentTab === "CHAT" && <ChatListScreen onOpenChat={onOpenChat} />}
        {currentTab === "CREATE" && (
          <CreatePostScreen onCreated={onOpenCreate} />
        )}
        {currentTab === "ACTIVITY" && (
          <MyActivityScreen
            onOpenManageAppointments={onOpenManageAppointments}
          />
        )}
        {currentTab === "PROFILE" && (
          <ProfileScreen onVerifyPress={onVerifyPress} />
        )}
      </View>

      {/* 3. Bottom Tab Bar 5 Mục */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab("HOME")}
        >
          <Text
            style={[styles.tabIcon, currentTab === "HOME" && styles.activeText]}
          >
            🏠
          </Text>
          <Text
            style={[
              styles.tabLabel,
              currentTab === "HOME" && styles.activeText,
            ]}
          >
            Trang chủ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab("CHAT")}
        >
          <Text
            style={[styles.tabIcon, currentTab === "CHAT" && styles.activeText]}
          >
            💬
          </Text>
          <Text
            style={[
              styles.tabLabel,
              currentTab === "CHAT" && styles.activeText,
            ]}
          >
            Tin nhắn
          </Text>
        </TouchableOpacity>

        {/* Nút [+] Đăng tin Nổi Bật */}
        <TouchableOpacity
          style={styles.plusTabItem}
          onPress={() => setCurrentTab("CREATE")}
        >
          <View style={styles.plusButton}>
            <Text style={styles.plusIcon}>+</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab("ACTIVITY")}
        >
          <Text
            style={[
              styles.tabIcon,
              currentTab === "ACTIVITY" && styles.activeText,
            ]}
          >
            📋
          </Text>
          <Text
            style={[
              styles.tabLabel,
              currentTab === "ACTIVITY" && styles.activeText,
            ]}
          >
            Bài viết
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab("PROFILE")}
        >
          <Text
            style={[
              styles.tabIcon,
              currentTab === "PROFILE" && styles.activeText,
            ]}
          >
            👤
          </Text>
          <Text
            style={[
              styles.tabLabel,
              currentTab === "PROFILE" && styles.activeText,
            ]}
          >
            Cá nhân
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  body: { flex: 1 },
  tabBar: {
    height: 60,
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabIcon: { fontSize: 18, color: "#6B7280" },
  tabLabel: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  activeText: { color: "#00B14F", fontWeight: "bold" },
  plusTabItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  plusButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#00B14F",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -15,
    elevation: 4,
  },
  plusIcon: { color: "#FFF", fontSize: 24, fontWeight: "bold" },
});
