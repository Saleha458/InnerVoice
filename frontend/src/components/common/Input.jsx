const Input = ({
  label,
  name,
  error,
  hint,
  className = "",
  ...props
}) => {
  return (
    <div className="form-group">
      {label && (
        <label
          htmlFor={name}
          className="form-label"
        >
          {label}
        </label>
      )}

      <input
        id={name}
        name={name}
        className={`form-input ${className}`}
        {...props}
      />

      {hint && !error && (
        <small className="form-hint">
          {hint}
        </small>
      )}

      {error && (
        <small className="form-error">
          {error}
        </small>
      )}
    </div>
  );
};

export default Input;