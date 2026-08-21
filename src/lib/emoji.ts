/** Bộ emoji hay dùng khi trực chat bán hàng/CSKH tiếng Việt.
 *
 * Danh sách CỨNG, không kéo thư viện emoji-picker: các thư viện đó nặng vài trăm KB
 * và kèm theo bộ dữ liệu tra cứu đa ngôn ngữ — trong khi người trực thực tế chỉ dùng
 * đi dùng lại vài chục cái. App này cố ý mỏng.
 *
 * Xếp theo việc thật: chào hỏi & cảm xúc trước, rồi xác nhận/từ chối, rồi mấy thứ
 * hay nhắc trong đơn hàng và lịch hẹn.
 */
export const EMOJI: { ten: string; ky: string[] }[] = [
  {
    ten: "Hay dùng",
    ky: ["😊", "🥰", "😍", "😁", "😂", "🤣", "😅", "🙂", "😉", "😌", "🤗", "🙏", "👍", "👏", "❤️", "🧡", "💚", "💙", "💜", "🤝"],
  },
  {
    ten: "Xác nhận",
    ky: ["✅", "☑️", "✔️", "❌", "⭕", "❗", "❓", "⚠️", "🔔", "📌", "📍", "🎯", "💡", "🆗", "🆕", "🔥", "⭐", "🌟", "💯", "🎉"],
  },
  {
    ten: "Đơn hàng & lịch",
    ky: ["📅", "🗓️", "⏰", "🕐", "📞", "📱", "💬", "📩", "📦", "🚚", "🛒", "💰", "💵", "🏷️", "🧾", "📝", "📄", "📋", "🏠", "🏥"],
  },
];
