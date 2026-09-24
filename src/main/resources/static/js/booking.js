/**
 * ============================================================
 * BOOKING.JS - DEV 2
 * SƯƠNG MAI HOTEL PMS
 *
 * Chức năng:
 * - Load booking theo khách sạn + ngày
 * - Lọc trạng thái
 * - Tìm kiếm booking
 * - Tạo booking mới
 * - Load phòng AVAILABLE
 * - Check-in
 * - Check-out
 * - Hủy booking
 * ============================================================
 */

let allBookings = [];
let availableRooms = [];


// ============================================================
// KHỞI TẠO TRANG
// ============================================================

document.addEventListener("DOMContentLoaded", function () {

    initBookingPage();

});


async function initBookingPage() {

    // Khởi tạo dropdown khách sạn dùng common.js
    initCustomDropdown(function (hotelId) {
        loadBookings();
    });

    // Gắn sự kiện
    bindEvents();

    // Load danh sách khách sạn
    await loadHotels(function () {
        loadBookings();
    });
}



// ============================================================
// EVENT
// ============================================================

function bindEvents() {

    const dateFilter =
        document.getElementById("bookingDateFilter");

    const statusFilter =
        document.getElementById("bookingStatusFilter");

    const keywordInput =
        document.getElementById("bookingKeyword");

    const refreshButton =
        document.getElementById("btnRefresh");

    const openModalButton =
        document.getElementById("btnOpenBookingModal");

    const closeModalButton =
        document.getElementById("btnCloseBookingModal");

    const cancelModalButton =
        document.getElementById("btnCancelBookingModal");

    const saveBookingButton =
        document.getElementById("btnSaveBooking");

    const modalHotel =
        document.getElementById("modalHotelId");

    const modalRoom =
        document.getElementById("modalRoomNumber");

    const checkIn =
        document.getElementById("modalCheckIn");

    const checkOut =
        document.getElementById("modalCheckOut");

    const bookingModal =
        document.getElementById("bookingModal");


    // ----------------------------------------------------------
    // Filter ngày & Tất cả ngày
    // ----------------------------------------------------------

    if (dateFilter) {
        dateFilter.addEventListener(
            "change",
            function () {
                loadBookings();
            }
        );
    }

    const btnAllBookings = document.getElementById("btnAllBookings");
    if (btnAllBookings) {
        btnAllBookings.addEventListener("click", function () {
            if (dateFilter) {
                dateFilter.value = "";
            }
            loadBookings();
        });
    }


    // ----------------------------------------------------------
    // Filter trạng thái
    // ----------------------------------------------------------

    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            function () {
                filterBookings();
            }
        );

    }


    // ----------------------------------------------------------
    // Tìm kiếm
    // ----------------------------------------------------------

    if (keywordInput) {

        keywordInput.addEventListener(
            "input",
            function () {
                filterBookings();
            }
        );

    }


    // ----------------------------------------------------------
    // Refresh
    // ----------------------------------------------------------

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            function () {

                showToast(
                    "Đang làm mới danh sách booking...",
                    "info"
                );

                loadBookings();
            }
        );

    }


    // ----------------------------------------------------------
    // Mở modal
    // ----------------------------------------------------------

    if (openModalButton) {

        openModalButton.addEventListener(
            "click",
            function () {
                openBookingModal();
            }
        );

    }


    // ----------------------------------------------------------
    // Đóng modal
    // ----------------------------------------------------------

    if (closeModalButton) {

        closeModalButton.addEventListener(
            "click",
            function () {
                closeBookingModal();
            }
        );

    }


    if (cancelModalButton) {

        cancelModalButton.addEventListener(
            "click",
            function () {
                closeBookingModal();
            }
        );

    }


    // ----------------------------------------------------------
    // Save booking
    // ----------------------------------------------------------

    if (saveBookingButton) {

        saveBookingButton.addEventListener(
            "click",
            function () {
                createBooking();
            }
        );

    }


    // ----------------------------------------------------------
    // Đổi khách sạn trong modal
    // ----------------------------------------------------------

    if (modalHotel) {

        modalHotel.addEventListener(
            "change",
            function () {

                loadAvailableRooms(
                    modalHotel.value
                );

            }
        );

    }


    // ----------------------------------------------------------
    // Đổi phòng
    // ----------------------------------------------------------

    if (modalRoom) {

        modalRoom.addEventListener(
            "change",
            function () {
                updateRoomPreview();
            }
        );

    }


    // ----------------------------------------------------------
    // Thay đổi ngày
    // ----------------------------------------------------------

    if (checkIn) {

        checkIn.addEventListener(
            "change",
            function () {

                updateCheckOutMinDate();
                updateNightCount();

            }
        );

    }


    if (checkOut) {

        checkOut.addEventListener(
            "change",
            function () {
                updateNightCount();
            }
        );

    }


    // ----------------------------------------------------------
    // Click ra ngoài modal để đóng
    // ----------------------------------------------------------

    if (bookingModal) {

        bookingModal.addEventListener(
            "click",
            function (event) {

                if (event.target === bookingModal) {
                    closeBookingModal();
                }

            }
        );

    }

}



