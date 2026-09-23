package com.qlks.controller;

import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.cql.PreparedStatement;
import com.datastax.oss.driver.api.core.cql.ResultSet;
import com.datastax.oss.driver.api.core.cql.Row;
import com.qlks.model.Booking;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Controller quản lý Đặt phòng / Check-in / Check-out.
 *
 * Các bảng Cassandra sử dụng:
 * - bookings_by_hotel_date
 * - bookings_by_guest
 * - bookings_by_id
 * - rooms_by_hotel
 *
 * Phụ trách: Dev 2
 */
@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
public class BookingController {

    private static final Logger log =
            LoggerFactory.getLogger(BookingController.class);

    private final CqlSession session;

    // ============================================================
    // SELECT
    // ============================================================

    private PreparedStatement selectBookingsByHotelDateStmt;
    private PreparedStatement selectBookingsByGuestStmt;
    private PreparedStatement selectBookingByIdStmt;
    private PreparedStatement selectRoomByIdStmt;

    // ============================================================
    // INSERT
    // ============================================================

    private PreparedStatement insertBookingByHotelDateStmt;
    private PreparedStatement insertBookingByGuestStmt;
    private PreparedStatement insertBookingByIdStmt;

    // ============================================================
    // UPDATE
    // ============================================================

    private PreparedStatement updateBookingByIdStatusStmt;
    private PreparedStatement updateBookingByHotelStatusStmt;
    private PreparedStatement updateBookingByGuestStatusStmt;
    private PreparedStatement updateRoomStatusStmt;

    // ============================================================
    // MOCK DATA
    // ============================================================

    private static final List<Booking> MOCK_BOOKINGS = new ArrayList<>();

    static {
        MOCK_BOOKINGS.add(
                Booking.builder()
                        .bookingId("B001")
                        .guestId("G001")
                        .guestName("Nguyen Van An")
                        .hotelId("H001")
                        .hotelName("Suong Mai Grand Hotel Da Nang")
                        .roomNumber("101")
                        .roomType("Deluxe Ocean View")
                        .checkInDate(LocalDate.of(2026, 10, 1))
                        .checkOutDate(LocalDate.of(2026, 10, 3))
                        .numberOfNights(2)
                        .numberOfGuests(2)
                        .status("CONFIRMED")
                        .specialRequest("Tang cao, check-in muon 18h")
                        .totalAmountVnd(3000000)
                        .build()
        );

        MOCK_BOOKINGS.add(
                Booking.builder()
                        .bookingId("B002")
                        .guestId("G001")
                        .guestName("Nguyen Van An")
                        .hotelId("H003")
                        .hotelName("Suong Mai Boutique Hotel Da Lat")
                        .roomNumber("101")
                        .roomType("Classic Pine View")
                        .checkInDate(LocalDate.of(2026, 8, 15))
                        .checkOutDate(LocalDate.of(2026, 8, 18))
                        .numberOfNights(3)
                        .numberOfGuests(2)
                        .status("COMPLETED")
                        .specialRequest("Khong hut thuoc")
                        .totalAmountVnd(2850000)
                        .build()
        );

        MOCK_BOOKINGS.add(
                Booking.builder()
                        .bookingId("B003")
                        .guestId("G002")
                        .guestName("Tran Thi Bich")
                        .hotelId("H001")
                        .hotelName("Suong Mai Grand Hotel Da Nang")
                        .roomNumber("201")
                        .roomType("Executive Suite")
                        .checkInDate(LocalDate.of(2026, 10, 5))
                        .checkOutDate(LocalDate.of(2026, 10, 7))
                        .numberOfNights(2)
                        .numberOfGuests(2)
                        .status("CONFIRMED")
                        .specialRequest("Ky niem ngay cuoi")
                        .totalAmountVnd(5600000)
                        .build()
        );
    }

    // ============================================================
    // CONSTRUCTOR
    // ============================================================

