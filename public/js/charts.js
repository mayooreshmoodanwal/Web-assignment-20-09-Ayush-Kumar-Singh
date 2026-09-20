// GymFlow Chart.js Initializers

document.addEventListener('DOMContentLoaded', () => {
  // 1. Weight Progress Line Chart
  const weightCanvas = document.getElementById('weightProgressChart');
  if (weightCanvas && typeof Chart !== 'undefined') {
    try {
      const labels = JSON.parse(weightCanvas.getAttribute('data-labels') || '[]');
      const data = JSON.parse(weightCanvas.getAttribute('data-values') || '[]');

      if (labels.length > 0) {
        new Chart(weightCanvas, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Body Weight (kg)',
                data: data,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                borderWidth: 3,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#2563eb',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: '#0f172a',
                padding: 10,
                callbacks: {
                  label: function (context) {
                    return `Weight: ${context.parsed.y} kg`;
                  }
                }
              }
            },
            scales: {
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  font: {
                    family: 'Inter',
                    size: 11
                  },
                  color: '#64748b'
                }
              },
              y: {
                grid: {
                  color: '#f1f5f9'
                },
                ticks: {
                  font: {
                    family: 'Inter',
                    size: 11
                  },
                  color: '#64748b',
                  callback: function (val) {
                    return val + ' kg';
                  }
                }
              }
            }
          }
        });
      }
    } catch (e) {
      console.error('Error rendering weight progress chart:', e);
    }
  }

  // 2. Admin Membership Plan Distribution Doughnut Chart
  const planDistCanvas = document.getElementById('planDistributionChart');
  if (planDistCanvas && typeof Chart !== 'undefined') {
    try {
      const labels = JSON.parse(planDistCanvas.getAttribute('data-labels') || '[]');
      const data = JSON.parse(planDistCanvas.getAttribute('data-values') || '[]');

      if (labels.length > 0) {
        new Chart(planDistCanvas, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [
              {
                data: data,
                backgroundColor: ['#2563eb', '#10b981', '#06b6d4', '#f59e0b', '#8b5cf6'],
                borderWidth: 2,
                borderColor: '#ffffff'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  font: {
                    family: 'Inter',
                    size: 12
                  },
                  boxWidth: 12,
                  padding: 15
                }
              }
            },
            cutout: '68%'
          }
        });
      }
    } catch (e) {
      console.error('Error rendering plan distribution chart:', e);
    }
  }
});
