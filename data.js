// ==============================================================================
// HOANG KIM HUE PROJECT - UNIVERSAL DATA REPOSITORY (data.js)
// Tác giả: Hoàng Kim Huệ | Lead AI & Data Intelligence Specialist
// ==============================================================================

// Bộ dữ liệu kinh doanh mẫu đa ngành để người dùng có thể trải nghiệm tức thì
const SAMPLE_DATASET = [
    { id: "ENT-01", entity_name: "Tập Đoàn Công Nghệ VinaTech", sector: "Công nghệ", revenue: 24500000000, cost: 14700000000, profit: 9800000000, growth_pct: 28.5, score: 92, risk_level: "Thấp", status: "Xuất sắc" },
    { id: "ENT-02", entity_name: "Công Ty Tài Chính Delta Credit", sector: "Tài chính", revenue: 18900000000, cost: 12200000000, profit: 6700000000, growth_pct: 15.2, score: 85, risk_level: "Trung bình", status: "Tiềm năng" },
    { id: "ENT-03", entity_name: "Chuỗi Bán Lẻ Á Châu Mart", sector: "Bán lẻ", revenue: 31200000000, cost: 24960000000, profit: 6240000000, growth_pct: 8.4, score: 74, risk_level: "Trung bình", status: "Tiềm năng" },
    { id: "ENT-04", entity_name: "Tổng Công Ty Vận Tải Toàn Cầu", sector: "Logistics", revenue: 15400000000, cost: 13860000000, profit: 1540000000, growth_pct: -4.5, score: 58, risk_level: "Cao", status: "Cảnh báo" },
    { id: "ENT-05", entity_name: "Dược Phẩm Sinh Học BioHealth", sector: "Y tế & Dược", revenue: 27800000000, cost: 15290000000, profit: 12510000000, growth_pct: 34.0, score: 96, risk_level: "Thấp", status: "Xuất sắc" },
    { id: "ENT-06", entity_name: "Nhà Máy Cơ Khí Tân Phát", sector: "Sản xuất", revenue: 12600000000, cost: 11340000000, profit: 1260000000, growth_pct: 3.1, score: 62, risk_level: "Cao", status: "Cảnh báo" },
    { id: "ENT-07", entity_name: "Nền Tảng Thương Mại Số NexStore", sector: "Công nghệ", revenue: 22100000000, cost: 17680000000, profit: 4420000000, growth_pct: 42.0, score: 88, risk_level: "Trung bình", status: "Tiềm năng" },
    { id: "ENT-08", entity_name: "Hệ Thống Phân Phối MegaDistribution", sector: "Bán lẻ", revenue: 9800000000, cost: 9310000000, profit: 490000000, growth_pct: -12.4, score: 41, risk_level: "Rất cao", status: "Nguy cơ cao" },
    { id: "ENT-09", entity_name: "Công Ty Năng Lượng Xanh GreenPower", sector: "Năng lượng", revenue: 19500000000, cost: 12675000000, profit: 6825000000, growth_pct: 22.8, score: 89, risk_level: "Thấp", status: "Xuất sắc" },
    { id: "ENT-10", entity_name: "Công Ty Cổ Phần Thực Phẩm An Gia", sector: "Tiêu dùng", revenue: 16800000000, cost: 13440000000, profit: 3360000000, growth_pct: 6.5, score: 71, risk_level: "Trung bình", status: "Ổn định" },
    { id: "ENT-11", entity_name: "Tập Đoàn Dệt May Quốc Tế Minh Trí", sector: "Sản xuất", revenue: 14200000000, cost: 12780000000, profit: 1420000000, growth_pct: -1.2, score: 59, risk_level: "Cao", status: "Cảnh báo" },
    { id: "ENT-12", entity_name: "Bệnh Viện Đa Khoa Tâm Đức", sector: "Y tế & Dược", revenue: 25600000000, cost: 16640000000, profit: 8960000000, growth_pct: 18.0, score: 91, risk_level: "Thấp", status: "Xuất sắc" },
    { id: "ENT-13", entity_name: "Dịch Vụ Kho Vận Tân Cảng Logistics", sector: "Logistics", revenue: 17300000000, cost: 14186000000, profit: 3114000000, growth_pct: 9.8, score: 76, risk_level: "Trung bình", status: "Ổn định" },
    { id: "ENT-14", entity_name: "Bất Động Sản & Nghỉ Dưỡng SunLand", sector: "Bất động sản", revenue: 38400000000, cost: 26880000000, profit: 11520000000, growth_pct: 14.2, score: 86, risk_level: "Trung bình", status: "Tiềm năng" },
    { id: "ENT-15", entity_name: "Cung Ứng Vật Liệu Xây Dựng Nam Hải", sector: "Xây dựng", revenue: 8700000000, cost: 8439000000, profit: 261000000, growth_pct: -18.5, score: 36, risk_level: "Rất cao", status: "Nguy cơ cao" },
    { id: "ENT-16", entity_name: "Phần Mềm Quản Trị Doanh Nghiệp CloudERP", sector: "Công nghệ", revenue: 16500000000, cost: 8250000000, profit: 8250000000, growth_pct: 55.0, score: 95, risk_level: "Thấp", status: "Xuất sắc" }
];

// Trạng thái dữ liệu phân tích hiện hành (Mặc định khởi tạo rỗng chờ người dùng tải file)
let currentDataset = [];
let datasetMetadata = {
    fileName: "",
    rowCount: 0,
    columns: [],
    numericColumns: [],
    categoricalColumns: [],
    primaryMetric: null,
    categoryMetric: null,
    totalSum: 0,
    averageVal: 0,
    anomaliesCount: 0
};

// Expose ra window để truy cập từ mọi module
window.SAMPLE_DATASET = SAMPLE_DATASET;
window.currentDataset = currentDataset;
window.datasetMetadata = datasetMetadata;
