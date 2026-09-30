import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getPostsByUserId, getSavedPosts } from "../../services/api";
interface Props { onOpenManageAppointments: () => void; userId?: number; }
export default function MyActivityScreen({ onOpenManageAppointments, userId = 1 }: Props) {
  const [tab, setTab] = useState<"MY_POSTS" | "SAVED">("MY_POSTS");
  const [posts, setPosts] = useState<any[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { const [mine, bookmarks] = await Promise.all([getPostsByUserId(userId), getSavedPosts(userId)]); setPosts(mine.data || []); setSaved(bookmarks.data || []); }
    catch (e) { console.error("Không tải được hoạt động", e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [userId]);
  useEffect(() => { load(); }, [load]);
  const rows = tab === "MY_POSTS" ? posts : saved;
  return <View style={styles.container}><View style={styles.tabs}>{([["MY_POSTS", "Bài đăng của tôi"], ["SAVED", "Đã lưu"]] as const).map(([key, label]) => <TouchableOpacity key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.active]}><Text style={[styles.tabText, tab === key && styles.activeText]}>{label}</Text></TouchableOpacity>)}</View>
    <TouchableOpacity onPress={onOpenManageAppointments} style={styles.appointments}><Text style={styles.appointmentText}>Lịch hẹn xem phòng ›</Text></TouchableOpacity>
    {loading ? <ActivityIndicator style={{ marginTop: 30 }} color="#00685f"/> : <FlatList data={rows} keyExtractor={(item) => String(item.post_id)} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}/>} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.empty}>{tab === "MY_POSTS" ? "Bạn chưa có bài đăng nào" : "Chưa có bài đăng nào được lưu"}</Text>} renderItem={({ item }) => <View style={styles.card}><Text style={styles.title}>{item.title}</Text><Text style={styles.price}>{Number(item.price).toLocaleString("vi-VN")} đ/tháng</Text><Text style={styles.address}>{item.address || item.address_detail}</Text><Text style={styles.status}>Trạng thái: {item.status}</Text></View>}/>}
  </View>;
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:"#F9FAFB"},tabs:{flexDirection:"row",backgroundColor:"white",borderBottomWidth:1,borderColor:"#E5E7EB"},tab:{flex:1,padding:14,alignItems:"center"},active:{borderBottomWidth:2,borderColor:"#00685f"},tabText:{color:"#64748B"},activeText:{color:"#00685f",fontWeight:"700"},appointments:{margin:12,padding:13,backgroundColor:"#E8F0F3",borderRadius:9},appointmentText:{color:"#405D6B",fontWeight:"700"},list:{padding:12},card:{backgroundColor:"white",padding:14,borderRadius:10,marginBottom:10,borderWidth:1,borderColor:"#E5E7EB"},title:{fontSize:16,fontWeight:"700",color:"#1E293B"},price:{color:"#00685f",fontWeight:"700",marginTop:5},address:{color:"#64748B",marginTop:4},status:{color:"#64748B",fontSize:12,marginTop:5},empty:{textAlign:"center",color:"#94A3B8",padding:24}});
