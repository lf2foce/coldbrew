import { redirect } from "next/navigation";

// Trang gốc không có nội dung — vào thẳng hộp thư (middleware đẩy sang /sign-in
// nếu chưa đăng nhập).
export default function Home() {
  redirect("/inbox");
}
