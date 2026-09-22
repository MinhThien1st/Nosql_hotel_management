package com.qlks.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Model ánh xạ bảng 'invoices_by_booking' (Q5)
 * Primary Key: ((booking_id))
 * Phụ trách: Thành viên 3 (Module Hóa đơn & Thanh toán)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Invoice {
    private String bookingId;
    private String invoiceId;
    private String guestId;
    private String guestName;
    private String hotelId;
    private String hotelName;
    private String roomType;
    private Integer numberOfNights;
    private Integer subtotalVnd;
    private Integer discountVnd;
    private Integer totalAmountVnd;
    private String paymentMethod;    // CASH, CREDIT_CARD, BANK_TRANSFER, MOMO, VNPAY
    private String paymentStatus;    // PAID, UNPAID, REFUNDED
    private LocalDate issuedDate;
}