// ============================================================
// LOAD BOOKING
// ============================================================

async function loadBookings() {

    const hotelId =
        appState.selectedHotelId;

    const dateElement =
        document.getElementById("bookingDateFilter");

    const date =
        dateElement ? dateElement.value : "";

    showBookingLoading();

    try {
        let url = API_BASE + "/bookings";
        const params = [];
        if (hotelId) {
            params.push("hotelId=" + encodeURIComponent(hotelId));
        }
        if (date) {
            params.push("date=" + encodeURIComponent(date));
        }
        if (params.length > 0) {
            url += "?" + params.join("&");
        }

        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await readResponseJson(response);
            throw new Error(errorData.error || "Không thể tải booking.");
        }

        const data = await response.json();
        allBookings = Array.isArray(data) ? data : [];

        updateSummary();
        filterBookings();
        updateTableSubtitle();

    } catch (error) {
        console.error("Lỗi load booking:", error);
        allBookings = [];
        updateSummary();
        renderEmptyBooking("Không thể tải danh sách booking.");
        showToast(error.message || "Lỗi kết nối máy chủ.", "error");
    }
}

function updateTableSubtitle() {
    const subtitle = document.getElementById("bookingTableSubtitle");
    if (!subtitle) return;

    let hotelName = "Tất Cả Chi Nhánh";
    if (appState.selectedHotelId) {
        const found = appState.hotels.find(h => h.hotelId === appState.selectedHotelId);
        if (found) {
            hotelName = found.hotelName || found.name;
        }
    }

    const dateElement = document.getElementById("bookingDateFilter");
    const date = dateElement ? dateElement.value : "";

    if (date) {
        subtitle.textContent = `${hotelName} - Ngày ${formatDateVi(date)} - ${allBookings.length} booking`;
    } else {
        subtitle.textContent = `${hotelName} - Tất cả các ngày - ${allBookings.length} booking`;
    }
}



// ============================================================
// FILTER BOOKING
// ============================================================

