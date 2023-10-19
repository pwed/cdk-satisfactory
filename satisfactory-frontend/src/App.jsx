import { AuthContext, AuthProvider } from "./AuthContext"
import { BrowserRouter, Link, Route, Routes } from "react-router-dom"
import SignUp from "./SignUp"
import ConfirmSignUp from "./ConfirmSignUp"
import Login from "./Login"
import UserProfile from "./UserProfile"
import RouteGuard from "./RouteGuard"
import { useContext } from "react"
import ForgotPassword from "./ForgotPassword"
import ResetPassword from "./ResetPassword"
import { signOut } from "./auth"
import Dashboard from "./Dashboard"
// import "./App.css"
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';

function Navigation() {
  const { user } = useContext(AuthContext)

  return (
    <nav>
      <Link  to="/">Dashboard</Link>
      {user ? (
        <>
          <Link  to="/profile">Profile</Link>
          <Link  onClick={signOut}>Sign Out</Link>
        </>
      ) : (
        <>
          <Link  to="/login">Login</Link>
          <Link  to="/signup">SignUp</Link>
        </>
      )}
    </nav>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navigation />
        <main>
          <Routes>
            <Route path="/signup" element={<SignUp />} />
            <Route path="/confirm-signup" element={<ConfirmSignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<RouteGuard>
              <UserProfile />
            </RouteGuard>} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App