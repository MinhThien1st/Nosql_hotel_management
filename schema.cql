-- ============================================================
-- HỆ THỐNG QUẢN LÝ KHÁCH SẠN & ĐẶT PHÒNG (QLKS) - ASTRA DB
-- File: schema.cql
-- Hướng dẫn: Mở Astra DB CQL Console -> Chạy script này để tạo 5 bảng NoSQL
-- ============================================================

-- Q1: THÔNG TIN KHÁCH SẠN
CREATE TABLE IF NOT EXISTS hotels (
    hotel_id text,
    hotel_name text,
    tagline text,
    city text,
    address text,
    star_rating int,
    phone text,
    total_rooms int,
    has_pool boolean,
    has_spa boolean,
    PRIMARY KEY (hotel_id)
);

-- Q2: DANH SÁCH PHÒNG THEO KHÁCH SẠN
CREATE TABLE IF NOT EXISTS rooms_by_hotel (
    hotel_id text,
    room_number text,
    room_type text,
    floor int,
    price_vnd int,
    room_view text,
    status text,
    capacity int,
    description text,
    PRIMARY KEY ((hotel_id), room_number)
) WITH CLUSTERING ORDER BY (room_number ASC);

-- Q3: LỊCH SỬ ĐẶT PHÒNG THEO KHÁCH HÀNG
CREATE TABLE IF NOT EXISTS bookings_by_guest (
    guest_id text,
    check_in_date date,
    booking_id text,
    guest_name text,
    hotel_id text,
    hotel_name text,
    room_type text,
    check_out_date date,
    number_of_nights int,
    status text,
    total_amount_vnd int,
    PRIMARY KEY ((guest_id), check_in_date, booking_id)
) WITH CLUSTERING ORDER BY (check_in_date DESC, booking_id ASC);

-- Q4: BOOKING THEO KHÁCH SẠN VÀ NGÀY CHECK-IN
CREATE TABLE IF NOT EXISTS bookings_by_hotel_date (
    hotel_id text,
    check_in_date date,
    booking_id text,
    guest_id text,
    guest_name text,
    room_number text,
    room_type text,
    check_out_date date,
    status text,
    special_request text,
    number_of_guests int,
    PRIMARY KEY ((hotel_id), check_in_date, booking_id)
) WITH CLUSTERING ORDER BY (check_in_date ASC, booking_id ASC);

-- Q5: HÓA ĐƠN THEO BOOKING
CREATE TABLE IF NOT EXISTS invoices_by_booking (
    booking_id text,
    invoice_id text,
    guest_id text,
    guest_name text,
    hotel_id text,
    hotel_name text,
    room_type text,
    number_of_nights int,
    subtotal_vnd int,
    discount_vnd int,
    total_amount_vnd int,
    payment_method text,
    payment_status text,
    issued_date date,
    PRIMARY KEY ((booking_id))
);