    @Autowired
    public BookingController(
            @Autowired(required = false) CqlSession session) {

        this.session = session;

        if (session == null) {
            log.warn("BookingController đang chạy Mock Mode vì chưa có CqlSession.");
            return;
        }

        try {
            // --------------------------------------------------------
            // SELECT Q4: booking theo khách sạn + ngày check-in
            // --------------------------------------------------------
            this.selectBookingsByHotelDateStmt = session.prepare(
                    """
                    SELECT hotel_id,
                           check_in_date,
                           booking_id,
                           guest_id,
                           guest_name,
                           room_number,
                           room_type,
                           check_out_date,
                           status,
                           special_request,
                           number_of_guests
                    FROM bookings_by_hotel_date
                    WHERE hotel_id = ?
                    AND check_in_date = ?;
                    """
            );

            // --------------------------------------------------------
            // SELECT Q3: lịch sử booking theo khách
            // --------------------------------------------------------
            this.selectBookingsByGuestStmt = session.prepare(
                    """
                    SELECT guest_id,
                           check_in_date,
                           booking_id,
                           guest_name,
                           hotel_id,
                           hotel_name,
                           room_type,
                           check_out_date,
                           number_of_nights,
                           status,
                           total_amount_vnd
                    FROM bookings_by_guest
                    WHERE guest_id = ?;
                    """
            );

            // --------------------------------------------------------
            // SELECT booking theo ID
            // --------------------------------------------------------
            this.selectBookingByIdStmt = session.prepare(
                    """
                    SELECT *
                    FROM bookings_by_id
                    WHERE booking_id = ?;
                    """
            );

            // --------------------------------------------------------
            // SELECT phòng
            // --------------------------------------------------------
            this.selectRoomByIdStmt = session.prepare(
                    """
                    SELECT hotel_id,
                           room_number,
                           room_type,
                           price_vnd,
                           status,
                           capacity
                    FROM rooms_by_hotel
                    WHERE hotel_id = ?
                    AND room_number = ?;
                    """
            );

            // --------------------------------------------------------
            // INSERT Q4
            // --------------------------------------------------------
            this.insertBookingByHotelDateStmt = session.prepare(
                    """
                    INSERT INTO bookings_by_hotel_date (
                        hotel_id,
                        check_in_date,
                        booking_id,
                        guest_id,
                        guest_name,
                        room_number,
                        room_type,
                        check_out_date,
                        status,
                        special_request,
                        number_of_guests
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """
            );

            // --------------------------------------------------------
            // INSERT Q3
            // --------------------------------------------------------
            this.insertBookingByGuestStmt = session.prepare(
                    """
                    INSERT INTO bookings_by_guest (
                        guest_id,
                        check_in_date,
                        booking_id,
                        guest_name,
                        hotel_id,
                        hotel_name,
                        room_type,
                        check_out_date,
                        number_of_nights,
                        status,
                        total_amount_vnd
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """
            );

            // --------------------------------------------------------
            // INSERT booking lookup
            // --------------------------------------------------------
            this.insertBookingByIdStmt = session.prepare(
                    """
                    INSERT INTO bookings_by_id (
                        booking_id,
                        guest_id,
                        guest_name,
                        hotel_id,
                        hotel_name,
                        room_number,
                        room_type,
                        check_in_date,
                        check_out_date,
                        number_of_nights,
                        number_of_guests,
                        status,
                        special_request,
                        total_amount_vnd
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """
            );

            // --------------------------------------------------------
            // UPDATE status bookings_by_id
            // --------------------------------------------------------
            this.updateBookingByIdStatusStmt = session.prepare(
                    """
                    UPDATE bookings_by_id
                    SET status = ?
                    WHERE booking_id = ?;
                    """
            );

            // --------------------------------------------------------
            // UPDATE status bookings_by_hotel_date
            // --------------------------------------------------------
            this.updateBookingByHotelStatusStmt = session.prepare(
                    """
                    UPDATE bookings_by_hotel_date
                    SET status = ?
                    WHERE hotel_id = ?
                    AND check_in_date = ?
                    AND booking_id = ?;
                    """
            );

            // --------------------------------------------------------
            // UPDATE status bookings_by_guest
            // --------------------------------------------------------
            this.updateBookingByGuestStatusStmt = session.prepare(
                    """
                    UPDATE bookings_by_guest
                    SET status = ?
                    WHERE guest_id = ?
                    AND check_in_date = ?
                    AND booking_id = ?;
                    """
            );

            // --------------------------------------------------------
            // UPDATE trạng thái phòng
            // --------------------------------------------------------
            this.updateRoomStatusStmt = session.prepare(
                    """
                    UPDATE rooms_by_hotel
                    SET status = ?
                    WHERE hotel_id = ?
                    AND room_number = ?;
                    """
            );

            log.info("Prepared CQL Statements for Bookings successfully!");

        } catch (Exception e) {
            log.error(
                    "Không thể prepare Booking statements: {}",
                    e.getMessage()
            );
        }
    }

