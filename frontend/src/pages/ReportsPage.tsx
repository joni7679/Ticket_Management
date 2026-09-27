import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { exportReport, getReportSummary } from '../services/reports';
import { listDepartments } from '../services/users';
import { useAppSelector } from '../hooks/useAppSelector';
import { toast } from 'sonner';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const DEPARTMENT_CHART_COLORS = ['#2563eb', '#0ea5e9', '#14b8a6', '#f59e0b', '#f97316', '#8b5cf6', '#ef4444', '#22c55e'];

type DepartmentChartItem = {
  fullName: string;
  count: number;
  color: string;
};

export function ReportsPage() {
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [report, setReport] = useState<any>(null);
  const [departments, setDepartments] = useState<Array<{ _id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [nextReport, nextDepartments] = await Promise.all([
        getReportSummary(),
        listDepartments().catch(() => [])
      ]);
      setReport(nextReport);
      setDepartments(nextDepartments);
    } catch (error: any) {
      setLoadError(error?.response?.data?.message || 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Don't burn API calls for users who can't view this page.
    if (currentUser && !['admin', 'support_agent', 'super_admin'].includes(currentUser.roleKey)) {
      setIsLoading(false);
      return;
    }
    void load();
  }, []);

  // Only admins and super admins can access reports
  if (currentUser && !['admin', 'support_agent', 'super_admin'].includes(currentUser.roleKey)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Access Denied" description="You do not have permission to view reports." />
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-3">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">Reports are only available for support team members.</p>
              <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const departmentNameById = useMemo(() => {
    return new Map(departments.map((department) => [department._id, department.name]));
  }, [departments]);

  const download = async (format: 'csv' | 'xlsx' | 'pdf') => {
    const blob = await exportReport(format);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `helpdesk-report.${format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv'}`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${format.toUpperCase()}`);
  };

  const departmentDonutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        display: false
      }
    }
  };

  const departmentChartItems = useMemo<DepartmentChartItem[]>(() => {
    const items = report?.byDepartment ?? [];
    return items.map((item: any, index: number) => {
      const fullName = departmentNameById.get(String(item._id)) ?? String(item._id);
      return {
        fullName,
        count: item.count,
        color: DEPARTMENT_CHART_COLORS[index % DEPARTMENT_CHART_COLORS.length]
      };
    });
  }, [report?.byDepartment, departmentNameById]);

  const priorityBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Export ticket and performance data in formats that finance and operations can consume."
        actions={
          <>
            <Button variant="outline" className="h-9 px-3 text-xs" onClick={() => void download('csv')}>CSV Export</Button>
            <Button variant="outline" className="h-9 px-3 text-xs" onClick={() => void download('xlsx')}>Excel Export</Button>
            <Button className="h-9 px-3 text-xs" onClick={() => void download('pdf')}>PDF Export</Button>
          </>
        }
      />
      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-sm text-slate-500">Loading reports...</CardContent></Card>
      ) : loadError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{loadError}</p>
            <Button className="mt-4" onClick={() => void load()}>Retry</Button>
          </CardContent>
        </Card>
      ) : (
      <>
      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardContent><p className="text-sm text-slate-500">Total Tickets</p><p className="text-3xl font-bold">{report?.summary?.totalTickets ?? 0}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-slate-500">Open Tickets</p><p className="text-3xl font-bold">{report?.summary?.openTickets ?? 0}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-slate-500">Resolved Tickets</p><p className="text-3xl font-bold">{report?.summary?.resolvedTickets ?? 0}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-slate-500">Closed Tickets</p><p className="text-3xl font-bold">{report?.summary?.closedTickets ?? 0}</p></CardContent></Card>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Priority Wise Tickets</CardTitle></CardHeader>
          <CardContent className="p-4">
            <div className="h-[260px] w-full sm:h-[300px]">
              <Bar
                data={{ labels: report?.byPriority?.map((item: any) => item._id) ?? [], datasets: [{ data: report?.byPriority?.map((item: any) => item.count) ?? [], backgroundColor: '#2563eb' }] }}
                options={priorityBarOptions}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Department Wise Tickets</CardTitle></CardHeader>
          <CardContent className="p-4">
            <div className="mx-auto h-[260px] w-full max-w-[420px] sm:h-[300px]">
              <Doughnut
                data={{ labels: departmentChartItems.map((item: DepartmentChartItem) => item.fullName), datasets: [{ data: departmentChartItems.map((item: DepartmentChartItem) => item.count), backgroundColor: departmentChartItems.map((item: DepartmentChartItem) => item.color) }] }}
                options={departmentDonutOptions}
              />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {departmentChartItems.map((item: DepartmentChartItem) => (
                <div key={item.fullName} className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 dark:border-slate-700">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-300" title={item.fullName}>{item.fullName}</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      </>
      )}
    </div>
  );
}
