/**
 * ============================================================
 * CORE APPLICATION JAVASCRIPT (SPA - PMS EDITION)
 * Phụ trách: Thành viên 1 (Trưởng nhóm)
 * Quản lý: Dashboard Analytics, Custom Dropdown, PMS Room Grid
 * ============================================================
 */

// State Management
const appState = {
    hotels: [],
    selectedHotelId: '',
    rooms: [],
    dashboardStats: null,
    currentStatusFilter: 'ALL',
    viewMode: 'grid', // 'grid' or 'list'
    charts: {
        revenue: null,
        status: null
    }
};

// API Base URL
const API_BASE = '/api';

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCustomDropdown();
    initFilters();
    loadHotels();
    loadDashboard();
    loadRooms();

    // Refresh Button
    document.getElementById('btnRefresh').addEventListener('click', () => {
        showToast('Đang làm mới dữ liệu...', 'info');
        loadDashboard();
        loadRooms();
    });
});

/**
 * Điều hướng Tab SPA
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
}

function switchTab(tabId) {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId);
    });

    const pageTitle = document.getElementById('page-title');
    switch(tabId) {
        case 'dashboard-tab':
            pageTitle.innerText = 'Dashboard Tổng Quan';
            loadDashboard();
            break;
        case 'rooms-tab':
            pageTitle.innerText = 'Sơ Đồ Phòng Khách Sạn';
            loadRooms();
            break;
        case 'tasks-tab':
            pageTitle.innerText = 'Phân Chia Nhiệm Vụ 3 Thành Viên';
            break;
        case 'booking-tab':
            pageTitle.innerText = 'Đặt Phòng';
            break;
        case 'invoice-tab':
            pageTitle.innerText = 'Hóa Đơn';
            break;
    }
}

/**
 * ============================================================
 * CUSTOM INTERACTIVE DROPDOWN COMPONENT (100% LIGHT THEME)
 * ============================================================
 */
function initCustomDropdown() {
    const btn = document.getElementById('hotelDropdownBtn');
    const menu = document.getElementById('hotelDropdownMenu');

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menu.classList.contains('show');
        if (isOpen) {
            menu.classList.remove('show');
            btn.classList.remove('open');
        } else {
            menu.classList.add('show');
            btn.classList.add('open');
        }
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#hotelDropdownContainer')) {
            menu.classList.remove('show');
            btn.classList.remove('open');
        }
    });
}

/**
 * Tải danh sách Khách Sạn ('hotels' - Q1) & Điền vào Custom Dropdown
 */
async function loadHotels() {
    try {
        const res = await fetch(`${API_BASE}/hotels`);
        const data = await res.json();
        appState.hotels = data;

        // Điền vào Custom Dropdown List
        const dropdownList = document.getElementById('hotelDropdownList');
        const modalHotelSelect = document.getElementById('modalHotelId');
        const bkHotelSelect = document.getElementById('bkHotelId');

        dropdownList.innerHTML = `
            <div class="dropdown-item ${appState.selectedHotelId === '' ? 'active' : ''}" onclick="selectHotel('')">
                <i class="fa-solid fa-globe"></i>
                <span>Tất Cả Chi Nhánh</span>
                <i class="fa-solid fa-check check-icon"></i>
            </div>
        `;

        if (modalHotelSelect) modalHotelSelect.innerHTML = '';
        if (bkHotelSelect) bkHotelSelect.innerHTML = '';

        data.forEach(h => {
            const shortName = h.hotelName.replace('Suong Mai ', '');
            dropdownList.innerHTML += `
                <div class="dropdown-item ${appState.selectedHotelId === h.hotelId ? 'active' : ''}" onclick="selectHotel('${h.hotelId}')">
                    <i class="fa-solid fa-hotel"></i>
                    <span>${shortName} <small style="color:#94a3b8">(${h.city})</small></span>
                    <i class="fa-solid fa-check check-icon"></i>
                </div>
            `;

            const opt = `<option value="${h.hotelId}">${h.hotelName} (${h.city})</option>`;
            if (modalHotelSelect) modalHotelSelect.innerHTML += opt;
            if (bkHotelSelect) bkHotelSelect.innerHTML += opt;
        });

    } catch (err) {
        console.error('Lỗi khi tải danh sách khách sạn:', err);
    }
}

