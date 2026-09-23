package com.qlks.controller;

import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.cql.PreparedStatement;
import com.datastax.oss.driver.api.core.cql.ResultSet;
import com.datastax.oss.driver.api.core.cql.Row;
import com.qlks.model.Invoice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

/**
 * Controller quản lý Hóa đơn & Thu ngân (Q5 - invoices_by_booking).
 *
 * Query-driven Cassandra:
 * - GET /api/invoices/{bookingId}: truy vấn trực tiếp theo partition key booking_id.
 * - POST /api/invoices: tạo duy nhất một hóa đơn cho mỗi booking_id.
 * - PUT /api/invoices/{bookingId}/pay: cập nhật trạng thái thanh toán.
 * - GET /api/invoices: danh sách phục vụ màn hình thu ngân; do Q5 chỉ có
 *   booking_id làm partition key nên truy vấn danh sách dùng ALLOW FILTERING.
 *   Đây là giới hạn của schema hiện tại; nếu cần báo cáo lớn nên tạo bảng truy vấn riêng.
 */
@RestController
@RequestMapping("/api/invoices")
@CrossOrigin(origins = "*")
public class InvoiceController {

    private static final Logger log = LoggerFactory.getLogger(InvoiceController.class);

    private static final Set<String> PAYMENT_METHODS = Set.of(
            "CASH", "CREDIT_CARD", "MOMO", "VNPAY", "BANK_TRANSFER"
    );
    private static final Set<String> PAYMENT_STATUSES = Set.of("PAID", "UNPAID");

    private final CqlSession session;
    private PreparedStatement selectAllInvoicesStmt;
    private PreparedStatement selectInvoiceByBookingStmt;
    private PreparedStatement insertInvoiceStmt;
    private PreparedStatement updatePaymentStmt;

    private static final List<Invoice> MOCK_INVOICES = new CopyOnWriteArrayList<>();

    static {
        MOCK_INVOICES.add(invoice("B001", "INV-2026-001", "G001", "Nguyen Van An", "H001", "Suong Mai Grand Hotel Da Nang", "Deluxe Ocean View", 2, 3000000, 0, 3000000, "CREDIT_CARD", "PAID", "2026-10-01"));
        MOCK_INVOICES.add(invoice("B002", "INV-2026-002", "G001", "Nguyen Van An", "H003", "Suong Mai Boutique Hotel Da Lat", "Classic Pine View", 3, 2850000, 150000, 2700000, "BANK_TRANSFER", "PAID", "2026-08-15"));
        MOCK_INVOICES.add(invoice("B003", "INV-2026-003", "G002", "Tran Thi Bich", "H001", "Suong Mai Grand Hotel Da Nang", "Executive Suite", 2, 5600000, 300000, 5300000, "CASH", "UNPAID", "2026-10-05"));
        MOCK_INVOICES.add(invoice("B004", "INV-2026-004", "G003", "Le Hoang Nam", "H002", "Suong Mai Luxury Resort Nha Trang", "Beachfront Villa", 4, 14000000, 1000000, 13000000, "CREDIT_CARD", "PAID", "2026-10-10"));
        MOCK_INVOICES.add(invoice("B005", "INV-2026-005", "G004", "Pham Thu Ha", "H004", "Suong Mai Pearl Resort Phu Quoc", "Sunset Ocean Pool Villa", 3, 12600000, 600000, 12000000, "BANK_TRANSFER", "PAID", "2026-09-20"));
        MOCK_INVOICES.add(invoice("B006", "INV-2026-006", "G005", "Dang Minh Tri", "H005", "Suong Mai Heritage Hotel Ha Noi", "Old Quarter Deluxe", 2, 2400000, 0, 2400000, "MOMO", "UNPAID", "2026-11-01"));
        MOCK_INVOICES.add(invoice("B007", "INV-2026-007", "G006", "Vu Thi Mai", "H006", "Suong Mai Riverside Hotel Sai Gon", "Presidential River Suite", 1, 5500000, 500000, 5000000, "CREDIT_CARD", "PAID", "2026-10-15"));
        MOCK_INVOICES.add(invoice("B008", "INV-2026-008", "G007", "Hoang Quoc Viet", "H003", "Suong Mai Boutique Hotel Da Lat", "Romantic Suite", 2, 3600000, 200000, 3400000, "VNPAY", "PAID", "2026-12-24"));
        MOCK_INVOICES.add(invoice("B009", "INV-2026-009", "G008", "Ngo Bao Chau", "H002", "Suong Mai Luxury Resort Nha Trang", "Premier Garden View", 2, 3200000, 0, 3200000, "CASH", "PAID", "2026-09-01"));
        MOCK_INVOICES.add(invoice("B010", "INV-2026-010", "G009", "Do My Linh", "H001", "Suong Mai Grand Hotel Da Nang", "Superior City View", 2, 2200000, 100000, 2100000, "BANK_TRANSFER", "UNPAID", "2026-10-20"));
    }

