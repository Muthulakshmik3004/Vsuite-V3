import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  SectionList,
  TextInput,
} from "react-native";
import axios from "axios";
import API_BASE_URL  from "../../config";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

type Complaint = {
  _id?: string;
  complaint_no: string;
  customer_name?: string;
  phone?: string;
  assigned?: boolean;
  assigned_emp_name?: string;
  assigned_emp_id?: string;
  due_date?: string;
  payment_method?: "cash" | "upi" | "";
  payment_done?: boolean;
};

type DueStatus = {
  type: "overdue" | "today" | "soon";
  label: string;
  color: string;
};


const COLORS = {
  background: "#6addf7ff",
  header: "#12b5d9ff",
  surface: "#ffffff",
  panel: "#b2ebf2",
  primary: "#007bff",
  success: "#399a43ff",
  warning: "#f39c12",
  danger: "#eb5968ff",
  info: "#0abde3",
  textPrimary: "#000",
  textSecondary: "#555",
};

const SIZES = {
  radius: 16,
  padding: 16,
};

export default function DueReminderScreen() {

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [now, setNow] = useState(new Date());
  const [filter, setFilter] = useState("all");
  const [expandedComplaintNo, setExpandedComplaintNo] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [remarks, setRemarks] = useState("");

  /* ================= FETCH ================= */

  const fetchComplaints = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/user/complaints/`);
      setComplaints(res.data || []);
    } catch (err) {
      console.log("Fetch error", err);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchComplaints();
    }, [])
  );

  /* ================= CLOCK ================= */

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* ================= PROCESS DATA ================= */

  // 1️⃣ BASE LIST (NO FILTER — FOR COUNTS)
  const baseList = useMemo(() => {
    return complaints
      .filter((item) => {
        if (item.payment_method === "cash") return false;
        if (item.payment_method === "upi") return false;
        if (item.payment_done === true) return false;
        return true;
      })
      .map((item) => {
        const status = getDueStatus(item.due_date, now);
        if (!status) return null;

        return {
          ...item,
          dueStatus: status,
          staff: item.assigned ? (item.assigned_emp_name || "Unknown") : "Unassigned",
        };
      })
      .filter(Boolean) as (Complaint & {
        dueStatus: DueStatus;
        staff: string;
      })[];
  }, [complaints, now]);

  // 2️⃣ FILTERED LIST (ONLY FOR DISPLAY)
  const processed = useMemo(() => {
    if (filter === "all") return baseList;
    return baseList.filter((i) => i.dueStatus.type === filter);
  }, [baseList, filter]);


  /* ================= DASHBOARD COUNTS ================= */

  const counts = useMemo(
    () => ({
      total: baseList.length,
      overdue: baseList.filter((i) => i.dueStatus.type === "overdue").length,
      today: baseList.filter((i) => i.dueStatus.type === "today").length,
      soon: baseList.filter((i) => i.dueStatus.type === "soon").length,
    }),
    [baseList]
  );


  /* ================= GROUP BY STAFF ================= */

  const sections = useMemo(() => {
    const map: Record<string, typeof processed> = {};

    processed.forEach((i) => {
      if (!map[i.staff]) map[i.staff] = [];
      map[i.staff].push(i);
    });

    return Object.entries(map).map(([staff, data]) => ({
      title: staff,
      data,
    }));
  }, [processed]);


  /* ================= SUBMIT PAYMENT ================= */

  const submitPayment = async () => {
    if (!expandedComplaintNo) return;

    if (!paymentMethod || !remarks) {
      alert("Please select Cash or UPI and enter remarks");
      return;
    }

    try {
      const res = await axios.patch(
        `${API_BASE_URL}/api/user/complaints/by-complaint-no/${expandedComplaintNo}/`,
        {
          payment_method: paymentMethod,
          remarks: remarks,
          payment_done: true,
        }
      );

      console.log("UPDATED:", res.data);

      // ✅ RESET STATES (UNCHANGED)
      setExpandedComplaintNo(null);
      setPaymentMethod("");
      setRemarks("");

      // ✅ FORCE REFRESH (UNCHANGED)
      fetchComplaints();

    } catch (error: any) {
      console.log("Payment update error",error?.response?.data || error);
    }
  };


  /* ================= RENDER ================= */

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.header}>⏰ Due Reminder Dashboard</Text>
        <Text style={styles.headerSub}>
          Overdue •  Today •  Upcoming Payments
        </Text>

      </View>
      <View style={styles.dashboard}>
        <DashboardCard
          label="Total"
          value={counts.total}
          color={COLORS.primary}
          active={filter === "all"}
          onPress={() => setFilter("all")}
        />

        <DashboardCard
          label="Overdue"
          value={counts.overdue}
          color={COLORS.danger}
          active={filter === "overdue"}
          onPress={() => setFilter("overdue")}
        />

        <DashboardCard
          label="Today"
          value={counts.today}
          color={COLORS.warning}
          active={filter === "today"}
          onPress={() => setFilter("today")}
        />

        <DashboardCard
          label="Soon"
          value={counts.soon}
          color={COLORS.info}
          active={filter === "soon"}
          onPress={() => setFilter("soon")}
        />
      </View>


      <SectionList
        sections={sections}
        keyExtractor={(item, index) =>
          item._id ? item._id.toString() : `${item.complaint_no}-${index}`
        }

        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
              onPress={() => {
                if (expandedComplaintNo !== item.complaint_no) {
                  setPaymentMethod("");
                  setRemarks("");
                }
                setExpandedComplaintNo(
                  expandedComplaintNo === item.complaint_no
                    ? null
                    : item.complaint_no
                );
              }}

          >
            <BlinkCard active={item.dueStatus.type === "overdue"}>
              <View style={styles.card}>
                <View style={styles.cardInner}>

                  {/* TOP ROW */}
                  <View style={styles.rowBetween}>
                    <Text style={styles.title}>{item.complaint_no}</Text>

                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: item.dueStatus.color },
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {item.dueStatus.label}
                      </Text>
                    </View>
                  </View>

                  {/* CUSTOMER */}
                  <View style={styles.row}>
                    <Feather name="user" size={14} />
                    <Text style={styles.infoText}>
                      Customer Name:{item.customer_name || "Customer"}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Feather name="phone" size={14} />
                    <Text style={styles.infoText}>
                      Customer Number:{item.phone || "N/A"}
                    </Text>
                  </View>

                  {/* STAFF */}
                  {item.assigned ? (
                    <>
                      <View style={styles.row}>
                        <Feather name="briefcase" size={14} />
                        <Text style={styles.infoText}>
                          Employee Name: {item.assigned_emp_name || "Unknown"}
                        </Text>
                      </View>
                      <View style={styles.row}>
                        <Feather name="user-check" size={14} />
                        <Text style={styles.infoText}>
                          Employee ID: {item.assigned_emp_id || "N/A"}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.row}>
                      <Feather name="briefcase" size={14} />
                      <Text style={styles.infoText}>
                        Staff: Unassigned
                      </Text>
                    </View>
                  )}

                  {/* DATE */}
                  <View style={styles.row}>
                    <Feather name="calendar" size={14} />
                    <Text style={styles.infoText}>
                      Due: {item.due_date
                        ? new Date(item.due_date).toDateString()
                        : "No Due Date"}
                    </Text>
                  </View>

                </View>
                {/* 🔽 PAYMENT SECTION (SHOW UNDER CLICKED COMPLAINT) */}
                {expandedComplaintNo === item.complaint_no && (
                  <View
                    style={{
                      marginTop: 16,
                      borderTopWidth: 1,
                      borderTopColor: "#eee",
                      paddingTop: 16,
                    }}
                  >
                    <Text style={styles.modalTitle}>💰 Select Payment Method</Text>

                    <View style={styles.paymentGrid}>
                      {/* CASH */}
                      <TouchableOpacity
                        style={[
                          styles.paymentCard,
                          paymentMethod === "cash" && styles.paymentCardActive,
                        ]}
                        onPress={() => setPaymentMethod("cash")}
                      >
                        <Feather
                          name="dollar-sign"
                          size={22}
                          color={paymentMethod === "cash" ? "#fff" : COLORS.primary}
                        />
                        <Text
                          style={[
                            styles.paymentLabel,
                            paymentMethod === "cash" && styles.paymentLabelActive,
                          ]}
                        >
                          CASH
                        </Text>
                      </TouchableOpacity>

                      {/* UPI */}
                      <TouchableOpacity
                        style={[
                          styles.paymentCard,
                          paymentMethod === "upi" && styles.paymentCardActive,
                        ]}
                        onPress={() => setPaymentMethod("upi")}
                      >
                        <Feather
                          name="smartphone"
                          size={22}
                          color={paymentMethod === "upi" ? "#fff" : COLORS.primary}
                        />
                        <Text
                          style={[
                            styles.paymentLabel,
                            paymentMethod === "upi" && styles.paymentLabelActive,
                          ]}
                        >
                          UPI
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* REMARKS */}
                    <TextInput
                      placeholder="Remarks"
                      value={remarks}
                      onChangeText={setRemarks}
                      style={styles.input}
                    />

                    {/* SUBMIT */}
                    <TouchableOpacity onPress={submitPayment} style={styles.submitBtn}>
                      <Text style={styles.submitBtnText}>Submit Payment</Text>
                    </TouchableOpacity>

                  </View>
                )}

              </View>
            </BlinkCard>
          </TouchableOpacity>
        )}
      />

    </View>
  );
}

/* ================= HELPERS ================= */

  const getDueStatus = (
    dueDate?: string,
    now: Date = new Date()
  ): DueStatus | null => {
    // 🚨 IMPORTANT: guard clause
    if (!dueDate) return null;

    const due = new Date(dueDate);

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const dueOnly = new Date(
      due.getFullYear(),
      due.getMonth(),
      due.getDate()
    );

    const diffDays =
      (dueOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays < 0)
      return { type: "overdue", label: "OVERDUE", color: "#eb5968ff" };

    if (diffDays === 0)
      return { type: "today", label: "DUE TODAY", color: "#f39c12" };

    if (diffDays <= 3)
      return { type: "soon", label: "DUE SOON", color: "#0abde3" };

    return null;
  };

type BlinkCardProps = {
  children: React.ReactNode;
  active: boolean;
};

const BlinkCard = ({ children, active }: BlinkCardProps) => {
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [active]);

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#ff4d4d", "#ff0000"], // neon red
  });

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  return (
    <Animated.View
      style={{
        borderWidth: active ? 2.5 : 0,
        borderRadius: 18,
        borderColor,
        shadowColor: "#ff0000",
        shadowOpacity: active ? shadowOpacity : 0,
        shadowRadius: active ? 14 : 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: active ? 16 : 0, // Android glow
        marginBottom: 14,
      }}
    >
      {children}
    </Animated.View>
  );
};


  type DashboardCardProps = {
    label: string;
    value: number;
    color: string;
    onPress: () => void;
    active: boolean;
  };

  const DashboardCard = ({
    label,
    value,
    color,
    onPress,
    active,
  }: DashboardCardProps) => (

  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={[
      styles.countBadge,
      styles.countBadgeNew,
      { backgroundColor: color },
      active && styles.activeDashboardCard,   // ⭐ highlight
    ]}
  >
    <Text style={styles.countText}>{label}</Text>
    <Text style={styles.countValue}>{value}</Text>
  </TouchableOpacity>
);


/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#6addf7ff" },
  header: { fontSize: 22, fontWeight: "bold", color: "#fff" },

  dashboard: { flexDirection: "row", marginVertical: 10 },
  countBadge: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center" },
  countText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  countValue: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 6,
  },

  sectionHeader: { fontWeight: "bold", marginVertical: 5 },
  card: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,     // ✅ SPACE BETWEEN CARDS
    elevation: 2,         // Android depth
    shadowColor: "#000",  // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  modalTitle: { fontSize: 18, fontWeight: "bold" },

  input: { borderWidth: 1, borderRadius: 6, padding: 10, marginTop: 10 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  title: {
    fontSize: 16,
    fontWeight: "bold",
  },

  infoText: {
    marginLeft: 6,
    color: "#333",
  },

  paymentGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 16,
  },

  paymentCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    elevation: 4,
  },

  paymentCardActive: {
    backgroundColor: COLORS.primary,
    transform: [{ scale: 1.05 }],
  },

  paymentLabel: {
    marginTop: 6,
    fontWeight: "700",
    color: COLORS.primary,
  },

  paymentLabelActive: {
    color: "#fff",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },

  headerCard: {
    backgroundColor: COLORS.header,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: 12,
  },

  headerSub: {
    color: "#fff",
    fontSize: 13,
    marginTop: 4,
  },

  countBadgeNew: {
    marginHorizontal: 6,
    borderRadius: 16,
    paddingVertical: 18,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },

  cardInner: {
    paddingVertical: 4,
  },

  activeDashboardCard: {
    borderWidth: 2,
    borderColor: "#ffffff",
    transform: [{ scale: 1.05 }],
    shadowOpacity: 0.3,
    elevation: 10,
  },

  submitBtn: { backgroundColor: "green", padding: 12, borderRadius: 8, marginTop: 10 },
  submitBtnText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
});
