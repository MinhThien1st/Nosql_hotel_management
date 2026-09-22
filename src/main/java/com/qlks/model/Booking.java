package com.qlks.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Model ánh xạ bảng 'bookings_by_hotel_date' (Q4) & 'bookings_by_guest' (Q3)
 * Phụ trách: Thành viên 2 (Module Đặt phòng & Check-in/out)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Booking {
    private String bookingId;
    private String hotelId;
    private String hotelName;
    private String guestId;
    private String guestName;
    private String roomNumber;
    private String roomType;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Integer numberOfNights;
    private Integer numberOfGuests;
    private String status;          // CONFIRMED, CHECKED_IN, COMPLETED, CANCELLED
    private String specialRequest;
    private Integer totalAmountVnd;
}