    private static Invoice invoice(String bookingId, String invoiceId, String guestId, String guestName,
                                   String hotelId, String hotelName, String roomType, int nights,
                                   int subtotal, int discount, int total, String method, String status,
                                   String date) {
        return Invoice.builder()
                .bookingId(bookingId).invoiceId(invoiceId).guestId(guestId).guestName(guestName)
                .hotelId(hotelId).hotelName(hotelName).roomType(roomType).numberOfNights(nights)
                .subtotalVnd(subtotal).discountVnd(discount).totalAmountVnd(total)
                .paymentMethod(method).paymentStatus(status).issuedDate(LocalDate.parse(date)).build();
    }

    @Autowired
    public InvoiceController(@Autowired(required = false) CqlSession session) {
        this.session = session;
        if (session != null) {
            try {
                String columns = "booking_id, invoice_id, guest_id, guest_name, hotel_id, hotel_name, room_type, "
                        + "number_of_nights, subtotal_vnd, discount_vnd, total_amount_vnd, payment_method, "
                        + "payment_status, issued_date";
                this.selectAllInvoicesStmt = session.prepare("SELECT " + columns + " FROM invoices_by_booking ALLOW FILTERING;");
                this.selectInvoiceByBookingStmt = session.prepare("SELECT " + columns + " FROM invoices_by_booking WHERE booking_id = ?;");
                this.insertInvoiceStmt = session.prepare("INSERT INTO invoices_by_booking "
                        + "(booking_id, invoice_id, guest_id, guest_name, hotel_id, hotel_name, room_type, number_of_nights, "
                        + "subtotal_vnd, discount_vnd, total_amount_vnd, payment_method, payment_status, issued_date) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);");
                this.updatePaymentStmt = session.prepare("UPDATE invoices_by_booking SET payment_method = ?, payment_status = ? WHERE booking_id = ?;");
                log.info("Prepared CQL statements for Invoices successfully!");
            } catch (Exception e) {
                log.error("Không thể prepare statement cho Invoice: {}", e.getMessage());
            }
        }
    }

    /** Lấy danh sách hóa đơn, có thể lọc theo hotelId và paymentStatus. */
    @GetMapping
    public ResponseEntity<List<Invoice>> getInvoices(
            @RequestParam(value = "hotelId", required = false) String hotelId,
            @RequestParam(value = "paymentStatus", required = false) String paymentStatus) {

        if (session == null || selectAllInvoicesStmt == null) {
            return ResponseEntity.ok(filterInvoices(MOCK_INVOICES, hotelId, paymentStatus));
        }

        try {
            List<Invoice> invoices = new ArrayList<>();
            for (Row row : session.execute(selectAllInvoicesStmt.bind())) {
                invoices.add(mapRowToInvoice(row));
            }
            return ResponseEntity.ok(filterInvoices(invoices, hotelId, paymentStatus));
        } catch (Exception e) {
            log.error("Lỗi khi truy vấn danh sách hóa đơn: {}", e.getMessage());
            return ResponseEntity.ok(filterInvoices(MOCK_INVOICES, hotelId, paymentStatus));
        }
    }