function filterBookings() {

    const statusElement =
        document.getElementById(
            "bookingStatusFilter"
        );

    const keywordElement =
        document.getElementById(
            "bookingKeyword"
        );


    const status =
        statusElement
            ? statusElement.value
            : "ALL";


    const keyword =
        keywordElement
            ? keywordElement.value
                .trim()
                .toLowerCase()
            : "";


    const result =
        allBookings.filter(
            function (booking) {

                // ----------------------------------------------
                // Filter status
                // ----------------------------------------------

                const matchStatus =
                    status === "ALL"
                    || booking.status === status;


                // ----------------------------------------------
                // Search
                // ----------------------------------------------

                const searchText = [
                    booking.bookingId,
                    booking.guestId,
                    booking.guestName,
                    booking.roomNumber,
                    booking.roomType
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                const matchKeyword =
                    keyword === ""
                    || searchText.includes(keyword);


                return (
                    matchStatus &&
                    matchKeyword
                );

            }
        );


    renderBookingTable(result);

}



// ============================================================
// RENDER TABLE
// ============================================================

function renderBookingTable(bookings) {

    const tbody =
        document.getElementById(
            "bookingTableBody"
        );


    if (!tbody) {
        return;
    }


    if (
        !bookings ||
        bookings.length === 0
    ) {

        renderEmptyBooking(
            "Không có booking phù hợp."
        );

        return;
    }


    let html = "";


    bookings.forEach(
        function (booking) {

            html += `
                <tr>

                    <td>
                        <span class="booking-id">
                            ${escapeHtml(
                                booking.bookingId || "-"
                            )}
                        </span>
                    </td>


                    <td>

                        <div class="guest-name">

                            ${escapeHtml(
                                booking.guestName || "-"
                            )}

                        </div>

                        <div class="muted-line">

                            ${escapeHtml(
                                booking.guestId || ""
                            )}

                        </div>

                    </td>


                    <td>
                        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                            <strong>
                                P.${escapeHtml(booking.roomNumber || "-")}
                            </strong>
                            ${!appState.selectedHotelId && booking.hotelId ? `
                                <span style="font-size:11px; background:#eff6ff; color:#2563eb; padding:1px 7px; border-radius:5px; font-weight:700; border:1px solid #dbeafe;">
                                    <i class="fa-solid fa-hotel" style="font-size:10px;"></i>
                                    ${escapeHtml(((appState.hotels || []).find(x => x.hotelId === booking.hotelId) || {}).city || booking.hotelId)}
                                </span>
                            ` : ''}
                        </div>
                        <div class="muted-line">
                            ${escapeHtml(booking.roomType || "")}
                        </div>
                    </td>


                    <td>

                        ${formatDateVi(
                            booking.checkInDate
                        )}

                    </td>


                    <td>

                        ${formatDateVi(
                            booking.checkOutDate
                        )}

                    </td>


                    <td>

                        ${
                            booking.numberOfGuests
                            != null
                                ? booking.numberOfGuests
                                : "-"
                        }

                    </td>


                    <td>

                        ${renderStatusBadge(
                            booking.status
                        )}

                    </td>


                    <td>

                        ${renderActionButtons(
                            booking
                        )}

                    </td>

                </tr>
            `;

        }
    );


    tbody.innerHTML = html;

}



// ============================================================
// STATUS BADGE
// ============================================================

function renderStatusBadge(status) {

    if (status === "CONFIRMED") {

        return `
            <span
                class="booking-status status-confirmed"
            >
                <i class="fa-solid fa-clock"></i>
                Đã đặt
            </span>
        `;

    }


    if (status === "CHECKED_IN") {

        return `
            <span
                class="booking-status status-checked_in"
            >
                <i class="fa-solid fa-key"></i>
                Đã nhận phòng
            </span>
        `;

    }


    if (status === "COMPLETED") {

        return `
            <span
                class="booking-status status-completed"
            >
                <i class="fa-solid fa-circle-check"></i>
                Hoàn thành
            </span>
        `;

    }


    if (status === "CANCELLED") {

        return `
            <span
                class="booking-status status-cancelled"
            >
                <i class="fa-solid fa-circle-xmark"></i>
                Đã hủy
            </span>
        `;

    }


    return `
        <span class="booking-status">
            ${escapeHtml(status || "-")}
        </span>
    `;

}



// ============================================================
// ACTION BUTTON
// ============================================================

function renderActionButtons(booking) {

    const bookingId =
        escapeJsString(
            booking.bookingId || ""
        );


    // ----------------------------------------------------------
    // CONFIRMED
    // ----------------------------------------------------------

    if (booking.status === "CONFIRMED") {

        return `
            <div class="booking-actions">

                <button
                    type="button"
                    class="booking-action-btn btn-checkin"
                    onclick="changeBookingStatus(
                        '${bookingId}',
                        'CHECKED_IN'
                    )"
                >

                    <i class="fa-solid fa-key"></i>

                    Check-in

                </button>


                <button
                    type="button"
                    class="booking-action-btn btn-cancel-booking"
                    onclick="changeBookingStatus(
                        '${bookingId}',
                        'CANCELLED'
                    )"
                >

                    <i class="fa-solid fa-xmark"></i>

                    Hủy

                </button>

            </div>
        `;

    }


    // ----------------------------------------------------------
    // CHECKED_IN
    // ----------------------------------------------------------

    if (booking.status === "CHECKED_IN") {

        return `
            <div class="booking-actions">

                <button
                    type="button"
                    class="booking-action-btn btn-checkout"
                    onclick="changeBookingStatus(
                        '${bookingId}',
                        'COMPLETED'
                    )"
                >

                    <i class="fa-solid fa-right-from-bracket"></i>

                    Check-out

                </button>

            </div>
        `;

    }


    // ----------------------------------------------------------
    // COMPLETED / CANCELLED
    // ----------------------------------------------------------

    return `
        <span class="muted-line">
            Không có thao tác
        </span>
    `;

}



// ============================================================
// CHANGE BOOKING STATUS
// ============================================================

async function changeBookingStatus(
    bookingId,
    newStatus
) {

    let message =
        "Xác nhận thay đổi trạng thái booking?";


    if (newStatus === "CHECKED_IN") {

        message =
            "Xác nhận khách đã đến nhận phòng?";

    }


    if (newStatus === "COMPLETED") {

        message =
            "Xác nhận khách đã trả phòng?";

    }


    if (newStatus === "CANCELLED") {

        message =
            "Bạn có chắc chắn muốn hủy booking này?";

    }


    const confirmed =
        window.confirm(message);


    if (!confirmed) {
        return;
    }


    try {

        const url =
            API_BASE
            + "/bookings/"
            + encodeURIComponent(bookingId)
            + "/status";


        const response =
            await fetch(
                url,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        status: newStatus
                    })
                }
            );


        const data =
            await readResponseJson(response);


        if (!response.ok) {

            throw new Error(
                data.error
                || "Không thể cập nhật booking."
            );

        }


        showToast(
            data.message
            || "Cập nhật trạng thái thành công!",
            "success"
        );


        await loadBookings();


    } catch (error) {

        console.error(
            "Lỗi update booking:",
            error
        );


        showToast(
            error.message
            || "Lỗi kết nối máy chủ.",
            "error"
        );

    }

}



