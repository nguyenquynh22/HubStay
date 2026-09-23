// src/types/mockData.ts

export interface Post {
  id: string;
  title: string;
  price: string;
  address: string;
  university: string;
  badge: "SƯ PHẠM KỸ THUẬT" | "BÁCH KHOA" | "GIAO THÔNG";
  imageUrl: string;
  isVerifiedHost: boolean;
  type: "CHO_THUE" | "O_GHEP" | "PASS_PHONG";
  lat: number;
  lng: number;
  status?: "AVAILABLE" | "RENTED" | "PENDING";
  distanceKm?: number;
}

export interface Appointment {
  id: string;
  postId: string;
  postTitle: string;
  userName: string;
  userPhone: string;
  timeSlot: string;
  date: string;
  note: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
}

export interface Transaction {
  id: string;
  postTitle: string;
  amount: number;
  method: "VIETQR" | "MOMO" | "BANK";
  status: "PENDING" | "SUCCESS" | "FAILED";
  date: string;
  description: string;
}

export const UNIVERSITY_COORDS = {
  name: "ĐH SPKT Hưng Yên",
  lat: 20.9324,
  lng: 106.0081,
};

export const calculateDistanceKm = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
) => {
  const earthRadiusKm = 6371;
  const latDelta = ((toLat - fromLat) * Math.PI) / 180;
  const lngDelta = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((earthRadiusKm * c).toFixed(1));
};

export const getNearbyPosts = (radiusKm = 10) =>
  MOCK_POSTS.map((post) => ({
    ...post,
    distanceKm: calculateDistanceKm(
      UNIVERSITY_COORDS.lat,
      UNIVERSITY_COORDS.lng,
      post.lat,
      post.lng,
    ),
  }))
    .filter((post) => post.distanceKm <= radiusKm)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

export const MOCK_POSTS: Post[] = [
  {
    id: "p1",
    title: "Phòng trọ khép kín full đồ gần ĐH Sư Phạm Kỹ Thuật Hưng Yên",
    price: "2.200.000 đ/tháng",
    address: "Dân Tiến, Khoái Châu, Hưng Yên",
    university: "ĐH Sư Phạm Kỹ Thuật Hưng Yên (UTEHY)",
    badge: "SƯ PHẠM KỸ THUẬT",
    imageUrl:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500",
    isVerifiedHost: true,
    type: "CHO_THUE",
    lat: 20.9324,
    lng: 106.0081,
    status: "AVAILABLE",
  },
  {
    id: "p2",
    title: "Pass lại phòng chung cư mini 30m2 có ban công thoáng mát",
    price: "1.800.000 đ/tháng",
    address: "Phường Hiến Nam, TP. Hưng Yên",
    university: "ĐH Sư Phạm Kỹ Thuật Hưng Yên",
    badge: "SƯ PHẠM KỸ THUẬT",
    imageUrl:
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500",
    isVerifiedHost: false,
    type: "PASS_PHONG",
    lat: 20.9425,
    lng: 106.0154,
    status: "AVAILABLE",
  },
  {
    id: "p3",
    title: "Phòng riêng gần trường, có máy giặt, chỗ để xe rộng",
    price: "2.600.000 đ/tháng",
    address: "Ngõ 64 Chu Văn An, P. Hiến Nam",
    university: "ĐH SPKT Hưng Yên",
    badge: "BÁCH KHOA",
    imageUrl:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500",
    isVerifiedHost: true,
    type: "CHO_THUE",
    lat: 20.9182,
    lng: 106.0078,
    status: "PENDING",
  },
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: "app1",
    postId: "p1",
    postTitle: "Phòng trọ khép kín full đồ gần ĐH Sư Phạm Kỹ Thuật",
    userName: "Nguyễn Văn A",
    userPhone: "0987654321",
    timeSlot: "10:30",
    date: "18/10/2026",
    note: "Xem phòng lúc 10h30 sáng, có thể đến sớm 10 phút.",
    status: "PENDING",
  },
  {
    id: "app2",
    postId: "p1",
    postTitle: "Phòng trọ khép kín full đồ gần ĐH Sư Phạm Kỹ Thuật",
    userName: "Trần Thị B",
    userPhone: "0912345678",
    timeSlot: "15:00",
    date: "19/10/2026",
    note: "Hỏi thêm về chỗ để xe máy.",
    status: "CONFIRMED",
  },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "tx1",
    postTitle: "Phòng trọ khép kín gần trường",
    amount: 2800000,
    method: "VIETQR",
    status: "SUCCESS",
    date: "20/09/2026",
    description: "Đặt cọc phòng tháng 9",
  },
  {
    id: "tx2",
    postTitle: "Phòng mini ở ghép",
    amount: 1500000,
    method: "MOMO",
    status: "PENDING",
    date: "18/09/2026",
    description: "Thanh toán giữ chỗ",
  },
  {
    id: "tx3",
    postTitle: "Phòng pass phòng",
    amount: 800000,
    method: "BANK",
    status: "FAILED",
    date: "12/09/2026",
    description: "Thanh toán hoàn tiền 1 phần",
  },
];
