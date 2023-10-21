import { AuthContext, AuthProvider } from "./AuthContext"
import { BrowserRouter, Route, Routes } from "react-router-dom"
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
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';

function Navigation() {
  const { user } = useContext(AuthContext)

  return (
    <Navbar expand="md" className="bg-body-tertiary">
      <Container>
        <Navbar.Brand href="/">Satisfactory Admin</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="/">Dashboard</Nav.Link>
            {user ? (
              <>
                <Nav.Link href="/profile">Profile</Nav.Link>
                <Nav.Link onClick={signOut}>Sign Out</Nav.Link>
              </>
            ) : (
              <>
                <Nav.Link href="/login">Login</Nav.Link>
                <Nav.Link href="/signup">SignUp</Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navigation />
        <Container >
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
              <Route path='*' exact={true} element={<h1>Page not found</h1>} />
              {/* TODO: Improve the Page not found page */}
            </Routes>
          </main>
        </Container>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App