package com.qlks.controller;

import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.cql.PreparedStatement;
import com.datastax.oss.driver.api.core.cql.ResultSet;
import com.datastax.oss.driver.api.core.cql.Row;
import com.qlks.model.Hotel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Controller quản lý Khách Sạn ('hotels' - Q1)
 * Sử dụng CQL Prepared Statements với Cassandra CqlSession
 * Phụ trách: Thành viên 1 (Trưởng nhóm)
 */
@RestController
@RequestMapping("/api/hotels")
@CrossOrigin(origins = "*")
public class HotelController {

    private static final Logger log = LoggerFactory.getLogger(HotelController.class);

    private final CqlSession session;
    private PreparedStatement selectAllHotelsStmt;
    private PreparedStatement selectHotelByIdStmt;

    // Bộ nhớ đệm Mock Data phòng trường hợp Astra DB chưa nạp file bundle
    private static final List<Hotel> MOCK_HOTELS = new ArrayList<>();

    static {
        MOCK_HOTELS.add(new Hotel("H001", "Suong Mai Grand Hotel Da Nang", "Trai nghiem dang cap ven bien My Khe", "Da Nang", "120 Vo Nguyen Giap, Son Tra", 5, "0236-399-8888", 150, true, true));
        MOCK_HOTELS.add(new Hotel("H002", "Suong Mai Luxury Resort Nha Trang", "Thien duong nghi duong nhiet doi", "Nha Trang", "88 Tran Phu, Loc Tho", 5, "0258-388-9999", 200, true, true));
        MOCK_HOTELS.add(new Hotel("H003", "Suong Mai Boutique Hotel Da Lat", "Net co kinh giua ngan hoa thanh pho suong mu", "Da Lat", "15 Tran Hung Dao, Phuong 10", 4, "0263-377-6666", 80, false, true));
        MOCK_HOTELS.add(new Hotel("H004", "Suong Mai Pearl Resort Phu Quoc", "Hoang hon ruc ro tren bo bien Bai Truong", "Phu Quoc", "Duong Bao, Duong To", 5, "0297-366-5555", 250, true, true));
        MOCK_HOTELS.add(new Hotel("H005", "Suong Mai Heritage Hotel Ha Noi", "Tinh hoa pho co Ha Noi ngan nam van hien", "Ha Noi", "36 Hang Be, Hoan Kiem", 4, "0243-355-4444", 90, false, true));
        MOCK_HOTELS.add(new Hotel("H006", "Suong Mai Riverside Hotel Sai Gon", "Tam nhin tuyet my huong song Sai Gon", "Ho Chi Minh", "2A Ton Duc Thang, Ben Nghe, Quan 1", 5, "0283-344-3333", 180, true, true));
        MOCK_HOTELS.add(new Hotel("H007", "Suong Mai Mountain Lodge Sa Pa", "San may giua dai ngan Tay Bac hung vi", "Sa Pa", "08 Fansipan, Thi xa Sa Pa", 4, "0214-333-2222", 70, false, true));
        MOCK_HOTELS.add(new Hotel("H008", "Suong Mai Coastal Resort Quy Nhon", "Ve dep hoang so Ky Co Eo Gio", "Quy Nhon", "Khu du lich Bien Nhon Ly", 5, "0256-322-1111", 120, true, true));
        MOCK_HOTELS.add(new Hotel("H009", "Suong Mai Ocean View Vung Tau", "Nghi duong cuoi tuan lang man ven bien", "Vung Tau", "150 Thuy Van, Bai Sau", 4, "0254-311-0000", 110, true, false));
        MOCK_HOTELS.add(new Hotel("H010", "Suong Mai Imperial Hotel Hue", "Dau an co do ben dong song Huong tho mong", "Hue", "05 Le Loi, Vinh Ninh", 4, "0234-300-9999", 85, true, true));
    }

    @Autowired
    public HotelController(@Autowired(required = false) CqlSession session) {
        this.session = session;
        if (session != null) {
            try {
                this.selectAllHotelsStmt = session.prepare("SELECT hotel_id, hotel_name, tagline, city, address, star_rating, phone, total_rooms, has_pool, has_spa FROM hotels;");
                this.selectHotelByIdStmt = session.prepare("SELECT hotel_id, hotel_name, tagline, city, address, star_rating, phone, total_rooms, has_pool, has_spa FROM hotels WHERE hotel_id = ?;");
                log.info("✅ Prepared CQL Statements for Hotels successfully!");
            } catch (Exception e) {
                log.error("⚠️ Không thể prepare statement cho Hotel: {}", e.getMessage());
            }
        }
    }

    /**
     * Lấy danh sách toàn bộ khách sạn trong hệ thống
     * CQL: SELECT * FROM hotels;
     */
    @GetMapping
    public ResponseEntity<List<Hotel>> getAllHotels() {
        if (session == null || selectAllHotelsStmt == null) {
            return ResponseEntity.ok(MOCK_HOTELS);
        }

        try {
            ResultSet rs = session.execute(selectAllHotelsStmt.bind());
            List<Hotel> list = new ArrayList<>();
            for (Row row : rs) {
                list.add(mapRowToHotel(row));
            }
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            log.error("Lỗi khi truy vấn danh sách khách sạn từ Astra: {}", e.getMessage());
            return ResponseEntity.ok(MOCK_HOTELS);
        }
    }

    /**
     * Lấy thông tin chi tiết một khách sạn theo ID
     * CQL: SELECT * FROM hotels WHERE hotel_id = ?;
     */
    @GetMapping("/{id}")
    public ResponseEntity<Hotel> getHotelById(@PathVariable("id") String id) {
        if (session == null || selectHotelByIdStmt == null) {
            return MOCK_HOTELS.stream()
                    .filter(h -> h.getHotelId().equalsIgnoreCase(id))
                    .findFirst()
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        }

        try {
            Row row = session.execute(selectHotelByIdStmt.bind(id)).one();
            if (row != null) {
                return ResponseEntity.ok(mapRowToHotel(row));
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Lỗi khi lấy thông tin khách sạn {}: {}", id, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    private Hotel mapRowToHotel(Row row) {
        return Hotel.builder()
                .hotelId(row.getString("hotel_id"))
                .hotelName(row.getString("hotel_name"))
                .tagline(row.getString("tagline"))
                .city(row.getString("city"))
                .address(row.getString("address"))
                .starRating(row.getInt("star_rating"))
                .phone(row.getString("phone"))
                .totalRooms(row.getInt("total_rooms"))
                .hasPool(row.getBoolean("has_pool"))
                .hasSpa(row.getBoolean("has_spa"))
                .build();
    }
}
