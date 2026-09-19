import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import {
  Link,
  useLocation
} from "react-router-dom";

import {
  createVault,
  getVaultProfile,
  unlockVault,
  isVaultUnlocked
} from "../../services/privateVault";

import {
  getMyReports,
  getAllReports,
  getReportRecipient,
  migrateLegacyReports,
  updateReportStatus
} from "../../services/reportService";

import ReportCard from "../../components/cards/ReportCard";

const getError = error =>
  error?.response?.data?.message ||
  error?.message ||
  "Could not load reports.";

export default function Reports({ adminMode = false }) {
  const location = useLocation();

  const [profile, setProfile] = useState(undefined);

  const [unlocked, setUnlocked] = useState(
    isVaultUnlocked()
  );

  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const [reports, setReports] = useState([]);

  const [loading, setLoading] = useState(
    isVaultUnlocked()
  );

  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [slowLoading, setSlowLoading] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Prevent an older request from replacing newer results.
  const requestIdRef = useRef(0);

  // Track whether reports have already loaded successfully.
  const loadedRef = useRef(false);

  const loadReports = useCallback(async () => {
    if (!isVaultUnlocked()) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const requestId = ++requestIdRef.current;

    if (!loadedRef.current) {
      setLoading(true);
    } else {
      // Keep existing reports visible while refreshing.
      setRefreshing(true);
    }

    setError("");
    setSlowLoading(false);

    try {
      // IMPORTANT:
      // Fetch reports only. Do not wait for the Admin key
      // or another getVaultProfile() request here.
      const response = adminMode
        ? await getAllReports()
        : await getMyReports();

      if (requestId !== requestIdRef.current) {
        return;
      }

      setReports(response.reports || []);
      loadedRef.current = true;
    } catch (cause) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setError(getError(cause));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
        setSlowLoading(false);
      }
    }
  }, [adminMode]);

  // Load vault profile and reports independently.
  useEffect(() => {
    let active = true;

    getVaultProfile()
      .then(value => {
        if (active) {
          setProfile(value);
        }
      })
      .catch(() => {
        if (active) {
          setError("Could not load your private vault.");
          setProfile(null);
        }
      });

    if (isVaultUnlocked()) {
      // Do not await getVaultProfile() before loading reports.
      void loadReports();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
      requestIdRef.current += 1;
    };
  }, [loadReports]);

  // Show useful feedback if the actual reports request is slow.
  useEffect(() => {
    if (!loading) {
      setSlowLoading(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSlowLoading(true);
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [loading]);

  async function openVault(event) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");

    try {
      if (!profile) {
        if (
          passphrase.length < 16 ||
          passphrase !== confirmation
        ) {
          throw new Error(
            "Use a matching passphrase of at least 16 characters."
          );
        }

        await createVault(passphrase);

        setProfile(await getVaultProfile());

        setNotice(
          "Vault created. Keep your passphrase safe; InnerVoice cannot recover it."
        );
      } else {
        await unlockVault(passphrase);
      }

      setPassphrase("");
      setConfirmation("");
      setUnlocked(true);

      // Unlock immediately shows the page.
      // Reports load separately instead of blocking the form.
      void loadReports();
    } catch (cause) {
      setError(getError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(report, status) {
    if (busy) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await updateReportStatus(report.id, status);

      await loadReports();

      setNotice(
        "Report status updated. The User can refresh their reports page to see it."
      );
    } catch (cause) {
      setError(getError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function migrate() {
    if (busy) return;

    const confirmed = window.confirm(
      "Before migrating old reports, verify that a NEW encrypted report opens on both the User and Admin accounts. Check your backup too. Continue?"
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      // Fetch the Admin key ONLY when migration is requested.
      // It must not delay normal report-page loading.
      await getReportRecipient();

      const count = await migrateLegacyReports();

      await loadReports();

      setNotice(
        `${count} old reports migrated. Older backups may still contain server-decryptable copies.`
      );
    } catch (cause) {
      setError(getError(cause));
    } finally {
      setBusy(false);
    }
  }

  const oldCount = reports.filter(
    report => report.legacy
  ).length;

  const failedCount = reports.filter(
    report => report.decryptionFailed
  ).length;

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            {adminMode
              ? "ADMINISTRATION"
              : "PRIVATE SUPPORT"}
          </span>

          <h1>
            {adminMode
              ? "Private report review"
              : "Your reports"}
          </h1>

          <p>
            {adminMode
              ? "Review reports encrypted for your Admin vault."
              : "Track the status of your submitted reports."}
          </p>
        </div>

        {unlocked && (
          <div className="button-row">
            <button
              type="button"
              className="secondary-button"
              disabled={refreshing || busy}
              onClick={() => {
                void loadReports();
              }}
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh status"}
            </button>

            {!adminMode && (
              <Link
                to="/reports/new"
                className="primary-button"
              >
                + Create report
              </Link>
            )}
          </div>
        )}
      </header>

      {error && (
        <div className="error-box" role="alert">
          {error}

          {unlocked && (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  void loadReports();
                }}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}

      {notice && (
        <div className="success-box" role="status">
          {notice}
        </div>
      )}

      {location.state?.submitted && (
        <div className="success-box">
          Report submitted successfully.
        </div>
      )}

      {!unlocked || !isVaultUnlocked() ? (
        <form
          className="feature-card"
          onSubmit={openVault}
          style={{
            maxWidth: 620,
            display: "grid",
            gap: 14
          }}
        >
          <h2>
            {profile === undefined
              ? "Checking private vault..."
              : profile
                ? "Unlock your private vault"
                : "Create your private vault"}
          </h2>

          <p>
            {adminMode
              ? "Use your own Admin vault passphrase."
              : "Use the same private passphrase as your Journal."}
          </p>

          <input
            className="form-input"
            type="password"
            minLength={16}
            required
            value={passphrase}
            onChange={event =>
              setPassphrase(event.target.value)
            }
            placeholder="Private passphrase"
          />

          {profile === null && (
            <input
              className="form-input"
              type="password"
              minLength={16}
              required
              value={confirmation}
              onChange={event =>
                setConfirmation(event.target.value)
              }
              placeholder="Confirm passphrase"
            />
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={
              busy ||
              profile === undefined
            }
          >
            {busy
              ? "Working..."
              : profile
                ? "Unlock vault"
                : "Create vault"}
          </button>
        </form>
      ) : (
        <>
          {adminMode && (
            <div className="notice-box">
              <strong>Report review</strong>

              <p>
                Pending means submitted but not yet reviewed.
                Admin can start review, mark a report resolved,
                or close it. Old reports need owner-side
                migration before private review.
              </p>
            </div>
          )}

          {!adminMode && oldCount > 0 && (
            <div className="warning-box">
              <strong>
                {oldCount} older reports still use
                server-held encryption.
              </strong>

              <p>
                Verify a new encrypted report on both
                accounts before migrating old data.
              </p>

              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={migrate}
              >
                Migrate old reports
              </button>
            </div>
          )}

          {failedCount > 0 && (
            <div className="error-box" role="alert">
              {failedCount} report(s) could not be decrypted.
              Do not delete or migrate those reports.
            </div>
          )}

          {loading && !loadedRef.current ? (
            <div className="empty-card">
              <p>Loading reports...</p>

              {slowLoading && (
                <>
                  <p>
                    The reports request is taking longer
                    than expected. Your saved reports have
                    not been deleted.
                  </p>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      void loadReports();
                    }}
                  >
                    Retry loading
                  </button>
                </>
              )}
            </div>
          ) : reports.length === 0 ? (
            <div className="empty-card">
              {error
                ? "Reports could not be loaded."
                : "No reports yet."}
            </div>
          ) : (
            <div className="list-grid">
              {reports.map(report => (
                <div key={report.id}>
                  <ReportCard report={report} />

                  {adminMode &&
                    !report.legacy &&
                    !report.decryptionFailed && (
                      <div
                        className="button-row"
                        style={{
                          marginTop: 12,
                          marginBottom: 24
                        }}
                      >
                        {(report.status === "pending"
                          ? [
                              {
                                value: "in_review",
                                label: "Start review"
                              }
                            ]
                          : report.status === "in_review"
                            ? [
                                {
                                  value: "resolved",
                                  label: "Mark resolved"
                                },
                                {
                                  value: "closed",
                                  label: "Close report"
                                }
                              ]
                            : report.status === "resolved"
                              ? [
                                  {
                                    value: "closed",
                                    label: "Close report"
                                  }
                                ]
                              : []
                        ).map(action => (
                          <button
                            key={action.value}
                            type="button"
                            className="secondary-button"
                            disabled={busy}
                            onClick={() => {
                              void changeStatus(
                                report,
                                action.value
                              );
                            }}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}