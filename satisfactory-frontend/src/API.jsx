import { useState, useContext } from "react"
import { AuthContext } from "./AuthContext"
import { Link, Navigate } from "react-router-dom";
import { getSession } from "./auth";

export default function API() {
    const [error, setError] = useState("")

    const { user, signIn } = useContext(AuthContext)

    const [responseBody, setBody] = useState("")

    const submit = async (e) => {
        const session = await getSession()


        try {
            const response = await fetch("https://api.admin.satisfactory.pwed.me/server", {
                headers: {
                    Authorization: `Bearer ${session.idToken.jwtToken}`
                }
            })
            setBody(await response.text())
        } catch (err) {
            setError(err.message)
        }
    }

    // If the user is logged in, don't show the login form
    if (user) {
        // Redirect to the profile page
        return (
            <div>
                <h2>Server Status</h2>
                <button onClick={submit}>GET</button>
                <pre>{responseBody}</pre>
                {error && <p>{error}</p>}
            </div>
        )
    }

    return (
        <div>
            <h2>Server Status</h2>
            <button onClick={submit}>GET</button>
            {error && <p>{error}</p>}
        </div>
    )
}