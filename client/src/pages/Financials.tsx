import { useState, useMemo } from "react";
import { useClients } from "@/hooks/use-clients";
import { useIncomeRecords, IncomeRecord } from "@/hooks/use-income-records";
import { useProfiles, useCurrentProfile } from "@/hooks/use-profiles";
import { format, subMonths, parseISO } from "date-fns";
import {
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  CreditCard,
  PiggyBank,
  Filter,
  IndianRupee,
  ChevronRight,
  Phone,
  User,
  Briefcase,
  FileText,
  X
} from "lucide-react";
import Shell from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Get current date in Indian timezone (IST = UTC+5:30)
const getIndianDate = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utcOffset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() + utcOffset + istOffset);
};

export default function Financials() {
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: incomeRecords = [], isLoading: recordsLoading } = useIncomeRecords();
  const { data: profiles = [] } = useProfiles();
  const { data: currentProfile } = useCurrentProfile();
  
  const indianNow = getIndianDate();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("this-month");
  const [selectedMonth, setSelectedMonth] = useState<number>(indianNow.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(indianNow.getFullYear());
  const [selectedRecord, setSelectedRecord] = useState<IncomeRecord | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const isLoading = clientsLoading || recordsLoading;
  const isAdmin = currentProfile?.role === 'admin';

  const getUserName = (id: string | null) => {
    if (!id) return "Unknown";
    const profile = profiles.find(p => p.id === id);
    return profile?.full_name || "Unknown";
  };

  // Parse date properly
  const parseDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    if (dateStr.length === 10) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return parseISO(dateStr);
  };

  // Filter records by period
  const getRecordsForPeriod = (period: string) => {
    const now = indianNow;
    
    return incomeRecords.filter(record => {
      const recordDate = parseDate(record.delivery_date || record.created_at);
      if (!recordDate) return false;
      
      switch (period) {
        case "this-month":
          return recordDate.getMonth() === now.getMonth() && 
                 recordDate.getFullYear() === now.getFullYear();
        case "last-month":
          const lastMonth = subMonths(now, 1);
          return recordDate.getMonth() === lastMonth.getMonth() && 
                 recordDate.getFullYear() === lastMonth.getFullYear();
        case "last-3-months": {
          const threeMonthsAgo = subMonths(now, 3);
          return recordDate >= threeMonthsAgo && recordDate <= now;
        }
        case "last-6-months": {
          const sixMonthsAgo = subMonths(now, 6);
          return recordDate >= sixMonthsAgo && recordDate <= now;
        }
        case "this-year":
          return recordDate.getFullYear() === now.getFullYear();
        case "specific-month":
          return recordDate.getMonth() === selectedMonth && 
                 recordDate.getFullYear() === selectedYear;
        case "all-time":
        default:
          return true;
      }
    });
  };


  // Calculate financial stats from income records
  const stats = useMemo(() => {
    const periodRecords = getRecordsForPeriod(selectedPeriod);
    const thisMonthRecords = getRecordsForPeriod("this-month");
    const lastMonthRecords = getRecordsForPeriod("last-month");

    // All time stats from income records
    const totalRevenue = incomeRecords.reduce((sum, r) => sum + (r.project_value || 0), 0);
    const totalPaid = incomeRecords.reduce((sum, r) => sum + (r.paid_amount || 0), 0);
    const totalPending = totalRevenue - totalPaid;
    const completedProjects = incomeRecords.length;

    // Period stats
    const periodRevenue = periodRecords.reduce((sum, r) => sum + (r.project_value || 0), 0);
    const periodPaid = periodRecords.reduce((sum, r) => sum + (r.paid_amount || 0), 0);
    const periodProjects = periodRecords.length;

    // This month vs last month comparison
    const thisMonthRevenue = thisMonthRecords.reduce((sum, r) => sum + (r.project_value || 0), 0);
    const lastMonthRevenue = lastMonthRecords.reduce((sum, r) => sum + (r.project_value || 0), 0);
    const revenueChange = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : thisMonthRevenue > 0 ? 100 : 0;

    // Average project value
    const avgProjectValue = completedProjects > 0 ? totalRevenue / completedProjects : 0;

    // Payment status breakdown
    const paidProjects = incomeRecords.filter(r => r.payment_status === 'paid').length;
    const partialProjects = incomeRecords.filter(r => r.payment_status === 'partial').length;
    const pendingProjects = incomeRecords.filter(r => r.payment_status === 'pending').length;

    return {
      totalRevenue,
      totalPaid,
      totalPending,
      completedProjects,
      periodRevenue,
      periodPaid,
      periodProjects,
      thisMonthRevenue,
      lastMonthRevenue,
      revenueChange,
      avgProjectValue,
      paidProjects,
      partialProjects,
      pendingProjects,
      periodRecords,
    };
  }, [incomeRecords, selectedPeriod, selectedMonth, selectedYear]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPeriodLabel = (period: string) => {
    const now = indianNow;
    switch (period) {
      case "this-month": return format(now, "MMMM yyyy");
      case "last-month": return format(subMonths(now, 1), "MMMM yyyy");
      case "last-3-months": return "Last 3 Months";
      case "last-6-months": return "Last 6 Months";
      case "this-year": return `Year ${now.getFullYear()}`;
      case "specific-month": 
        const specificDate = new Date(selectedYear, selectedMonth, 1);
        return format(specificDate, "MMMM yyyy");
      case "all-time": return "All Time";
      default: return period;
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => indianNow.getFullYear() - i);

  const handleViewDetails = (record: IncomeRecord) => {
    setSelectedRecord(record);
    setDetailDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  if (!isAdmin) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <IndianRupee className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Only administrators can view financial data.</p>
        </div>
      </Shell>
    );
  }


  return (
    <Shell>
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight">Financials</h1>
            <p className="text-muted-foreground">Track your project revenue and payments</p>
            <p className="text-xs text-muted-foreground mt-1">
              {incomeRecords.length} income records • {format(indianNow, "dd MMM yyyy, hh:mm a")} IST
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="specific-month">Select Month</SelectItem>
                <SelectItem value="all-time">All Time</SelectItem>
              </SelectContent>
            </Select>

            {selectedPeriod === "specific-month" && (
              <>
                <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, index) => (
                      <SelectItem key={month} value={index.toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Total Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-800">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-green-600 mt-1">{stats.completedProjects} completed projects</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">{format(indianNow, "MMMM yyyy")}</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800">{formatCurrency(stats.thisMonthRevenue)}</div>
              <div className="flex items-center text-xs mt-1">
                {stats.revenueChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={stats.revenueChange >= 0 ? "text-green-600" : "text-red-600"}>
                  {Math.abs(stats.revenueChange).toFixed(1)}% vs last month
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Total Collected</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-800">{formatCurrency(stats.totalPaid)}</div>
              <p className="text-xs text-purple-600 mt-1">{stats.paidProjects} fully paid projects</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Pending</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-800">{formatCurrency(stats.totalPending)}</div>
              <p className="text-xs text-orange-600 mt-1">{stats.pendingProjects + stats.partialProjects} awaiting payment</p>
            </CardContent>
          </Card>
        </div>

        {/* Period Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {getPeriodLabel(selectedPeriod)} Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Revenue</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(stats.periodRevenue)}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Collected</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.periodPaid)}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Projects</p>
                <p className="text-3xl font-bold text-blue-600">{stats.periodProjects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <PiggyBank className="h-4 w-4" />
                Average Project Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.avgProjectValue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary" className="bg-green-100 text-green-700">{stats.paidProjects} Paid</Badge>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">{stats.partialProjects} Partial</Badge>
                <Badge variant="secondary" className="bg-gray-100 text-gray-700">{stats.pendingProjects} Pending</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {format(subMonths(indianNow, 1), "MMMM yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.lastMonthRevenue)}</div>
            </CardContent>
          </Card>
        </div>


        {/* Income Records List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Income Records - {getPeriodLabel(selectedPeriod)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.periodRecords.length === 0 ? (
              <div className="text-center py-8">
                <IndianRupee className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No income records for this period.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Income records are created when projects are marked as delivered.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.periodRecords.map(record => {
                  const deliveryDate = parseDate(record.delivery_date);
                  return (
                    <div 
                      key={record.id} 
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
                      onClick={() => handleViewDetails(record)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{record.business_name}</p>
                          {record.business_category && (
                            <Badge variant="outline" className="text-[10px]">{record.business_category}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {record.owner_name && (
                            <span className="flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              {record.owner_name}
                            </span>
                          )}
                          {deliveryDate && (
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {format(deliveryDate, "dd MMM yyyy")}
                            </span>
                          )}
                          {record.services && record.services.length > 0 && (
                            <span className="flex items-center">
                              <Briefcase className="w-3 h-3 mr-1" />
                              {record.services.slice(0, 2).join(", ")}
                              {record.services.length > 2 && ` +${record.services.length - 2}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrency(record.project_value || 0)}</p>
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs",
                              record.payment_status === 'paid' && "bg-green-100 text-green-700",
                              record.payment_status === 'partial' && "bg-yellow-100 text-yellow-700",
                              record.payment_status === 'pending' && "bg-gray-100 text-gray-600"
                            )}
                          >
                            {record.payment_status === 'paid' ? 'Paid' : 
                             record.payment_status === 'partial' ? `Partial (${formatCurrency(record.paid_amount || 0)})` : 
                             'Pending'}
                          </Badge>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Income Record Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {selectedRecord?.business_name}
            </DialogTitle>
            <DialogDescription>
              Income record details
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-4 py-4">
              {/* Financial Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-600 font-medium">Project Value</p>
                  <p className="text-xl font-bold text-green-800">
                    {formatCurrency(selectedRecord.project_value || 0)}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium">Amount Paid</p>
                  <p className="text-xl font-bold text-blue-800">
                    {formatCurrency(selectedRecord.paid_amount || 0)}
                  </p>
                </div>
              </div>

              {/* Payment Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Payment Status</span>
                <Badge 
                  className={cn(
                    "text-sm",
                    selectedRecord.payment_status === 'paid' && "bg-green-500 text-white",
                    selectedRecord.payment_status === 'partial' && "bg-yellow-500 text-white",
                    selectedRecord.payment_status === 'pending' && "bg-gray-500 text-white"
                  )}
                >
                  {selectedRecord.payment_status === 'paid' ? 'Fully Paid' : 
                   selectedRecord.payment_status === 'partial' ? 'Partial Payment' : 
                   'Payment Pending'}
                </Badge>
              </div>

              <Separator />

              {/* Client Details */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Client Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedRecord.owner_name && (
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-xs text-muted-foreground">Owner Name</p>
                      <p className="font-medium">{selectedRecord.owner_name}</p>
                    </div>
                  )}
                  {selectedRecord.phone && (
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium flex items-center">
                        <Phone className="w-3 h-3 mr-1" />
                        {selectedRecord.phone}
                      </p>
                    </div>
                  )}
                  {selectedRecord.business_category && (
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-xs text-muted-foreground">Business Category</p>
                      <p className="font-medium">{selectedRecord.business_category}</p>
                    </div>
                  )}
                  {selectedRecord.lead_source && (
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-xs text-muted-foreground">Lead Source</p>
                      <p className="font-medium">{selectedRecord.lead_source}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Services */}
              {selectedRecord.services && selectedRecord.services.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Services Provided
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedRecord.services.map((service, i) => (
                        <Badge key={i} variant="secondary">{service}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Project Timeline */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Project Timeline
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedRecord.project_start_date && (
                    <div className="p-2 bg-blue-50 rounded">
                      <p className="text-xs text-blue-600">Start Date</p>
                      <p className="font-medium text-blue-800">
                        {format(parseDate(selectedRecord.project_start_date)!, "dd MMM yyyy")}
                      </p>
                    </div>
                  )}
                  {selectedRecord.delivery_date && (
                    <div className="p-2 bg-green-50 rounded">
                      <p className="text-xs text-green-600">Delivery Date</p>
                      <p className="font-medium text-green-800">
                        {format(parseDate(selectedRecord.delivery_date)!, "dd MMM yyyy")}
                      </p>
                    </div>
                  )}
                  {selectedRecord.payment_date && (
                    <div className="p-2 bg-purple-50 rounded">
                      <p className="text-xs text-purple-600">Payment Date</p>
                      <p className="font-medium text-purple-800">
                        {format(parseDate(selectedRecord.payment_date)!, "dd MMM yyyy")}
                      </p>
                    </div>
                  )}
                  {selectedRecord.delivered_by && (
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-xs text-muted-foreground">Delivered By</p>
                      <p className="font-medium">{getUserName(selectedRecord.delivered_by)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedRecord.notes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Notes</h4>
                    <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
                      {selectedRecord.notes}
                    </p>
                  </div>
                </>
              )}

              {/* Record Info */}
              <div className="pt-2 border-t text-xs text-muted-foreground">
                <p>Record created: {format(parseDate(selectedRecord.created_at)!, "dd MMM yyyy, hh:mm a")}</p>
                {!selectedRecord.client_id && (
                  <p className="text-orange-600 mt-1">
                    Note: Original client record has been deleted. This income record is preserved for financial tracking.
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
