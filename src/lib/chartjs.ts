import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  Filler,
} from 'chart.js'

// Register all required components once globally
ChartJS.register(
  CategoryScale,   // X axis (string labels)
  LinearScale,     // Y axis (numbers)
  BarElement,      // Bar chart
  LineElement,     // Line chart
  PointElement,    // Line chart points
  ArcElement,      // Pie / Donut chart
  Tooltip,
  Legend,
  Title,
  Filler
)

export default ChartJS
