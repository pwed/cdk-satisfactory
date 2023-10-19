import { useState, useContext } from "react"
import { AuthContext } from "./AuthContext"
import { Link, Navigate } from "react-router-dom";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

export default function Login() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")

    const { user, signIn } = useContext(AuthContext)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")

        try {
            await signIn(username, password)
        } catch (err) {
            setError(err.message)
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
                />
            </Form.Group>

            <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                    type="password"
                    placeholder="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </Form.Group>
            <Button variant="primary" type="submit">Login</Button>

            {/* {error && <p>{error}</p>} */}
            <Button variant="link" href="/forgot-password">Forgot Password</Button>
            <Button variant="link" href="/signup">Sign Up</Button>
        </Form>
    )
}