/**
 * ============================================================
 * INVOICES JAVASCRIPT (DEV 3)
 * Module: Quản lý Hóa Đơn & Thanh Toán Thu Ngân
 * Bảng Cassandra: invoices_by_booking (Q5)
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    initCustomDropdown((hotelId) => {
        // Tải lại danh sách hóa đơn khi chọn khách sạn
        console.log('Khách sạn đã chọn:', hotelId);
    });

    loadHotels();
});
