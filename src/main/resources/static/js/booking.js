/**
 * ============================================================
 * BOOKINGS JAVASCRIPT (DEV 2)
 * Module: Quản lý Đặt Phòng & Check-in / Check-out
 * Bảng Cassandra: bookings_by_hotel_date (Q4) & bookings_by_guest (Q3)
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    initCustomDropdown((hotelId) => {
        // Tải lại danh sách booking khi chọn khách sạn
        console.log('Khách sạn đã chọn:', hotelId);
    });

    loadHotels();
});
