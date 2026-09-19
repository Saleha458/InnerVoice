import AppRoutes from "./routes/AppRoutes";

import {
  NotificationProvider,
} from "./context/NotificationContext";

const App = () => {
  return (
    <NotificationProvider>
      <AppRoutes />
    </NotificationProvider>
  );
};

export default App;