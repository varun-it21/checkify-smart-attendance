import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  { month: "Jan", students: 1200, staffs: 150, management: 30 },
  { month: "Feb", students: 1180, staffs: 160, management: 28 },
  { month: "Mar", students: 1250, staffs: 155, management: 32 },
  { month: "Apr", students: 1220, staffs: 170, management: 31 },
];

export default function Chart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data}>
        
        {/* 🔹 Linear Gradient Definitions */}
        <defs>
          <linearGradient id="studentsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1} />
          </linearGradient>

          <linearGradient id="staffsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0.1} />
          </linearGradient>

          <linearGradient id="managementGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#dc2626" stopOpacity={0.1} />
          </linearGradient>
        </defs>

        {/* 🔹 Customized Cartesian Grid */}
        <CartesianGrid
          strokeDasharray="5 5"
          stroke="#e5e7eb"
        />

        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />

        {/* Students */}
        <Area
          type="monotone"
          dataKey="students"
          stackId="1"
          stroke="#4f46e5"
          fill="url(#studentsGradient)"
        />

        {/* Staffs */}
        <Area
          type="monotone"
          dataKey="staffs"
          stackId="1"
          stroke="#16a34a"
          fill="url(#staffsGradient)"
        />

        {/* Management */}
        <Area
          type="monotone"
          dataKey="management"
          stackId="1"
          stroke="#dc2626"
          fill="url(#managementGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