function selectHotel(hotelId) {
    appState.selectedHotelId = hotelId;
    const hotel = appState.hotels.find(h => h.hotelId === hotelId);
    const label = hotel ? hotel.hotelName.replace('Suong Mai ', '') + ` (${hotel.city})` : 'Tất Cả Chi Nhánh';

    document.getElementById('selectedHotelLabel').innerText = label;
    document.getElementById('hotelSelector').value = hotelId;

    // Update active class in custom dropdown list
    const items = document.querySelectorAll('.dropdown-item');
    items.forEach(item => item.classList.remove('active'));
    
    // Close dropdown
    document.getElementById('hotelDropdownMenu').classList.remove('show');
    document.getElementById('hotelDropdownBtn').classList.remove('open');

    // Reload data
    loadDashboard();
    loadRooms();
}

/**
 * ============================================================
 * DASHBOARD ANALYTICS & CHART.JS (TV1)
 * ============================================================
 */
async function loadDashboard() {
    try {
        let url = `${API_BASE}/dashboard/stats`;
        if (appState.selectedHotelId) {
            url += `?hotelId=${encodeURIComponent(appState.selectedHotelId)}`;
        }

        const res = await fetch(url);
        const stats = await res.json();
        appState.dashboardStats = stats;

        // KPI cards
        document.getElementById('kpiTotalRooms').innerText = stats.totalRooms || 0;
        document.getElementById('kpiTotalHotels').innerText = stats.totalHotels || 0;
        document.getElementById('kpiOccupiedRooms').innerText = stats.occupiedRooms || 0;
        document.getElementById('kpiOccupancyRate').innerText = `${stats.occupancyRate || 0}%`;
        document.getElementById('kpiTotalRevenue').innerText = formatVnd(stats.totalRevenueVnd || 0);
        document.getElementById('kpiAvailableRooms').innerText = stats.availableRooms || 0;
        document.getElementById('kpiBookedRooms').innerText = stats.bookedRooms || 0;
        document.getElementById('kpiMaintenanceRooms').innerText = stats.maintenanceRooms || 0;

        renderRevenueChart(stats.revenueByHotel || {});
        renderStatusChart(stats.roomsByStatus || {});

    } catch (err) {
        console.error('Lỗi khi tải dữ liệu Dashboard:', err);
    }
}

function renderRevenueChart(revenueData) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    const labels = Object.keys(revenueData).map(name => name.replace('Suong Mai ', ''));
    const values = Object.values(revenueData);

    if (appState.charts.revenue) {
        appState.charts.revenue.destroy();
    }

    appState.charts.revenue = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: values,
                backgroundColor: '#4f46e5',
                borderRadius: 6,
                hoverBackgroundColor: '#4338ca'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${formatVnd(ctx.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 11, weight: '500' } }
                },
                y: {
                    grid: { color: '#f1f5f9' },
                    ticks: {
                        color: '#64748b',
                        font: { size: 11 },
                        callback: (value) => `${(value / 1000000).toFixed(0)} tr`
                    }
                }
            }
        }
    });
}

function renderStatusChart(statusData) {
    const ctx = document.getElementById('statusChart').getContext('2d');

    if (appState.charts.status) {
        appState.charts.status.destroy();
    }

    const labels = ['Trống', 'Đang ở', 'Đã đặt', 'Bảo trì'];
    const values = [
        statusData['AVAILABLE'] || 0,
        statusData['OCCUPIED'] || 0,
        statusData['BOOKED'] || 0,
        statusData['MAINTENANCE'] || 0
    ];

    appState.charts.status = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: ['#10b981', '#f43f5e', '#f59e0b', '#94a3b8'],
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#475569', font: { size: 11, weight: '500' }, padding: 12 }
                }
            },
            cutout: '72%'
        }
    });
}

/**
 * ============================================================
 * PMS ROOM GRID VIEW (RE-DESIGNED, CLEAN & ELEGANT)
 * ============================================================
 */
async function loadRooms() {
    try {
        let url = `${API_BASE}/rooms`;
        if (appState.selectedHotelId) {
            url += `?hotelId=${encodeURIComponent(appState.selectedHotelId)}`;
        }

        const res = await fetch(url);
        const rooms = await res.json();
        appState.rooms = rooms;

        updateStatusChipCounts();
        filterAndRenderRooms();
    } catch (err) {
        console.error('Lỗi khi tải danh sách phòng:', err);
    }
}

