/**
 * Tô vàng đoạn khớp trong một chuỗi — chép `highlightMatch` của dashboard.
 *
 * Chỉ tô LẦN KHỚP ĐẦU: tô hết mọi lần khớp thì tên khách dài thành loang lổ,
 * và dòng xem trước vốn đã bị cắt ngắn nên lần thứ hai hiếm khi lọt vào.
 */
export function Highlight({ text, term }: { text: string; term: string }) {
  const q = term.trim();
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm px-0.5 text-inherit" style={{ background: "#fde68a" }}>
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}