// ============================================================
// OPEN MODAL
// ============================================================

async function openBookingModal() {

    resetBookingForm();

    renderModalHotelOptions();


    const hotelSelect =
        document.getElementById(
            "modalHotelId"
        );


    // ----------------------------------------------------------
    // Chọn khách sạn đang filter
    // ----------------------------------------------------------

    if (
        hotelSelect &&
        appState.selectedHotelId
    ) {

        hotelSelect.value =
            appState.selectedHotelId;

    }


    // ----------------------------------------------------------
    // Ngày mặc định
    // ----------------------------------------------------------

    const checkIn =
        document.getElementById(
            "modalCheckIn"
        );

    const checkOut =
        document.getElementById(
            "modalCheckOut"
        );


    const filterDateElement =
        document.getElementById(
            "bookingDateFilter"
        );


    let initialDate =
        getTodayString();


    if (
        filterDateElement &&
        filterDateElement.value
    ) {

        initialDate =
            filterDateElement.value;

    }


    if (checkIn) {

        checkIn.value =
            initialDate;

        checkIn.min =
            getTodayString();

    }


    if (checkOut) {

        checkOut.value =
            addDays(
                initialDate,
                1
            );

        checkOut.min =
            addDays(
                initialDate,
                1
            );

    }


    updateNightCount();


    // ----------------------------------------------------------
    // Load phòng AVAILABLE
    // ----------------------------------------------------------

    if (hotelSelect) {

        await loadAvailableRooms(
            hotelSelect.value
        );

    }


    // ----------------------------------------------------------
    // Show modal
    // ----------------------------------------------------------

    const modal =
        document.getElementById(
            "bookingModal"
        );


    if (modal) {

        modal.classList.add("show");

    }

}