function initFilters() {
    document.getElementById('filterRoomFloor').addEventListener('change', filterAndRenderRooms);
    document.getElementById('searchRoomKeyword').addEventListener('input', filterAndRenderRooms);
}

function setStatusChipFilter(status) {
    appState.currentStatusFilter = status;
    document.querySelectorAll('.status-chip').forEach(chip => {
        chip.classList.toggle('active', chip.getAttribute('data-status') === status);
    });
    filterAndRenderRooms();
}

function setRoomViewMode(mode) {
    appState.viewMode = mode;
    document.getElementById('btnViewGrid').classList.toggle('active', mode === 'grid');
    document.getElementById('btnViewList').classList.toggle('active', mode === 'list');
    
    document.getElementById('roomGridContainer').style.display = mode === 'grid' ? 'grid' : 'none';
    document.getElementById('roomTableContainer').style.display = mode === 'list' ? 'block' : 'none';

    filterAndRenderRooms();
}

function updateStatusChipCounts() {
    const total = appState.rooms.length;
    const available = appState.rooms.filter(r => r.status === 'AVAILABLE').length;
    const occupied = appState.rooms.filter(r => r.status === 'OCCUPIED').length;
    const booked = appState.rooms.filter(r => r.status === 'BOOKED').length;
    const maintenance = appState.rooms.filter(r => r.status === 'MAINTENANCE').length;

    document.getElementById('chipCountAll').innerText = total;
    document.getElementById('chipCountAvailable').innerText = available;
    document.getElementById('chipCountOccupied').innerText = occupied;
    document.getElementById('chipCountBooked').innerText = booked;
    document.getElementById('chipCountMaintenance').innerText = maintenance;
}

function filterAndRenderRooms() {
    const statusFilter = appState.currentStatusFilter;
    const floorFilter = document.getElementById('filterRoomFloor').value;
    const keyword = document.getElementById('searchRoomKeyword').value.trim().toLowerCase();

    const filtered = appState.rooms.filter(r => {
        const matchStatus = (statusFilter === 'ALL') || (r.status === statusFilter);
        const matchFloor = (floorFilter === 'ALL') || (r.floor == floorFilter);
        const matchKeyword = !keyword || 
            (r.roomNumber && r.roomNumber.toLowerCase().includes(keyword)) ||
            (r.roomType && r.roomType.toLowerCase().includes(keyword));

        return matchStatus && matchFloor && matchKeyword;
    });

    if (appState.viewMode === 'list') {
        renderRoomTable(filtered);
    } else {
        renderRoomGrid(filtered);
    }
}

/**
 * Render Lưới Phòng theo Nhóm Khách Sạn (Clean PMS Style)
 */
