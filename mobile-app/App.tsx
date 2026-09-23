import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { MainTabNavigator } from "./src/navigation/MainTabNavigator";
import IdentityVerificationScreen from "./src/screens/nested/IdentityVerificationScreen";
import ManageAppointmentsScreen from "./src/screens/nested/ManageAppointmentsScreen";
import PostDetailScreen from "./src/screens/nested/PostDetailScreen";
import ChatDetailScreen from "./src/screens/nested/ChatDetailScreen";
import ReportPostScreen from "./src/screens/nested/ReportPostScreen";
import TransactionHistoryScreen from "./src/screens/nested/TransactionHistoryScreen";
import PaymentSimulationScreen from "./src/screens/nested/PaymentSimulationScreen";

export default function App() {
  const [currentNestedScreen, setCurrentNestedScreen] = useState<string | null>(
    null,
  );
  const [selectedPost, setSelectedPost] = useState<any>(null);

  return (
    <>
      <StatusBar style="auto" />

      {currentNestedScreen === "VERIFY" ? (
        <IdentityVerificationScreen
          onBack={() => setCurrentNestedScreen(null)}
        />
      ) : currentNestedScreen === "APPOINTMENTS" ? (
        <ManageAppointmentsScreen onBack={() => setCurrentNestedScreen(null)} />
      ) : currentNestedScreen === "POST_DETAIL" ? (
        <PostDetailScreen
          post={selectedPost}
          onBack={() => setCurrentNestedScreen(null)}
          onReport={() => setCurrentNestedScreen("REPORT")}
          onOpenChat={() => setCurrentNestedScreen("CHAT_DETAIL")}
        />
      ) : currentNestedScreen === "CHAT_DETAIL" ? (
        <ChatDetailScreen
          onBack={() => setCurrentNestedScreen(null)}
          post={selectedPost}
        />
      ) : currentNestedScreen === "REPORT" ? (
        <ReportPostScreen
          onBack={() => setCurrentNestedScreen("POST_DETAIL")}
        />
      ) : currentNestedScreen === "TRANSACTION_HISTORY" ? (
        <TransactionHistoryScreen onBack={() => setCurrentNestedScreen(null)} />
      ) : currentNestedScreen === "PAYMENT_SIMULATION" ? (
        <PaymentSimulationScreen onBack={() => setCurrentNestedScreen(null)} />
      ) : (
        <MainTabNavigator
          onVerifyPress={() => setCurrentNestedScreen("VERIFY")}
          onOpenManageAppointments={() =>
            setCurrentNestedScreen("APPOINTMENTS")
          }
          onOpenTransactionHistory={() =>
            setCurrentNestedScreen("TRANSACTION_HISTORY")
          }
          onOpenPaymentSimulation={() =>
            setCurrentNestedScreen("PAYMENT_SIMULATION")
          }
          onSelectPost={(post) => {
            setSelectedPost(post);
            setCurrentNestedScreen("POST_DETAIL");
          }}
          onOpenChat={() => setCurrentNestedScreen("CHAT_DETAIL")}
          onOpenCreate={() => setCurrentNestedScreen(null)}
        />
      )}
    </>
  );
}
