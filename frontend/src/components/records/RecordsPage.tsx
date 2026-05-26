import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  createRecord,
  deleteRecord,
  getRecordById,
  listRecords,
  updateRecord,
} from "@/lib/records-api";
import { formatRecordDateTime, normalizeRecordDateOfBirth } from "@/lib/record-dates";
import type { RecordRequest, RecordResponse } from "@/types/record";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type StatusFilter = "all" | "draft" | "active";

type FormState = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phoneNumber: string;
};

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  email: "",
  phoneNumber: "",
};

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"] as const;

function validateForm(form: FormState): string | null {
  if (!form.firstName.trim()) return "First name is required.";
  if (!form.lastName.trim()) return "Last name is required.";
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return "Enter a valid email address.";
  }
  if (form.dateOfBirth) {
    const dob = new Date(form.dateOfBirth);
    if (Number.isNaN(dob.getTime())) return "Enter a valid date of birth.";
    if (dob > new Date()) return "Date of birth cannot be in the future.";
  }
  return null;
}

function recordToForm(r: RecordResponse): FormState {
  return {
    firstName: r.firstName ?? "",
    lastName: r.lastName ?? "",
    dateOfBirth: normalizeRecordDateOfBirth(r.dateOfBirth),
    gender: r.gender ?? "",
    email: r.email ?? "",
    phoneNumber: r.phoneNumber ?? "",
  };
}

function formToRequest(form: FormState): RecordRequest {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    ...(form.dateOfBirth ? { dateOfBirth: form.dateOfBirth } : {}),
    ...(form.gender ? { gender: form.gender } : {}),
    ...(form.email.trim() ? { email: form.email.trim() } : {}),
    ...(form.phoneNumber.trim() ? { phoneNumber: form.phoneNumber.trim() } : {}),
  };
}

function recipientName(r: RecordResponse) {
  return [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || "—";
}

function initials(r: RecordResponse) {
  const a = r.firstName?.trim()?.[0] ?? "";
  const b = r.lastName?.trim()?.[0] ?? "";
  const s = (a + b).toUpperCase();
  return s || "?";
}

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 8);
}

function matchesStatus(r: RecordResponse, f: StatusFilter) {
  const hasEmail = !!r.email?.trim();
  if (f === "draft") return !hasEmail;
  if (f === "active") return hasEmail;
  return true;
}

