import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/table';
import { assignTicketToUser, listAssignableUsers, listTickets } from '../services/tickets';
import { Badge } from '../components/ui/badge';
import { EmptyState } from '../components/layout/EmptyState';
import { TableSkeleton } from '../components/layout/LoadingScreen';
import { useAppSelector } from '../hooks/useAppSelector';
import { formatDateTime } from '../utils/date';

export function TicketsPage() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<Array<{ _id: string; fullName: string; email: string; roleKey: string }>>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<Record<string, string>>({});
  const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null);
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [company, setCompany] = useState('');
  const [line, setLine] = useState('');
  const [ip, setIp] = useState('');
  const [operatorPhone, setOperatorPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadTickets = useCallback(async (overrides?: { q?: string }) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const activeQuery = overrides?.q ?? query;
      const params: Record<string, string | number | undefined> = { q: activeQuery || undefined, status: status || undefined, priority: priority || undefined, limit: 20 };
      if (company) params.companyName = company;
      if (line) params.lineOrStation = line;
      if (ip) params.ip = ip;
      if (operatorPhone) params.currentOperatorPhoneNumber = operatorPhone;
      const data = await listTickets(params);
      // Ignore stale responses when the user types quickly.
      if (requestIdRef.current !== requestId) return;
      setItems(data.items ?? []);
    } catch (error: any) {
      if (requestIdRef.current !== requestId) return;
      setLoadError(error?.response?.data?.message || 'Failed to load tickets');
      toast.error('Failed to load tickets');
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [query, status, priority, company, line, ip, operatorPhone]);

  const loadAssignableUsers = async () => {
    try {
      const users = await listAssignableUsers();
      setAssignableUsers(users);
    } catch {
      setAssignableUsers([]);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  // Pick up Navbar searches (?q=...) without a full reload.
  // NOTE: no side effects inside the state updater (updaters must be pure
  // and may run twice in StrictMode) — compare first, then load.
  const searchQuery = searchParams.get('q') ?? '';
  useEffect(() => {
    if (searchQuery !== query) {
      setQuery(searchQuery);
      void loadTickets({ q: searchQuery });
    }
  }, [searchQuery]);

  useEffect(() => {
    const canAssign = currentUser?.permissions?.includes('ticket:assign') || currentUser?.roleKey === 'super_admin';
    if (canAssign) {
      void loadAssignableUsers();
    }
  }, [currentUser?.permissions, currentUser?.roleKey]);

  const handleQuickAssign = async (ticketId: string) => {
    const assignedAgentId = selectedAssignees[ticketId];
    if (!assignedAgentId) {
      toast.error('Select a user to assign this ticket');
      return;
    }

    try {
      setAssigningTicketId(ticketId);
      await assignTicketToUser(ticketId, assignedAgentId);
      toast.success('Ticket assigned');
      await loadTickets();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to assign ticket');
    } finally {
      setAssigningTicketId(null);
    }
  };

  const getAssignedAgentId = (ticket: any) => {
    const assigned = ticket?.assignedAgentId;
    if (!assigned) {
      return '';
    }

    if (typeof assigned === 'object' && assigned._id) {
      return String(assigned._id);
    }

    return String(assigned);
  };

  const getAssignedAgentName = (ticket: any) => {
    const assigned = ticket?.assignedAgentId;
    if (!assigned) {
      return null;
    }

    if (typeof assigned === 'object' && assigned.fullName) {
      return assigned.fullName as string;
    }

    const assignedId = String(assigned);
    const matchedUser = assignableUsers.find((user) => user._id === assignedId);
    if (matchedUser?.fullName) {
      return matchedUser.fullName;
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tickets"
        description={currentUser?.roleKey === 'user' ? 'Your tickets' : 'Search, filter, and manage the full ticket queue.'}
        actions={<Link className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-blue-500 dark:hover:bg-blue-400" to="/tickets/new">Create Ticket</Link>}
      />

      {currentUser?.roleKey !== 'user' ? (
        <Card className="p-4">
          <CardContent className="flex flex-wrap items-end gap-1.5">
            <Input className="h-11 min-w-[220px] flex-1" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ticket ID, subject, description" />
            <Input className="h-11 min-w-[160px] flex-1" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Company" />
            <Input className="h-11 min-w-[160px] flex-1" value={line} onChange={(event) => setLine(event.target.value)} placeholder="Line / Station" />
            <Input className="h-11 min-w-[140px] flex-1" value={ip} onChange={(event) => setIp(event.target.value)} placeholder="IP" />
            <Input className="h-11 min-w-[180px] flex-1" value={operatorPhone} onChange={(event) => setOperatorPhone(event.target.value)} placeholder="Operator phone" />
            <Select className="h-11 min-w-[160px] flex-1" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="reopened">Reopened</option>
            </Select>
            <Select className="h-11 min-w-[160px] flex-1" value={priority} onChange={(event) => setPriority(event.target.value)}>
              <option value="">All priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
            <Button className="h-11 min-w-[110px]" onClick={() => void loadTickets()} disabled={isLoading}>{isLoading ? 'Searching...' : 'Search'}</Button>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : loadError && items.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{loadError}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Check your connection and try again.</p>
          <Button className="mt-4" onClick={() => void loadTickets()}>Retry</Button>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState title="No tickets found" description="Create a ticket or adjust your filters to see results." actionLabel="Create ticket" onAction={() => window.location.assign('/tickets/new')} />
      ) : (
        <Card className="overflow-hidden border-slate-200 p-0 shadow-sm dark:border-slate-700">
          <div className="overflow-x-auto">
            <Table className="min-w-[1100px]">
              <TableHead>
                <TableRow className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/70">
                  {currentUser?.roleKey === 'user' ? (
                    <>
                      <TableHeaderCell className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Ticket</TableHeaderCell>
                      <TableHeaderCell className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Subject</TableHeaderCell>
                      <TableHeaderCell className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Status</TableHeaderCell>
                      <TableHeaderCell className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Created</TableHeaderCell>
                      <TableHeaderCell className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Updated</TableHeaderCell>
                    </>
                  ) : (
                    <>
                      <TableHeaderCell className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Ticket</TableHeaderCell>
                      <TableHeaderCell className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Company</TableHeaderCell>
                      <TableHeaderCell className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Line / Station</TableHeaderCell>
                      <TableHeaderCell className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">IP</TableHeaderCell>
                      <TableHeaderCell className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Operator</TableHeaderCell>
                      <TableHeaderCell className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Subject</TableHeaderCell>
                      <TableHeaderCell className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Priority</TableHeaderCell>
                      <TableHeaderCell className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Status</TableHeaderCell>
                      <TableHeaderCell className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Assign</TableHeaderCell>
                      <TableHeaderCell className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Created</TableHeaderCell>
                      <TableHeaderCell className="px-2.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Updated</TableHeaderCell>
                    </>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((ticket) => (
                  <TableRow key={ticket._id} className="border-b border-slate-100 transition hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-blue-900/10">
                    {currentUser?.roleKey === 'user' ? (
                      <>
                        <TableCell className="px-2.5 py-2.5 font-semibold">
                          <Link to={`/tickets/${ticket._id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition">
                            {ticket.ticketId}
                          </Link>
                        </TableCell>
                        <TableCell className="px-2.5 py-2.5 text-slate-700 dark:text-slate-300">
                          <span className="line-clamp-1">{ticket.subject}</span>
                        </TableCell>
                        <TableCell className="px-2.5 py-2.5">
                          <div className="space-y-1">
                            <Badge className={`capitalize border ${
                              ticket.status === 'open' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' :
                              ticket.status === 'assigned' || ticket.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                              ticket.status === 'resolved' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800' :
                              'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}>
                              {ticket.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="px-2.5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400">
                          {formatDateTime(ticket.createdAt)}
                        </TableCell>
                        <TableCell className="px-2.5 py-2.5 text-sm text-slate-600 dark:text-slate-400">
                          {formatDateTime(ticket.updatedAt)}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="px-2.5 py-2.5 font-semibold">
                          <Link to={`/tickets/${ticket._id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition">
                            {ticket.ticketId}
                          </Link>
                        </TableCell>
                        <TableCell className="px-2.5 py-2.5">
                          <div className="rounded bg-purple-50 px-2 py-1 text-xs text-slate-700 dark:bg-purple-900/20 dark:text-slate-300">
                            {ticket.companyName || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="px-2.5 py-2.5">
                          <div className="rounded bg-indigo-50 px-2 py-1 text-xs text-slate-700 dark:bg-indigo-900/20 dark:text-slate-300">
                            {ticket.lineOrStation || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="px-2.5 py-2.5">
                          <code className="whitespace-nowrap rounded border border-cyan-200 bg-cyan-100 px-2 py-1 font-mono text-xs text-cyan-800 dark:border-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300">
                            {ticket.ip || '—'}
                          </code>
                        </TableCell>
                        <TableCell className="px-2.5 py-2.5">
                          <code className="whitespace-nowrap rounded border border-green-200 bg-green-100 px-2 py-1 font-mono text-xs text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
                            {ticket.currentOperatorPhoneNumber || '—'}
                          </code>
                        </TableCell>
                        <TableCell className="px-2.5 py-2.5 text-slate-700 dark:text-slate-300">
                          <span className="line-clamp-1">{ticket.subject}</span>
                        </TableCell>
                        <TableCell className="px-2.5 py-2.5">
                          <Badge className={`border ${
                            ticket.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800' :
                            ticket.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800' :
                            ticket.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' :
                            'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800'
                          }`}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2.5 py-2.5">
                          <div className="space-y-0.5">
                            <Badge className={`border capitalize ${
                              ticket.status === 'open' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' :
                              ticket.status === 'assigned' || ticket.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                              ticket.status === 'resolved' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800' :
                              'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}>
                              {ticket.status.replace(/_/g, ' ')}
                            </Badge>
                            {['assigned', 'in_progress'].includes(ticket.status) && getAssignedAgentName(ticket) ? (
                              <p className="text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                                Assigned to: <span className="font-semibold text-slate-700 dark:text-slate-300">{getAssignedAgentName(ticket)}</span>
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="px-2.5 py-2.5 text-sm text-slate-600 dark:text-slate-400">
                          {currentUser?.permissions?.includes('ticket:assign') || currentUser?.roleKey === 'super_admin' ? (
                            <div className="min-w-[220px] space-y-1.5">
                              {getAssignedAgentName(ticket) ? (
                                <Badge
                                  title={`Currently assigned: ${getAssignedAgentName(ticket)}`}
                                  className="inline-flex max-w-full rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                >
                                  <span className="truncate">Assigned: {getAssignedAgentName(ticket)}</span>
                                </Badge>
                              ) : null}
                              <div className="flex items-center gap-1.5">
                                <Select
                                  value={selectedAssignees[ticket._id] ?? getAssignedAgentId(ticket)}
                                  onChange={(event) => setSelectedAssignees((current) => ({ ...current, [ticket._id]: event.target.value }))}
                                >
                                  <option value="">Select user</option>
                                  {assignableUsers.map((user) => (
                                    <option key={user._id} value={user._id}>
                                      {user.fullName} ({user.roleKey})
                                    </option>
                                  ))}
                                </Select>
                                <Button type="button" size="sm" className="shrink-0 px-3" onClick={() => void handleQuickAssign(ticket._id)} disabled={assigningTicketId === ticket._id}>
                                  {assigningTicketId === ticket._id ? 'Assigning...' : 'Assign'}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-2.5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400">
                          {formatDateTime(ticket.createdAt)}
                        </TableCell>
                        <TableCell className="px-2.5 py-2.5 text-sm text-slate-600 dark:text-slate-400">
                          {formatDateTime(ticket.updatedAt)}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

    </div>
  );
}
