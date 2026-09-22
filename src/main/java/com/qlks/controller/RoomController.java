package com.qlks.controller;

import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.cql.PreparedStatement;
import com.datastax.oss.driver.api.core.cql.ResultSet;
import com.datastax.oss.driver.api.core.cql.Row;
import com.qlks.model.Room;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Controller quản lý Phòng ('rooms_by_hotel' - Q2)
 * Sử dụng CQL Prepared Statements & Bound Statements
 * Phụ trách: Thành viên 1 (Trưởng nhóm)
 */
@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = "*")
public class RoomController {

    private static final Logger log = LoggerFactory.getLogger(RoomController.class);

    private final CqlSession session;
    private PreparedStatement selectRoomsByHotelStmt;
    private PreparedStatement selectAllRoomsStmt;
    private PreparedStatement selectRoomByIdStmt;
    private PreparedStatement insertRoomStmt;
    private PreparedStatement updateRoomStatusStmt;
    private PreparedStatement updateRoomDetailsStmt;
    private PreparedStatement deleteRoomStmt;

    // Bộ nhớ đệm Mock Data an toàn cho demo offline
    private static final List<Room> MOCK_ROOMS = new ArrayList<>();

    static {
        MOCK_ROOMS.add(new Room("H001", "101", "Deluxe Ocean View", 1, 1500000, "Ocean", "AVAILABLE", 2, "Phong Deluxe huong bien truc dien, ban cong rong"));
        MOCK_ROOMS.add(new Room("H001", "102", "Superior City View", 1, 1100000, "City", "OCCUPIED", 2, "Phong Superior huong pho ngam Da Nang ve dem"));
        MOCK_ROOMS.add(new Room("H001", "201", "Executive Suite", 2, 2800000, "Ocean", "AVAILABLE", 4, "Suite cao cap co phong khach rieng va be boi jacuzzi"));
        MOCK_ROOMS.add(new Room("H001", "202", "Standard Double Room", 2, 1200000, "City", "BOOKED", 2, "Phong tieu chuan 2 giuong doi day du tien nghi"));
        MOCK_ROOMS.add(new Room("H001", "301", "Presidential Suite", 3, 4500000, "Panoramic Ocean", "MAINTENANCE", 6, "Phong tong thong sang trong nhat"));
        
        MOCK_ROOMS.add(new Room("H002", "101", "Beachfront Villa", 1, 3500000, "Beach", "OCCUPIED", 4, "Villa sat bien co loi di rieng xuong bai cat"));
        MOCK_ROOMS.add(new Room("H002", "102", "Premier Garden View", 1, 1600000, "Garden", "AVAILABLE", 2, "Phong Premier nhin ra khu vuon nhiet doi xanh mat"));
        MOCK_ROOMS.add(new Room("H002", "201", "Ocean Breeze Bungalow", 2, 2200000, "Ocean", "AVAILABLE", 3, "Bungalow thoang mat sat bo bien"));
        
        MOCK_ROOMS.add(new Room("H003", "101", "Classic Pine View", 1, 950000, "Garden", "AVAILABLE", 2, "Phong co dien view vuon thong Da Lat"));
        MOCK_ROOMS.add(new Room("H003", "201", "Romantic Suite", 2, 1800000, "Mountain", "AVAILABLE", 2, "Phong suite lang man co lo suoi am ap"));
        
        MOCK_ROOMS.add(new Room("H004", "301", "Sunset Ocean Pool Villa", 3, 4200000, "Ocean Sunset", "AVAILABLE", 4, "Villa be boi vo cuc ngam hoang hon Phu Quoc"));
        MOCK_ROOMS.add(new Room("H005", "101", "Old Quarter Deluxe", 1, 1200000, "Street", "AVAILABLE", 2, "Phong Deluxe mang kien truc Phap co pho co Ha Noi"));
        MOCK_ROOMS.add(new Room("H006", "501", "Presidential River Suite", 5, 5500000, "River", "OCCUPIED", 4, "Phong Tong thong view toan canh song Sai Gon"));
    }

    @Autowired
    public RoomController(@Autowired(required = false) CqlSession session) {
        this.session = session;
        if (session != null) {
            try {
                this.selectRoomsByHotelStmt = session.prepare(
                        "SELECT hotel_id, room_number, room_type, floor, price_vnd, room_view, status, capacity, description FROM rooms_by_hotel WHERE hotel_id = ?;"
                );
                this.selectAllRoomsStmt = session.prepare(
                        "SELECT hotel_id, room_number, room_type, floor, price_vnd, room_view, status, capacity, description FROM rooms_by_hotel;"
                );
                this.selectRoomByIdStmt = session.prepare(
                        "SELECT hotel_id, room_number, room_type, floor, price_vnd, room_view, status, capacity, description FROM rooms_by_hotel WHERE hotel_id = ? AND room_number = ?;"
                );
                this.insertRoomStmt = session.prepare(
                        "INSERT INTO rooms_by_hotel (hotel_id, room_number, room_type, floor, price_vnd, room_view, status, capacity, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);"
                );
                this.updateRoomStatusStmt = session.prepare(
                        "UPDATE rooms_by_hotel SET status = ? WHERE hotel_id = ? AND room_number = ?;"
                );
                this.updateRoomDetailsStmt = session.prepare(
                        "UPDATE rooms_by_hotel SET room_type = ?, floor = ?, price_vnd = ?, room_view = ?, status = ?, capacity = ?, description = ? WHERE hotel_id = ? AND room_number = ?;"
                );
                this.deleteRoomStmt = session.prepare(
                        "DELETE FROM rooms_by_hotel WHERE hotel_id = ? AND room_number = ?;"
                );
                log.info("✅ Prepared CQL Statements for Rooms successfully!");
            } catch (Exception e) {
                log.error("⚠️ Không thể prepare statement cho Room: {}", e.getMessage());
            }
        }
    }

