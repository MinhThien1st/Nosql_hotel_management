package com.qlks.controller;

import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.cql.ResultSet;
import com.datastax.oss.driver.api.core.cql.Row;
import com.qlks.dto.DashboardStatsDTO;
import com.qlks.model.Hotel;
import com.qlks.model.Room;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Controller thống kê phân tích Analytics & KPI Dashboard
 * Phụ trách: Thành viên 1 (Trưởng nhóm)
 */
@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    private static final Logger log = LoggerFactory.getLogger(DashboardController.class);

    private final CqlSession session;
    private final HotelController hotelController;
    private final RoomController roomController;

    @Autowired
    public DashboardController(
            @Autowired(required = false) CqlSession session,
            HotelController hotelController,
            RoomController roomController) {
        this.session = session;
        this.hotelController = hotelController;
        this.roomController = roomController;
    }

    /**
     * Lấy toàn bộ số liệu KPI & dữ liệu biểu đồ cho Dashboard
     */
    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsDTO> getDashboardStats(
            @RequestParam(value = "hotelId", required = false) String hotelId) {

        List<Hotel> hotels = hotelController.getAllHotels().getBody();
        List<Room> rooms = roomController.getRooms(hotelId).getBody();

        if (hotels == null) hotels = Collections.emptyList();
        if (rooms == null) rooms = Collections.emptyList();

        int totalHotels = hotels.size();
        int totalRooms = rooms.size();
        int occupied = 0;
        int available = 0;
        int booked = 0;
        int maintenance = 0;

        Map<String, Integer> roomsByStatus = new LinkedHashMap<>();
        roomsByStatus.put("AVAILABLE", 0);
        roomsByStatus.put("OCCUPIED", 0);
        roomsByStatus.put("BOOKED", 0);
        roomsByStatus.put("MAINTENANCE", 0);

        Map<String, Integer> roomsByType = new LinkedHashMap<>();

        for (Room r : rooms) {
            String status = r.getStatus() != null ? r.getStatus().toUpperCase() : "AVAILABLE";
            switch (status) {
                case "OCCUPIED":
                    occupied++;
                    roomsByStatus.put("OCCUPIED", roomsByStatus.get("OCCUPIED") + 1);
                    break;
                case "BOOKED":
                    booked++;
                    roomsByStatus.put("BOOKED", roomsByStatus.get("BOOKED") + 1);
                    break;
                case "MAINTENANCE":
                    maintenance++;
                    roomsByStatus.put("MAINTENANCE", roomsByStatus.get("MAINTENANCE") + 1);
                    break;
                default:
                    available++;
                    roomsByStatus.put("AVAILABLE", roomsByStatus.get("AVAILABLE") + 1);
                    break;
            }

            String type = r.getRoomType() != null ? r.getRoomType() : "Standard";
            roomsByType.put(type, roomsByType.getOrDefault(type, 0) + 1);
        }

        double occupancyRate = totalRooms > 0 ? ((double) occupied / totalRooms) * 100.0 : 0.0;
        occupancyRate = Math.round(occupancyRate * 10.0) / 10.0;

        // Tính doanh thu & biểu đồ doanh thu theo khách sạn
        Map<String, Long> revenueByHotel = new LinkedHashMap<>();
        long totalRevenue = 0;

        if (session != null) {
            try {
                ResultSet rs = session.execute("SELECT hotel_id, hotel_name, total_amount_vnd FROM invoices_by_booking;");
                for (Row row : rs) {
                    String hName = row.getString("hotel_name");
                    long amount = row.getInt("total_amount_vnd");
                    totalRevenue += amount;
                    if (hName != null) {
                        revenueByHotel.put(hName, revenueByHotel.getOrDefault(hName, 0L) + amount);
                    }
                }
            } catch (Exception e) {
                log.warn("Chưa đọc được hóa đơn từ Astra, dùng Mock Revenue: {}", e.getMessage());
            }
        }

        if (revenueByHotel.isEmpty()) {
            revenueByHotel.put("Suong Mai Grand Hotel Da Nang", 10800000L);
            revenueByHotel.put("Suong Mai Luxury Resort Nha Trang", 16200000L);
            revenueByHotel.put("Suong Mai Pearl Resort Phu Quoc", 12000000L);
            revenueByHotel.put("Suong Mai Riverside Hotel Sai Gon", 5000000L);
            revenueByHotel.put("Suong Mai Boutique Hotel Da Lat", 6100000L);
            revenueByHotel.put("Suong Mai Heritage Hotel Ha Noi", 2400000L);
            totalRevenue = revenueByHotel.values().stream().mapToLong(Long::longValue).sum();
        }

        DashboardStatsDTO dto = DashboardStatsDTO.builder()
                .totalHotels(totalHotels)
                .totalRooms(totalRooms)
                .occupiedRooms(occupied)
                .availableRooms(available)
                .bookedRooms(booked)
                .maintenanceRooms(maintenance)
                .occupancyRate(occupancyRate)
                .totalRevenueVnd(totalRevenue)
                .revenueByHotel(revenueByHotel)
                .roomsByStatus(roomsByStatus)
                .roomsByType(roomsByType)
                .build();

        return ResponseEntity.ok(dto);
    }
}
