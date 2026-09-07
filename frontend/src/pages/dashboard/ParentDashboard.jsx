import { Link } from "react-router-dom";

const ages = [
  ["0–3", "Early years"],
  ["4–6", "Young children"],
  ["7–10", "Childhood"],
  ["11–14", "Early teens"],
  ["15–18", "Teen years"],
];

const ParentDashboard = () => {
  return (
    <div className="page-shell parent-portal">
      <div className="page-header">
        <div>
          <span className="eyebrow">
            PARENT PORTAL
          </span>

          <h1>
            Parent Support Center
          </h1>

          <p>
            Practical guidance for creating
            safer, respectful and supportive
            relationships.
          </p>
        </div>
      </div>

      <section className="feature-card">
        <h2>
          A calm, supportive approach
        </h2>

        <p>
          Listen first, avoid blame, respect
          boundaries and take concerns
          seriously.
        </p>
      </section>

      <h2 className="section-heading">
        Guidance by age
      </h2>

      <div className="dashboard-cards">
        {ages.map(([age, title]) => (
          <Link
            key={age}
            to="/parent/guidelines"
            className="dashboard-card"
          >
            <span>{age}</span>
            <h2>{title}</h2>
            <p>
              Age-appropriate parenting
              guidance.
            </p>
          </Link>
        ))}
      </div>

      <div className="parent-columns">
        <section className="feature-card">
          <h2>Positive parenting</h2>

          <ul className="clean-list">
            <li>
              Use calm conversations.
            </li>
            <li>
              Teach body boundaries.
            </li>
            <li>
              Praise honesty.
            </li>
            <li>
              Avoid threats and humiliation.
            </li>
          </ul>

          <Link
            to="/parent/guidelines"
            className="text-link"
          >
            View guidelines →
          </Link>
        </section>

        <section className="feature-card warning-box">
          <h2>Warning signs</h2>

          <p>
            Learn age-specific signs that
            may deserve careful attention.
          </p>

          <Link
            to="/parent/warnings"
            className="text-link"
          >
            View warning signs →
          </Link>
        </section>
      </div>
    </div>
  );
};

export default ParentDashboard;