// ============================================================
// CLOSE MODAL
// ============================================================

function closeBookingModal() {

    const modal =
        document.getElementById(
            "bookingModal"
        );


    if (modal) {

        modal.classList.remove("show");

    }

}



// ============================================================
// RESET FORM
// ============================================================

function resetBookingForm() {

    const form =
        document.getElementById(
            "bookingForm"
        );


    if (form) {

        form.reset();

    }


    const guests =
        document.getElementById(
            "modalNumberOfGuests"
        );


    if (guests) {

        guests.value = "1";

    }


    const nights =
        document.getElementById(
            "modalNumberOfNights"
        );


    if (nights) {

        nights.value = "0";

    }


    availableRooms = [];


    hideRoomPreview();

}



// ============================================================
// RENDER HOTEL SELECT
// ============================================================

function renderModalHotelOptions() {

    const select =
        document.getElementById(
            "modalHotelId"
        );


    if (!select) {
        return;
    }


    let html = "";


    appState.hotels.forEach(
        function (hotel) {

            html += `
                <option
                    value="${escapeHtml(
                        hotel.hotelId
                    )}"
                >

                    ${escapeHtml(
                        hotel.hotelName
                    )}

                    ${
                        hotel.city
                            ? " (" +
                              escapeHtml(hotel.city)
                              + ")"
                            : ""
                    }

                </option>
            `;

        }
    );


    select.innerHTML = html;

}



// ============================================================
// LOAD PHÒNG AVAILABLE
// ============================================================

async function loadAvailableRooms(hotelId) {

    const select =
        document.getElementById(
            "modalRoomNumber"
        );


    if (!select) {
        return;
    }


    availableRooms = [];


    hideRoomPreview();


    if (!hotelId) {

        select.innerHTML = `
            <option value="">
                -- Chọn khách sạn trước --
            </option>
        `;

        return;
    }


    select.innerHTML = `
        <option value="">
            Đang tải phòng...
        </option>
    `;


    try {

        const url =
            API_BASE
            + "/rooms?hotelId="
            + encodeURIComponent(hotelId);


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Không thể tải phòng."
            );

        }


        const rooms =
            await response.json();


        availableRooms =
            rooms.filter(
                function (room) {
                    return (
                        room.status === "AVAILABLE"
                    );
                }
            );


        // ------------------------------------------------------
        // Không còn phòng
        // ------------------------------------------------------

        if (availableRooms.length === 0) {

            select.innerHTML = `
                <option value="">
                    Không còn phòng trống
                </option>
            `;

            return;
        }


        // ------------------------------------------------------
        // Render phòng
        // ------------------------------------------------------

        let html = `
            <option value="">
                -- Chọn phòng --
            </option>
        `;


        availableRooms.forEach(
            function (room) {

                const price =
                    room.priceVnd
                    || room.pricePerNightVnd
                    || 0;


                html += `
                    <option
                        value="${escapeHtml(
                            room.roomNumber
                        )}"
                    >

                        P.${escapeHtml(
                            room.roomNumber
                        )}

                        - ${escapeHtml(
                            room.roomType
                            || "Standard"
                        )}

                        - ${formatVnd(price)}

                    </option>
                `;

            }
        );


        select.innerHTML = html;


    } catch (error) {

        console.error(
            "Lỗi load phòng:",
            error
        );


        select.innerHTML = `
            <option value="">
                Không tải được phòng
            </option>
        `;


        showToast(
            "Không thể tải phòng trống.",
            "error"
        );

    }

}



// ============================================================
// ROOM PREVIEW
// ============================================================

