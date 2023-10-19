import { useState, useContext } from "react"
import { AuthContext } from "./AuthContext"
import { Link, Navigate } from "react-router-dom";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';

export default function Login() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [show, setShow] = useState(true);

    const { user, signIn } = useContext(AuthContext)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")

        try {
            await signIn(username, password)
        } catch (err) {
            setError(err.message)
            setShow(true)
        }
    }

    // If the user is logged in, don't show the login form
    if (user) {
        // Redirect to the profile page
        return <Navigate to="/profile" />
    }

    return (
        <Form onSubmit={handleSubmit} className="mt-3">
            <Form.Group className="mb-3">
                <Form.Label>Username</Form.Label>
                <Form.Control
                    type="text"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                    type="password"
                    placeholder="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </Form.Group>
            <Button variant="primary" type="submit">Login</Button>
            <Button variant="link" href="/forgot-password">Forgot Password</Button>
            <Button variant="link" href="/signup">Sign Up</Button>

            {
                error &&                 
                <ToastContainer
                    className="p-3"
                    position="middle-center"
                    style={{ zIndex: 1 }}
                    >
                    <Toast onClose={() => {setShow(false); setError("")}} show={show} delay={3000} autohide>
                        <Toast.Header closeButton={false}>
                            <strong>Error Signing In</strong>
                        </Toast.Header>
                        <Toast.Body>{error}</Toast.Body>
                    </Toast>
                </ToastContainer>
            }
        </Form>
    )
}