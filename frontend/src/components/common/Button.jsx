const Button = ({
  children,
  type = "button",
  variant = "primary",
  loading = false,
  disabled = false,
  onClick,
  className = "",
  ...props
}) => {
  const variantClass =
    variant === "danger"
      ? "danger-button"
      : variant === "secondary"
      ? "secondary-button"
      : "primary-button";

  return (
    <button
      type={type}
      className={`${variantClass} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
};

export default Button;