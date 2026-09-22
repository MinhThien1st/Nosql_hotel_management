package com.qlks.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Model ánh xạ bảng 'hotels' (Q1)
 * Partition Key: hotel_id
 * Phụ trách: Thành viên 1 (Trưởng nhóm)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Hotel {
    private String hotelId;
    private String hotelName;
    private String tagline;
    private String city;
    private String address;
    private Integer starRating;
    private String phone;
    private Integer totalRooms;
    private Boolean hasPool;
    private Boolean hasSpa;
}
