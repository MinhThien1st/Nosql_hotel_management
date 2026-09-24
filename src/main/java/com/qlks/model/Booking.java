package com.qlks.model;

import java.time.LocalDate;

public class Booking {

    private String bookingId;
    private String hotelId;
    private String hotelName;
    private String guestId;
    private String guestName;
    private String roomNumber;
    private String roomType;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Integer numberOfNights;
    private Integer numberOfGuests;
    private String status;
    private String specialRequest;
    private Integer totalAmountVnd;

    // ============================================================
    // CONSTRUCTORS
    // ============================================================

    public Booking() {
    }

    public Booking(
            String bookingId,
            String hotelId,
            String hotelName,
            String guestId,
            String guestName,
            String roomNumber,
            String roomType,
            LocalDate checkInDate,
            LocalDate checkOutDate,
            Integer numberOfNights,
            Integer numberOfGuests,
            String status,
            String specialRequest,
            Integer totalAmountVnd) {

        this.bookingId = bookingId;
        this.hotelId = hotelId;
        this.hotelName = hotelName;
        this.guestId = guestId;
        this.guestName = guestName;
        this.roomNumber = roomNumber;
        this.roomType = roomType;
        this.checkInDate = checkInDate;
        this.checkOutDate = checkOutDate;
        this.numberOfNights = numberOfNights;
        this.numberOfGuests = numberOfGuests;
        this.status = status;
        this.specialRequest = specialRequest;
        this.totalAmountVnd = totalAmountVnd;
    }

    // ============================================================
    // GETTERS / SETTERS
    // ============================================================

    public String getBookingId() {
        return bookingId;
    }

    public void setBookingId(String bookingId) {
        this.bookingId = bookingId;
    }

    public String getHotelId() {
        return hotelId;
    }

    public void setHotelId(String hotelId) {
        this.hotelId = hotelId;
    }

    public String getHotelName() {
        return hotelName;
    }

    public void setHotelName(String hotelName) {
        this.hotelName = hotelName;
    }

    public String getGuestId() {
        return guestId;
    }

    public void setGuestId(String guestId) {
        this.guestId = guestId;
    }

    public String getGuestName() {
        return guestName;
    }

    public void setGuestName(String guestName) {
        this.guestName = guestName;
    }

    public String getRoomNumber() {
        return roomNumber;
    }

    public void setRoomNumber(String roomNumber) {
        this.roomNumber = roomNumber;
    }

    public String getRoomType() {
        return roomType;
    }

    public void setRoomType(String roomType) {
        this.roomType = roomType;
    }

    public LocalDate getCheckInDate() {
        return checkInDate;
    }

    public void setCheckInDate(LocalDate checkInDate) {
        this.checkInDate = checkInDate;
    }

    public LocalDate getCheckOutDate() {
        return checkOutDate;
    }

    public void setCheckOutDate(LocalDate checkOutDate) {
        this.checkOutDate = checkOutDate;
    }

    public Integer getNumberOfNights() {
        return numberOfNights;
    }

    public void setNumberOfNights(Integer numberOfNights) {
        this.numberOfNights = numberOfNights;
    }

    public Integer getNumberOfGuests() {
        return numberOfGuests;
    }

    public void setNumberOfGuests(Integer numberOfGuests) {
        this.numberOfGuests = numberOfGuests;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSpecialRequest() {
        return specialRequest;
    }

    public void setSpecialRequest(String specialRequest) {
        this.specialRequest = specialRequest;
    }

    public Integer getTotalAmountVnd() {
        return totalAmountVnd;
    }

    public void setTotalAmountVnd(Integer totalAmountVnd) {
        this.totalAmountVnd = totalAmountVnd;
    }

    // ============================================================
    // BUILDER
    // Giữ nguyên Booking.builder() đang dùng trong Controller
    // ============================================================

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {

        private String bookingId;
        private String hotelId;
        private String hotelName;
        private String guestId;
        private String guestName;
        private String roomNumber;
        private String roomType;
        private LocalDate checkInDate;
        private LocalDate checkOutDate;
        private Integer numberOfNights;
        private Integer numberOfGuests;
        private String status;
        private String specialRequest;
        private Integer totalAmountVnd;

        public Builder bookingId(String bookingId) {
            this.bookingId = bookingId;
            return this;
        }

        public Builder hotelId(String hotelId) {
            this.hotelId = hotelId;
            return this;
        }

        public Builder hotelName(String hotelName) {
            this.hotelName = hotelName;
            return this;
        }

        public Builder guestId(String guestId) {
            this.guestId = guestId;
            return this;
        }

        public Builder guestName(String guestName) {
            this.guestName = guestName;
            return this;
        }

        public Builder roomNumber(String roomNumber) {
            this.roomNumber = roomNumber;
            return this;
        }

        public Builder roomType(String roomType) {
            this.roomType = roomType;
            return this;
        }

        public Builder checkInDate(LocalDate checkInDate) {
            this.checkInDate = checkInDate;
            return this;
        }

        public Builder checkOutDate(LocalDate checkOutDate) {
            this.checkOutDate = checkOutDate;
            return this;
        }

        public Builder numberOfNights(Integer numberOfNights) {
            this.numberOfNights = numberOfNights;
            return this;
        }

        public Builder numberOfGuests(Integer numberOfGuests) {
            this.numberOfGuests = numberOfGuests;
            return this;
        }

        public Builder status(String status) {
            this.status = status;
            return this;
        }

        public Builder specialRequest(String specialRequest) {
            this.specialRequest = specialRequest;
            return this;
        }

        public Builder totalAmountVnd(Integer totalAmountVnd) {
            this.totalAmountVnd = totalAmountVnd;
            return this;
        }

        public Booking build() {
            return new Booking(
                    bookingId,
                    hotelId,
                    hotelName,
                    guestId,
                    guestName,
                    roomNumber,
                    roomType,
                    checkInDate,
                    checkOutDate,
                    numberOfNights,
                    numberOfGuests,
                    status,
                    specialRequest,
                    totalAmountVnd
            );
        }
    }
}