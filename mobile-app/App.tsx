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
import { Alert } from "react-native";
import { createConversation } from "./src/services/api";

const CURRENT_USER_ID = 1; // Demo identity until a real login/session flow is connected.

export default function App() {
  const [currentNestedScreen, setCurrentNestedScreen] = useState<string | null>(
    null,
  );
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [bookingReturnScreen, setBookingReturnScreen] = useState<
    "POST_DETAIL" | "CHAT_DETAIL"
  >("POST_DETAIL");

  const openPostChat = async () => {
    try {
      const result = await createConversation(
        Number(selectedPost?.post_id),
        CURRENT_USER_ID,
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

  return (
    <>
      <StatusBar style="auto" />

      {currentNestedScreen === "VERIFY" ? (
        <IdentityVerificationScreen
          onBack={() => setCurrentNestedScreen(null)}
          userId={CURRENT_USER_ID}
        />
      ) : currentNestedScreen === "APPOINTMENTS" ? (
        <ManageAppointmentsScreen
          onBack={() => setCurrentNestedScreen(null)}
          userId={CURRENT_USER_ID}
          mode="landlord"
        />
      ) : currentNestedScreen === "MY_APPOINTMENTS" ? (
        <ManageAppointmentsScreen
          onBack={() => setCurrentNestedScreen(null)}
          userId={CURRENT_USER_ID}
          mode="tenant"
        />
      ) : currentNestedScreen === "BOOK_APPOINTMENT" ? (
        <BookAppointmentModal
          postId={Number(selectedPost?.post_id)}
          tenantId={CURRENT_USER_ID}
          onBack={() => setCurrentNestedScreen(bookingReturnScreen)}
          onSubmitted={() => setCurrentNestedScreen(bookingReturnScreen)}
        />
      ) : currentNestedScreen === "POST_DETAIL" ? (
        <PostDetailScreen
          post={selectedPost}
          onBack={() => setCurrentNestedScreen(null)}
          userId={CURRENT_USER_ID}
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
          userId={CURRENT_USER_ID}
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
        />
      ) : currentNestedScreen === "TRANSACTION_HISTORY" ? (
        <TransactionHistoryScreen
          onBack={() => setCurrentNestedScreen(null)}
          userId={CURRENT_USER_ID}
        />
      ) : currentNestedScreen === "PAYMENT_SIMULATION" ? (
        <PaymentSimulationScreen
          onBack={() => setCurrentNestedScreen(null)}
          onOpenVip={() => setCurrentNestedScreen("VIP_PACKAGES")}
          userId={CURRENT_USER_ID}
        />
      ) : currentNestedScreen === "VIP_PACKAGES" ? (
        <VipPackagesScreen
          onBack={() => setCurrentNestedScreen("PAYMENT_SIMULATION")}
          userId={CURRENT_USER_ID}
        />
      ) : currentNestedScreen === "NOTIFICATIONS" ? (
        <NotificationsScreen
          onBack={() => setCurrentNestedScreen(null)}
          userId={CURRENT_USER_ID}
        />
      ) : currentNestedScreen === "RENTAL_REQUESTS" ? (
        <RentalRequestsScreen
          onBack={() => setCurrentNestedScreen(null)}
          userId={CURRENT_USER_ID}
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
          userId={CURRENT_USER_ID}
          onOpenCreate={() => setCurrentNestedScreen(null)}
        />
      )}
    </>
  );
}
