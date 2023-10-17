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
import API from "./API"

function Navigation() {
  const { user } = useContext(AuthContext)

  return (
    <nav>
      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>
        {user ? (
          <>
            <li>
              <Link to="/profile">Profile</Link>
            </li>
          </>
        ) : (
          <li>
            <Link to="/login">Login</Link>
          </li>
        )}
      </ul>
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
            <Route path="/" element={<API />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App