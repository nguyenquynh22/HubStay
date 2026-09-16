// src/screens/main/MyActivityScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { MOCK_APPOINTMENTS } from '../../types/mockData';

interface Props {
  onOpenManageAppointments: () => void;
}

export default function MyActivityScreen({ onOpenManageAppointments }: Props) {
  const [activeTopTab, setActiveTopTab] = useState<'MY_POSTS' | 'SAVED'>('MY_POSTS');
  const pendingCount = MOCK_APPOINTMENTS.filter(a => a.status === 'PENDING').length;

  return (
    <View style={styles.container}>
      {/* Top Tab Bar */}
      <View style={styles.topTabBar}>
        <TouchableOpacity 
          style={[styles.topTab, activeTopTab === 'MY_POSTS' && styles.activeTopTab]}
          onPress={() => setActiveTopTab('MY_POSTS')}
        >
          <Text style={[styles.topTabText, activeTopTab === 'MY_POSTS' && styles.activeTopTabText]}>
            Bài đăng của tôi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.topTab, activeTopTab === 'SAVED' && styles.activeTopTab]}
          onPress={() => setActiveTopTab('SAVED')}
        >
          <Text style={[styles.topTabText, activeTopTab === 'SAVED' && styles.activeTopTabText]}>
            Đã lưu (Bookmark)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Nội dung Bài Đăng Của Tôi */}
      {activeTopTab === 'MY_POSTS' ? (
        <View style={styles.content}>
          <View style={styles.postCard}>
            <Text style={styles.postTitle}>Phòng trọ khép kín full đồ gần ĐH Sư Phạm Kỹ Thuật</Text>
            <Text style={styles.postStatus}>Trạng thái: <Text style={{color: '#00B14F', fontWeight: 'bold'}}>Đang hiển thị</Text></Text>

            {/* Lối vào Lịch Hẹn Xem Phòng có Badge Thông Báo Mới */}
            <TouchableOpacity style={styles.appointmentBtn} onPress={onOpenManageAppointments}>
              <View style={styles.btnRow}>
                <Text style={styles.btnText}>📅 Lịch hẹn xem phòng</Text>
                {pendingCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingCount}</Text>
                  </View>
                )}
              </View>
              <Text style={{color: '#6B7280'}}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.center}><Text>Chưa có bài viết nào được lưu</Text></View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topTabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  topTab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTopTab: { borderBottomWidth: 2, borderColor: '#00B14F' },
  topTabText: { fontSize: 14, color: '#6B7280' },
  activeTopTabText: { color: '#00B14F', fontWeight: 'bold' },
  content: { padding: 14 },
  postCard: { backgroundColor: '#FFF', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  postTitle: { fontSize: 15, fontWeight: 'bold', color: '#1F2937' },
  postStatus: { fontSize: 12, color: '#4B5563', marginVertical: 6 },
  appointmentBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 12, borderRadius: 6, marginTop: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontWeight: 'bold', color: '#166534', fontSize: 13 },
  badge: { backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});