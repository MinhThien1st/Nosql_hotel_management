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
    public static final List<Room> MOCK_ROOMS = new ArrayList<>();

    static {
        // H001 - Da Nang
        MOCK_ROOMS.add(new Room("H001", "101", "Deluxe Ocean View", 1, 1500000, "Ocean", "AVAILABLE", 2, "Phong Deluxe huong bien truc dien, ban cong rong"));
        MOCK_ROOMS.add(new Room("H001", "102", "Superior City View", 1, 1100000, "City", "OCCUPIED", 2, "Phong Superior huong pho ngam Da Nang ve dem"));
        MOCK_ROOMS.add(new Room("H001", "201", "Executive Suite", 2, 2800000, "Ocean", "AVAILABLE", 4, "Suite cao cap co phong khach rieng va be boi jacuzzi"));
        MOCK_ROOMS.add(new Room("H001", "202", "Standard Double Room", 2, 1200000, "City", "BOOKED", 2, "Phong tieu chuan 2 giuong doi day du tien nghi"));
        MOCK_ROOMS.add(new Room("H001", "301", "Presidential Suite", 3, 4500000, "Panoramic Ocean", "MAINTENANCE", 6, "Phong tong thong sang trong nhat"));
        MOCK_ROOMS.add(new Room("H001", "302", "Deluxe Ocean View", 3, 1600000, "Ocean", "AVAILABLE", 2, "Phong Deluxe tang cao view bien My Khe"));
        MOCK_ROOMS.add(new Room("H001", "401", "Premier Panorama Suite", 4, 3200000, "Ocean & Mountain", "OCCUPIED", 4, "Suite Panorama 360 do ngam ban dao Son Tra"));

        // H002 - Nha Trang
        MOCK_ROOMS.add(new Room("H002", "101", "Beachfront Villa", 1, 3500000, "Beach", "OCCUPIED", 4, "Villa sat bien co loi di rieng xuong bai cat"));
        MOCK_ROOMS.add(new Room("H002", "102", "Premier Garden View", 1, 1600000, "Garden", "AVAILABLE", 2, "Phong Premier nhin ra khu vuon nhiet doi xanh mat"));
        MOCK_ROOMS.add(new Room("H002", "201", "Ocean Breeze Bungalow", 2, 2200000, "Ocean", "AVAILABLE", 3, "Bungalow thoang mat sat bo bien"));
        MOCK_ROOMS.add(new Room("H002", "202", "Deluxe Family Suite", 2, 2900000, "Sea View", "BOOKED", 4, "Phong gia dinh tien nghi co ban cong rong rai"));
        MOCK_ROOMS.add(new Room("H002", "301", "Grand Ocean Penthouse", 3, 4800000, "Panoramic Bay", "AVAILABLE", 6, "Penthouse sang trong nhat vinh Nha Trang"));

        // H003 - Da Lat
        MOCK_ROOMS.add(new Room("H003", "101", "Classic Pine View", 1, 950000, "Garden", "AVAILABLE", 2, "Phong co dien view vuon thong Da Lat"));
        MOCK_ROOMS.add(new Room("H003", "102", "Vintage Garden Room", 1, 850000, "Flower Garden", "AVAILABLE", 2, "Phong phong cach vintage ngam vuon hoa Da Lat"));
        MOCK_ROOMS.add(new Room("H003", "201", "Romantic Suite", 2, 1800000, "Mountain", "AVAILABLE", 2, "Phong suite lang man co lo suoi am ap"));
        MOCK_ROOMS.add(new Room("H003", "202", "Honeymoon Wooden Chalet", 2, 2100000, "Valley View", "OCCUPIED", 2, "Nha go phong cach Thuy Si danh cho cap doi"));
        MOCK_ROOMS.add(new Room("H003", "301", "Cloud Valley Suite", 3, 2400000, "Cloud & Valley", "BOOKED", 3, "Suite tang ap san may buoi sang"));

        // H004 - Phu Quoc
        MOCK_ROOMS.add(new Room("H004", "101", "Tropical Garden Villa", 1, 2600000, "Garden Pool", "AVAILABLE", 3, "Villa san vuon nhiet doi gan ho boi"));
        MOCK_ROOMS.add(new Room("H004", "102", "Sunset Beachfront Bungalow", 1, 3800000, "Sunset Beach", "OCCUPIED", 2, "Bungalow sat bai bien ngam hoang hon"));
        MOCK_ROOMS.add(new Room("H004", "201", "Deluxe Ocean View", 2, 2100000, "Ocean", "AVAILABLE", 2, "Phong Deluxe tien nghi cao cap"));
        MOCK_ROOMS.add(new Room("H004", "301", "Sunset Ocean Pool Villa", 3, 4200000, "Ocean Sunset", "AVAILABLE", 4, "Villa be boi vo cuc ngam hoang hon Phu Quoc"));

        // H005 - Ha Noi
        MOCK_ROOMS.add(new Room("H005", "101", "Old Quarter Deluxe", 1, 1200000, "Street", "AVAILABLE", 2, "Phong Deluxe mang kien truc Phap co pho co Ha Noi"));
        MOCK_ROOMS.add(new Room("H005", "102", "Heritage Superior", 1, 980000, "Inner Courtyard", "OCCUPIED", 2, "Phong Superior yen tinh co san trong"));
        MOCK_ROOMS.add(new Room("H005", "201", "Opera Balcony Suite", 2, 2300000, "City Opera", "BOOKED", 2, "Suite ban cong ngam pho co Hoan Kiem"));
        MOCK_ROOMS.add(new Room("H005", "301", "Royal Heritage Suite", 3, 3100000, "Sword Lake View", "AVAILABLE", 4, "Suite phong cach Hoang Gia co do"));

        // H006 - TP. Ho Chi Minh
        MOCK_ROOMS.add(new Room("H006", "101", "Riverside Deluxe", 1, 1700000, "River", "AVAILABLE", 2, "Phong Deluxe view song Sai Gon lung linh"));
        MOCK_ROOMS.add(new Room("H006", "201", "Executive Business Suite", 2, 2600000, "City Skyline", "AVAILABLE", 2, "Suite danh cho doanh nhan trung tam Quan 1"));
        MOCK_ROOMS.add(new Room("H006", "301", "Grand River View Suite", 3, 3500000, "Saigon River", "MAINTENANCE", 4, "Suite ban cong rong ngam cau Ba Son"));
        MOCK_ROOMS.add(new Room("H006", "501", "Presidential River Suite", 5, 5500000, "River", "OCCUPIED", 4, "Phong Tong thong view toan canh song Sai Gon"));

        // H007 - Sa Pa
        MOCK_ROOMS.add(new Room("H007", "101", "Mountain View Deluxe", 1, 1350000, "Fansipan Peak", "AVAILABLE", 2, "Phong Deluxe view dinh Fansipan hung vi"));
        MOCK_ROOMS.add(new Room("H007", "102", "Valley Mist Superior", 1, 1100000, "Muong Hoa Valley", "AVAILABLE", 2, "Phong ngam thung lung Muong Hoa"));
        MOCK_ROOMS.add(new Room("H007", "201", "Cloud Hunter Suite", 2, 2200000, "Floating Clouds", "OCCUPIED", 3, "Suite san may sang som tai Sa Pa"));
        MOCK_ROOMS.add(new Room("H007", "301", "Highland Panorama Chalet", 3, 3300000, "360 Mountain", "AVAILABLE", 4, "Chalet bang go cao cap giua nui rung Tay Bac"));

        // H008 - Quy Nhon
        MOCK_ROOMS.add(new Room("H008", "101", "Ky Co Coastal Deluxe", 1, 1450000, "Ocean Front", "AVAILABLE", 2, "Phong Deluxe sat bien Ky Co hoang so"));
        MOCK_ROOMS.add(new Room("H008", "102", "Eo Gio Sunset View", 1, 1650000, "Rocky Cliff Sunset", "AVAILABLE", 2, "Phong ngam hoang hon Eo Gio Quy Nhon"));
        MOCK_ROOMS.add(new Room("H008", "201", "Oceanfront Suite Villa", 2, 2950000, "Panoramic Sea", "BOOKED", 4, "Villa view bien xanh ngoc bich"));

        // H009 - Vung Tau
        MOCK_ROOMS.add(new Room("H009", "101", "Back Beach Deluxe", 1, 1150000, "Back Beach", "AVAILABLE", 2, "Phong Deluxe sat Bai Sau Vung Tau"));
        MOCK_ROOMS.add(new Room("H009", "102", "Seaside Superior", 1, 950000, "City Sea", "OCCUPIED", 2, "Phong Superior tieu chuan nghi duong cuoi tuan"));
        MOCK_ROOMS.add(new Room("H009", "201", "Ocean Breeze Suite", 2, 1950000, "Ocean Front", "AVAILABLE", 4, "Suite gia dinh ngam bien thoang mat"));

        // H010 - Hue
        MOCK_ROOMS.add(new Room("H010", "101", "Perfume River Deluxe", 1, 1250000, "Huong River", "AVAILABLE", 2, "Phong Deluxe ngam song Huong tho mong"));
        MOCK_ROOMS.add(new Room("H010", "102", "Imperial Classic Room", 1, 990000, "Ancient Citadel", "AVAILABLE", 2, "Phong mang phong cach co do Hue co kinh"));
        MOCK_ROOMS.add(new Room("H010", "201", "Royal River Suite", 2, 2450000, "River & Citadel", "OCCUPIED", 3, "Suite Hoang Cung sang trong ben bo song Huong"));
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
        if (room.getHotelId() == null || room.getHotelId().isBlank() || room.getRoomNumber() == null || room.getRoomNumber().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mã khách sạn và Số phòng là bắt buộc!"));
        }

        String roomType = room.getRoomType() != null && !room.getRoomType().isBlank() ? room.getRoomType() : "Standard";
        int floor = room.getFloor() != null ? room.getFloor() : 1;
        int price = room.getPriceVnd() != null ? room.getPriceVnd() : 1000000;
        String roomView = room.getRoomView() != null && !room.getRoomView().isBlank() ? room.getRoomView() : "City";
        String status = room.getStatus() != null && !room.getStatus().isBlank() ? room.getStatus().toUpperCase() : "AVAILABLE";
        int capacity = room.getCapacity() != null ? room.getCapacity() : 2;
        String description = room.getDescription() != null ? room.getDescription() : "";

        room.setRoomType(roomType);
        room.setFloor(floor);
        room.setPriceVnd(price);
        room.setRoomView(roomView);
        room.setStatus(status);
        room.setCapacity(capacity);
        room.setDescription(description);

        if (session == null || insertRoomStmt == null) {
            MOCK_ROOMS.removeIf(r -> r.getHotelId().equalsIgnoreCase(room.getHotelId()) && r.getRoomNumber().equalsIgnoreCase(room.getRoomNumber()));
            MOCK_ROOMS.add(room);
            return ResponseEntity.ok(Map.of("message", "Thêm phòng thành công (Mock Mode)", "room", room));
        }

        try {
            session.execute(insertRoomStmt.bind(
                    room.getHotelId(),
                    room.getRoomNumber(),
                    roomType,
                    floor,
                    price,
                    roomView,
                    status,
                    capacity,
                    description
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

        newStatus = newStatus.toUpperCase();

        if (session == null || updateRoomStatusStmt == null) {
            for (Room r : MOCK_ROOMS) {
                if (r.getHotelId().equalsIgnoreCase(hotelId) && r.getRoomNumber().equalsIgnoreCase(roomNumber)) {
                    r.setStatus(newStatus);
                    return ResponseEntity.ok(Map.of("message", "Cập nhật trạng thái thành công (Mock Mode)", "room", r));
                }
            }
            return ResponseEntity.notFound().build();
        }

        try {
            session.execute(updateRoomStatusStmt.bind(newStatus, hotelId, roomNumber));
            return ResponseEntity.ok(Map.of("message", "Cập nhật trạng thái phòng thành công!", "hotelId", hotelId, "roomNumber", roomNumber, "newStatus", newStatus));
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

        String roomType = updatedRoom.getRoomType() != null && !updatedRoom.getRoomType().isBlank() ? updatedRoom.getRoomType() : "Standard";
        int floor = updatedRoom.getFloor() != null ? updatedRoom.getFloor() : 1;
        int price = updatedRoom.getPriceVnd() != null ? updatedRoom.getPriceVnd() : 1000000;
        String roomView = updatedRoom.getRoomView() != null && !updatedRoom.getRoomView().isBlank() ? updatedRoom.getRoomView() : "City";
        String status = updatedRoom.getStatus() != null && !updatedRoom.getStatus().isBlank() ? updatedRoom.getStatus().toUpperCase() : "AVAILABLE";
        int capacity = updatedRoom.getCapacity() != null ? updatedRoom.getCapacity() : 2;
        String description = updatedRoom.getDescription() != null ? updatedRoom.getDescription() : "";

        updatedRoom.setHotelId(hotelId);
        updatedRoom.setRoomNumber(roomNumber);
        updatedRoom.setRoomType(roomType);
        updatedRoom.setFloor(floor);
        updatedRoom.setPriceVnd(price);
        updatedRoom.setRoomView(roomView);
        updatedRoom.setStatus(status);
        updatedRoom.setCapacity(capacity);
        updatedRoom.setDescription(description);

        if (session == null || updateRoomDetailsStmt == null) {
            boolean found = false;
            for (int i = 0; i < MOCK_ROOMS.size(); i++) {
                Room r = MOCK_ROOMS.get(i);
                if (r.getHotelId().equalsIgnoreCase(hotelId) && r.getRoomNumber().equalsIgnoreCase(roomNumber)) {
                    MOCK_ROOMS.set(i, updatedRoom);
                    found = true;
                    break;
                }
            }
            if (!found) {
                MOCK_ROOMS.add(updatedRoom);
            }
            return ResponseEntity.ok(Map.of("message", "Cập nhật phòng thành công (Mock Mode)", "room", updatedRoom));
        }

        try {
            session.execute(updateRoomDetailsStmt.bind(
                    roomType,
                    floor,
                    price,
                    roomView,
                    status,
                    capacity,
                    description,
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