function renderRoomGrid(rooms) {
    const container = document.getElementById('roomGridContainer');
    
    if (rooms.length === 0) {
        container.innerHTML = '<div class="panel-card text-center text-muted" style="grid-column: 1/-1; padding: 40px;">Không tìm thấy phòng phù hợp.</div>';
        return;
    }

    // Nếu đang chọn "Tất Cả Chi Nhánh", nhóm phòng theo Khách Sạn
    if (!appState.selectedHotelId) {
        // Group by hotelId
        const groups = {};
        rooms.forEach(r => {
            if (!groups[r.hotelId]) groups[r.hotelId] = [];
            groups[r.hotelId].push(r);
        });

        let html = '';
        for (const [hotelId, hotelRooms] of Object.entries(groups)) {
            const hotel = appState.hotels.find(h => h.hotelId === hotelId);
            const hotelName = hotel ? hotel.hotelName : hotelId;
            const city = hotel ? hotel.city : '';

            html += `
                <div class="hotel-room-group" style="grid-column: 1 / -1;">
                    <div class="hotel-group-header">
                        <div class="hotel-group-title">
                            <i class="fa-solid fa-hotel text-indigo"></i> ${hotelName} <small style="color: #64748b; font-weight: 500;">(${city})</small>
                        </div>
                        <span class="hotel-group-badge">${hotelRooms.length} Phòng</span>
                    </div>
                    <div class="room-grid">
                        ${hotelRooms.map(r => renderSingleRoomCard(r)).join('')}
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
    } else {
        container.innerHTML = rooms.map(r => renderSingleRoomCard(r)).join('');
    }
}

/**
 * Render 1 Thẻ Phòng PMS Tinh Gọn & Đẹp Mắt
 */
function renderSingleRoomCard(r) {
    const statusLower = (r.status || 'AVAILABLE').toLowerCase();
    
    let actionBtnHtml = '';
    if (r.status === 'AVAILABLE') {
        actionBtnHtml = `
            <button class="btn-card-action btn-card-available" onclick="changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'OCCUPIED')" title="Chuyển sang Đang Ở">
                <i class="fa-solid fa-user-check"></i> Đang Ở
            </button>
            <button class="btn-card-action btn-card-maintenance" onclick="changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'MAINTENANCE')" title="Chuyển sang Bảo Trì">
                <i class="fa-solid fa-wrench"></i> Bảo Trì
            </button>
        `;
    } else if (r.status === 'OCCUPIED') {
        actionBtnHtml = `
            <button class="btn-card-action btn-card-occupied" onclick="changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'AVAILABLE')" title="Trả phòng & chuyển về Trống">
                <i class="fa-solid fa-arrow-rotate-left"></i> Trả Phòng
            </button>
        `;
    } else if (r.status === 'BOOKED') {
        actionBtnHtml = `
            <button class="btn-card-action btn-card-booked" onclick="changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'OCCUPIED')" title="Nhận phòng">
                <i class="fa-solid fa-key"></i> Nhận Phòng
            </button>
        `;
    } else {
        actionBtnHtml = `
            <button class="btn-card-action btn-card-available" onclick="changeRoomStatus('${r.hotelId}', '${r.roomNumber}', 'AVAILABLE')" title="Hoàn tất bảo trì">
                <i class="fa-solid fa-check"></i> Xong Bảo Trì
            </button>
        `;
    }

    return `
        <div class="pms-room-card status-${statusLower}">
            <div class="pms-card-top">
                <div class="pms-room-number">
                    ${r.roomNumber}
                    <span class="pms-floor-tag">Tầng ${r.floor}</span>
                </div>
                <span class="status-tag ${getStatusClass(r.status)}">${r.status}</span>
            </div>

            <div class="pms-room-type">${r.roomType}</div>

            <div class="pms-room-info-row">
                <div class="pms-specs">
                    <span><i class="fa-solid fa-user"></i> ${r.capacity}</span>
                    <span>·</span>
                    <span><i class="fa-solid fa-compass"></i> ${r.roomView || 'N/A'}</span>
                </div>
                <div class="pms-price">
                    ${formatVnd(r.priceVnd)}<small>/đêm</small>
                </div>
            </div>

            <div class="pms-card-actions">
                ${actionBtnHtml}
                <button class="btn-card-edit" onclick='editRoom(${JSON.stringify(r)})' title="Sửa thông tin phòng">
                    <i class="fa-solid fa-pen"></i>
                </button>
            </div>
        </div>
    `;
}

/**
 * Render Danh Sách Phòng Dạng Bảng (Table View)
 */
function renderRoomTable(rooms) {
    const tbody = document.getElementById('roomTableBody');
    if (!tbody) return;

    if (rooms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">Không tìm thấy phòng phù hợp</td></tr>';
        return;
    }

    tbody.innerHTML = rooms.map(r => {
        const hotel = appState.hotels.find(h => h.hotelId === r.hotelId);
        const hotelName = hotel ? hotel.hotelName.replace('Suong Mai ', '') : r.hotelId;

        return `
            <tr>
                <td><strong>Phòng ${r.roomNumber}</strong></td>
                <td>${hotelName}</td>
                <td><span class="pms-floor-tag">${r.roomType}</span></td>
                <td>Tầng ${r.floor}</td>
                <td>${r.capacity} người</td>
                <td>${r.roomView || 'N/A'}</td>
                <td class="text-green"><strong>${formatVnd(r.priceVnd)}</strong></td>
                <td><span class="status-tag ${getStatusClass(r.status)}">${r.status}</span></td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick='editRoom(${JSON.stringify(r)})'>
                        <i class="fa-solid fa-pen"></i> Sửa
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function changeRoomStatus(hotelId, roomNumber, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/rooms/${hotelId}/${roomNumber}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (res.ok) {
            showToast(`Cập nhật phòng ${roomNumber} sang ${newStatus}!`, 'success');
            loadRooms();
            loadDashboard();
        } else {
            showToast('Không thể cập nhật trạng thái', 'error');
        }
    } catch (err) {
        console.error('Lỗi:', err);
        showToast('Lỗi kết nối máy chủ', 'error');
    }
}

/**
 * Modal Thêm / Chỉnh Sửa Phòng
 */
function openAddRoomModal() {
    document.getElementById('roomModalTitle').innerHTML = '<i class="fa-solid fa-plus text-indigo"></i> Thêm Phòng Mới';
    document.getElementById('modalRoomNumber').readOnly = false;
    document.getElementById('modalRoomNumber').value = '';
    document.getElementById('modalRoomType').value = 'Deluxe Ocean View';
    document.getElementById('modalFloor').value = '1';
    document.getElementById('modalPrice').value = '1500000';
    document.getElementById('modalCapacity').value = '2';
    document.getElementById('modalRoomView').value = 'Ocean';
    document.getElementById('modalRoomStatus').value = 'AVAILABLE';
    document.getElementById('modalDescription').value = '';

    if (appState.selectedHotelId) {
        document.getElementById('modalHotelId').value = appState.selectedHotelId;
    }

    document.getElementById('roomModal').classList.add('open');
}

function editRoom(room) {
    document.getElementById('roomModalTitle').innerHTML = `<i class="fa-solid fa-pen text-indigo"></i> Sửa Phòng ${room.roomNumber}`;
    document.getElementById('modalHotelId').value = room.hotelId;
    document.getElementById('modalRoomNumber').value = room.roomNumber;
    document.getElementById('modalRoomNumber').readOnly = true;
    document.getElementById('modalRoomType').value = room.roomType;
    document.getElementById('modalFloor').value = room.floor;
    document.getElementById('modalPrice').value = room.priceVnd;
    document.getElementById('modalCapacity').value = room.capacity;
    document.getElementById('modalRoomView').value = room.roomView || '';
    document.getElementById('modalRoomStatus').value = room.status;
    document.getElementById('modalDescription').value = room.description || '';

    document.getElementById('roomModal').classList.add('open');
}

function closeRoomModal() {
    document.getElementById('roomModal').classList.remove('open');
}

async function saveRoom() {
    const isEdit = document.getElementById('modalRoomNumber').readOnly;
    const hotelId = document.getElementById('modalHotelId').value;
    const roomNumber = document.getElementById('modalRoomNumber').value.trim();

    if (!roomNumber) {
        showToast('Vui lòng nhập số phòng!', 'error');
        return;
    }

    const payload = {
        hotelId: hotelId,
        roomNumber: roomNumber,
        roomType: document.getElementById('modalRoomType').value.trim(),
        floor: parseInt(document.getElementById('modalFloor').value),
        priceVnd: parseInt(document.getElementById('modalPrice').value),
        capacity: parseInt(document.getElementById('modalCapacity').value),
        roomView: document.getElementById('modalRoomView').value.trim(),
        status: document.getElementById('modalRoomStatus').value,
        description: document.getElementById('modalDescription').value.trim()
    };

    try {
        let res;
        if (isEdit) {
            res = await fetch(`${API_BASE}/rooms/${hotelId}/${roomNumber}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch(`${API_BASE}/rooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (res.ok) {
            showToast(isEdit ? 'Cập nhật thành công!' : 'Thêm phòng thành công!', 'success');
            closeRoomModal();
            loadRooms();
            loadDashboard();
        } else {
            const data = await res.json();
            showToast(data.error || 'Lỗi khi lưu phòng', 'error');
        }
    } catch (err) {
        console.error('Lỗi khi lưu phòng:', err);
        showToast('Lỗi máy chủ', 'error');
    }
}

/**
 * Toast Notifications
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 250);
    }, 3000);
}

/**
 * Utilities
 */
function formatVnd(amount) {
    if (!amount) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function getStatusClass(status) {
    if (!status) return 'available';
    switch(status.toUpperCase()) {
        case 'OCCUPIED': return 'occupied';
        case 'BOOKED': return 'booked';
        case 'MAINTENANCE': return 'maintenance';
        case 'PAID': return 'paid';
        case 'UNPAID': return 'unpaid';
        default: return 'available';
    }
}