function updateRoomPreview() {

    const roomSelect =
        document.getElementById(
            "modalRoomNumber"
        );


    const preview =
        document.getElementById(
            "roomPreview"
        );


    if (
        !roomSelect ||
        !preview
    ) {
        return;
    }


    const room =
        availableRooms.find(
            function (item) {

                return (
                    String(item.roomNumber)
                    === String(roomSelect.value)
                );

            }
        );


    if (!room) {

        hideRoomPreview();

        return;
    }


    const price =
        room.priceVnd
        || room.pricePerNightVnd
        || 0;


    preview.innerHTML = `

        <strong>
            Phòng ${escapeHtml(
                room.roomNumber
            )}
        </strong>

        &nbsp;·&nbsp;

        ${escapeHtml(
            room.roomType
            || "Standard"
        )}

        &nbsp;·&nbsp;

        ${formatVnd(price)}/đêm

        &nbsp;·&nbsp;

        Tối đa ${
            room.capacity != null
                ? room.capacity
                : "-"
        } khách

    `;


    preview.classList.add("show");

}



// ============================================================
// HIDE ROOM PREVIEW
// ============================================================

function hideRoomPreview() {

    const preview =
        document.getElementById(
            "roomPreview"
        );


    if (!preview) {
        return;
    }


    preview.innerHTML = "";

    preview.classList.remove("show");

}



// ============================================================
// UPDATE CHECKOUT MIN DATE
// ============================================================

function updateCheckOutMinDate() {

    const checkIn =
        document.getElementById(
            "modalCheckIn"
        );


    const checkOut =
        document.getElementById(
            "modalCheckOut"
        );


    if (
        !checkIn ||
        !checkOut ||
        !checkIn.value
    ) {
        return;
    }


    const minCheckOut =
        addDays(
            checkIn.value,
            1
        );


    checkOut.min =
        minCheckOut;


    if (
        !checkOut.value ||
        checkOut.value <= checkIn.value
    ) {

        checkOut.value =
            minCheckOut;

    }

}



// ============================================================
// TÍNH SỐ ĐÊM
// ============================================================

function updateNightCount() {

    const checkIn =
        document.getElementById(
            "modalCheckIn"
        );


    const checkOut =
        document.getElementById(
            "modalCheckOut"
        );


    const nightsInput =
        document.getElementById(
            "modalNumberOfNights"
        );


    if (
        !checkIn ||
        !checkOut ||
        !nightsInput
    ) {
        return;
    }


    if (
        !checkIn.value ||
        !checkOut.value
    ) {

        nightsInput.value = "0";

        return;
    }


    const start =
        new Date(
            checkIn.value + "T00:00:00"
        );


    const end =
        new Date(
            checkOut.value + "T00:00:00"
        );


    const millisecondsPerDay =
        1000 * 60 * 60 * 24;


    const nights =
        Math.round(
            (end - start)
            / millisecondsPerDay
        );


    nightsInput.value =
        nights > 0
            ? String(nights)
            : "0";

}



// ============================================================
// CREATE BOOKING
// ============================================================