    // ============================================================
    // GET BOOKING THEO KHÁCH SẠN + NGÀY
    // GET /api/bookings?hotelId=H001&date=2026-10-01
    // ============================================================

    @GetMapping
    public ResponseEntity<List<Booking>> getBookingsByHotelDate(
            @RequestParam("hotelId") String hotelId,
            @RequestParam("date")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {

        if (session == null || selectBookingsByHotelDateStmt == null) {
            List<Booking> result = MOCK_BOOKINGS.stream()
                    .filter(b -> b.getHotelId().equalsIgnoreCase(hotelId))
                    .filter(b -> b.getCheckInDate().equals(date))
                    .collect(Collectors.toList());

            return ResponseEntity.ok(result);
        }

        try {
            ResultSet rs = session.execute(
                    selectBookingsByHotelDateStmt.bind(
                            hotelId,
                            date
                    )
            );

            List<Booking> bookings = new ArrayList<>();

            for (Row row : rs) {
                bookings.add(mapHotelDateRowToBooking(row));
            }

            return ResponseEntity.ok(bookings);

        } catch (Exception e) {
            log.error(
                    "Lỗi khi lấy booking hotel {} ngày {}: {}",
                    hotelId,
                    date,
                    e.getMessage()
            );

            return ResponseEntity.internalServerError().build();
        }
    }

    // ============================================================
    // GET LỊCH SỬ BOOKING THEO KHÁCH
    // GET /api/bookings/guest/G001
    // ============================================================

    @GetMapping("/guest/{guestId}")
    public ResponseEntity<List<Booking>> getBookingsByGuest(
            @PathVariable("guestId") String guestId) {

        if (session == null || selectBookingsByGuestStmt == null) {
            List<Booking> result = MOCK_BOOKINGS.stream()
                    .filter(b -> b.getGuestId().equalsIgnoreCase(guestId))
                    .collect(Collectors.toList());

            return ResponseEntity.ok(result);
        }

        try {
            ResultSet rs = session.execute(
                    selectBookingsByGuestStmt.bind(guestId)
            );

            List<Booking> bookings = new ArrayList<>();

            for (Row row : rs) {
                bookings.add(mapGuestRowToBooking(row));
            }

            return ResponseEntity.ok(bookings);

        } catch (Exception e) {
            log.error(
                    "Lỗi khi lấy booking của guest {}: {}",
                    guestId,
                    e.getMessage()
            );

            return ResponseEntity.internalServerError().build();
        }
    }

    // ============================================================
    // POST TẠO BOOKING
    // POST /api/bookings
    // ============================================================

    @PostMapping
    public ResponseEntity<?> createBooking(
            @RequestBody Booking booking) {

        // --------------------------------------------------------
        // 1. Validate dữ liệu bắt buộc
        // --------------------------------------------------------
        if (isBlank(booking.getGuestId())) {
            return badRequest("guestId là bắt buộc!");
        }

        if (isBlank(booking.getGuestName())) {
            return badRequest("guestName là bắt buộc!");
        }

        if (isBlank(booking.getHotelId())) {
            return badRequest("hotelId là bắt buộc!");
        }

        if (isBlank(booking.getRoomNumber())) {
            return badRequest("roomNumber là bắt buộc!");
        }

        if (booking.getCheckInDate() == null
                || booking.getCheckOutDate() == null) {

            return badRequest(
                    "Ngày check-in và check-out là bắt buộc!"
            );
        }

        // --------------------------------------------------------
        // 2. Validate ngày
        // --------------------------------------------------------
        if (!booking.getCheckOutDate()
                .isAfter(booking.getCheckInDate())) {

            return badRequest(
                    "Ngày check-out phải sau ngày check-in!"
            );
        }

        // --------------------------------------------------------
        // 3. Số khách mặc định
        // --------------------------------------------------------
        if (booking.getNumberOfGuests() == null
                || booking.getNumberOfGuests() <= 0) {

            booking.setNumberOfGuests(1);
        }

        // --------------------------------------------------------
        // 4. Tính số đêm
        // --------------------------------------------------------
        long nights = ChronoUnit.DAYS.between(
                booking.getCheckInDate(),
                booking.getCheckOutDate()
        );

        booking.setNumberOfNights((int) nights);

        // --------------------------------------------------------
        // 5. Sinh booking ID
        // --------------------------------------------------------
        if (isBlank(booking.getBookingId())) {
            booking.setBookingId(
                    "B-" +
                    UUID.randomUUID()
                            .toString()
                            .substring(0, 8)
                            .toUpperCase()
            );
        }

        // --------------------------------------------------------
        // 6. Status mặc định
        // --------------------------------------------------------
        booking.setStatus("CONFIRMED");

        // --------------------------------------------------------
        // 7. Mock Mode
        // --------------------------------------------------------
        if (session == null
                || insertBookingByHotelDateStmt == null
                || insertBookingByGuestStmt == null
                || insertBookingByIdStmt == null
                || selectRoomByIdStmt == null
                || updateRoomStatusStmt == null) {

            if (booking.getTotalAmountVnd() == null) {
                booking.setTotalAmountVnd(0);
            }

            MOCK_BOOKINGS.add(booking);

            return ResponseEntity.ok(
                    Map.of(
                            "message",
                            "Tạo booking thành công (Mock Mode)",
                            "booking",
                            booking
                    )
            );
        }

        // --------------------------------------------------------
        // 8. Astra DB Mode
        // --------------------------------------------------------
        try {
            // 8.1. Tìm phòng
            Row roomRow = session.execute(
                    selectRoomByIdStmt.bind(
                            booking.getHotelId(),
                            booking.getRoomNumber()
                    )
            ).one();

            if (roomRow == null) {
                return badRequest("Phòng không tồn tại!");
            }

            // 8.2. Kiểm tra trạng thái phòng
            String currentRoomStatus =
                    roomRow.getString("status");

            if (!"AVAILABLE".equalsIgnoreCase(currentRoomStatus)) {
                return badRequest(
                        "Phòng hiện không khả dụng! Trạng thái: "
                                + currentRoomStatus
                );
            }

            // 8.3. Lấy dữ liệu thật của phòng
            String roomType =
                    roomRow.getString("room_type");

            int pricePerNight =
                    roomRow.getInt("price_vnd");

            int capacity =
                    roomRow.getInt("capacity");

            booking.setRoomType(roomType);

            // 8.4. Kiểm tra sức chứa
            if (booking.getNumberOfGuests() > capacity) {
                return badRequest(
                        "Số khách vượt quá sức chứa của phòng! "
                                + "Tối đa: "
                                + capacity
                );
            }

            // 8.5. Tính tổng tiền
            int totalAmount =
                    pricePerNight * booking.getNumberOfNights();

            booking.setTotalAmountVnd(totalAmount);

            // 8.6. Ghi bookings_by_hotel_date
            session.execute(
                    insertBookingByHotelDateStmt.bind(
                            booking.getHotelId(),
                            booking.getCheckInDate(),
                            booking.getBookingId(),
                            booking.getGuestId(),
                            booking.getGuestName(),
                            booking.getRoomNumber(),
                            booking.getRoomType(),
                            booking.getCheckOutDate(),
                            booking.getStatus(),
                            booking.getSpecialRequest(),
                            booking.getNumberOfGuests()
                    )
            );

            // 8.7. Ghi bookings_by_guest
            session.execute(
                    insertBookingByGuestStmt.bind(
                            booking.getGuestId(),
                            booking.getCheckInDate(),
                            booking.getBookingId(),
                            booking.getGuestName(),
                            booking.getHotelId(),
                            booking.getHotelName(),
                            booking.getRoomType(),
                            booking.getCheckOutDate(),
                            booking.getNumberOfNights(),
                            booking.getStatus(),
                            booking.getTotalAmountVnd()
                    )
            );

            // 8.8. Ghi bookings_by_id
            session.execute(
                    insertBookingByIdStmt.bind(
                            booking.getBookingId(),
                            booking.getGuestId(),
                            booking.getGuestName(),
                            booking.getHotelId(),
                            booking.getHotelName(),
                            booking.getRoomNumber(),
                            booking.getRoomType(),
                            booking.getCheckInDate(),
                            booking.getCheckOutDate(),
                            booking.getNumberOfNights(),
                            booking.getNumberOfGuests(),
                            booking.getStatus(),
                            booking.getSpecialRequest(),
                            booking.getTotalAmountVnd()
                    )
            );

            // 8.9. AVAILABLE -> BOOKED
            session.execute(
                    updateRoomStatusStmt.bind(
                            "BOOKED",
                            booking.getHotelId(),
                            booking.getRoomNumber()
                    )
            );

            return ResponseEntity.ok(
                    Map.of(
                            "message",
                            "Tạo booking thành công!",
                            "booking",
                            booking,
                            "roomStatus",
                            "BOOKED"
                    )
            );

        } catch (Exception e) {
            log.error(
                    "Lỗi khi tạo booking: {}",
                    e.getMessage()
            );

            return ResponseEntity
                    .internalServerError()
                    .body(
                            Map.of(
                                    "error",
                                    safeMessage(e)
                            )
                    );
        }
    }

    // ============================================================
    // PUT CẬP NHẬT TRẠNG THÁI BOOKING
    // PUT /api/bookings/{bookingId}/status
    // ============================================================

    @PutMapping("/{bookingId}/status")
    public ResponseEntity<?> updateBookingStatus(
            @PathVariable("bookingId") String bookingId,
            @RequestBody Map<String, String> payload) {

        String newStatus = payload.get("status");

        if (isBlank(newStatus)) {
            return badRequest("status là bắt buộc!");
        }

        newStatus = newStatus.toUpperCase();

        if (!newStatus.equals("CHECKED_IN")
                && !newStatus.equals("COMPLETED")
                && !newStatus.equals("CANCELLED")) {

            return badRequest("Trạng thái không hợp lệ!");
        }

        // --------------------------------------------------------
        // Mock Mode
        // --------------------------------------------------------
        if (session == null || selectBookingByIdStmt == null) {
            for (Booking booking : MOCK_BOOKINGS) {
                if (!booking.getBookingId()
                        .equalsIgnoreCase(bookingId)) {
                    continue;
                }

                String currentStatus = booking.getStatus();

                if (!isValidStatusTransition(
                        currentStatus,
                        newStatus)) {

                    return badRequest(
                            "Không thể chuyển từ "
                                    + currentStatus
                                    + " sang "
                                    + newStatus
                    );
                }

                booking.setStatus(newStatus);

                String roomStatus =
                        roomStatusForBookingStatus(newStatus);

                return ResponseEntity.ok(
                        Map.of(
                                "message",
                                "Cập nhật trạng thái thành công (Mock Mode)!",
                                "bookingId",
                                bookingId,
                                "oldStatus",
                                currentStatus,
                                "newStatus",
                                newStatus,
                                "roomStatus",
                                roomStatus
                        )
                );
            }

            return ResponseEntity.notFound().build();
        }

        // --------------------------------------------------------
        // Astra DB Mode
        // --------------------------------------------------------
        try {
            Row row = session.execute(
                    selectBookingByIdStmt.bind(bookingId)
            ).one();

            if (row == null) {
                return ResponseEntity.notFound().build();
            }

            Booking booking =
                    mapBookingByIdRow(row);

            String currentStatus =
                    booking.getStatus();

            if (!isValidStatusTransition(
                    currentStatus,
                    newStatus)) {

                return badRequest(
                        "Không thể chuyển từ "
                                + currentStatus
                                + " sang "
                                + newStatus
                );
            }

            // 1. bookings_by_id
            session.execute(
                    updateBookingByIdStatusStmt.bind(
                            newStatus,
                            bookingId
                    )
            );

            // 2. bookings_by_hotel_date
            session.execute(
                    updateBookingByHotelStatusStmt.bind(
                            newStatus,
                            booking.getHotelId(),
                            booking.getCheckInDate(),
                            bookingId
                    )
            );

            // 3. bookings_by_guest
            session.execute(
                    updateBookingByGuestStatusStmt.bind(
                            newStatus,
                            booking.getGuestId(),
                            booking.getCheckInDate(),
                            bookingId
                    )
            );

            // 4. rooms_by_hotel
            String roomStatus =
                    roomStatusForBookingStatus(newStatus);

            session.execute(
                    updateRoomStatusStmt.bind(
                            roomStatus,
                            booking.getHotelId(),
                            booking.getRoomNumber()
                    )
            );

            return ResponseEntity.ok(
                    Map.of(
                            "message",
                            "Cập nhật trạng thái thành công!",
                            "bookingId",
                            bookingId,
                            "oldStatus",
                            currentStatus,
                            "newStatus",
                            newStatus,
                            "roomStatus",
                            roomStatus
                    )
            );

        } catch (Exception e) {
            log.error(
                    "Lỗi khi cập nhật trạng thái booking {}: {}",
                    bookingId,
                    e.getMessage()
            );

            return ResponseEntity
                    .internalServerError()
                    .body(
                            Map.of(
                                    "error",
                                    safeMessage(e)
                            )
                    );
        }
    }

    // ============================================================
    // MAPPING: Q4 bookings_by_hotel_date -> Booking
    // ============================================================

    private Booking mapHotelDateRowToBooking(Row row) {
        return Booking.builder()
                .bookingId(row.getString("booking_id"))
                .hotelId(row.getString("hotel_id"))
                .guestId(row.getString("guest_id"))
                .guestName(row.getString("guest_name"))
                .roomNumber(row.getString("room_number"))
                .roomType(row.getString("room_type"))
                .checkInDate(row.getLocalDate("check_in_date"))
                .checkOutDate(row.getLocalDate("check_out_date"))
                .status(row.getString("status"))
                .specialRequest(row.getString("special_request"))
                .numberOfGuests(row.getInt("number_of_guests"))
                .build();
    }

    // ============================================================
    // MAPPING: Q3 bookings_by_guest -> Booking
    // ============================================================

    private Booking mapGuestRowToBooking(Row row) {
        return Booking.builder()
                .bookingId(row.getString("booking_id"))
                .guestId(row.getString("guest_id"))
                .guestName(row.getString("guest_name"))
                .hotelId(row.getString("hotel_id"))
                .hotelName(row.getString("hotel_name"))
                .roomType(row.getString("room_type"))
                .checkInDate(row.getLocalDate("check_in_date"))
                .checkOutDate(row.getLocalDate("check_out_date"))
                .numberOfNights(row.getInt("number_of_nights"))
                .status(row.getString("status"))
                .totalAmountVnd(row.getInt("total_amount_vnd"))
                .build();
    }

    // ============================================================
    // MAPPING: bookings_by_id -> Booking
    // ============================================================

    private Booking mapBookingByIdRow(Row row) {
        return Booking.builder()
                .bookingId(row.getString("booking_id"))
                .guestId(row.getString("guest_id"))
                .guestName(row.getString("guest_name"))
                .hotelId(row.getString("hotel_id"))
                .hotelName(row.getString("hotel_name"))
                .roomNumber(row.getString("room_number"))
                .roomType(row.getString("room_type"))
                .checkInDate(row.getLocalDate("check_in_date"))
                .checkOutDate(row.getLocalDate("check_out_date"))
                .numberOfNights(row.getInt("number_of_nights"))
                .numberOfGuests(row.getInt("number_of_guests"))
                .status(row.getString("status"))
                .specialRequest(row.getString("special_request"))
                .totalAmountVnd(row.getInt("total_amount_vnd"))
                .build();
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private ResponseEntity<?> badRequest(String message) {
        return ResponseEntity.badRequest()
                .body(
                        Map.of(
                                "error",
                                message
                        )
                );
    }

    private boolean isValidStatusTransition(
            String currentStatus,
            String newStatus) {

        if ("CONFIRMED".equals(currentStatus)) {
            return "CHECKED_IN".equals(newStatus)
                    || "CANCELLED".equals(newStatus);
        }

        if ("CHECKED_IN".equals(currentStatus)) {
            return "COMPLETED".equals(newStatus);
        }

        return false;
    }

    private String roomStatusForBookingStatus(
            String bookingStatus) {

        if ("CHECKED_IN".equals(bookingStatus)) {
            return "OCCUPIED";
        }

        if ("COMPLETED".equals(bookingStatus)
                || "CANCELLED".equals(bookingStatus)) {

            return "AVAILABLE";
        }

        return "AVAILABLE";
    }

    private String safeMessage(Exception e) {
        if (e.getMessage() == null
                || e.getMessage().isBlank()) {

            return "Đã xảy ra lỗi không xác định.";
        }

        return e.getMessage();
    }
}
