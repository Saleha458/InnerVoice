const Loader = ({ text = "Loading..." }) => {
  return (
    <div className="loader-container">
      <div className="loading-spinner"></div>
      <p>{text}</p>
    </div>
  );
};

export default Loader;