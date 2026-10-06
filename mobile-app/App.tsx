import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { MainTabNavigator } from "./src/navigation/MainTabNavigator";
import IdentityVerificationScreen from "./src/screens/nested/IdentityVerificationScreen";
import ManageAppointmentsScreen from "./src/screens/nested/ManageAppointmentsScreen";
import BookAppointmentModal from "./src/screens/nested/BookAppointmentModal";
import PostDetailScreen from "./src/screens/nested/PostDetailScreen";
import ChatDetailScreen from "./src/screens/nested/ChatDetailScreen";
import ReportPostScreen from "./src/screens/nested/ReportPostScreen";
import TransactionHistoryScreen from "./src/screens/nested/TransactionHistoryScreen";
import PaymentSimulationScreen from "./src/screens/nested/PaymentSimulationScreen";
import VipPackagesScreen from "./src/screens/nested/VipPackagesScreen";
import NotificationsScreen from "./src/screens/nested/NotificationsScreen";
import RentalRequestsScreen from "./src/screens/nested/RentalRequestsScreen";
import LoginScreen from "./src/screens/auth/LoginScreen";
import RegisterScreen from "./src/screens/auth/RegisterScreen";
import { Alert } from "react-native";
import { createConversation, setAuthToken } from "./src/services/api";

export default function App() {
  const [session, setSession] = useState<{ user: any; token: string } | null>(
    null,
  );
  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const currentUserId = Number(session?.user?.user_id || 0);
  const [currentNestedScreen, setCurrentNestedScreen] = useState<string | null>(
    null,
  );
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [bookingReturnScreen, setBookingReturnScreen] = useState<
    "POST_DETAIL" | "CHAT_DETAIL"
  >("POST_DETAIL");

  const handleAuthenticated = (user: any, token: string) => {
    setAuthToken(token);
    setSession({ user, token });
  };

  const logout = () => {
    setAuthToken(null);
    setSession(null);
    setAuthMode("LOGIN");
    setCurrentNestedScreen(null);
  };

  const openPostChat = async () => {
    try {
      const result = await createConversation(
        Number(selectedPost?.post_id),
        currentUserId,
      );
      setSelectedConversation(result.data);
      setCurrentNestedScreen("CHAT_DETAIL");
    } catch (error: any) {
      Alert.alert(
        "Không mở được chat",
        error?.response?.data?.message || "Vui lòng thử lại.",
      );
    }
  };

  if (!session) {
    return authMode === "LOGIN" ? (
      <LoginScreen
        onAuthenticated={handleAuthenticated}
        onSwitchToRegister={() => setAuthMode("REGISTER")}
      />
    ) : (
      <RegisterScreen
        onAuthenticated={handleAuthenticated}
        onSwitchToLogin={() => setAuthMode("LOGIN")}
      />
    );
  }

  return (
    <>
      <StatusBar style="auto" />

      {currentNestedScreen === "VERIFY" ? (
        <IdentityVerificationScreen
          onBack={() => setCurrentNestedScreen(null)}
          userId={currentUserId}
        />
      ) : currentNestedScreen === "APPOINTMENTS" ? (
        <ManageAppointmentsScreen
          onBack={() => setCurrentNestedScreen(null)}
          userId={currentUserId}
          mode="landlord"
        />
      ) : currentNestedScreen === "MY_APPOINTMENTS" ? (
        <ManageAppointmentsScreen
          onBack={() => setCurrentNestedScreen(null)}
          userId={currentUserId}
          mode="tenant"
        />
      ) : currentNestedScreen === "BOOK_APPOINTMENT" ? (
        <BookAppointmentModal
          postId={Number(selectedPost?.post_id)}
          tenantId={currentUserId}
          onBack={() => setCurrentNestedScreen(bookingReturnScreen)}
          onSubmitted={() => setCurrentNestedScreen(bookingReturnScreen)}
        />
      ) : currentNestedScreen === "POST_DETAIL" ? (
        <PostDetailScreen
          post={selectedPost}
          onBack={() => setCurrentNestedScreen(null)}
          userId={currentUserId}
          onReport={() => setCurrentNestedScreen("REPORT")}
          onOpenChat={openPostChat}
          onNavigateToBooking={() => {
            setBookingReturnScreen("POST_DETAIL");
            setCurrentNestedScreen("BOOK_APPOINTMENT");
          }}
        />
      ) : currentNestedScreen === "CHAT_DETAIL" ? (
        <ChatDetailScreen
          onBack={() => setCurrentNestedScreen(null)}
          conversation={selectedConversation}
          userId={currentUserId}
          onBookAppointment={() => {
            setBookingReturnScreen("CHAT_DETAIL");
            setSelectedPost({
              post_id: Number(selectedConversation?.post_id),
              author_id: Number(selectedConversation?.landlord_id),
              title: selectedConversation?.post_title,
              enable_booking: selectedConversation?.enable_booking,
            });
            setCurrentNestedScreen("BOOK_APPOINTMENT");
          }}
        />
      ) : currentNestedScreen === "REPORT" ? (
        <ReportPostScreen
          onBack={() => setCurrentNestedScreen("POST_DETAIL")}
          postId={Number(selectedPost?.post_id)}
          userId={currentUserId}
        />
      ) : currentNestedScreen === "TRANSACTION_HISTORY" ? (
        <TransactionHistoryScreen
          onBack={() => setCurrentNestedScreen(null)}
          userId={currentUserId}
        />
      ) : currentNestedScreen === "PAYMENT_SIMULATION" ? (
        <PaymentSimulationScreen
          onBack={() => setCurrentNestedScreen(null)}
          onOpenVip={() => setCurrentNestedScreen("VIP_PACKAGES")}
          userId={currentUserId}
        />
      ) : currentNestedScreen === "VIP_PACKAGES" ? (
        <VipPackagesScreen
          onBack={() => setCurrentNestedScreen("PAYMENT_SIMULATION")}
          userId={currentUserId}
        />
      ) : currentNestedScreen === "NOTIFICATIONS" ? (
        <NotificationsScreen
          onBack={() => setCurrentNestedScreen(null)}
          userId={currentUserId}
        />
      ) : currentNestedScreen === "RENTAL_REQUESTS" ? (
        <RentalRequestsScreen
          onBack={() => setCurrentNestedScreen(null)}
          userId={currentUserId}
        />
      ) : (
        <MainTabNavigator
          onVerifyPress={() => setCurrentNestedScreen("VERIFY")}
          onOpenManageAppointments={() =>
            setCurrentNestedScreen("APPOINTMENTS")
          }
          onOpenAppointments={(mode) =>
            setCurrentNestedScreen(
              mode === "landlord" ? "APPOINTMENTS" : "MY_APPOINTMENTS",
            )
          }
          onOpenTransactionHistory={() =>
            setCurrentNestedScreen("TRANSACTION_HISTORY")
          }
          onOpenNotifications={() => setCurrentNestedScreen("NOTIFICATIONS")}
          onOpenRentalRequests={() => setCurrentNestedScreen("RENTAL_REQUESTS")}
          onOpenPaymentSimulation={() =>
            setCurrentNestedScreen("PAYMENT_SIMULATION")
          }
          onSelectPost={(post) => {
            setSelectedPost(post);
            setCurrentNestedScreen("POST_DETAIL");
          }}
          onOpenChat={(conversation) => {
            setSelectedConversation(conversation);
            setCurrentNestedScreen("CHAT_DETAIL");
          }}
          userId={currentUserId}
          onLogout={logout}
          onOpenCreate={() => setCurrentNestedScreen(null)}
        />
      )}
    </>
  );
}
