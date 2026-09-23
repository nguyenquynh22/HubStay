// src/navigation/MainTabNavigator.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform
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
  onOpenTransactionHistory: () => void;
  onOpenPaymentSimulation: () => void;
  onSelectPost: (post: any) => void;
  onOpenChat: () => void;
  onOpenCreate: () => void;
}

export const MainTabNavigator: React.FC<Props> = ({
  onVerifyPress,
  onOpenManageAppointments,
  onOpenTransactionHistory,
  onOpenPaymentSimulation,
  onSelectPost,
  onOpenChat,
  onOpenCreate,
}) => {
  const [currentTab, setCurrentTab] = useState<
    "HOME" | "CHAT" | "CREATE" | "ACTIVITY" | "PROFILE"
  >("HOME");

  return (
    <SafeAreaView style={styles.container}>
      <StickyVerificationBanner
        isVerified={false}
        onVerifyPress={onVerifyPress}
      />

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
          <ProfileScreen
            onVerifyPress={onVerifyPress}
            onOpenTransactionHistory={onOpenTransactionHistory}
            onOpenPaymentSimulation={onOpenPaymentSimulation}
          />
        )}
      </View>

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
  activeText: { color: "#6B8FA3", fontWeight: "bold" },
  plusTabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  plusButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#00685f",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -26, // Đẩy nút nhô lên đúng nửa chiều cao nút
    // Đổ bóng cho iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    // Đổ bóng cho Android
    elevation: 6,
  },
  plusIcon: { 
    color: "#FFF", 
    fontSize: 28, 
    fontWeight: "bold",
    marginTop: Platform.OS === "ios" ? -2 : -4, 
  },
});
