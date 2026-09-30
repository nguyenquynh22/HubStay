import React, { useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { activateDevVip } from "../../services/api";
interface Props { onBack?: () => void; userId?: number; }
const plans = [{ key: "MONTHLY", title: "VIP 1 tháng", months: 1 }, { key: "YEARLY", title: "VIP 1 năm", months: 12 }];
export default function PaymentSimulationScreen({ onBack, userId = 1 }: Props) {
  const [selected, setSelected] = useState("MONTHLY");
  const [loading, setLoading] = useState(false);
  const plan = plans.find((p) => p.key === selected) || plans[0];
  const activate = async () => {
    setLoading(true);
    try { await activateDevVip({ user_id: userId, package_name: `VIP_${plan.months === 1 ? "1_MONTH" : "1_YEAR"}`, price: 0, months: plan.months }); Alert.alert("Đã kích hoạt VIP", "Gói demo miễn phí đã được ghi vào lịch sử đăng ký. Bài đăng được ưu tiên trong kết quả tìm kiếm.", [{ text: "OK", onPress: onBack }]); }
    catch (e: any) { const data = e?.response?.data; Alert.alert(data?.required_action === "VERIFY" ? "Cần xác thực trước" : "Không kích hoạt được", data?.message || "Kiểm tra kết nối API."); }
    finally { setLoading(false); }
  };
  return <SafeAreaView style={styles.container}><View style={styles.header}><TouchableOpacity onPress={onBack}><Text style={styles.back}>‹ Quay lại</Text></TouchableOpacity><Text style={styles.heading}>Đăng ký VIP chủ trọ</Text></View><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.hero}><Text style={styles.star}>★</Text><Text style={styles.title}>Bài đăng ưu tiên hiển thị</Text><Text style={styles.copy}>Bài của tài khoản VIP được xếp trước bài thường sau khi người dùng tìm kiếm.</Text></View>
    <Text style={styles.section}>CHỌN THỜI HẠN</Text>{plans.map((item) => <TouchableOpacity key={item.key} onPress={() => setSelected(item.key)} style={[styles.plan, selected === item.key && styles.selected]}><View style={[styles.radio, selected === item.key && styles.radioOn]}/><Text style={styles.planTitle}>{item.title}</Text><Text style={styles.free}>Miễn phí · Dev</Text></TouchableOpacity>)}
    <View style={styles.info}><Text style={styles.infoTitle}>Thanh toán thử nghiệm</Text><Text style={styles.copy}>Không kết nối ngân hàng, VietQR hay ví điện tử. Backend kích hoạt gói với giá 0 đồng và chỉ cho phép ở môi trường phát triển.</Text></View>
    <TouchableOpacity disabled={loading} onPress={activate} style={styles.button}>{loading ? <ActivityIndicator color="white"/> : <Text style={styles.buttonText}>Kích hoạt gói miễn phí</Text>}</TouchableOpacity>
  </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:"#F3F4F6"},header:{padding:16,backgroundColor:"white",borderBottomWidth:1,borderColor:"#E2E8F0"},back:{color:"#00685f",fontWeight:"600"},heading:{fontSize:18,fontWeight:"700",marginTop:10,color:"#1E293B"},content:{padding:16},hero:{backgroundColor:"#F3E8FF",padding:20,borderRadius:14,alignItems:"center"},star:{fontSize:30,color:"#7C3AED"},title:{fontSize:20,fontWeight:"700",color:"#4C1D95",marginTop:5},copy:{color:"#64748B",lineHeight:20,marginTop:8},section:{fontSize:11,fontWeight:"700",color:"#64748B",marginTop:24,marginBottom:8},plan:{backgroundColor:"white",borderWidth:1,borderColor:"#E2E8F0",borderRadius:12,padding:16,marginBottom:10,flexDirection:"row",alignItems:"center"},selected:{borderColor:"#7C3AED",backgroundColor:"#FAF5FF"},radio:{width:18,height:18,borderWidth:2,borderColor:"#94A3B8",borderRadius:9,marginRight:10},radioOn:{borderColor:"#7C3AED",backgroundColor:"#7C3AED"},planTitle:{fontWeight:"700",color:"#1E293B",flex:1},free:{color:"#00685f",fontSize:12,fontWeight:"700"},info:{padding:16,backgroundColor:"white",borderRadius:12,marginTop:10},infoTitle:{fontWeight:"700",color:"#1E293B"},button:{marginTop:20,backgroundColor:"#00685f",padding:15,borderRadius:10,alignItems:"center"},buttonText:{color:"white",fontWeight:"700"}});
