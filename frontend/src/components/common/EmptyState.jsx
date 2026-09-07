const EmptyState = ({
  title = "Nothing here yet",
  message = "There is no information to show right now.",
  action = null,
}) => {
  return (
    <div className="empty-card">
      <div className="empty-state-icon">○</div>

      <h2>{title}</h2>

      <p>{message}</p>

      {action && (
        <div style={{ marginTop: 16 }}>
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;