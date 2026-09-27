import { useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/table';
import { StatCard } from '../components/layout/StatCard';
import { PageHeader } from '../components/layout/PageHeader';
import { CardSkeleton, TableSkeleton } from '../components/layout/LoadingScreen';
import { getReportSummary, getMyReportSummary } from '../services/reports';
import { listTickets } from '../services/tickets';
import { listDepartments } from '../services/users';
import { useAppSelector } from '../hooks/useAppSelector';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../utils/date';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const DEPARTMENT_CHART_COLORS = ['#0ea5e9', '#8b5cf6', '#22c55e', '#f97316', '#2563eb', '#ef4444', '#14b8a6', '#eab308'];

type DepartmentChartItem = {
  fullName: string;
  count: number;
  color: string;
};

export function DashboardPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [summary, setSummary] = useState<any>(null);
  const [departments, setDepartments] = useState<Array<{ _id: string; name: string }>>([]);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [ticketPage, setTicketPage] = useState(1);
  const ticketPageSize = 5;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        if (user?.roleKey === 'user') {
          // One parallel batch instead of two sequential round trips.
          const [report, departmentsList, tickets] = await Promise.all([
            getMyReportSummary(),
            listDepartments().catch(() => []),
            listTickets({ limit: 20 })
          ]);
          if (!mounted) return;
          setSummary(report);
          setDepartments(departmentsList);
          setMyTickets(tickets.items ?? []);
        } else {
          const [report, tickets, departmentsList] = await Promise.all([
            getReportSummary(),
            listTickets({ limit: 20 }),
            listDepartments().catch(() => [])
          ]);
          if (!mounted) return;
          setSummary(report);
          setMyTickets(tickets.items ?? []);
          setDepartments(departmentsList);
        }
      } catch (err: any) {
        console.error('Failed loading dashboard data:', err);
        if (!mounted) return;
        setError(err?.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => { mounted = false; };
  }, [user]);

  const priorityLabels = summary?.byPriority?.map((item: any) => item._id) ?? [];
  const priorityData = summary?.byPriority?.map((item: any) => item.count) ?? [];

  const ticketChart = useMemo(() => ({
    labels: priorityLabels,
    datasets: [{ label: 'Tickets', data: priorityData, backgroundColor: ['#2563eb', '#14b8a6', '#f59e0b', '#ef4444'] }]
  }), [priorityData, priorityLabels]);

  const departmentNameById = useMemo(() => new Map(departments.map((department) => [department._id, department.name])), [departments]);

  const departmentChartItems = useMemo<DepartmentChartItem[]>(() => {
    const items = summary?.byDepartment ?? [];
    return items.map((item: any, index: number) => {
      const fullName = departmentNameById.get(String(item._id)) ?? String(item._id);
      return {
        fullName,
        count: item.count,
        color: DEPARTMENT_CHART_COLORS[index % DEPARTMENT_CHART_COLORS.length]
      };
    });
  }, [summary?.byDepartment, departmentNameById]);

  const departmentChart = useMemo(() => ({
    labels: departmentChartItems.map((item: DepartmentChartItem) => item.fullName),
    datasets: [{ label: 'Departments', data: departmentChartItems.map((item: DepartmentChartItem) => item.count), backgroundColor: departmentChartItems.map((item: DepartmentChartItem) => item.color) }]
  }), [departmentChartItems]);

  const getStatusTone = (status: string) => {
    if (status === 'open') return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
    if (status === 'assigned' || status === 'in_progress') return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
    if (status === 'resolved') return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
    if (status === 'closed') return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
  };

  const totalTicketPages = Math.max(1, Math.ceil(myTickets.length / ticketPageSize));
  const visibleTickets = myTickets.slice((ticketPage - 1) * ticketPageSize, ticketPage * ticketPageSize);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Operational overview for ${user?.roleKey?.replace('_', ' ') ?? 'your'} workspace.`}
        actions={<Link className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-blue-500 dark:hover:bg-blue-400" to="/tickets/new">Raise Ticket</Link>}
      />

      {error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {loading && !summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CardSkeleton lines={2} />
            <CardSkeleton lines={2} />
            <CardSkeleton lines={2} />
            <CardSkeleton lines={2} />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <CardSkeleton lines={5} />
            <CardSkeleton lines={5} />
          </div>
          <TableSkeleton rows={5} />
        </>
      ) : (
        <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={user?.roleKey === 'user' ? 'My Tickets' : 'Total Tickets'} value={summary?.summary?.totalTickets ?? 0} description={user?.roleKey === 'user' ? 'Tickets you created' : 'All active and historical tickets'} />
        <StatCard title="Open Tickets" value={summary?.summary?.openTickets ?? 0} description={user?.roleKey === 'user' ? 'Your open tickets' : 'Needs attention'} />
        <StatCard title="Resolved Tickets" value={summary?.summary?.resolvedTickets ?? 0} description={user?.roleKey === 'user' ? 'Your resolved tickets' : 'Resolved and awaiting closure'} />
        {user?.roleKey !== 'user' && (
          <StatCard title="Total Users" value={summary?.summary?.totalUsers ?? 0} description="Registered account count" />
        )}
        {user?.roleKey === 'user' && (
          <StatCard title="SLA Breaches" value={summary?.summary?.slaBreaches ?? 0} description="Tickets past SLA" />
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="h-full overflow-hidden p-4">
          <CardHeader>
            <CardTitle>Priority distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px] xl:h-[360px]">
            <Bar
              data={ticketChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
              }}
            />
          </CardContent>
        </Card>
        <Card className="h-full overflow-hidden p-4">
          <CardHeader>
            <CardTitle>Department load</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px] xl:h-[360px]">
            <div className="mx-auto h-[220px] w-full max-w-md sm:h-[250px]">
              <Doughnut
                data={departmentChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '62%',
                  plugins: { legend: { display: false } }
                }}
              />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
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

      <Card className="overflow-hidden p-4">
        <CardHeader>
          <CardTitle>Recent tickets</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b-2 border-slate-200 dark:border-slate-600">
                  <TableHeaderCell className="text-slate-700 dark:text-slate-200">🎫 Ticket</TableHeaderCell>
                  <TableHeaderCell className="text-slate-700 dark:text-slate-200">📅 Created</TableHeaderCell>
                  <TableHeaderCell className="text-slate-700 dark:text-slate-200">📝 Subject</TableHeaderCell>
                  <TableHeaderCell className="text-slate-700 dark:text-slate-200">⚡ Status</TableHeaderCell>
                  <TableHeaderCell className="text-slate-700 dark:text-slate-200 text-center">🔎 Open</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleTickets.map((ticket) => (
                  <TableRow key={ticket._id} className="hover:bg-blue-50 dark:hover:bg-blue-900/10 border-b border-slate-100 dark:border-slate-800 transition">
                    <TableCell className="font-semibold">
                      <Link to={`/tickets/${ticket._id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition">
                        {ticket.ticketId}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                      {formatDateTime(ticket.createdAt)}
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">
                      <span className="line-clamp-1">{ticket.subject}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`border text-[11px] font-semibold uppercase tracking-wide ${getStatusTone(ticket.status)}`}>
                        {ticket.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Link
                        to={`/tickets/${ticket._id}`}
                        className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {myTickets.length > ticketPageSize && (
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing {Math.min((ticketPage - 1) * ticketPageSize + 1, myTickets.length)}-{Math.min(ticketPage * ticketPageSize, myTickets.length)} of {myTickets.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTicketPage((current) => Math.max(1, current - 1))}
                  disabled={ticketPage === 1}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Prev
                </button>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Page {ticketPage} of {totalTicketPages}
                </span>
                <button
                  type="button"
                  onClick={() => setTicketPage((current) => Math.min(totalTicketPages, current + 1))}
                  disabled={ticketPage >= totalTicketPages}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
