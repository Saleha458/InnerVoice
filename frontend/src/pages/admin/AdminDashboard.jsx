
import {
  useCallback,
  useEffect,
  useState
} from "react";

import { Link } from "react-router-dom";

import {
  ShieldCheck,
  Users,
  Flag,
  ArrowUpRight,
  RefreshCw,
  LockKeyhole
} from "lucide-react";

import api from "../../services/api";

const pages = [
  {
    to: "/admin/experts",
    title: "Expert verification",
    detail: "Review qualifications and protected documents.",
    icon: ShieldCheck,
    tone: "peach"
  },
  {
    to: "/admin/users",
    title: "Account management",
    detail: "Manage anonymous accounts and deletion requests.",
    icon: Users,
    tone: "cream"
  },
  {
    to: "/admin/reports",
    title: "Private reports",
    detail: "Review reports shared with the admin vault.",
    icon: Flag,
    tone: "sage"
  }
];

export default function AdminDashboard() {
  const [counts, setCounts] = useState({
    experts: null,
    users: null
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    const [experts, users] =
      await Promise.allSettled([
        api.get("/admin/experts/pending"),
        api.get("/admin/users")
      ]);

    setCounts({
      experts:
        experts.status === "fulfilled"
          ? (experts.value.data.experts || []).length
          : null,

      users:
        users.status === "fulfilled"
          ? (users.value.data.users || []).filter(
              item => item.role !== "admin"
            ).length
          : null
    });

    if (
      experts.status === "rejected" ||
      users.status === "rejected"
    ) {
      setError(
        "Some counts are unavailable. Check your connection, then refresh."
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="page-shell iv-admin-home">
      <style>{`
        .iv-admin-home {
          max-width: 1280px;
          margin: 0 auto;
          color: #352922;
        }

        .iv-admin-home .iv-admin-hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          padding: 28px 30px;
          border: 1px solid #edd9cc;
          border-radius: 24px;
          background: linear-gradient(
            115deg,
            #fff7ef 0%,
            #fffdf9 65%,
            #faf0e6 100%
          );
        }

        .iv-admin-home .iv-admin-kicker {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .16em;
          color: #a45c3b;
        }

        .iv-admin-home .iv-admin-hero h1 {
          font-family: Georgia, serif;
          font-size: clamp(28px, 3vw, 42px);
          line-height: 1.12;
          letter-spacing: -.03em;
          margin: 10px 0 12px;
        }

        .iv-admin-home .iv-admin-hero p {
          max-width: 600px;
          color: #715b50;
          margin: 0;
          font-size: 14px;
          line-height: 1.7;
        }

        .iv-admin-home .iv-admin-refresh {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #e6cfc0;
          background: #fff;
          border-radius: 12px;
          padding: 11px 15px;
          color: #83503a;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        .iv-admin-home .iv-admin-refresh:disabled {
          opacity: .65;
          cursor: wait;
        }

        .iv-admin-home .iv-admin-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-top: 23px;
        }

        .iv-admin-home .iv-admin-tile {
          display: flex;
          flex-direction: column;
          padding: 24px;
          min-height: 235px;
          border: 1px solid #e9dcd2;
          border-radius: 22px;
          background: #fff;
          color: inherit;
          text-decoration: none;
          box-shadow: 0 10px 30px rgba(77, 47, 29, .04);
          transition: transform .2s;
        }

        .iv-admin-home .iv-admin-tile:hover {
          transform: translateY(-3px);
        }

        .iv-admin-home .iv-admin-icon {
          display: grid;
          place-items: center;
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: #ffecdf;
          color: #9f573d;
        }

        .iv-admin-home .iv-admin-icon.cream {
          background: #fff2d9;
          color: #8f692d;
        }

        .iv-admin-home .iv-admin-icon.sage {
          background: #eaf3e9;
          color: #3d7654;
        }

        .iv-admin-home .iv-admin-tile h2 {
          margin: 19px 0 7px;
          font-size: 20px;
        }

        .iv-admin-home .iv-admin-tile p {
          margin: 0;
          color: #76655d;
          line-height: 1.6;
          font-size: 14px;
        }

        .iv-admin-home .iv-admin-foot {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
          padding-top: 22px;
          color: #a95e43;
          font-size: 13px;
          font-weight: 800;
        }

        .iv-admin-home .iv-admin-note {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          margin-top: 22px;
          padding: 16px 20px;
          border: 1px solid #e8dbd1;
          border-radius: 16px;
          background: #fff;
          color: #725d51;
          font-size: 13px;
          line-height: 1.65;
        }

        @media (max-width: 900px) {
          .iv-admin-home .iv-admin-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .iv-admin-home .iv-admin-hero {
            flex-direction: column;
            padding: 22px;
          }

          .iv-admin-home .iv-admin-grid {
            grid-template-columns: 1fr;
          }

          .iv-admin-home .iv-admin-tile {
            min-height: 205px;
          }
        }
      `}</style>

      <header className="iv-admin-hero">
        <div>
          <span className="iv-admin-kicker">
            INNERVOICE / ADMINISTRATION
          </span>

          <h1>Admin dashboard</h1>

          <p>
            Manage expert verification, anonymous accounts
            and private report workflows. User–Expert
            conversations and booked calls are not part
            of Admin access.
          </p>
        </div>

        <button
          type="button"
          className="iv-admin-refresh"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden="true" />

          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && (
        <div
          className="error-box"
          role="alert"
          style={{ marginTop: 18 }}
        >
          {error}
        </div>
      )}

      <section
        className="iv-admin-grid"
        aria-label="Administration sections"
      >
        {pages.map(
          ({
            to,
            title,
            detail,
            icon: Icon,
            tone
          }, index) => (
            <Link
              className="iv-admin-tile"
              to={to}
              key={to}
            >
              <span className={`iv-admin-icon ${tone}`}>
                <Icon
                  size={24}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </span>

              <h2>{title}</h2>

              <p>{detail}</p>

              <div className="iv-admin-foot">
                <span>
                  {index === 0
                    ? counts.experts === null
                      ? "Count unavailable"
                      : `${counts.experts} pending applications`
                    : index === 1
                      ? counts.users === null
                        ? "Count unavailable"
                        : `${counts.users} non-admin accounts`
                      : "Open review queue"}
                </span>

                <ArrowUpRight
                  size={18}
                  aria-hidden="true"
                />
              </div>
            </Link>
          )
        )}
      </section>

      <aside className="iv-admin-note">
        <LockKeyhole
          size={21}
          style={{
            flexShrink: 0,
            color: "#a15d45"
          }}
          aria-hidden="true"
        />

        <span>
          Report content is readable only after unlocking
          the designated Admin vault. Review status is
          administrative metadata, not proof that a report
          is true or false.
        </span>
      </aside>
    </div>
  );
}