    /**
     * Lấy danh sách phòng theo khách sạn hoặc toàn bộ phòng
     * CQL: SELECT * FROM rooms_by_hotel WHERE hotel_id = ?;
     */
    @GetMapping
    public ResponseEntity<List<Room>> getRooms(@RequestParam(value = "hotelId", required = false) String hotelId) {
        if (session == null || selectRoomsByHotelStmt == null) {
            if (hotelId != null && !hotelId.isBlank()) {
                return ResponseEntity.ok(MOCK_ROOMS.stream().filter(r -> r.getHotelId().equalsIgnoreCase(hotelId)).collect(Collectors.toList()));
            }
            return ResponseEntity.ok(MOCK_ROOMS);
        }

        try {
            List<Room> list = new ArrayList<>();
            ResultSet rs;
            if (hotelId != null && !hotelId.isBlank()) {
                rs = session.execute(selectRoomsByHotelStmt.bind(hotelId));
            } else {
                rs = session.execute(selectAllRoomsStmt.bind());
            }
            for (Row row : rs) {
                list.add(mapRowToRoom(row));
            }
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            log.error("Lỗi khi truy vấn phòng từ Astra: {}", e.getMessage());
            if (hotelId != null && !hotelId.isBlank()) {
                return ResponseEntity.ok(MOCK_ROOMS.stream().filter(r -> r.getHotelId().equalsIgnoreCase(hotelId)).collect(Collectors.toList()));
            }
            return ResponseEntity.ok(MOCK_ROOMS);
        }
    }