async function createBooking() {

    // ----------------------------------------------------------
    // Lấy dữ liệu form
    // ----------------------------------------------------------

    const guestId =
        getInputValue(
            "modalGuestId"
        );


    const guestName =
        getInputValue(
            "modalGuestName"
        );


    const hotelId =
        getInputValue(
            "modalHotelId"
        );


    const roomNumber =
        getInputValue(
            "modalRoomNumber"
        );


    const checkInDate =
        getInputValue(
            "modalCheckIn"
        );


    const checkOutDate =
        getInputValue(
            "modalCheckOut"
        );


    const specialRequest =
        getInputValue(
            "modalSpecialRequest"
        );


    const numberOfGuestsElement =
        document.getElementById(
            "modalNumberOfGuests"
        );


    const numberOfGuests =
        numberOfGuestsElement
            ? parseInt(
                numberOfGuestsElement.value,
                10
            ) || 1
            : 1;


    // ----------------------------------------------------------
    // Validate
    // ----------------------------------------------------------

    if (!guestId) {

        showToast(
            "Vui lòng nhập mã khách hàng.",
            "warning"
        );

        return;
    }


    if (!guestName) {

        showToast(
            "Vui lòng nhập tên khách hàng.",
            "warning"
        );

        return;
    }


    if (!hotelId) {

        showToast(
            "Vui lòng chọn khách sạn.",
            "warning"
        );

        return;
    }


    if (!roomNumber) {

        showToast(
            "Vui lòng chọn phòng.",
            "warning"
        );

        return;
    }


    if (
        !checkInDate ||
        !checkOutDate
    ) {

        showToast(
            "Vui lòng chọn ngày check-in và check-out.",
            "warning"
        );

        return;
    }


    if (
        checkOutDate <= checkInDate
    ) {

        showToast(
            "Ngày check-out phải sau ngày check-in.",
            "warning"
        );

        return;
    }


    // ----------------------------------------------------------
    // Tìm tên khách sạn
    // ----------------------------------------------------------

    const hotel =
        appState.hotels.find(
            function (item) {

                return (
                    item.hotelId === hotelId
                );

            }
        );


    const hotelName =
        hotel
            ? hotel.hotelName
            : hotelId;


    // ----------------------------------------------------------
    // Payload
    // Backend tự:
    // - sinh bookingId
    // - lấy roomType
    // - tính numberOfNights
    // - tính totalAmountVnd
    // - status = CONFIRMED
    // ----------------------------------------------------------

    const payload = {

        guestId: guestId,

        guestName: guestName,

        hotelId: hotelId,

        hotelName: hotelName,

        roomNumber: roomNumber,

        checkInDate: checkInDate,

        checkOutDate: checkOutDate,

        numberOfGuests:
            numberOfGuests,

        specialRequest:
            specialRequest

    };


    const saveButton =
        document.getElementById(
            "btnSaveBooking"
        );


    setSaveButtonLoading(
        true
    );


    try {

        const response =
            await fetch(
                API_BASE + "/bookings",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(payload)
                }
            );


        const data =
            await readResponseJson(
                response
            );


        if (!response.ok) {

            throw new Error(
                data.error
                || "Không thể tạo booking."
            );

        }


        showToast(
            data.message
            || "Tạo booking thành công!",
            "success"
        );


        closeBookingModal();


        // ------------------------------------------------------
        // Chuyển giao diện tới booking vừa tạo
        // ------------------------------------------------------

        if (
            appState.selectedHotelId
            !== hotelId
        ) {

            selectHotel(hotelId);

        }


        const dateFilter =
            document.getElementById(
                "bookingDateFilter"
            );


        if (dateFilter) {

            dateFilter.value =
                checkInDate;

        }


        await loadBookings();


    } catch (error) {

        console.error(
            "Lỗi create booking:",
            error
        );


        showToast(
            error.message
            || "Không thể tạo booking.",
            "error"
        );


    } finally {

        setSaveButtonLoading(
            false
        );

    }

}



// ============================================================
// SUMMARY
// ============================================================

function updateSummary() {

    const total =
        allBookings.length;


    const confirmed =
        allBookings.filter(
            function (booking) {

                return (
                    booking.status
                    === "CONFIRMED"
                );

            }
        ).length;


    const checkedIn =
        allBookings.filter(
            function (booking) {

                return (
                    booking.status
                    === "CHECKED_IN"
                );

            }
        ).length;


    const closed =
        allBookings.filter(
            function (booking) {

                return (
                    booking.status
                    === "COMPLETED"
                    ||
                    booking.status
                    === "CANCELLED"
                );

            }
        ).length;


    setElementText(
        "summaryTotal",
        total
    );


    setElementText(
        "summaryConfirmed",
        confirmed
    );


    setElementText(
        "summaryCheckedIn",
        checkedIn
    );


    setElementText(
        "summaryClosed",
        closed
    );

}



