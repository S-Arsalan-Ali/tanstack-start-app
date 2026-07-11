import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Mail, Trash2, CheckCircle, Loader2, Search, Filter, 
  Clock, User, Phone, ExternalLink, MailOpen, Eye
} from "lucide-react";
import { EntityDrawer, GhostBtn, PrimaryBtn } from "@/components/admin/EntityDrawer";
import { fmtDateTime } from "@/lib/admin-utils";
import { useConfirm } from "@/components/admin/ConfirmDialog";

export const Route = createLazyFileRoute("/admin/messages")({
  component: MessagesInbox,
});

type Message = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  topic: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

function MessagesInbox() {
  const [rows, setRows] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTopic, setFilterTopic] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("Failed to load messages: " + error.message);
    } else {
      setRows((data ?? []) as Message[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const topics = useMemo(() => {
    const allTopics = rows.map((r) => r.topic);
    return ["all", ...Array.from(new Set(allTopics))];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // 1. Search Query filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q || 
        r.name.toLowerCase().includes(q) || 
        r.email.toLowerCase().includes(q) || 
        r.message.toLowerCase().includes(q);

      // 2. Topic filter
      const matchesTopic = filterTopic === "all" || r.topic === filterTopic;

      // 3. Tab filter
      const matchesTab = 
        activeTab === "all" || 
        (activeTab === "unread" && !r.is_read) || 
        (activeTab === "read" && r.is_read);

      return matchesSearch && matchesTopic && matchesTab;
    });
  }, [rows, searchQuery, filterTopic, activeTab]);

  const unreadCount = useMemo(() => {
    return rows.filter((r) => !r.is_read).length;
  }, [rows]);

  const viewMessage = async (msg: Message) => {
    setSelected(msg);
    if (!msg.is_read) {
      // Optimistic update
      setRows(prev => prev.map(r => r.id === msg.id ? { ...r, is_read: true } : r));
      
      const { error } = await supabase
        .from("contact_messages")
        .update({ is_read: true })
        .eq("id", msg.id);

      if (error) {
        // Rollback on error
        setRows(prev => prev.map(r => r.id === msg.id ? { ...r, is_read: false } : r));
        console.error("Failed to mark message as read:", error.message);
      }
    }
  };

  const toggleReadStatus = async (msg: Message, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = !msg.is_read;
    
    // Optimistic update
    setRows(prev => prev.map(r => r.id === msg.id ? { ...r, is_read: nextStatus } : r));
    
    const { error } = await supabase
      .from("contact_messages")
      .update({ is_read: nextStatus })
      .eq("id", msg.id);

    if (error) {
      // Rollback
      setRows(prev => prev.map(r => r.id === msg.id ? { ...r, is_read: msg.is_read } : r));
      toast.error("Failed to update status: " + error.message);
    } else {
      toast.success(`Message marked as ${nextStatus ? "read" : "unread"}`);
    }
  };

  const deleteMessage = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const ok = await confirm({
      title: "Delete Message",
      message: "Are you sure you want to delete this contact message? This action cannot be undone.",
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!ok) return;

    const { error } = await supabase
      .from("contact_messages")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete message: " + error.message);
    } else {
      toast.success("Message deleted successfully");
      setSelected(null);
      load();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Telemetry Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-lg">
        <div className="space-y-1">
          <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Customer Inquiries Inbox</p>
          <h2 className="font-display text-xl uppercase tracking-tight text-white flex items-center gap-2">
            Messages Vault 
            {unreadCount > 0 && (
              <span className="bg-orange-500 text-black text-[10px] px-2 py-0.5 font-mono font-bold rounded-full shadow-[0_0_8px_rgba(255,87,34,0.4)] animate-pulse">
                {unreadCount} Unread
              </span>
            )}
          </h2>
        </div>
        <PrimaryBtn onClick={load} className="flex items-center gap-2">
          Sync Inbox
        </PrimaryBtn>
      </div>

      {/* Filters Bar */}
      <div className="grid sm:grid-cols-[1fr_200px] gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by sender, email keyword, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 pl-9 pr-4 py-2.5 text-xs text-white rounded focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all font-mono"
          />
        </div>

        {/* Topic Filter */}
        <div className="relative">
          <Filter className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <select
            value={filterTopic}
            onChange={(e) => setFilterTopic(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 pl-9 pr-4 py-2.5 text-xs text-white rounded focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all font-mono appearance-none cursor-pointer"
          >
            {topics.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t === "all" ? "All Topics" : t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs list for message status */}
      <div className="flex border-b border-zinc-800/80">
        {[
          { id: "all", label: "All Messages" },
          { id: "unread", label: "Unread" },
          { id: "read", label: "Read" },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 font-mono text-xs uppercase tracking-wider border-b-2 transition-all font-bold ${
                active
                  ? "border-orange-500 text-orange-400 bg-orange-500/[0.02]"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Messages List Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-8 animate-spin text-orange-500" />
            <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">Decrypting messages...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-20 text-center">
            <Mail className="size-10 text-zinc-650 mx-auto mb-4" />
            <p className="font-display text-lg tracking-wide uppercase text-zinc-400">INBOX SECURE & EMPTY</p>
            <p className="font-mono text-xs text-zinc-500 mt-1 uppercase">No messages match current parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-zinc-500 font-mono border-b border-zinc-800 bg-zinc-950/20">
                <tr>
                  <th className="p-4 w-12 text-center">Status</th>
                  <th className="p-4">Sender</th>
                  <th className="p-4">Topic</th>
                  <th className="p-4 hidden md:table-cell">Message Excerpt</th>
                  <th className="p-4 text-right">Received At</th>
                  <th className="p-4 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredRows.map((msg) => (
                  <tr 
                    key={msg.id} 
                    onClick={() => viewMessage(msg)}
                    className={`hover:bg-zinc-800/25 transition-colors cursor-pointer group ${!msg.is_read ? "bg-orange-500/[0.01] font-semibold" : "text-zinc-300"}`}
                  >
                    <td className="p-4 text-center">
                      <div className="relative inline-block">
                        {!msg.is_read ? (
                          <span className="flex size-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(255,87,34,0.8)]" />
                        ) : (
                          <span className="flex size-2 rounded-full bg-zinc-700" />
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="max-w-[200px] truncate font-display tracking-wide">{msg.name}</div>
                      <div className="text-xs text-zinc-500 font-mono truncate">{msg.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-zinc-950 border border-zinc-850 px-2.5 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider text-orange-400 select-none">
                        {msg.topic}
                      </span>
                    </td>
                    <td className="p-4 hidden md:table-cell max-w-sm truncate text-zinc-450 font-sans">
                      {msg.message}
                    </td>
                    <td className="p-4 text-right text-xs text-zinc-500 font-mono">
                      {fmtDateTime(msg.created_at)}
                    </td>
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => viewMessage(msg)}
                          className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                          title="Read Message"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          onClick={(e) => toggleReadStatus(msg, e)}
                          className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                          title={msg.is_read ? "Mark Unread" : "Mark Read"}
                        >
                          {msg.is_read ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
                        </button>
                        <button
                          onClick={(e) => deleteMessage(msg.id, e)}
                          className="p-1.5 hover:bg-red-500/10 rounded text-zinc-400 hover:text-red-400 transition-colors"
                          title="Delete Message"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Message Details Drawer */}
      <EntityDrawer
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        title="Message Details"
        footer={
          <div className="flex gap-2 w-full justify-between items-center">
            {selected && (
              <button
                onClick={() => deleteMessage(selected.id)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2.5 text-[10px] uppercase tracking-wider font-mono font-bold rounded cursor-pointer transition-all"
              >
                Delete Message
              </button>
            )}
            <div className="flex gap-2">
              <GhostBtn onClick={() => setSelected(null)}>Close</GhostBtn>
              {selected && (
                <a
                  href={`mailto:${selected.email}?subject=Re: [MotoHelm Support] ${selected.topic}&body=Hello ${selected.name},%0D%0DThank you for reaching out to MotoHelm Support.%0D%0D`}
                  className="bg-orange-500 hover:bg-orange-600 text-black px-4 py-2.5 text-[10px] uppercase tracking-wider font-mono font-bold rounded cursor-pointer transition-all flex items-center gap-2"
                >
                  Reply Email <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>
        }
      >
        {selected && (
          <div className="space-y-6">
            {/* Telemetry Block */}
            <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-lg space-y-3 font-mono text-xs relative">
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <span className={`size-2 rounded-full ${selected.is_read ? "bg-zinc-650" : "bg-orange-500 animate-pulse"}`} />
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest">{selected.is_read ? "Read" : "Unread"}</span>
              </div>
              <div className="flex items-start gap-3">
                <User className="size-4 text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">From Name</p>
                  <p className="text-zinc-200 font-display text-sm mt-0.5">{selected.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 border-t border-zinc-900 pt-3">
                <Mail className="size-4 text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Email Address</p>
                  <a href={`mailto:${selected.email}`} className="text-orange-400 hover:underline inline-flex items-center gap-1 mt-0.5">
                    {selected.email} <ExternalLink className="size-2.5" />
                  </a>
                </div>
              </div>
              {selected.phone && (
                <div className="flex items-start gap-3 border-t border-zinc-900 pt-3">
                  <Phone className="size-4 text-orange-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Phone</p>
                    <a href={`tel:${selected.phone}`} className="text-zinc-300 hover:text-white inline-flex items-center gap-1 mt-0.5">
                      {selected.phone}
                    </a>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 border-t border-zinc-900 pt-3">
                <Clock className="size-4 text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Timestamp</p>
                  <p className="text-zinc-300 mt-0.5">{fmtDateTime(selected.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Topic Info */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold font-mono">Topic</span>
              <p className="text-sm font-display uppercase tracking-wide text-orange-400 bg-orange-500/5 border border-orange-500/10 px-3 py-2 rounded">
                {selected.topic}
              </p>
            </div>

            {/* Message Body */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold font-mono block">Query Message</span>
              <div className="w-full bg-zinc-950 border border-zinc-850 p-4 rounded-lg text-sm text-zinc-200 leading-relaxed font-sans whitespace-pre-wrap select-text selection:bg-orange-500/30 selection:text-white">
                {selected.message}
              </div>
            </div>
          </div>
        )}
      </EntityDrawer>
    </div>
  );
}