    /** Tra cứu duy nhất theo booking_id - partition key của Q5. */
    @GetMapping("/{bookingId}")
    public ResponseEntity<Invoice> getInvoiceByBooking(@PathVariable String bookingId) {
        if (bookingId == null || bookingId.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        if (session == null || selectInvoiceByBookingStmt == null) {
            return MOCK_INVOICES.stream()
                    .filter(i -> bookingId.equalsIgnoreCase(i.getBookingId()))
                    .findFirst()
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        }

        try {
            Row row = session.execute(selectInvoiceByBookingStmt.bind(bookingId)).one();
            return row == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(mapRowToInvoice(row));
        } catch (Exception e) {
            log.error("Lỗi khi lấy hóa đơn booking {}: {}", bookingId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /** Xuất hóa đơn cho booking; mỗi booking chỉ có một invoice theo PRIMARY KEY Q5. */
    @PostMapping
    public ResponseEntity<?> createInvoice(@RequestBody Invoice invoice) {
        String validationError = validateInvoice(invoice);
        if (validationError != null) {
            return ResponseEntity.badRequest().body(Map.of("error", validationError));
        }

        if (invoice.getIssuedDate() == null) invoice.setIssuedDate(LocalDate.now());
        if (invoice.getPaymentStatus() == null || invoice.getPaymentStatus().isBlank()) invoice.setPaymentStatus("UNPAID");
        if (invoice.getInvoiceId() == null || invoice.getInvoiceId().isBlank()) invoice.setInvoiceId("INV-" + invoice.getBookingId());
        invoice.setPaymentMethod(normalizeMethod(invoice.getPaymentMethod()));
        invoice.setPaymentStatus(invoice.getPaymentStatus().toUpperCase(Locale.ROOT));

        if (getInvoiceByBooking(invoice.getBookingId()).getStatusCode().is2xxSuccessful()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Booking đã có hóa đơn, không thể tạo hóa đơn thứ hai."));
        }

        if (session == null || insertInvoiceStmt == null) {
            MOCK_INVOICES.add(invoice);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("message", "Xuất hóa đơn thành công (Mock Mode)", "invoice", invoice));
        }

        try {
            session.execute(insertInvoiceStmt.bind(
                    invoice.getBookingId(), invoice.getInvoiceId(), invoice.getGuestId(), invoice.getGuestName(),
                    invoice.getHotelId(), invoice.getHotelName(), invoice.getRoomType(), invoice.getNumberOfNights(),
                    invoice.getSubtotalVnd(), invoice.getDiscountVnd(), invoice.getTotalAmountVnd(),
                    invoice.getPaymentMethod(), invoice.getPaymentStatus(), invoice.getIssuedDate()
            ));
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of("message", "Xuất hóa đơn thành công!", "invoice", invoice));
        } catch (Exception e) {
            log.error("Lỗi khi tạo hóa đơn {}: {}", invoice.getBookingId(), e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /** Xác nhận thanh toán và cập nhật PAID + phương thức thanh toán. */
    @PutMapping("/{bookingId}/pay")
    public ResponseEntity<?> payInvoice(
            @PathVariable String bookingId,
            @RequestBody(required = false) Map<String, String> payload,
            @RequestParam(value = "paymentMethod", required = false) String paymentMethod) {

        String method = paymentMethod;
        if (payload != null && payload.get("paymentMethod") != null) method = payload.get("paymentMethod");
        method = normalizeMethod(method);
        if (method == null || !PAYMENT_METHODS.contains(method)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Phương thức thanh toán không hợp lệ.", "allowed", PAYMENT_METHODS));
        }

        ResponseEntity<Invoice> currentResponse = getInvoiceByBooking(bookingId);
        if (!currentResponse.getStatusCode().is2xxSuccessful() || currentResponse.getBody() == null) {
            return ResponseEntity.notFound().build();
        }
        Invoice current = currentResponse.getBody();

        if ("PAID".equalsIgnoreCase(current.getPaymentStatus())) {
            return ResponseEntity.ok(Map.of("message", "Hóa đơn đã được thanh toán trước đó.", "invoice", current));
        }

        if (session == null || updatePaymentStmt == null) {
            current.setPaymentMethod(method);
            current.setPaymentStatus("PAID");
            return ResponseEntity.ok(Map.of("message", "Xác nhận thanh toán thành công (Mock Mode)", "invoice", current));
        }

        try {
            session.execute(updatePaymentStmt.bind(method, "PAID", bookingId));
            current.setPaymentMethod(method);
            current.setPaymentStatus("PAID");
            return ResponseEntity.ok(Map.of("message", "Xác nhận thanh toán thành công!", "invoice", current));
        } catch (Exception e) {
            log.error("Lỗi thanh toán booking {}: {}", bookingId, e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    private List<Invoice> filterInvoices(List<Invoice> source, String hotelId, String paymentStatus) {
        return source.stream()
                .filter(i -> hotelId == null || hotelId.isBlank() || hotelId.equalsIgnoreCase(i.getHotelId()))
                .filter(i -> paymentStatus == null || paymentStatus.isBlank() || paymentStatus.equalsIgnoreCase(i.getPaymentStatus()))
                .collect(Collectors.toList());
    }

    private String validateInvoice(Invoice invoice) {
        if (invoice == null) return "Dữ liệu hóa đơn không được để trống.";
        if (blank(invoice.getBookingId())) return "bookingId là bắt buộc.";
        if (blank(invoice.getGuestId())) return "guestId là bắt buộc.";
        if (blank(invoice.getGuestName())) return "guestName là bắt buộc.";
        if (blank(invoice.getHotelId())) return "hotelId là bắt buộc.";
        if (blank(invoice.getHotelName())) return "hotelName là bắt buộc.";
        if (invoice.getNumberOfNights() == null || invoice.getNumberOfNights() <= 0) return "numberOfNights phải lớn hơn 0.";
        if (invoice.getSubtotalVnd() == null || invoice.getSubtotalVnd() < 0) return "subtotalVnd không hợp lệ.";
        if (invoice.getDiscountVnd() == null || invoice.getDiscountVnd() < 0) return "discountVnd không hợp lệ.";
        if (invoice.getDiscountVnd() > invoice.getSubtotalVnd()) return "discountVnd không được lớn hơn subtotalVnd.";
        int expectedTotal = invoice.getSubtotalVnd() - invoice.getDiscountVnd();
        if (invoice.getTotalAmountVnd() == null || invoice.getTotalAmountVnd() != expectedTotal) return "totalAmountVnd phải bằng subtotalVnd - discountVnd.";
        String method = normalizeMethod(invoice.getPaymentMethod());
        if (method != null && !PAYMENT_METHODS.contains(method)) return "paymentMethod không hợp lệ.";
        String status = invoice.getPaymentStatus();
        if (status != null && !status.isBlank() && !PAYMENT_STATUSES.contains(status.toUpperCase(Locale.ROOT))) return "paymentStatus phải là PAID hoặc UNPAID.";
        return null;
    }

    private String normalizeMethod(String method) {
        return method == null || method.isBlank() ? null : method.trim().toUpperCase(Locale.ROOT);
    }

    private boolean blank(String value) { return value == null || value.isBlank(); }

    private Invoice mapRowToInvoice(Row row) {
        return Invoice.builder()
                .bookingId(row.getString("booking_id"))
                .invoiceId(row.getString("invoice_id"))
                .guestId(row.getString("guest_id"))
                .guestName(row.getString("guest_name"))
                .hotelId(row.getString("hotel_id"))
                .hotelName(row.getString("hotel_name"))
                .roomType(row.getString("room_type"))
                .numberOfNights(row.getInt("number_of_nights"))
                .subtotalVnd(row.getInt("subtotal_vnd"))
                .discountVnd(row.getInt("discount_vnd"))
                .totalAmountVnd(row.getInt("total_amount_vnd"))
                .paymentMethod(row.getString("payment_method"))
                .paymentStatus(row.getString("payment_status"))
                .issuedDate(row.getLocalDate("issued_date"))
                .build();
    }
}