// ============================================================
// SUBTITLE
// ============================================================

function updateTableSubtitle() {

    const subtitle =
        document.getElementById(
            "bookingTableSubtitle"
        );


    if (!subtitle) {
        return;
    }


    const hotel =
        appState.hotels.find(
            function (item) {

                return (
                    item.hotelId
                    === appState.selectedHotelId
                );

            }
        );


    const dateElement =
        document.getElementById(
            "bookingDateFilter"
        );


    const date =
        dateElement
            ? dateElement.value
            : "";


    subtitle.textContent =
        (
            hotel
                ? hotel.hotelName
                : "Chi nhánh"
        )
        + " · "
        + formatDateVi(date)
        + " · "
        + allBookings.length
        + " booking";

}



// ============================================================
// LOADING
// ============================================================

function showBookingLoading() {

    const tbody =
        document.getElementById(
            "bookingTableBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = `

        <tr>

            <td
                colspan="8"
                class="booking-empty"
            >

                <i
                    class="fa-solid fa-spinner fa-spin"
                ></i>

                Đang tải dữ liệu...

            </td>

        </tr>
    `;

}



// ============================================================
// EMPTY TABLE
// ============================================================

function renderEmptyBooking(message) {

    const tbody =
        document.getElementById(
            "bookingTableBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = `

        <tr>

            <td
                colspan="8"
                class="booking-empty"
            >

                <i
                    class="fa-regular fa-calendar-xmark"
                ></i>

                ${escapeHtml(message)}

            </td>

        </tr>
    `;

}



// ============================================================
// SAVE BUTTON LOADING
// ============================================================

function setSaveButtonLoading(
    loading
) {

    const button =
        document.getElementById(
            "btnSaveBooking"
        );


    if (!button) {
        return;
    }


    button.disabled =
        loading;


    if (loading) {

        button.innerHTML = `
            <i
                class="fa-solid fa-spinner fa-spin"
            ></i>

            Đang tạo...
        `;

    } else {

        button.innerHTML = `
            <i
                class="fa-solid fa-floppy-disk"
            ></i>

            Tạo Booking
        `;

    }

}



// ============================================================
// HELPER - GET INPUT VALUE
// ============================================================

function getInputValue(id) {

    const element =
        document.getElementById(id);


    if (!element) {
        return "";
    }


    return String(
        element.value || ""
    ).trim();

}



// ============================================================
// HELPER - DATE TODAY
// ============================================================

function getTodayString() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        year
        + "-"
        + month
        + "-"
        + day
    );

}



// ============================================================
// HELPER - ADD DAYS
// ============================================================

function addDays(
    dateString,
    numberOfDays
) {

    const date =
        new Date(
            dateString
            + "T00:00:00"
        );


    date.setDate(
        date.getDate()
        + numberOfDays
    );


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        year
        + "-"
        + month
        + "-"
        + day
    );

}



// ============================================================
// HELPER - FORMAT DATE
// ============================================================

function formatDateVi(dateString) {

    if (!dateString) {
        return "-";
    }


    const parts =
        String(dateString)
            .split("-");


    if (parts.length !== 3) {

        return dateString;

    }


    return (
        parts[2]
        + "/"
        + parts[1]
        + "/"
        + parts[0]
    );

}



// ============================================================
// HELPER - RESPONSE JSON
// ============================================================

async function readResponseJson(
    response
) {

    try {

        return await response.json();

    } catch (error) {

        return {};

    }

}



// ============================================================
// HELPER - SET TEXT
// ============================================================

function setElementText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            String(value);

    }

}



// ============================================================
// HELPER - ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    const text =
        String(
            value == null
                ? ""
                : value
        );


    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}



// ============================================================
// HELPER - ESCAPE JS STRING
// Dùng bookingId trong onclick
// ============================================================

function escapeJsString(value) {

    return String(
        value == null
            ? ""
            : value
    )
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");

}