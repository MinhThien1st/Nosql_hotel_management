package com.qlks.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * DTO chứa số liệu thống kê Analytics Dashboard
 * Phụ trách: Thành viên 1 (Trưởng nhóm)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDTO {
    private int totalHotels;
    private int totalRooms;
    private int occupiedRooms;
    private int availableRooms;
    private int bookedRooms;
    private int maintenanceRooms;
    private double occupancyRate;
    private long totalRevenueVnd;
    
    // Dữ liệu cho biểu đồ Chart.js
    private Map<String, Long> revenueByHotel;
    private Map<String, Integer> roomsByStatus;
    private Map<String, Integer> roomsByType;
}
