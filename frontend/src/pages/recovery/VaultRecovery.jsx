
import {
  useEffect,
  useState
} from "react";

import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { auth } from "../../services/firebase";

import {
  getVaultProfile,
  unlockVault
} from "../../services/privateVault";

const enc = new TextEncoder();
const dec = new TextDecoder();

const toHex = data =>
  [...data]
    .map(number =>
      number.toString(16).padStart(2, "0")
    )
    .join("");

const fromHex = value =>
  Uint8Array.from(
    value.match(/.{2}/g).map(
      hex => parseInt(hex, 16)
    )
  );

const b64 = data =>
  btoa(
    String.fromCharCode(
      ...new Uint8Array(data)
    )
  );

const unb64 = data =>
  Uint8Array.from(
    atob(data),
    character => character.charCodeAt(0)
  );

const aadFor = uid =>
  enc.encode(
    `InnerVoice-recovery-kit-v1|${uid}`
  );

export default function VaultRecovery() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(undefined);

  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const [code, setCode] = useState("");
  const [file, setFile] = useState(null);
  const [newCode, setNewCode] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;

    getVaultProfile()
      .then(value => {
        if (alive) {
          setProfile(value);
        }
      })
      .catch(() => {
        if (alive) {
          setError(
            "Could not load your private vault."
          );
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  function requireSecure() {
    if (
      !window.isSecureContext ||
      !crypto.subtle ||
      !auth.currentUser?.uid
    ) {
      throw new Error(
        "Sign in over HTTPS or localhost."
      );
    }

    return auth.currentUser.uid;
  }

  async function create(event) {
    event.preventDefault();

    setError("");
    setNotice("");
    setNewCode("");
    setBusy(true);

    try {
      const uid = requireSecure();

      if (
        !profile ||
        passphrase.length < 16 ||
        passphrase !== confirmation
      ) {
        throw new Error(
          "Enter your existing vault passphrase twice (16+ characters)."
        );
      }

      // Verify against the existing vault.
      await unlockVault(passphrase);

      const secret = crypto.getRandomValues(
        new Uint8Array(32)
      );

      const iv = crypto.getRandomValues(
        new Uint8Array(12)
      );

      const key = await crypto.subtle.importKey(
        "raw",
        secret,
        "AES-GCM",
        false,
        ["encrypt"]
      );

      const ciphertext = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData: aadFor(uid),
          tagLength: 128
        },
        key,
        enc.encode(passphrase)
      );

      const kit = {
        format: "InnerVoice-recovery-kit",
        version: 1,
        iv: b64(iv),
        ciphertext: b64(ciphertext)
      };

      const url = URL.createObjectURL(
        new Blob(
          [
            JSON.stringify(
              kit,
              null,
              2
            )
          ],
          {
            type: "application/json"
          }
        )
      );

      const anchor = document.createElement("a");

      anchor.href = url;

      anchor.download =
        "innervoice-recovery-kit.json";

      anchor.click();

      setTimeout(
        () => URL.revokeObjectURL(url),
        1000
      );

      setNewCode(toHex(secret));

      setPassphrase("");
      setConfirmation("");

      setNotice(
        "Encrypted Recovery Kit downloaded. Save the code separately, then test your kit below."
      );
    } catch (cause) {
      setError(
        cause.message ||
        "Could not create Recovery Kit."
      );
    } finally {
      setBusy(false);
    }
  }

  async function recover(event) {
    event.preventDefault();

    setError("");
    setNotice("");
    setBusy(true);

    try {
      const uid = requireSecure();

      if (!profile) {
        throw new Error(
          "This account has no vault to unlock."
        );
      }

      if (
        !file ||
        file.size > 10000 ||
        !/^[0-9a-fA-F]{64}$/.test(code.trim())
      ) {
        throw new Error(
          "Choose a recovery JSON file under 10 KB and enter your 64-character code."
        );
      }

      const kit = JSON.parse(
        await file.text()
      );

      if (
        ![
          "InnerVoice-recovery-kit",
          "InnerVoice-passphrase-recovery"
        ].includes(kit.format) ||
        kit.version !== 1 ||
        typeof kit.iv !== "string" ||
        typeof kit.ciphertext !== "string" ||
        kit.iv.length > 32 ||
        kit.ciphertext.length > 2000
      ) {
        throw new Error(
          "Unsupported recovery kit."
        );
      }

      const iv = unb64(kit.iv);
      const ciphertext = unb64(kit.ciphertext);

      if (
        iv.length !== 12 ||
        ciphertext.length < 17 ||
        ciphertext.length > 1024
      ) {
        throw new Error(
          "Damaged recovery kit."
        );
      }

      const key = await crypto.subtle.importKey(
        "raw",
        fromHex(code.trim()),
        "AES-GCM",
        false,
        ["decrypt"]
      );

      const decrypted = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData:
            kit.format ===
            "InnerVoice-passphrase-recovery"
              ? enc.encode(
                  "InnerVoice-recovery-kit-v1"
                )
              : aadFor(uid),
          tagLength: 128
        },
        key,
        ciphertext
      );

      const recoveredPassphrase =
        dec.decode(decrypted);

      // Confirm that the recovered passphrase
      // unlocks the actual existing vault.
      await unlockVault(recoveredPassphrase);

      setCode("");
      setFile(null);

      setNotice(
        "Recovery test PASSED. Your existing vault is unlocked. Keep your recovery file and code private."
      );
    } catch {
      setError(
        "Recovery failed. Check the file, code, signed-in account and vault."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="page-shell"
      style={{
        maxWidth: 850,
        margin: "0 auto"
      }}
    >
      <header className="page-header">
        <div>
          <span className="eyebrow">
            PRIVATE VAULT
          </span>

          <h1>Recovery Kit</h1>

          <p>
            Your account password and vault passphrase
            are different. Resetting your account
            password cannot decrypt your chats.
          </p>
        </div>
      </header>

      {error && (
        <div
          className="error-box"
          role="alert"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          className="success-box"
          role="status"
        >
          {notice}
        </div>
      )}

      {profile === null && (
        <div className="warning-box">
          {user?.role === "expert" ? (
            <>
              Create your private vault in a booked{" "}
              <Link to="/expert/sessions">
                Expert Session
              </Link>{" "}
              first.
            </>
          ) : (
            <>
              Create a private vault in{" "}
              <Link to="/chat">
                AI Support
              </Link>{" "}
              first.
            </>
          )}
        </div>
      )}

      <section
        className="feature-card"
        style={{
          display: "grid",
          gap: 12,
          marginBottom: 18
        }}
      >
        <h2>
          1. Create a kit for your existing vault
        </h2>

        <p>
          Enter your current passphrase. It will
          be verified against your existing vault,
          then an encrypted JSON file will be
          downloaded. Your passphrase and recovery
          code are not sent to the backend.
        </p>

        <form
          onSubmit={create}
          style={{
            display: "grid",
            gap: 12
          }}
        >
          <label>
            Current vault passphrase

            <input
              className="form-input"
              type="password"
              autoComplete="off"
              minLength={16}
              required
              value={passphrase}
              onChange={event =>
                setPassphrase(event.target.value)
              }
            />
          </label>

          <label>
            Repeat passphrase

            <input
              className="form-input"
              type="password"
              autoComplete="off"
              minLength={16}
              required
              value={confirmation}
              onChange={event =>
                setConfirmation(event.target.value)
              }
            />
          </label>

          <button
            type="submit"
            className="primary-button"
            disabled={busy || !profile}
          >
            {busy
              ? "Working…"
              : "Verify passphrase & download encrypted kit"}
          </button>
        </form>

        {newCode && (
          <div className="warning-box">
            <strong>
              Save this recovery code SEPARATELY
              from your JSON file:
            </strong>

            <p
              style={{
                overflowWrap: "anywhere",
                fontFamily: "monospace",
                fontSize: 14
              }}
            >
              {newCode}
            </p>

            <p>
              Anyone with both the file and code
              can recover your vault passphrase.
              This code disappears when you leave
              this page.
            </p>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setNewCode("");
              }}
            >
              I saved the code separately
            </button>
          </div>
        )}
      </section>

      <section
        className="feature-card"
        style={{
          display: "grid",
          gap: 12
        }}
      >
        <h2>
          2. Test / unlock using your kit
        </h2>

        <p>
          Use the downloaded file and its separately
          stored code. This tests recovery against
          your actual vault, not just whether the
          JSON file can be decrypted.
        </p>

        <form
          onSubmit={recover}
          style={{
            display: "grid",
            gap: 12
          }}
        >
          <label>
            Recovery JSON

            <input
              className="form-input"
              type="file"
              accept=".json,application/json"
              required
              onChange={event =>
                setFile(
                  event.target.files?.[0] || null
                )
              }
            />
          </label>

          <label>
            64-character recovery code

            <input
              className="form-input"
              type="password"
              autoComplete="off"
              required
              value={code}
              onChange={event =>
                setCode(event.target.value)
              }
            />
          </label>

          <button
            type="submit"
            className="primary-button"
            disabled={busy || !profile}
          >
            {busy
              ? "Testing…"
              : "Test recovery and unlock existing vault"}
          </button>
        </form>
      </section>

      {/* SECOND-DEVICE SAFETY CARD */}

      <section
        className="feature-card"
        style={{
          marginTop: 20,
          border: "1px solid #e7d4c4",
          background:
            "linear-gradient(110deg,#fff9f3,#fff)",
          display: "flex",
          alignItems: "flex-start",
          gap: 16
        }}
        aria-labelledby="iv-recovery-safety-title"
      >
        <span
          aria-hidden="true"
          style={{
            display: "grid",
            placeItems: "center",
            width: 46,
            height: 46,
            borderRadius: 14,
            background: "#ffeadb",
            color: "#a45f40",
            fontSize: 24,
            flexShrink: 0
          }}
        >
          ♧
        </span>

        <div style={{ minWidth: 0 }}>
          <span className="eyebrow">
            KEEP YOUR HISTORY ACCESSIBLE
          </span>

          <h2
            id="iv-recovery-safety-title"
            style={{
              fontSize: 21,
              margin: "7px 0 10px"
            }}
          >
            Test your backup on a second device
          </h2>

          <p
            style={{
              lineHeight: 1.7,
              margin: "0 0 10px"
            }}
          >
            Sign in on another trusted device and unlock
            this same vault with your current passphrase.
            Test the Recovery Kit separately, too.
          </p>

          <p
            style={{
              lineHeight: 1.7,
              margin: "0 0 10px"
            }}
          >
            If you lose your passphrase, kit, and all
            usable unlocked devices, your old encrypted
            records cannot be recovered.
          </p>

          <p
            style={{
              lineHeight: 1.7,
              margin: 0,
              fontWeight: 650,
              color: "#925039"
            }}
          >
            Never reset or overwrite your existing vault
            to fix a forgotten passphrase.
          </p>
        </div>
      </section>
    </div>
  );
}