export function RecordsPage({ credentialConfigId }: { credentialConfigId?: string }) {
  const [records, setRecords] = useState<RecordResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [addOpen, setAddOpen] = useState(false);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);
  const [viewRecord, setViewRecord] = useState<RecordResponse | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await listRecords();
    setLoading(false);
    if (error) {
      setLoadError(error);
      setRecords([]);
      return;
    }
    setRecords(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (!matchesStatus(r, statusFilter)) return false;
      if (!q) return true;
      const blob = [r.id, r.firstName, r.lastName, r.email, r.phoneNumber, r.gender]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [records, search, statusFilter]);

  const totalFiltered = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  useEffect(() => {
    setPage((p) => Math.min(p, pageCount));
  }, [pageCount]);

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const pageIds = pageSlice.map((r) => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  const togglePage = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setAddOpen(true);
  };

  const openEdit = async (id: string) => {
    setFormError(null);
    setActionError(null);
    setEditLoadingId(id);
    const { data, error } = await getRecordById(id);
    setEditLoadingId(null);
    if (error || !data) {
      setActionError(error ?? "Failed to load record");
      return;
    }
    setForm(recordToForm(data));
    setEditRecordId(id);
  };

  const closeEdit = () => {
    setEditRecordId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const submitCreate = async () => {
    const v = validateForm(form);
    if (v) {
      setFormError(v);
      return;
    }
    setFormLoading(true);
    setFormError(null);
    const { error } = await createRecord(formToRequest(form));
    setFormLoading(false);
    if (error) {
      setFormError(error);
      return;
    }
    setAddOpen(false);
    setForm(EMPTY_FORM);
    void refresh();
    setSelectedIds(new Set());
  };

  const submitUpdate = async () => {
    if (!editRecordId) return;
    const v = validateForm(form);
    if (v) {
      setFormError(v);
      return;
    }
    setFormLoading(true);
    setFormError(null);
    const { error } = await updateRecord(editRecordId, formToRequest(form));
    setFormLoading(false);
    if (error) {
      setFormError(error);
      return;
    }
    closeEdit();
    void refresh();
  };

  const confirmDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleteLoading(true);
    setActionError(null);
    const ids = [...selectedIds];
    for (const id of ids) {
      const { error } = await deleteRecord(id);
      if (error) {
        setActionError(error);
        setDeleteLoading(false);
        return;
      }
    }
    setDeleteLoading(false);
    setDeleteOpen(false);
    setSelectedIds(new Set());
    void refresh();
  };

  const navigate = useNavigate();
  const openIssue = (recordId?: string) => {
    const id = recordId ?? (selectedIds.size === 1 ? [...selectedIds][0] : undefined);
    if (!id) return;
    void navigate({ to: "/issuance", search: { recordId: id, credentialConfigId } });
  };

  const statusLabel =
    statusFilter === "all" ? "All statuses" : statusFilter === "draft" ? "Draft" : "Active";

  return (
    <div className="px-4 lg:px-8 py-8 space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ClipboardList className="h-7 w-7 text-muted-foreground" />
          Records
        </h1>
        <p className="mt-2 text-muted-foreground max-w-2xl text-sm">
          Manage person records (certify.records). Filter by completion, search, then issue
          pre-authorized credentials or edit in place.
        </p>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load records</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            {loadError}
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive">
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            {actionError}
            <Button variant="outline" size="sm" onClick={() => setActionError(null)}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {credentialConfigId && (
        <div className="rounded-xl border border-primary/20 bg-primary/4 px-4 py-3 flex items-center gap-3">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Issuing for credential configuration
            </p>
            <p className="text-sm font-mono font-medium truncate">{credentialConfigId}</p>
          </div>
          <Link to="/credentials" className="text-xs text-primary hover:underline shrink-0">
            Change
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as StatusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft (no email)</SelectItem>
                <SelectItem value="active">Active (has email)</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {totalFiltered} Total Records
            </span>
          </div>

          <div className="flex flex-1 min-w-0 max-w-md items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search records"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={openAdd} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Record(s)
            </Button>
            <Button
              className="gap-1"
              disabled={selectedIds.size !== 1}
              onClick={() => openIssue()}
              title={
                selectedIds.size === 0
                  ? "Select one record"
                  : selectedIds.size > 1
                    ? "Select exactly one record"
                    : undefined
              }
            >
              <Send className="h-4 w-4" />
              Issue Credentials
            </Button>
            <Button
              variant="destructive"
              className="gap-1"
              disabled={selectedIds.size === 0}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox
                    checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                    onCheckedChange={(c) => togglePage(c === true)}
                    aria-label="Select all on this page"
                  />
                </TableHead>
                <TableHead>Record ID</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right w-[132px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin inline mr-2 align-middle" />
                    Loading records…
                  </TableCell>
                </TableRow>
              ) : pageSlice.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                    No records match {statusLabel}
                    {search ? " and your search" : ""}.
                  </TableCell>
                </TableRow>
              ) : (
                pageSlice.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(r.id)}
                        onCheckedChange={(c) => toggleOne(r.id, c === true)}
                        aria-label={`Select ${r.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="font-mono text-sm text-primary hover:underline"
                        onClick={() => setViewRecord(r)}
                      >
                        {shortId(r.id)}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[10px]">{initials(r)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate font-medium">{recipientName(r)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {r.email?.trim() || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">Person identity</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                      {formatRecordDateTime(r.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="View"
                          onClick={() => setViewRecord(r)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Edit"
                          disabled={editLoadingId === r.id}
                          onClick={() => void openEdit(r.id)}
                        >
                          {editLoadingId === r.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Pencil className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary"
                          aria-label="Issue credential"
                          title="Issue credential for this record"
                          onClick={() => openIssue(r.id)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm tabular-nums px-2 min-w-[2.5rem] text-center">{safePage}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[72px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Add */}
      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) {
            setForm(EMPTY_FORM);
            setFormError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add record</DialogTitle>
          </DialogHeader>
          <PersonRecordFields form={form} setForm={setForm} disabled={formLoading} />
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitCreate()} disabled={formLoading}>
              {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog
        open={editRecordId !== null}
        onOpenChange={(o) => {
          if (!o) closeEdit();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit record</DialogTitle>
          </DialogHeader>
          <PersonRecordFields form={form} setForm={setForm} disabled={formLoading} />
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>
              Cancel
            </Button>
            <Button onClick={() => void submitUpdate()} disabled={formLoading || !editRecordId}>
              {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View */}
      <Dialog open={viewRecord !== null} onOpenChange={(o) => !o && setViewRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record details</DialogTitle>
          </DialogHeader>
          {viewRecord && (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-mono break-all">{viewRecord.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd>{recipientName(viewRecord)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd>{viewRecord.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{viewRecord.phoneNumber || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Date of birth</dt>
                <dd>{normalizeRecordDateOfBirth(viewRecord.dateOfBirth) || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Gender</dt>
                <dd>{viewRecord.gender || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{formatRecordDateTime(viewRecord.createdAt)}</dd>
              </div>
            </dl>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRecord(null)}>
              Close
            </Button>
            {viewRecord && (
              <Button
                onClick={() => {
                  void openEdit(viewRecord.id);
                  setViewRecord(null);
                }}
              >
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected records?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} record
              {selectedIds.size === 1 ? "" : "s"}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteLoading}
              onClick={() => void confirmDelete()}
            >
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PersonRecordFields({
  form,
  setForm,
  disabled,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="fn">First name</Label>
          <Input
            id="fn"
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ln">Last name</Label>
          <Input
            id="ln"
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dob">Date of birth</Label>
        <Input
          id="dob"
          type="date"
          value={form.dateOfBirth}
          onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
          disabled={disabled}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Gender</Label>
        <Select
          value={form.gender || "__none__"}
          onValueChange={(v) => setForm((f) => ({ ...f, gender: v === "__none__" ? "" : v }))}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Optional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Not specified</SelectItem>
            {GENDER_OPTIONS.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="em">Email</Label>
        <Input
          id="em"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          disabled={disabled}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ph">Phone</Label>
        <Input
          id="ph"
          value={form.phoneNumber}
          onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
