const modules = [
  'Trại và ao/bể',
  'Đàn giống',
  'Nhật ký chăm sóc',
  'Môi trường & cảnh báo',
  'Hình ảnh & AI',
  'Chi phí & xuất bán',
  'Thống kê & báo cáo',
]

export default function App() {
  return (
    <main className="shell">
      <section className="card">
        <p className="eyebrow">React · Express · Supabase</p>
        <h1>ChillShrimp</h1>
        <p className="subtitle">Hệ thống quản lý trại tôm/cua giống đang ở giai đoạn khởi tạo.</p>
        <div className="notice">Project configuration ready · Chưa triển khai nghiệp vụ</div>
        <h2>Phạm vi hệ thống</h2>
        <ul className="module-list">
          {modules.map((module) => <li key={module}>{module}</li>)}
        </ul>
      </section>
    </main>
  )
}
