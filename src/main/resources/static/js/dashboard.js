/**
 * ============================================================
 * DASHBOARD JAVASCRIPT (DEV 1)
 * Phụ trách: KPI Statistics & Chart.js Analytics
 * ============================================================
 */

let revenueChart = null;
let statusChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initCustomDropdown((hotelId) => {
        loadDashboard();
    });

    loadHotels(() => {
        loadDashboard();
    });

    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            showToast('Đang làm mới dữ liệu Dashboard...', 'info');
            loadDashboard();
        });
    }
});

/**
 * Tải dữ liệu KPI & Biểu đồ từ API /api/dashboard/stats
 */
async function loadDashboard() {
    try {
        let url = `${API_BASE}/dashboard/stats`;
        if (appState.selectedHotelId) {
            url += `?hotelId=${encodeURIComponent(appState.selectedHotelId)}`;
        }

        const res = await fetch(url);
        const stats = await res.json();

        // Update KPI values
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
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const labels = Object.keys(revenueData).map(name => name.replace('Suong Mai ', ''));
    const values = Object.values(revenueData);

    if (revenueChart) {
        revenueChart.destroy();
    }

    revenueChart = new Chart(ctx, {
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
    const canvas = document.getElementById('statusChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (statusChart) {
        statusChart.destroy();
    }

    const labels = ['Trống', 'Đang ở', 'Đã đặt', 'Bảo trì'];
    const values = [
        statusData['AVAILABLE'] || 0,
        statusData['OCCUPIED'] || 0,
        statusData['BOOKED'] || 0,
        statusData['MAINTENANCE'] || 0
    ];

    statusChart = new Chart(ctx, {
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
