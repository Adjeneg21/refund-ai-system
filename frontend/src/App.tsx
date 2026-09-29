import { NavLink, Route, Routes } from "react-router-dom";
import { CustomerChat } from "./pages/CustomerChat";
import { AdminDashboard } from "./pages/AdminDashboard";
import "./App.css";

function App() {
  return (
    <div className="app">
      <nav className="app__nav">
        <span className="app__nav-title">Refund desk</span>
        <div className="app__nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? "app__nav-link app__nav-link--active" : "app__nav-link"
            }
          >
            Request refund
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              isActive ? "app__nav-link app__nav-link--active" : "app__nav-link"
            }
          >
            Admin register
          </NavLink>
        </div>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<CustomerChat />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