    /**
     * Lấy chi tiết 1 phòng theo Khách sạn & Số phòng
     * CQL: SELECT * FROM rooms_by_hotel WHERE hotel_id = ? AND room_number = ?;
     */
    @GetMapping("/{hotelId}/{roomNumber}")
    public ResponseEntity<Room> getRoom(@PathVariable("hotelId") String hotelId, @PathVariable("roomNumber") String roomNumber) {
        if (session == null || selectRoomByIdStmt == null) {
            return MOCK_ROOMS.stream()
                    .filter(r -> r.getHotelId().equalsIgnoreCase(hotelId) && r.getRoomNumber().equalsIgnoreCase(roomNumber))
                    .findFirst()
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        }

        try {
            Row row = session.execute(selectRoomByIdStmt.bind(hotelId, roomNumber)).one();
            if (row != null) {
                return ResponseEntity.ok(mapRowToRoom(row));
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Lỗi khi lấy thông tin phòng {}/{}: {}", hotelId, roomNumber, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Thêm phòng mới vào hệ thống
     * CQL: INSERT INTO rooms_by_hotel (...) VALUES (...);
     */
    @PostMapping
    public ResponseEntity<?> createRoom(@RequestBody Room room) {
        if (room.getHotelId() == null || room.getRoomNumber() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mã khách sạn và Số phòng là bắt buộc!"));
        }

        if (room.getStatus() == null || room.getStatus().isBlank()) {
            room.setStatus("AVAILABLE");
        }

        if (session == null || insertRoomStmt == null) {
            MOCK_ROOMS.removeIf(r -> r.getHotelId().equalsIgnoreCase(room.getHotelId()) && r.getRoomNumber().equalsIgnoreCase(room.getRoomNumber()));
            MOCK_ROOMS.add(room);
            return ResponseEntity.ok(Map.of("message", "Thêm phòng thành công (Mock Mode)", "room", room));
        }

        try {
            session.execute(insertRoomStmt.bind(
                    room.getHotelId(),
                    room.getRoomNumber(),
                    room.getRoomType(),
                    room.getFloor() != null ? room.getFloor() : 1,
                    room.getPriceVnd() != null ? room.getPriceVnd() : 1000000,
                    room.getRoomView(),
                    room.getStatus(),
                    room.getCapacity() != null ? room.getCapacity() : 2,
                    room.getDescription()
            ));
            return ResponseEntity.ok(Map.of("message", "Thêm phòng mới thành công!", "room", room));
        } catch (Exception e) {
            log.error("Lỗi khi thêm phòng mới vào Astra: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Cập nhật nhanh trạng thái phòng (AVAILABLE, OCCUPIED, BOOKED, MAINTENANCE)
     * CQL: UPDATE rooms_by_hotel SET status = ? WHERE hotel_id = ? AND room_number = ?;
     */
    @PutMapping("/{hotelId}/{roomNumber}/status")
    public ResponseEntity<?> updateRoomStatus(
            @PathVariable("hotelId") String hotelId,
            @PathVariable("roomNumber") String roomNumber,
            @RequestBody(required = false) Map<String, String> payload,
            @RequestParam(value = "status", required = false) String paramStatus) {

        String newStatus = (payload != null && payload.get("status") != null) 
                ? payload.get("status") 
                : paramStatus;

        if (newStatus == null || newStatus.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Trạng thái mới không hợp lệ!"));
        }

        if (session == null || updateRoomStatusStmt == null) {
            for (Room r : MOCK_ROOMS) {
                if (r.getHotelId().equalsIgnoreCase(hotelId) && r.getRoomNumber().equalsIgnoreCase(roomNumber)) {
                    r.setStatus(newStatus.toUpperCase());
                    return ResponseEntity.ok(Map.of("message", "Cập nhật trạng thái thành công (Mock Mode)", "room", r));
                }
            }
            return ResponseEntity.notFound().build();
        }

        try {
            session.execute(updateRoomStatusStmt.bind(newStatus.toUpperCase(), hotelId, roomNumber));
            return ResponseEntity.ok(Map.of("message", "Cập nhật trạng thái phòng thành công!", "hotelId", hotelId, "roomNumber", roomNumber, "newStatus", newStatus.toUpperCase()));
        } catch (Exception e) {
            log.error("Lỗi khi cập nhật trạng thái phòng {}/{}: {}", hotelId, roomNumber, e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Cập nhật thông tin chi tiết phòng
     * CQL: UPDATE rooms_by_hotel SET room_type = ?, ... WHERE hotel_id = ? AND room_number = ?;
     */
    @PutMapping("/{hotelId}/{roomNumber}")
    public ResponseEntity<?> updateRoom(
            @PathVariable("hotelId") String hotelId,
            @PathVariable("roomNumber") String roomNumber,
            @RequestBody Room updatedRoom) {

        if (session == null || updateRoomDetailsStmt == null) {
            for (int i = 0; i < MOCK_ROOMS.size(); i++) {
                Room r = MOCK_ROOMS.get(i);
                if (r.getHotelId().equalsIgnoreCase(hotelId) && r.getRoomNumber().equalsIgnoreCase(roomNumber)) {
                    updatedRoom.setHotelId(hotelId);
                    updatedRoom.setRoomNumber(roomNumber);
                    MOCK_ROOMS.set(i, updatedRoom);
                    return ResponseEntity.ok(Map.of("message", "Cập nhật phòng thành công (Mock Mode)", "room", updatedRoom));
                }
            }
            return ResponseEntity.notFound().build();
        }

        try {
            session.execute(updateRoomDetailsStmt.bind(
                    updatedRoom.getRoomType(),
                    updatedRoom.getFloor(),
                    updatedRoom.getPriceVnd(),
                    updatedRoom.getRoomView(),
                    updatedRoom.getStatus(),
                    updatedRoom.getCapacity(),
                    updatedRoom.getDescription(),
                    hotelId,
                    roomNumber
            ));
            return ResponseEntity.ok(Map.of("message", "Cập nhật phòng thành công!", "room", updatedRoom));
        } catch (Exception e) {
            log.error("Lỗi khi cập nhật phòng {}/{}: {}", hotelId, roomNumber, e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Xóa phòng
     * CQL: DELETE FROM rooms_by_hotel WHERE hotel_id = ? AND room_number = ?;
     */
    @DeleteMapping("/{hotelId}/{roomNumber}")
    public ResponseEntity<?> deleteRoom(@PathVariable("hotelId") String hotelId, @PathVariable("roomNumber") String roomNumber) {
        if (session == null || deleteRoomStmt == null) {
            boolean removed = MOCK_ROOMS.removeIf(r -> r.getHotelId().equalsIgnoreCase(hotelId) && r.getRoomNumber().equalsIgnoreCase(roomNumber));
            return removed ? ResponseEntity.ok(Map.of("message", "Đã xóa phòng (Mock Mode)")) : ResponseEntity.notFound().build();
        }

        try {
            session.execute(deleteRoomStmt.bind(hotelId, roomNumber));
            return ResponseEntity.ok(Map.of("message", "Đã xóa phòng thành công!"));
        } catch (Exception e) {
            log.error("Lỗi khi xóa phòng {}/{}: {}", hotelId, roomNumber, e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    private Room mapRowToRoom(Row row) {
        return Room.builder()
                .hotelId(row.getString("hotel_id"))
                .roomNumber(row.getString("room_number"))
                .roomType(row.getString("room_type"))
                .floor(row.getInt("floor"))
                .priceVnd(row.getInt("price_vnd"))
                .roomView(row.getString("room_view"))
                .status(row.getString("status"))
                .capacity(row.getInt("capacity"))
                .description(row.getString("description"))
                .build();
    }
}
