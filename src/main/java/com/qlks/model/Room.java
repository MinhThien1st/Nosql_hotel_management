package com.qlks.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Model ánh xạ bảng 'rooms_by_hotel' (Q2)
 * Primary Key: ((hotel_id), room_number)
 * Phụ trách: Thành viên 1 (Trưởng nhóm)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Room {
    private String hotelId;
    private String roomNumber;
    private String roomType;
    private Integer floor;
    private Integer priceVnd;
    private String roomView;
    private String status;      // AVAILABLE, OCCUPIED, BOOKED, MAINTENANCE
    private Integer capacity;
    private String description;
}
